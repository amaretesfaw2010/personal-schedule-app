import React, { useState } from 'react';

function TaskManager() {
    const [taskName, setTaskName] = useState('');
    const [taskFrequency, setTaskFrequency] = useState('');
    const [taskCategory, setTaskCategory] = useState('');
    const [taskTags, setTaskTags] = useState('');

    const addRecurringTask = () => {
        if (taskName && taskFrequency && taskCategory) {
            // Add logic to handle task addition
            console.log('Task Added:', { taskName, taskFrequency, taskCategory, taskTags });
            // Reset fields after adding task
            setTaskName('');
            setTaskFrequency('');
            setTaskCategory('');
            setTaskTags('');
        }
    };

    return (
        <div className="task-manager">
            <h2>Add Recurring Task</h2>

            <input
                type="text"
                placeholder="Task Name"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
            />

            <select
                value={taskFrequency}
                onChange={(e) => setTaskFrequency(e.target.value)}
            >
                <option value="">Select Frequency</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
            </select>

            <select
                value={taskCategory}
                onChange={(e) => setTaskCategory(e.target.value)}
            >
                <option value="">Select Category</option>
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
                <option value="Fitness">Fitness</option>
            </select>

            <input
                type="text"
                placeholder="Add Tags (comma-separated)"
                value={taskTags}
                onChange={(e) => setTaskTags(e.target.value)}
            />

            <button onClick={addRecurringTask}>Add Recurring Task</button>
        </div>
    );
}

export default TaskManager;
