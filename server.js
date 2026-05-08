const express = require('express');
const lodash = require('lodash');
const sqlite3 = require('sqlite3').verbose();
const cookieParser = require('cookie-parser');

const app = express();
app.use(cookieParser());

// VULNERABILIDAD 1: Secreto Hardcodeado (Hardcoded Secret)
const ADMIN_PASSWORD = "SuperSecretPassword123!";
const AWS_ACCESS_KEY = "AKIAEXAMPLE123456789";

const db = new sqlite3.Database(':memory:');
db.serialize(() => {
    db.run("CREATE TABLE users (id INT, name TEXT, bio TEXT)");
    db.run("INSERT INTO users VALUES (1, 'Admin', 'I am the boss')");
});

app.get('/', (req, res) => {
    res.send('<h1>Vulnerable App for CI/CD Testing</h1><p>Check the source code for intentional flaws.</p>');
});

// VULNERABILIDAD 2: Inyección SQL (SQL Injection)
app.get('/user', (req, res) => {
    const name = req.query.name;
    // Malo: Concatenación directa de strings
    const query = "SELECT * FROM users WHERE name = '" + name + "'";
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        res.json(rows);
    });
});

// VULNERABILIDAD 3: Cross-Site Scripting (XSS) Reflejado
app.get('/search', (req, res) => {
    const q = req.query.q;
    // Malo: Enviando input del usuario directamente al HTML sin sanitizar
    res.send("You searched for: " + q);
});

// VULNERABILIDAD 4: Ejecución de Código Remoto (RCE) vía eval
app.get('/calc', (req, res) => {
    const formula = req.query.formula;
    try {
        // MUY MALO: Usar eval con input del usuario
        const result = eval(formula);
        res.send("Result: " + result);
    } catch (e) {
        res.send("Error in formula");
    }
});

// VULNERABILIDAD 5: Configuración insegura de Cookies
app.get('/login', (req, res) => {
    // Malo: Cookie sin flag HttpOnly ni Secure
    res.cookie('sessionID', 'fake-session-token', { httpOnly: false, secure: false });
    res.send("Logged in!");
});

// VULNERABILIDAD 6: Prototype Pollution (vía lodash antiguo)
app.get('/update-profile', (req, res) => {
    let profile = {};
    const data = JSON.parse(req.query.data);
    // lodash 4.17.11 es vulnerable a prototype pollution
    lodash.merge(profile, data);
    res.json(profile);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Vulnerable server running on http://localhost:${PORT}`);
});
