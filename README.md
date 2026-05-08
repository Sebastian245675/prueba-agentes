# Proyecto Vulnerable para Pruebas de CI/CD

Este proyecto contiene múltiples vulnerabilidades intencionales para probar herramientas de seguridad en pipelines de CI/CD (SAST, DAST, SCA).

## Vulnerabilidades Incluidas

### 1. Software Composition Analysis (SCA) / Escaneo de Dependencias
- **express@4.16.0**: Versión antigua con múltiples vulnerabilidades conocidas.
- **lodash@4.17.11**: Vulnerable a *Prototype Pollution*.
- **sqlite3@5.0.0**: Dependencias internas desactualizadas.

### 2. Static Application Security Testing (SAST)
- **SQL Injection**: En el endpoint `/user?name=...` por concatenación de strings.
- **XSS (Reflected)**: En el endpoint `/search?q=...` por falta de sanitización.
- **RCE (Remote Code Execution)**: En `/calc?formula=...` mediante el uso de `eval()`.
- **Secrets Exposure**: Contraseñas y llaves de AWS hardcodeadas en `server.js`.
- **Insecure Cookies**: Cookies configuradas sin los flags `HttpOnly` ni `Secure`.

### 3. Dynamic Application Security Testing (DAST)
Si corres este servidor localmente, herramientas como OWASP ZAP o Burp Suite detectarán:
- Falta de headers de seguridad (HSTS, CSP, X-Frame-Options).
- XSS y SQLi activos.

## Cómo ejecutarlo
1. `npm install`
2. `node server.js`

---
**ADVERTENCIA**: No despliegues este proyecto en un entorno real. Está diseñado para ser inseguro.
