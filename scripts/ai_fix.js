const fs = require('fs');
const path = require('path');

async function fixVulnerabilities() {
    console.log("--- Iniciando Remediación con IA (Gemini) ---");

    const serverPath = path.join(__dirname, '../server.js');
    const sourceCode = fs.readFileSync(serverPath, 'utf8');

    let auditResults = "No se encontró reporte de npm audit.";
    try {
        auditResults = fs.readFileSync(path.join(__dirname, '../audit-results.json'), 'utf8');
        const parsed = JSON.parse(auditResults);
        const count = parsed.metadata?.vulnerabilities;
        console.log(`Vulnerabilidades de dependencias: ${JSON.stringify(count)}`);
    } catch (e) {
        console.log("No se pudo parsear el reporte de audit.");
    }

    const apiKey = process.env.AI_API_KEY;

    if (!apiKey) {
        console.error("❌ ERROR: No se encontró la variable AI_API_KEY en los Secrets.");
        process.exit(1);
    }

    console.log("✅ API Key detectada. Enviando código a Gemini para remediación...");

    const prompt = `Eres un experto en ciberseguridad y Node.js. Analiza el siguiente código vulnerable y corrígelo.

VULNERABILIDADES DETECTADAS POR npm audit:
${auditResults.substring(0, 2000)}

CÓDIGO VULNERABLE A CORREGIR:
\`\`\`javascript
${sourceCode}
\`\`\`

INSTRUCCIONES ESTRICTAS:
1. Devuelve ÚNICAMENTE el código JavaScript corregido, sin explicaciones ni markdown.
2. NO incluyas bloques de código con triple backtick, solo el código puro.
3. Corrige todas las vulnerabilidades: SQL Injection, XSS, eval/RCE, Command Injection, Hardcoded Secrets, Insecure Cookies, Prototype Pollution.
4. Para secretos hardcodeados, usa process.env.VARIABLE_NAME en su lugar.
5. El código debe ser sintácticamente válido y funcional.`;

    const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                temperature: 0.1,
                max_tokens: 4096,
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un experto en ciberseguridad. Cuando corrijas código, devuelves SOLO el código JavaScript corregido, sin markdown, sin explicaciones, sin backticks.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error de la API de OpenAI: ${response.status} - ${errorText}`);
        process.exit(1);
    }

    const data = await response.json();
    let fixedCode = data?.choices?.[0]?.message?.content;

    if (!fixedCode) {
        console.error("❌ OpenAI no devolvió contenido.");
        console.error(JSON.stringify(data, null, 2));
        process.exit(1);
    }

    // Limpiar si Gemini devolvió backticks de markdown por error
    fixedCode = fixedCode
        .replace(/^```javascript\n?/i, '')
        .replace(/^```js\n?/i, '')
        .replace(/^```\n?/, '')
        .replace(/\n?```$/, '')
        .trim();

    console.log("🤖 Gemini respondió con el código corregido. Verificando...");

    // Guardar temporalmente para verificar
    const tempPath = path.join(__dirname, '../server_fixed_temp.js');
    fs.writeFileSync(tempPath, fixedCode);

    // Verificar sintaxis con Node.js antes de reemplazar
    const { execSync } = require('child_process');
    try {
        execSync(`node --check ${tempPath}`, { stdio: 'pipe' });
        console.log("✅ Sintaxis del código corregido: VÁLIDA");
    } catch (err) {
        console.error("❌ El código generado por Gemini tiene errores de sintaxis:");
        console.error(err.stderr?.toString());
        fs.unlinkSync(tempPath);
        process.exit(1);
    }

    // Reemplazar el archivo original con el código corregido
    fs.copyFileSync(tempPath, serverPath);
    fs.unlinkSync(tempPath);
    console.log("✅ server.js reemplazado con el código corregido por Gemini.");
}

fixVulnerabilities().catch(err => {
    console.error("❌ Error inesperado:", err);
    process.exit(1);
});
