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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 8192,
                }
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error de la API de Gemini: ${response.status} - ${errorText}`);
        process.exit(1);
    }

    const data = await response.json();
    let fixedCode = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!fixedCode) {
        console.error("❌ Gemini no devolvió contenido.");
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
