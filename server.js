const express = require('express');
const lodash = require('lodash');
const sqlite3 = require('sqlite3').verbose();
const cookieParser = require('cookie-parser');
// FIX: child_process eliminado - nunca ejecutar comandos con input del usuario

const app = express();
app.use(cookieParser());
app.use(express.json());

// FIX 1: Secretos movidos a variables de entorno
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;

const db = new sqlite3.Database(':memory:');
db.serialize(() => {
    db.run("CREATE TABLE users (id INT, name TEXT, bio TEXT)");
    db.run("INSERT INTO users VALUES (1, 'Admin', 'I am the boss')");
});

app.get('/', (req, res) => {
    res.send('<h1>Secure App - Fixed by AI Remediation Bot</h1>');
});

// FIX 2: SQL Injection -> Parameterized Query
app.get('/user', (req, res) => {
    const name = req.query.name;
    // SEGURO: Usando placeholders parametrizados
    const query = "SELECT * FROM users WHERE name = ?";
    db.all(query, [name], (err, rows) => {
        if (err) {
            res.status(500).send("Database error");
            return;
        }
        res.json(rows);
    });
});

// FIX 3: XSS -> Escapar el output
app.get('/search', (req, res) => {
    const q = (req.query.q || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    res.send("You searched for: " + q);
});

// FIX 4: RCE (eval) -> Removido completamente
app.get('/calc', (req, res) => {
    res.status(403).json({ error: 'eval is forbidden for security reasons' });
});

// FIX 5: Cookies seguras con HttpOnly y Secure
app.get('/login', (req, res) => {
    res.cookie('sessionID', 'fake-session-token', { httpOnly: true, secure: true, sameSite: 'Strict' });
    res.send("Logged in!");
});

// FIX 6: Prototype Pollution -> Validar que data no tenga __proto__
app.get('/update-profile', (req, res) => {
    let profile = {};
    try {
        const data = JSON.parse(req.query.data);
        if (data.__proto__ || data.constructor || data.prototype) {
            return res.status(400).json({ error: 'Prototype pollution attempt blocked' });
        }
        lodash.merge(profile, data);
        res.json(profile);
    } catch (e) {
        res.status(400).json({ error: 'Invalid JSON' });
    }
});

// FIX 7: Command Injection -> Endpoint eliminado y reemplazado con respuesta segura
app.get('/ping', (req, res) => {
    res.status(403).json({ error: 'Direct command execution is forbidden. Use a safe ping library.' });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Secure server running on http://localhost:${PORT}`);
});
