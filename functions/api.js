const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize SQLite database
const dbPath = path.join(__dirname, 'activities.db');
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
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

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  const path = event.path.replace('/.netlify/functions/api', '');
  const segments = path.split('/').filter(Boolean);
  const resource = segments[0]; // 'activities' or 'evening-plans'
  const id = segments[1];

  try {
    switch (event.httpMethod) {
      case 'GET':
        if (resource === 'activities') {
          return new Promise((resolve, reject) => {
            const query = id 
              ? 'SELECT * FROM activities WHERE id = ?'
              : 'SELECT * FROM activities ORDER BY time DESC';
            const params = id ? [id] : [];

            db.all(query, params, (err, rows) => {
              if (err) reject(err);
              resolve({
                statusCode: 200,
                headers,
                body: JSON.stringify(id ? rows[0] : rows)
              });
            });
          });
        }
        break;

      case 'POST':
        if (resource === 'activities') {
          const activity = JSON.parse(event.body);
          return new Promise((resolve, reject) => {
            const query = `INSERT INTO activities 
              (id, time, date, description, duration, status, notes, additionalDetails)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
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

            db.run(query, params, function(err) {
              if (err) reject(err);
              resolve({
                statusCode: 201,
                headers,
                body: JSON.stringify({ id: activity.id, success: true })
              });
            });
          });
        }
        break;

      case 'PUT':
        if (resource === 'activities' && id) {
          const updates = JSON.parse(event.body);
          return new Promise((resolve, reject) => {
            const query = `UPDATE activities 
              SET time=?, date=?, description=?, duration=?, status=?, notes=?, additionalDetails=?
              WHERE id=?`;
            const params = [
              updates.time,
              updates.date,
              updates.description,
              updates.duration,
              updates.status,
              updates.notes,
              updates.additionalDetails,
              id
            ];

            db.run(query, params, function(err) {
              if (err) reject(err);
              resolve({
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
              });
            });
          });
        }
        break;

      case 'DELETE':
        if (resource === 'activities' && id) {
          return new Promise((resolve, reject) => {
            db.run('DELETE FROM activities WHERE id = ?', [id], function(err) {
              if (err) reject(err);
              resolve({
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
              });
            });
          });
        }
        break;
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not Found' })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}; 