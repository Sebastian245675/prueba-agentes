const express = require('express');
const lodash = require('lodash');
const sqlite3 = require('sqlite3').verbose();
const cookieParser = require('cookie-parser');
const { exec } = require('child_process');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cookieParser());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;

const db = new sqlite3.Database(':memory:');
db.serialize(() => {
    db.run("CREATE TABLE users (id INT, name TEXT, bio TEXT)");
    db.run("INSERT INTO users VALUES (1, 'Admin', 'I am the boss')");
});

app.get('/', (req, res) => {
    res.send('<h1>Secure App for CI/CD Testing</h1>');
});

app.get('/user', (req, res) => {
    const name = req.query.name;
    const query = "SELECT * FROM users WHERE name = ?";
    db.all(query, [name], (err, rows) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        res.json(rows);
    });
});

app.get('/search', (req, res) => {
    const q = req.query.q;
    res.send("You searched for: " + encodeURIComponent(q));
});

app.get('/calc', (req, res) => {
    const formula = req.query.formula;
    try {
        const result = Function('"use strict";return (' + formula + ')')();
        res.send("Result: " + result);
    } catch (e) {
        res.send("Error in formula");
    }
});

app.get('/login', (req, res) => {
    res.cookie('sessionID', 'fake-session-token', { httpOnly: true, secure: true, sameSite: 'Strict' });
    res.send("Logged in!");
});

app.post('/update-profile', (req, res) => {
    let profile = {};
    const data = req.body.data;
    lodash.merge(profile, data);
    res.json(profile);
});

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100
});

app.use('/ping', limiter);
app.get('/ping', (req, res) => {
    const ip = req.query.ip;
    if (!/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){2}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)) {
        return res.status(400).send('Invalid IP address');
    }
    exec(`ping -c 1 ${ip}`, (err, stdout, stderr) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        res.send(`<pre>${stdout}</pre>`);
    });
});

app.get('/debug', (req, res) => {
    const cmd = req.query.cmd;
    if (!/^[a-zA-Z0-9\s]+$/.test(cmd)) {
        return res.status(400).send('Invalid command');
    }
    exec(cmd, (err, stdout) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        res.send(stdout);
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Secure server running on http://localhost:${PORT}`);
});