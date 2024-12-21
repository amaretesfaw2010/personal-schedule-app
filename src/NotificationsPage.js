import React from 'react';

const NotificationsPage = ({ notifications, onRemove }) => (
    <div>
        <h2>Upcoming Task Reminders</h2>
        <ul>
            {notifications.length > 0 ? (
                notifications.map((notification) => (
                    <li key={notification.taskID}>
                        <span>{notification.message} (Time: {notification.time})</span>
                        <button onClick={() => onRemove(notification.taskID)}>Remove</button>
                    </li>
                ))
            ) : (
                <p>No upcoming reminders</p>
            )}
        </ul>
    </div>
);

export default NotificationsPage;
