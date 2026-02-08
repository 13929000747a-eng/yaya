
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    type QuestionSegment,
    getQuestionById,
    saveQuestion,
    updateQuestion
} from '../../services/listeningDecoderService';
import { analyzeSentence } from '../../services/aiService';
import { generateAudioForText, uploadAudioToStorage } from '../../services/audioGeneratorService';
import './ListeningEditor.css';

const ListeningEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // State
    const [text, setText] = useState('');
    const [difficulty, setDifficulty] = useState<'Level 1' | 'Level 2' | 'Level 3'>('Level 1');
    const [segments, setSegments] = useState<QuestionSegment[]>([]);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);

    // Load existing data if editing
    useEffect(() => {
        if (id) {
            setLoading(true);
            getQuestionById(id).then(q => {
                if (q) {
                    setText(q.text);
                    setDifficulty(q.difficulty);
                    setSegments(q.segments || []);
                }
            }).finally(() => setLoading(false));
        }
    }, [id]);

    const handleAnalyze = async () => {
        if (!text.trim()) return;
        setAnalyzing(true);
        try {
            const result = await analyzeSentence(text);
            if (result.error) {
                alert(`Analysis failed: ${result.error}`);
            } else {
                setSegments(result.segments);
            }
        } catch (error) {
            alert("Analysis failed");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSave = async () => {
        if (!text || segments.length === 0) {
            alert("Please enter text and analyze/segment it first.");
            return;
        }

        setLoading(true);
        try {
            // 1. Generate Audio if needed (or always regenerate on save for cleanliness?)
            // Ideally check if text changed, but for now regenerate is safer to match text
            const audioBuffer = await generateAudioForText(text);
            const tempId = id || `temp_${Date.now()}`;
            const audioUrl = await uploadAudioToStorage(tempId, audioBuffer);

            const questionData = {
                text,
                difficulty,
                segments,
                audioUrl, // Updated URL
                accent: 'American' as const // Default for now
            };

            if (id) {
                await updateQuestion(id, questionData);
            } else {
                await saveQuestion(questionData);
            }

            alert("Saved successfully!");
            navigate('/admin/listening');
        } catch (error) {
            console.error(error);
            alert("Save failed");
        } finally {
            setLoading(false);
        }
    };

    const updateDistractor = (index: number, val: string) => {
        const newSegments = [...segments];
        // We focus on Phonetic distractors as per new plan
        // If empty string, remove it. If present, set array to [val]
        const d = newSegments[index].distractors;
        if (!val.trim()) {
            d.phonetic = [];
        } else {
            d.phonetic = [val.trim()];
        }
        setSegments(newSegments);
    };

    return (
        <div className="editor-container">
            <header className="editor-header">
                <button onClick={() => navigate('/admin/listening')} className="back-btn">← Back</button>
                <h1>{id ? 'Edit Question' : 'New Question'}</h1>
            </header>

            <div className="editor-content">
                <div className="form-group">
                    <label>Sentence (English)</label>
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        rows={3}
                        placeholder="Enter the English sentence here..."
                    />
                </div>

                <div className="form-group">
                    <label>Difficulty</label>
                    <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)}>
                        <option value="Level 1">Level 1 (Basic)</option>
                        <option value="Level 2">Level 2 (Intermediate)</option>
                        <option value="Level 3">Level 3 (Advanced)</option>
                    </select>
                </div>

                {/* AI Action */}
                <div className="ai-actions">
                    <button
                        className="ai-btn"
                        onClick={handleAnalyze}
                        disabled={analyzing || !text}
                    >
                        {analyzing ? '✨ Analyzing...' : '✨ Smart Analyze (DeepSeek)'}
                    </button>
                    <p className="hint">
                        AI will select 1-2 keywords and generate 1 distractor each.
                    </p>
                </div>

                {/* Segments Editor */}
                {segments.length > 0 && (
                    <div className="segments-editor">
                        <h3>Word Segments (Click to Edit)</h3>
                        <div className="segments-list">
                            {segments.map((seg, idx) => (
                                <div
                                    key={idx}
                                    className={`segment-chip ${seg.distractors.phonetic.length > 0 ? 'has-distractor' : ''} ${selectedSegmentIndex === idx ? 'selected' : ''}`}
                                    onClick={() => setSelectedSegmentIndex(idx)}
                                >
                                    <span className="word">{seg.word}</span>
                                    {seg.distractors.phonetic.length > 0 && (
                                        <span className="distractor-badge">{seg.distractors.phonetic[0]}</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Edit Panel for Selected Segment */}
                        {selectedSegmentIndex !== null && (
                            <div className="edit-panel">
                                <h4>Edit Distractor for: <strong>"{segments[selectedSegmentIndex].word}"</strong></h4>
                                <div className="input-group">
                                    <label>Distractor (Phonetic):</label>
                                    <input
                                        type="text"
                                        value={segments[selectedSegmentIndex].distractors.phonetic[0] || ''}
                                        onChange={e => updateDistractor(selectedSegmentIndex, e.target.value)}
                                        placeholder="e.g. walk (for walked)"
                                    />
                                    <small>Leave empty to have no distractor.</small>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="form-actions">
                    <button className="primary-btn save-btn" onClick={handleSave} disabled={loading}>
                        {loading ? 'Saving...' : '💾 Save Question'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ListeningEditor;
