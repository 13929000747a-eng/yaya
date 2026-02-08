
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getTopic,
    getQuestionsByTopic,
    type QuestionBankTopic,
    type QuestionBankQuestion
} from '../services/questionBankService';
import './TopicStudio.css';

const TopicStudio: React.FC = () => {
    const { topicId } = useParams<{ topicId: string }>();
    const navigate = useNavigate();

    const [topic, setTopic] = useState<QuestionBankTopic | null>(null);
    const [questions, setQuestions] = useState<QuestionBankQuestion[]>([]);
    const [loading, setLoading] = useState(true);

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            if (!topicId) return;
            setLoading(true);
            try {
                const [topicData, questionsData] = await Promise.all([
                    getTopic(topicId),
                    getQuestionsByTopic(topicId)
                ]);
                setTopic(topicData);
                setQuestions(questionsData);
            } catch (error) {
                console.error("Failed to load topic data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [topicId]);

    if (loading) return <div className="topic-studio-container">Loading...</div>;
    if (!topic) return <div className="topic-studio-container">Topic not found.</div>;

    return (
        <div className="topic-studio-container">
            {/* Nav */}
            <div className="back-nav" onClick={() => navigate('/dashboard')}>
                ← Back to Dashboard
            </div>

            {/* Header */}
            <header className="studio-header">
                <div>
                    <span className="topic-meta-badge">Part {topic.part}</span>
                    {topic.tags?.map(tag => (
                        <span key={tag} className="topic-meta-badge">{tag}</span>
                    ))}
                </div>
                <h1 className="studio-title">{topic.title}</h1>
            </header>

            {/* Part 2: Cue Card Style */}
            {topic.part === 2 && (
                <div className="part2-card">
                    <h3>Describe {topic.title}</h3>
                    <p style={{ color: '#666', marginBottom: '1rem' }}>You should say:</p>
                    <ul>
                        {questions.flatMap(q => q.subQuestions || []).map((sq, idx) => (
                            <li key={idx}>{sq}</li>
                        ))}
                    </ul>

                    {/* Story Builder Placeholder */}
                    <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>💡 Story Builder</h4>
                        <div className="answer-section">
                            <textarea
                                className="answer-textarea"
                                placeholder="Draft your story bullet points here..."
                            />
                            <div className="ai-toolbar">
                                <button className="btn-ai">✨ Generate Story (AI)</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Questions List (Part 1 & 3) */}
            {(topic.part === 1 || topic.part === 3) && (
                <div className="questions-list">
                    {questions.map((q, idx) => (
                        <div key={q.id} className="question-item">
                            <div className="question-text">
                                <span style={{ color: '#999', marginRight: '0.5rem' }}>{idx + 1}.</span>
                                {q.text}
                            </div>

                            {/* Answer Area */}
                            <div className="answer-section">
                                <textarea
                                    className="answer-textarea"
                                    placeholder="Type your answer notes here..."
                                />
                                <div className="ai-toolbar">
                                    <button className="btn-record">🎤</button>
                                    <button className="btn-ai">✨ AI Improve</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Part 2 Questions used as cues, hidden from main list if displayed in card? 
                Actually Part 2 questions are usually just prompts.
                If there are specific follow-up questions for Part 2, they are usually Part 3.
            */}
        </div>
    );
};

export default TopicStudio;
