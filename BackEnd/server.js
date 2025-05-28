const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const secretKey = process.env.JWT_SECRET || 'default_secret_key';

app.use(cors());
app.use(bodyParser.json());

// MySQL Configuration
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.get('/', (req, res) => {
    res.send('Welcome to the Personal Schedule Backend (MySQL)!');
});

// Middleware for JWT Authentication
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided.' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.userId = decoded.userId;
        next();
    });
};

// Register
app.post('/register', async (req, res) => {
    const { Username, Password } = req.body;
    if (!Username || !Password) return res.status(400).json({ error: 'Username and Password required' });

    try {
        const hashedPassword = await bcrypt.hash(Password, 10);
        const conn = await pool.getConnection();
        await conn.execute('INSERT INTO Users (Username, PasswordHash) VALUES (?, ?)', [Username, hashedPassword]);
        conn.release();
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and Password required' });

    try {
        const conn = await pool.getConnection();
        const [rows] = await conn.execute('SELECT * FROM Users WHERE Username = ?', [username]);
        conn.release();

        if (rows.length === 0 || !(await bcrypt.compare(password, rows[0].PasswordHash))) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        const token = jwt.sign({ userId: rows[0].UserID, username: rows[0].Username }, secretKey, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get tasks
app.get('/tasks', authenticateJWT, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [tasks] = await conn.execute('SELECT * FROM Tasks WHERE UserID = ?', [req.userId]);
        conn.release();
        res.status(200).json(tasks);
    } catch (err) {
        console.error('Fetch tasks error:', err);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Add task
app.post('/tasks', authenticateJWT, async (req, res) => {
    const { TaskName, TaskDate, Category } = req.body;
    if (!TaskName || !TaskDate || !Category) return res.status(400).json({ error: 'All fields are required' });

    try {
        const conn = await pool.getConnection();
        await conn.execute(
            'INSERT INTO Tasks (TaskName, TaskDate, Category, UserID) VALUES (?, ?, ?, ?)',
            [TaskName, TaskDate, Category, req.userId]
        );
        conn.release();
        res.status(201).json({ message: 'Task added successfully!' });
    } catch (err) {
        console.error('Add task error:', err);
        res.status(500).json({ error: 'Failed to add task' });
    }
});

// Update task
app.put('/tasks/:id', authenticateJWT, async (req, res) => {
    const { id } = req.params;
    const { TaskName, TaskDate } = req.body;
    if (!TaskName || !TaskDate) return res.status(400).json({ error: 'TaskName and TaskDate required' });

    try {
        const conn = await pool.getConnection();
        const [result] = await conn.execute(
            'UPDATE Tasks SET TaskName = ?, TaskDate = ? WHERE TaskID = ? AND UserID = ?',
            [TaskName, TaskDate, id, req.userId]
        );
        conn.release();

        if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });

        res.status(200).json({ message: 'Task updated successfully!' });
    } catch (err) {
        console.error('Update task error:', err);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Delete task
app.delete('/tasks/:id', authenticateJWT, async (req, res) => {
    const { id } = req.params;

    try {
        const conn = await pool.getConnection();
        const [result] = await conn.execute(
            'DELETE FROM Tasks WHERE TaskID = ? AND UserID = ?',
            [id, req.userId]
        );
        conn.release();

        if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });

        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (err) {
        console.error('Delete task error:', err);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
