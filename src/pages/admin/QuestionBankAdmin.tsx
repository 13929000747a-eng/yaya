
import React, { useState, useEffect } from 'react';
import {
    getSeasons,
    createSeason,
    setActiveSeason,
    type QuestionBankSeason
} from '../../services/questionBankService';
import { useNavigate } from 'react-router-dom';
import './QuestionBankAdmin.css'; // Will create this later

const QuestionBankAdmin: React.FC = () => {
    const navigate = useNavigate();
    const [seasons, setSeasons] = useState<QuestionBankSeason[]>([]);
    const [newTitle, setNewTitle] = useState('');
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getSeasons();
            setSeasons(data);
        } catch (error) {
            console.error(error);
            alert("Failed to load seasons");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        try {
            await createSeason(newTitle);
            setNewTitle('');
            loadData();
        } catch (error) {
            alert("Failed to create season");
        }
    };

    const handleActivate = async (id: string) => {
        try {
            await setActiveSeason(id);
            loadData();
        } catch (error) {
            alert("Failed to activate season");
        }
    };

    return (
        <div className="qb-admin-container">
            <header className="page-header">
                <h1>Question Bank Management</h1>
            </header>

            {/* Create Season */}
            <div className="admin-section">
                <h3>Create New Season</h3>
                <div className="input-row">
                    <input
                        type="text"
                        placeholder="e.g. Jan-Apr 2026"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                    />
                    <button className="primary-btn" onClick={handleCreate}>Create</button>
                </div>
            </div>

            {/* List Seasons */}
            <div className="admin-section">
                <h3>All Seasons</h3>
                {loading ? <p>Loading...</p> : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {seasons.map(s => (
                                <tr key={s.id} className={s.isActive ? 'active-row' : ''}>
                                    <td>{s.title}</td>
                                    <td>
                                        {s.isActive ? <span className="badge success">Active</span> : <span className="badge">Inactive</span>}
                                    </td>
                                    <td>
                                        <div className="action-group">
                                            {!s.isActive && (
                                                <button className="btn-sm" onClick={() => handleActivate(s.id)}>Set Active</button>
                                            )}
                                            <button className="btn-sm" onClick={() => navigate(`/admin/question-bank/${s.id}`)}>
                                                Manage Topics
                                            </button>
                                        </div>
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

export default QuestionBankAdmin;
