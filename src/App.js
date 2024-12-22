import React, { useState, useEffect } from 'react';
import './App.css'; // Include CSS for styling

// Common API base URL
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://personalschedule-backend.onrender.com'  // Deployed backend
  : 'http://localhost:4000';  // Local backend (if running locally)

function App() {
    const [tasks, setTasks] = useState([]);
    const [taskName, setTaskName] = useState('');
    const [taskDate, setTaskDate] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loggedIn, setLoggedIn] = useState(false);
    const [token, setToken] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [category, setCategory] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [notifications, setNotifications] = useState([]);

    const categories = ["Work", "Personal", "Fitness", "Education", "Others"]; // Example categories

    // Remove a notification
    const removeNotification = (taskID) => {
        setNotifications(notifications.filter(notification => notification.taskID !== taskID));
    };

    // Handle login logic
   const [isLoading, setIsLoading] = useState(false);

const handleLogin = async () => {
    if (username && password) {
        setIsLoading(true);  // Start loading
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (response.ok) {
                setToken(data.token);
                setLoggedIn(true);
                fetchTasks(data.token);
            } else {
                alert(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Error logging in:', error);
        } finally {
            setIsLoading(false);  // End loading
        }
    } else {
        alert('Please enter both username and password.');
    }
};

    // Handle sign-up logic
    const handleSignUp = async () => {
        if (username && password && password === confirmPassword) {
            try {
                const response = await fetch(`${API_BASE_URL}/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ Username: username, Password: password }),
                });
                const data = await response.json();
                if (response.ok) {
                    alert('Sign-up successful! You can now log in.');
                    setIsSignUp(false);
                } else {
                    alert(data.message || 'Sign-up failed');
                }
            } catch (error) {
                console.error('Error signing up:', error);
            }
        } else {
            alert('Please make sure passwords match and all fields are filled.');
        }
    };

    // Fetch tasks from the server
    const fetchTasks = async (authToken) => {
        try {
            const response = await fetch(`${API_BASE_URL}/tasks`, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            const data = await response.json();
            setTasks(categoryFilter ? data.filter(task => task.Category === categoryFilter) : data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    // Add a new task
    const addTask = async () => {
        if (taskName && taskDate && category) {
            try {
                const response = await fetch(`${API_BASE_URL}/tasks`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        TaskName: taskName,
                        TaskDate: taskDate,
                        Category: category,
                    }),
                });
                if (response.ok) {
                    setTaskName('');
                    setTaskDate('');
                    setCategory('');
                    fetchTasks(token);
                } else {
                    alert('Failed to add task.');
                }
            } catch (error) {
                console.error('Error adding task:', error);
            }
        } else {
            alert('Please fill all fields (Task Name, Date, and Category).');
        }
    };

    // Remove a task
    const removeTask = async (taskID) => {
        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${taskID}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                fetchTasks(token);
            } else {
                alert('Failed to remove task.');
            }
        } catch (error) {
            console.error('Error removing task:', error);
        }
    };

    // Format date for better readability
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Calculate the remaining time for the task
    const getRemainingTime = (taskTimeLocal) => {
        const now = new Date();
        const timeDifference = taskTimeLocal - now;

        if (timeDifference <= 0) {
            return "Task has already passed";
        }

        const remainingDays = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
        const remainingHours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const remainingMinutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));

        return `${remainingDays} days, ${remainingHours} hours, ${remainingMinutes} minutes`;
    };

    // Check reminders based on task deadlines
    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            let newNotifications = [];

            tasks.forEach(task => {
                const taskTime = new Date(task.TaskDate);
                const remainingTime = getRemainingTime(taskTime);

                if (!newNotifications.some(notification => notification.taskID === task.TaskID)) {
                    newNotifications.push({
                        taskID: task.TaskID,
                        message: `Reminder: ${task.TaskName} in ${remainingTime}`,
                        time: taskTime.toLocaleString(),
                    });
                }
            });

            setNotifications(newNotifications);
        };

        if (tasks.length > 0) {
            checkReminders();
        }
    }, [tasks]);

    return (
        <div className="App">
            <header className="App-header">
                <h1>Personal Schedule App</h1>

                {!loggedIn ? (
                    <div className="auth-container">
                        <h2>{isSignUp ? 'Sign Up' : 'Login'}</h2>
                        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        {isSignUp && (
                            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        )}
                        <button onClick={isSignUp ? handleSignUp : handleLogin}>
                            {isSignUp ? 'Sign Up' : 'Login'}
                        </button>
                        <div className="auth-links">
                            <span onClick={() => setIsSignUp(!isSignUp)}>
                                {isSignUp ? 'Already have an account? Login' : 'Create an account'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="content">
                        <div className="task-input">
                            <h2>Add New Task</h2>
                            <input type="text" placeholder="Task Name" value={taskName} onChange={(e) => setTaskName(e.target.value)} />
                            <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
                            <select value={category} onChange={(e) => setCategory(e.target.value)}>
                                <option value="">Select Category</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <button onClick={addTask}>Add Task</button>
                        </div>

                        <div className="task-list">
                            <h2>Scheduled Tasks</h2>
                            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                                <option value="">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <button onClick={() => fetchTasks(token)}>Filter</button>

                            {tasks.length > 0 ? (
                                <table className="task-table">
                                    <thead>
                                        <tr>
                                            <th>Task</th>
                                            <th>Date</th>
                                            <th>Category</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tasks.map((task) => (
                                            <tr key={task.TaskID}>
                                                <td>{task.TaskName}</td>
                                                <td>{formatDate(task.TaskDate)}</td>
                                                <td>{task.Category}</td>
                                                <td>
                                                    <button onClick={() => removeTask(task.TaskID)} className="remove-btn">Remove</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p>No tasks scheduled yet.</p>
                            )}
                        </div>

                        <div className="notifications">
                            <h2>Notifications</h2>
                            {notifications.length > 0 ? (
                                <div className="notification-list">
                                    {notifications.map((notification) => (
                                        <div key={notification.taskID} className="notification-card">
                                            <div className="notification-message">
                                                {notification.message}
                                            </div>
                                            <div className="notification-time">
                                                {notification.time}
                                            </div>
                                            <button onClick={() => removeNotification(notification.taskID)} className="close-notification-btn">
                                                Close
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p>No reminders yet.</p>
                            )}
                        </div>
                    </div>
                )}
            </header>
        </div>
    );
}

export default App;
