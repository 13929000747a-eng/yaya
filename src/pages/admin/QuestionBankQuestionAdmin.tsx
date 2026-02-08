
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    getQuestionsByTopic,
    createQuestion,
    deleteQuestion,
    type QuestionBankQuestion
} from '../../services/questionBankService';
import './QuestionBankAdmin.css';

const QuestionBankQuestionAdmin: React.FC = () => {
    const { topicId } = useParams<{ topicId: string }>();

    const [questions, setQuestions] = useState<QuestionBankQuestion[]>([]);
    const [loading, setLoading] = useState(true);

    // New Question Form
    const [text, setText] = useState('');
    const [subQuestions, setSubQuestions] = useState(''); // Textarea for bullet points

    const loadData = async () => {
        if (!topicId) return;
        setLoading(true);
        try {
            const data = await getQuestionsByTopic(topicId);
            setQuestions(data);
        } catch (error) {
            console.error(error);
            alert("Failed to load questions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [topicId]);

    const handleCreate = async () => {
        if (!topicId || !text.trim()) return;

        // Parse sub-questions
        const subs = subQuestions
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        try {
            await createQuestion({
                topicId,
                text,
                subQuestions: subs.length > 0 ? subs : undefined,
                order: questions.length
            });
            setText('');
            setSubQuestions('');
            loadData();
        } catch (error) {
            alert("Failed to create question");
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this question?")) return;
        try {
            await deleteQuestion(id);
            setQuestions(prev => prev.filter(q => q.id !== id));
        } catch (e) {
            alert("Failed to delete");
        }
    };

    return (
        <div className="qb-admin-container">
            {/* We need a back link to topic list. Ideally pass seasonId, but for now just go back in history or use a smart link if we fetch topic details */}
            <button onClick={() => window.history.back()} className="back-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>← Back to Topic</button>

            <header className="page-header">
                <h1>Manage Questions</h1>
                <span className="badge">Topic ID: {topicId}</span>
            </header>

            {/* Create Question */}
            <div className="admin-section">
                <h3>Add New Question</h3>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '.5rem', fontWeight: 600 }}>Main Question Text</label>
                    <textarea
                        rows={2}
                        placeholder="e.g. Do you work or are you a student?"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        style={{ width: '100%', padding: '.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '.5rem', fontWeight: 600 }}>
                        Sub-Questions (Part 2 Only) - One per line
                    </label>
                    <textarea
                        rows={4}
                        placeholder="e.g. Who this person is&#10;How often helps others..."
                        value={subQuestions}
                        onChange={e => setSubQuestions(e.target.value)}
                        style={{ width: '100%', padding: '.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                </div>

                <button className="primary-btn" onClick={handleCreate} style={{ marginTop: '1rem' }}>Add Question</button>
            </div>

            {/* List */}
            <div className="admin-section">
                <h3>Questions List</h3>
                {loading ? <p>Loading...</p> : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Q Text</th>
                                <th>Sub-Questions</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {questions.map((q, idx) => (
                                <tr key={q.id}>
                                    <td>
                                        <strong>Q{idx + 1}:</strong> {q.text}
                                    </td>
                                    <td>
                                        {q.subQuestions && (
                                            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '.9rem', color: '#64748b' }}>
                                                {q.subQuestions.map((sq, i) => (
                                                    <li key={i}>{sq}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </td>
                                    <td>
                                        <button className="btn-sm dest-btn" onClick={() => handleDelete(q.id)}>🗑️</button>
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

export default QuestionBankQuestionAdmin;
