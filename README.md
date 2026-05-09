# 🛡️ AI Security Self-Healing — CI/CD Pipeline

> Proyecto de demostración de un pipeline de **auto-remediación de seguridad** impulsado por IA.  
> Cada vez que se sube código a `main`, el sistema detecta vulnerabilidades, las envía a OpenAI para que las corrija, valida el resultado y lo publica en una nueva rama lista para revisión.

---

## 🧠 ¿Cómo funciona?

```
Push a main
     │
     ▼
┌─────────────────────────┐
│  1. ESCANEO (SCA)       │  npm audit → genera audit-results.json
│     17 vulnerabilidades │  con todas las CVEs encontradas
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  2. REMEDIACIÓN CON IA  │  Envía el código + el reporte a
│     OpenAI GPT-4o-mini  │  OpenAI, que devuelve el código corregido
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  3. VALIDACIÓN          │  node --check valida que el código
│     Verificación syntax │  generado por la IA sea sintácticamente
│                         │  válido antes de aplicarlo
└───────────┬─────────────┘
            │
       ┌────┴────┐
       │         │
      ✅ OK     ❌ Error
       │         │
       ▼         ▼
  Nueva rama   Pipeline falla
  creada       (protege main)
       │
       ▼
┌─────────────────────────┐
│  4. ENTREGA             │  Git push a rama:
│  fixed-remediation-{ID} │  fixed-remediation-{run_id}
└─────────────────────────┘
            │
            ▼
     👤 Revisión humana
     y merge manual (PR)
```

---

## 📂 Estructura del Proyecto

```
vulnerable-app/
├── server.js                        # App Express con vulnerabilidades intencionales
├── scripts/
│   └── ai_fix.js                    # Script que llama a OpenAI para corregir el código
├── .github/
│   └── workflows/
│       └── security.yml             # Pipeline de GitHub Actions
└── README.md
```

---

## 🔥 Vulnerabilidades Incluidas en `server.js`

| # | Tipo | Endpoint | Descripción |
|---|------|----------|-------------|
| 1 | **Hardcoded Secrets** | — | Contraseñas y llaves AWS escritas directamente en el código |
| 2 | **SQL Injection** | `GET /user?name=` | Concatenación directa de strings en queries SQL |
| 3 | **XSS Reflejado** | `GET /search?q=` | Input del usuario devuelto al HTML sin sanitizar |
| 4 | **RCE via eval** | `GET /calc?formula=` | Ejecución de código arbitrario con `eval()` |
| 5 | **Insecure Cookies** | `GET /login` | Cookies sin los flags `HttpOnly` ni `Secure` |
| 6 | **Prototype Pollution** | `GET /update-profile` | `lodash.merge()` con input del usuario sin validar |
| 7 | **Command Injection** | `GET /ping?ip=` | Ejecución de comandos del sistema con `child_process.exec` |

---

## ⚙️ Configuración

### 1. Requisito: API Key de OpenAI

Ve a tu repositorio en GitHub:  
`Settings` → `Secrets and variables` → `Actions` → `New repository secret`

| Nombre | Valor |
|--------|-------|
| `AI_API_KEY` | Tu API Key de OpenAI (`sk-...`) |

### 2. Activar el pipeline

El pipeline se activa automáticamente en cada `push` a la rama `main`.  
También puedes activarlo manualmente desde la pestaña **Actions** → `Run workflow`.

---

## 🔄 Flujo Detallado del Pipeline (`.github/workflows/security.yml`)

### Paso 1 — Escaneo (SCA)
```bash
npm audit --json > audit-results.json
```
Genera un reporte JSON con todas las vulnerabilidades de dependencias (CVEs).

### Paso 2 — Remediación con IA (`scripts/ai_fix.js`)
El script construye un prompt con:
- El código fuente de `server.js`
- El reporte de `npm audit`

Lo envía a **OpenAI GPT-4o-mini** con instrucciones estrictas de devolver únicamente el código corregido.

### Paso 3 — Validación de Sintaxis
```bash
node --check server.js
```
Si la IA devolvió código con errores de sintaxis, el pipeline falla aquí y **protege la rama main** de recibir código roto.

### Paso 4 — Push a Rama de Correcciones
```bash
git checkout -b fixed-remediation-{run_id}
git commit -m "security: fixes applied by AI assistant"
git push origin fixed-remediation-{run_id}
```
Los cambios nunca van directo a `main`. Siempre requieren **revisión humana y un Pull Request**.

---

## 🚀 Cómo Probar el Sistema

```bash
# 1. Clona el repositorio
git clone https://github.com/Sebastian245675/prueba-agentes.git
cd prueba-agentes

# 2. Instala dependencias
npm install

# 3. Añade una vulnerabilidad nueva en server.js
# (o modifica una existente)

# 4. Sube el cambio a main
git add .
git commit -m "vuln: nueva vulnerabilidad de prueba"
git push origin main

# 5. Observa el pipeline en:
# https://github.com/Sebastian245675/prueba-agentes/actions
```

---

## ⚠️ Advertencia

> Este proyecto contiene vulnerabilidades **intencionales** únicamente con fines de demostración y aprendizaje de DevSecOps.  
> **No lo despliegues en un entorno real o de producción.**

---

## 🛠️ Tecnologías Utilizadas

- **Node.js + Express** — Aplicación web vulnerable de ejemplo
- **GitHub Actions** — Orquestación del pipeline CI/CD
- **npm audit** — Escaneo de vulnerabilidades de dependencias (SCA)
- **OpenAI GPT-4o-mini** — Motor de remediación automática con IA
- **Git** — Control de versiones y gestión de ramas de corrección
