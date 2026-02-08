
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getListeningQuestions,
    deleteQuestion,
    updateQuestion,
    type ListeningQuestion
} from '../../services/listeningDecoderService';
import {
    generateAudioForText,
    uploadAudioToStorage
} from '../../services/audioGeneratorService';
import './ListeningAdmin.css';

const ListeningAdmin: React.FC = () => {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<ListeningQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingId, setGeneratingId] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch 50 questions for now
            const data = await getListeningQuestions(50);
            setQuestions(data);
        } catch (error) {
            console.error("Failed to load questions:", error);
            alert("Failed to load questions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this question?")) return;
        try {
            await deleteQuestion(id);
            setQuestions(prev => prev.filter(q => q.id !== id));
        } catch (error) {
            alert("Failed to delete");
        }
    };

    const handleGenerateAudio = async (question: ListeningQuestion) => {
        setGeneratingId(question.id);
        try {
            console.log("Generating audio for:", question.text);
            const audioBuffer = await generateAudioForText(question.text);
            const url = await uploadAudioToStorage(question.id, audioBuffer);

            await updateQuestion(question.id, { audioUrl: url });

            // Update local state
            setQuestions(prev => prev.map(q =>
                q.id === question.id ? { ...q, audioUrl: url } : q
            ));

            alert("Audio generated successfully!");
        } catch (error) {
            console.error("Generation failed:", error);
            alert(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setGeneratingId(null);
        }
    };

    // Simple play helper
    const playAudio = (url: string) => {
        const audio = new Audio(url);
        audio.play();
    };

    return (
        <div className="listening-admin-page">
            <header className="page-header">
                <h1>Listening Decoder Admin</h1>
                <div className="actions">
                    <button className="primary-btn" onClick={() => navigate('/admin/listening/new')}>➕ New Question</button>
                    <button className="secondary-btn" onClick={loadData}>🔄 Refresh</button>
                </div>
            </header>

            <div className="content-area">
                {loading ? (
                    <p>Loading questions...</p>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Text</th>
                                <th>Difficulty</th>
                                <th>Audio</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {questions.map(q => (
                                <tr key={q.id}>
                                    <td title={q.text} style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {q.text}
                                    </td>
                                    <td>
                                        <span className={`badge ${q.difficulty?.toLowerCase().replace(' ', '-')}`}>
                                            {q.difficulty || 'L1'}
                                        </span>
                                    </td>
                                    <td>
                                        {q.audioUrl ? (
                                            <button className="icon-btn" onClick={() => playAudio(q.audioUrl)}>▶️ Play</button>
                                        ) : (
                                            <span className="text-warning">Missing</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="action-group">
                                            <button
                                                className="btn-sm"
                                                onClick={() => navigate(`/admin/listening/${q.id}`)}
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                className="btn-sm"
                                                onClick={() => handleGenerateAudio(q)}
                                                disabled={generatingId === q.id}
                                            >
                                                {generatingId === q.id ? '⏳' : '🔊 Gen Audio'}
                                            </button>
                                            <button className="btn-sm dest-btn" onClick={() => handleDelete(q.id)}>🗑️</button>
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

export default ListeningAdmin;
