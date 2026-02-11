import React, { useEffect, useState } from 'react';
import { getDevLogs, addDevLog, deleteDevLog } from '../../services/devLogService';
import { LOG_CATEGORIES } from '../../types/devLog';
import type { DevLog, DevLogCategory } from '../../types/devLog';
import './DevLogsAdmin.css'; // Will create this next

const DevLogsAdmin: React.FC = () => {
    const [logs, setLogs] = useState<DevLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<DevLog>>({
        category: 'feature',
        title: '',
        description: '',
        author: 'Admin',
        links: []
    });

    const fetchLogs = async () => {
        setLoading(true);
        const data = await getDevLogs();
        setLogs(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDevLog({
                ...formData as DevLog,
                timestamp: new Date()
            });
            setIsAdding(false);
            setFormData({
                category: 'feature',
                title: '',
                description: '',
                author: 'Admin',
                links: []
            });
            fetchLogs();
        } catch (error) {
            alert('Failed to add log');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this log?')) {
            await deleteDevLog(id);
            fetchLogs();
        }
    };

    return (
        <div className="dev-logs-admin">
            <div className="header">
                <h2>🛠️ Development Logs</h2>
                <button className="add-btn" onClick={() => setIsAdding(!isAdding)}>
                    {isAdding ? 'Cancel' : '+ Add Log'}
                </button>
            </div>

            {isAdding && (
                <form className="log-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Category</label>
                        <select
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value as DevLogCategory })}
                        >
                            {Object.entries(LOG_CATEGORIES).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Title</label>
                        <input
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Implemented Dark Mode"
                        />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            required
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Details about the change..."
                            rows={3}
                        />
                    </div>
                    <div className="form-group">
                        <label>Author</label>
                        <input
                            value={formData.author}
                            onChange={e => setFormData({ ...formData, author: e.target.value })}
                        />
                    </div>
                    <button type="submit" className="submit-btn">Save Log</button>
                </form>
            )}

            <div className="logs-list">
                {loading ? <p>Loading logs...</p> : logs.map(log => (
                    <div key={log.id} className="log-item" style={{ borderLeft: `4px solid ${LOG_CATEGORIES[log.category].color}` }}>
                        <div className="log-header">
                            <span className="log-category" style={{ backgroundColor: LOG_CATEGORIES[log.category].color }}>
                                {LOG_CATEGORIES[log.category].label}
                            </span>
                            <span className="log-date">{log.timestamp.toLocaleString()}</span>
                            <button className="delete-btn" onClick={() => handleDelete(log.id)}>×</button>
                        </div>
                        <h3>{log.title}</h3>
                        <p className="log-desc">{log.description}</p>
                        <div className="log-footer">
                            <span className="log-author">👤 {log.author}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DevLogsAdmin;
