
import React, { useState, useEffect } from 'react';
import {
    getSeasons,
    getTopicsBySeason,
    type QuestionBankSeason,
    type QuestionBankTopic
} from '../services/questionBankService';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();

    // State
    const [seasons, setSeasons] = useState<QuestionBankSeason[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
    const [topics, setTopics] = useState<QuestionBankTopic[]>([]);
    const [activePart, setActivePart] = useState<number>(1);
    const [loading, setLoading] = useState(true);

    // Load Seasons on Mount
    useEffect(() => {
        const loadSeasons = async () => {
            try {
                const data = await getSeasons();
                setSeasons(data);

                // Default to active season, or first one
                const active = data.find(s => s.isActive) || data[0];
                if (active) {
                    setSelectedSeasonId(active.id);
                }
            } catch (error) {
                console.error("Failed to load seasons", error);
            }
        };
        loadSeasons();
    }, []);

    // Load Topics when Season Changes
    useEffect(() => {
        const loadTopics = async () => {
            if (!selectedSeasonId) return;
            setLoading(true);
            try {
                const data = await getTopicsBySeason(selectedSeasonId);
                setTopics(data);
            } catch (error) {
                console.error("Failed to load topics", error);
            } finally {
                setLoading(false);
            }
        };
        loadTopics();
    }, [selectedSeasonId]);

    // Filter topics by active part
    const displayedTopics = topics.filter(t => t.part === activePart);
    // .sort((a, b) => (a.order || 0) - (b.order || 0)); // Already sorted by Firestore

    return (
        <div className="dashboard-container">
            {/* Header */}
            <header className="dashboard-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 className="dashboard-title">
                        <span>📚</span> 雅思口语题库
                    </h1>
                    {/* Season Selector */}
                    <select
                        className="season-selector"
                        value={selectedSeasonId}
                        onChange={(e) => setSelectedSeasonId(e.target.value)}
                    >
                        {seasons.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.title} {s.isActive ? '(Current)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <p style={{ color: '#666', marginTop: '-0.5rem' }}>
                    {displayedTopics.length} topics for Part {activePart}
                </p>
            </header>

            {/* Part Tabs */}
            <div className="part-tabs">
                {[1, 2, 3].map(part => (
                    <div
                        key={part}
                        className={`part-tab ${activePart === part ? 'active' : ''}`}
                        onClick={() => setActivePart(part)}
                    >
                        Part {part}
                    </div>
                ))}
            </div>

            {/* Topic List */}
            {loading ? (
                <div className="empty-state">Loading topics...</div>
            ) : displayedTopics.length > 0 ? (
                <div className="topic-list">
                    {displayedTopics.map(topic => (
                        <div
                            key={topic.id}
                            className="topic-card"
                            onClick={() => navigate(`/topic/${topic.id}`)}
                        >
                            <div>
                                <h3 className="topic-title">{topic.title}</h3>
                                <div className="topic-meta">
                                    <span className="status-badge status-new"></span>
                                    <span>New</span>
                                </div>
                            </div>
                            {/* Progress bar placeholder */}
                            <div style={{ marginTop: '1rem', height: '4px', background: '#f0f0f0', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: '0%', height: '100%', background: '#3b82f6' }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    No topics found for Part {activePart} in this season.
                </div>
            )}
        </div>
    );
};

export default Dashboard;
