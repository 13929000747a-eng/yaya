
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    getTopicsBySeason,
    createTopic,
    deleteTopic,
    type QuestionBankTopic
} from '../../services/questionBankService';
import './QuestionBankAdmin.css';

const QuestionBankTopicAdmin: React.FC = () => {
    const { seasonId } = useParams<{ seasonId: string }>();

    const [topics, setTopics] = useState<QuestionBankTopic[]>([]);
    const [loading, setLoading] = useState(true);

    // New Topic Form
    const [newTitle, setNewTitle] = useState('');
    const [newPart, setNewPart] = useState<number>(1);

    const loadData = async () => {
        if (!seasonId) return;
        setLoading(true);
        try {
            const data = await getTopicsBySeason(seasonId);
            setTopics(data);
        } catch (error) {
            console.error(error);
            alert("Failed to load topics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [seasonId]);

    const handleCreate = async () => {
        if (!seasonId || !newTitle.trim()) return;
        try {
            await createTopic({
                seasonId,
                title: newTitle,
                part: newPart as 1 | 2 | 3,
                order: topics.length // Simple append
            });
            setNewTitle('');
            loadData();
        } catch (error) {
            alert("Failed to create topic");
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!window.confirm(`Delete topic "${title}"? This will delete all questions inside it.`)) return;
        try {
            await deleteTopic(id);
            setTopics(prev => prev.filter(t => t.id !== id));
        } catch (e) {
            alert("Failed to delete");
        }
    };

    return (
        <div className="qb-admin-container">
            <Link to="/admin/question-bank" className="back-link">← Back to Seasons</Link>
            <header className="page-header">
                <h1>Manage Topics</h1>
                <span className="badge">Season ID: {seasonId}</span>
            </header>

            {/* Create Topic */}
            <div className="admin-section">
                <h3>Add New Topic</h3>
                <div className="input-row">
                    <input
                        type="text"
                        placeholder="Topic Title (e.g. Hometown)"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                    />
                    <select
                        value={newPart}
                        onChange={e => setNewPart(Number(e.target.value))}
                        style={{ maxWidth: '150px' }}
                    >
                        <option value={1}>Part 1</option>
                        <option value={2}>Part 2</option>
                        <option value={3}>Part 3</option>
                    </select>
                    <button className="primary-btn" onClick={handleCreate}>Add Topic</button>
                </div>
            </div>

            {/* List */}
            <div className="admin-section">
                <h3>Topics List</h3>
                {loading ? <p>Loading...</p> : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Part</th>
                                <th>Title</th>
                                <th>Questions</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topics.map(t => (
                                <tr key={t.id}>
                                    <td>
                                        <span className={`badge p${t.part}`}>Part {t.part}</span>
                                    </td>
                                    <td>{t.title}</td>
                                    <td>
                                        {/* Fallback count or simple link */}
                                        <Link to={`/admin/question-bank/topic/${t.id}`}>View Questions</Link>
                                    </td>
                                    <td>
                                        <button className="btn-sm dest-btn" onClick={() => handleDelete(t.id, t.title)}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default QuestionBankTopicAdmin;
