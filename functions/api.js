const express = require('express');
const serverless = require('serverless-http');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, 'activities.db');
const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        time TEXT,
        date TEXT,
        description TEXT,
        duration TEXT,
        status TEXT,
        notes TEXT,
        additionalDetails TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS evening_plans (
        id TEXT PRIMARY KEY,
        date TEXT,
        journaling TEXT,
        tomorrowTasks TEXT,
        outfit TEXT,
        visualization TEXT
    )`);
});

// API Routes
app.get('/activities', async (req, res) => {
    const date = req.query.date;
    let query = 'SELECT * FROM activities';
    let params = [];

    if (date) {
        query += ' WHERE date = ?';
        params = [date];
    }
    query += ' ORDER BY time DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/activities/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM activities WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Activity not found' });
            return;
        }
        res.json(row);
    });
});

app.post('/activities', (req, res) => {
    const activity = req.body;
    const params = [
        activity.id,
        activity.time,
        activity.date,
        activity.description,
        activity.duration || '',
        activity.status || 'Pending',
        activity.notes || '',
        activity.additionalDetails || ''
    ];

    db.run(`INSERT INTO activities VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: activity.id, success: true });
    });
});

app.put('/activities/:id', (req, res) => {
    const updates = req.body;
    const params = [
        updates.time,
        updates.date,
        updates.description,
        updates.duration,
        updates.status,
        updates.notes,
        updates.additionalDetails,
        req.params.id
    ];

    db.run(`UPDATE activities SET time=?, date=?, description=?, duration=?, status=?, notes=?, additionalDetails=? WHERE id=?`,
        params, function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        });
});

app.delete('/activities/:id', (req, res) => {
    db.run('DELETE FROM activities WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

// Evening plans routes
app.get('/evening-plans', (req, res) => {
    const date = req.query.date;
    let query = 'SELECT * FROM evening_plans';
    const params = date ? [date] : [];
    
    if (date) query += ' WHERE date = ?';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/evening-plans', (req, res) => {
    const plan = req.body;
    const params = [plan.id, plan.date, plan.journaling, plan.tomorrowTasks, plan.outfit, plan.visualization];

    db.run(`INSERT INTO evening_plans VALUES (?, ?, ?, ?, ?, ?)`, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: plan.id });
    });
});

// Export the express app wrapped in serverless
exports.handler = serverless(app); 