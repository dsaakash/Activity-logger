const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: ['https://activity-logger-x2rv.onrender.com', 'https://activity-logger-x2rv.onrender.com', 'https://activity-logger-x2rv.onrender.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Initialize SQLite database
const db = new sqlite3.Database('activities.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        createTables();
    }
});

// Create necessary tables
function createTables() {
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
}

// API Endpoints
app.get('/api/activities', (req, res) => {
    const date = req.query.date;
    console.log('Fetching activities for date:', date);

    let query = 'SELECT * FROM activities';
    let params = [];

    if (date) {
        query += ' WHERE date = ?';
        params = [date];
    }

    query += ' ORDER BY time DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('Found activities:', rows.length);
        res.json(rows);
    });
});

app.post('/api/activities', (req, res) => {
    console.log('Received activity data:', req.body);
    
    const activity = req.body;
    if (!activity.time || !activity.date || !activity.description) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

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

    db.run(`INSERT INTO activities (id, time, date, description, duration, status, notes, additionalDetails)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, params, function(err) {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('Activity saved successfully');
        res.json({ id: activity.id, success: true });
    });
});

app.put('/api/activities/:id', (req, res) => {
    const activity = req.body;
    const params = [
        activity.time,
        activity.date,
        activity.description,
        activity.duration,
        activity.status,
        activity.notes,
        activity.additionalDetails,
        req.params.id
    ];

    db.run(`UPDATE activities 
            SET time=?, date=?, description=?, duration=?, status=?, notes=?, additionalDetails=?
            WHERE id=?`, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ changes: this.changes });
    });
});

app.delete('/api/activities/:id', (req, res) => {
    db.run('DELETE FROM activities WHERE id = ?', req.params.id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ changes: this.changes });
    });
});

// Evening Plans endpoints
app.get('/api/evening-plans', (req, res) => {
    const date = req.query.date;
    let query = 'SELECT * FROM evening_plans';
    if (date) {
        query += ' WHERE date = ?';
        db.all(query, [date], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        });
    } else {
        db.all(query, [], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        });
    }
});

app.post('/api/evening-plans', (req, res) => {
    const plan = req.body;
    const params = [
        plan.id,
        plan.date,
        plan.journaling,
        plan.tomorrowTasks,
        plan.outfit,
        plan.visualization
    ];

    db.run(`INSERT INTO evening_plans (id, date, journaling, tomorrowTasks, outfit, visualization)
            VALUES (?, ?, ?, ?, ?, ?)`, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: plan.id });
    });
});

// Add this new endpoint after the other activity endpoints
app.get('/api/activities/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM activities WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('Database error:', err);
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 