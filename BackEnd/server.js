const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sql = require('mssql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // To manage environment variables

// SQL Server Configuration
const config = {
    server: process.env.DB_SERVER, // Update with your server or use env variable
    database: process.env.DB_NAME,
    driver: 'msnodesqlv8',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: true,
        connectionTimeout: 120000, // Timeout in milliseconds
    },
};

const app = express();
const secretKey = process.env.JWT_SECRET || 'default_secret_key'; // Use environment variable or default for local dev

app.use(cors());
app.use(bodyParser.json());
app.get('/', (req, res) => {
    res.send('Welcome to the Personal Schedule Backend!');
});

// Connect to SQL Server
sql.connect(config).then(pool => {
    console.log('Connected to SQL Server.');

    // Middleware for SQL pool injection
    app.use((req, res, next) => {
        req.sql = pool.request();
        next();
    });

    // Middleware for JWT Authentication
    const authenticateJWT = (req, res, next) => {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const token = authHeader.split(' ')[1];

        jwt.verify(token, secretKey, (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid token.' });
            }

            req.userId = decoded.userId; // Attach userId to the request
            next();
        });
    };

    // User Authentication Routes
    // Register a new user
    app.post('/register', async (req, res) => {
        const { Username, Password } = req.body;

        if (!Username || !Password) {
            return res.status(400).json({ error: 'Username and Password are required' });
        }

        try {
            const hashedPassword = await bcrypt.hash(Password, 10);
            await req.sql
                .input('Username', sql.NVarChar, Username)
                .input('PasswordHash', sql.NVarChar, hashedPassword)
                .query('INSERT INTO Users (Username, PasswordHash) VALUES (@Username, @PasswordHash)');

            res.status(201).json({ message: 'User registered successfully!' });
        } catch (err) {
            console.error('Error registering user:', err);
            res.status(500).json({ error: 'Failed to register user' });
        }
    });

    // Login a user
    app.post('/login', async (req, res) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and Password are required' });
        }

        try {
            // Get user from the database
            const result = await req.sql
                .input('Username', sql.NVarChar, username)
                .query('SELECT * FROM Users WHERE Username = @Username');

            if (result.recordset.length === 0) {
                return res.status(400).json({ message: 'Invalid username or password' });
            }

            const user = result.recordset[0];

            // Compare the entered password with the hashed password in the database
            const isMatch = await bcrypt.compare(password, user.PasswordHash);

            if (isMatch) {
                // Generate JWT token
                const token = jwt.sign({ userId: user.UserID, username: user.Username }, secretKey, { expiresIn: '1h' });
                return res.json({ token });
            } else {
                return res.status(400).json({ message: 'Invalid username or password' });
            }
        } catch (err) {
            console.error('Error logging in:', err);
            return res.status(500).json({ error: 'Failed to log in' });
        }
    });

    // Task Management Routes
    // Get all tasks for authenticated user
    app.get('/tasks', authenticateJWT, async (req, res) => {
        try {
            const result = await req.sql
                .input('UserID', sql.Int, req.userId)
                .query('SELECT * FROM Tasks WHERE UserID = @UserID');

            res.status(200).json(result.recordset);
        } catch (err) {
            console.error('Error fetching tasks:', err);
            res.status(500).json({ error: 'Failed to fetch tasks' });
        }
    });

    // Add a new task for authenticated user
    app.post('/tasks', authenticateJWT, async (req, res) => {
        const { TaskName, TaskDate, Category } = req.body;

        if (!TaskName || !TaskDate || !Category) {
            return res.status(400).json({ error: 'TaskName, TaskDate, and Category are required' });
        }

        try {
            await req.sql
                .input('TaskName', sql.NVarChar, TaskName)
                .input('TaskDate', sql.Date, TaskDate)
                .input('Category', sql.NVarChar, Category)
                .input('UserID', sql.Int, req.userId)
                .query('INSERT INTO Tasks (TaskName, TaskDate, Category, UserID) VALUES (@TaskName, @TaskDate, @Category, @UserID)');

            res.status(201).json({ message: 'Task added successfully!' });
        } catch (err) {
            console.error('Error adding task:', err);
            res.status(500).json({ error: 'Failed to add task' });
        }
    });


    // Update a task for authenticated user
    app.put('/tasks/:id', authenticateJWT, async (req, res) => {
        const { id } = req.params;
        const { TaskName, TaskDate } = req.body;

        if (!TaskName || !TaskDate) {
            return res.status(400).json({ error: 'TaskName and TaskDate are required' });
        }

        try {
            const result = await req.sql
                .input('TaskID', sql.Int, id)
                .input('TaskName', sql.NVarChar, TaskName)
                .input('TaskDate', sql.Date, TaskDate)
                .input('UserID', sql.Int, req.userId)
                .query('UPDATE Tasks SET TaskName = @TaskName, TaskDate = @TaskDate WHERE TaskID = @TaskID AND UserID = @UserID');

            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({ error: 'Task not found' });
            }

            res.status(200).json({ message: 'Task updated successfully!' });
        } catch (err) {
            console.error('Error updating task:', err);
            res.status(500).json({ error: 'Failed to update task' });
        }
    });

    // Delete a task for authenticated user
    app.delete('/tasks/:id', authenticateJWT, async (req, res) => {
        const { id } = req.params;

        try {
            const result = await req.sql
                .input('TaskID', sql.Int, id)
                .input('UserID', sql.Int, req.userId)
                .query('DELETE FROM Tasks WHERE TaskID = @TaskID AND UserID = @UserID');

            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({ error: 'Task not found' });
            }

            res.status(200).json({ message: 'Task deleted successfully' });
        } catch (err) {
            console.error('Error deleting task:', err);
            res.status(500).json({ error: 'Failed to delete task' });
        }
    });

}).catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1); // Exit if connection fails
});

// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

