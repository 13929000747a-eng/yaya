import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
    getListeningQuestions,
    recordListeningError,
    seedSampleQuestions,
    type ListeningQuestion
} from '../services/listeningDecoderService';
import {
    processMissingAudio
} from '../services/audioGeneratorService';
import './ListeningDecoder.css';

type GameState = 'loading' | 'ready' | 'playing' | 'selecting' | 'result';
type SpeedFeedback = 'too_fast' | 'good' | 'too_slow';

interface SelectedWord {
    word: string;
    index: number;
}

const ListeningDecoder: React.FC = () => {
    const { user } = useAuth();

    // Question state
    const [questions, setQuestions] = useState<ListeningQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    // Game state
    const [gameState, setGameState] = useState<GameState>('loading');
    const [selectedWords, setSelectedWords] = useState<SelectedWord[]>([]);
    const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [wrongWords, setWrongWords] = useState<Set<number>>(new Set());

    // Audio state
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [isScreenDark, setIsScreenDark] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Word pool (correct words + distractors shuffled)
    const [wordPool, setWordPool] = useState<string[]>([]);

    const currentQuestion = questions[currentIndex];

    // Load questions
    useEffect(() => {
        const loadQuestions = async () => {
            setLoading(true);
            try {
                let data = await getListeningQuestions(10);

                if (data.length === 0) {
                    console.log("No questions found, seeding sample data...");
                    await seedSampleQuestions();
                    data = await getListeningQuestions(10);
                }

                setQuestions(data);
                setGameState('ready');
            } catch (error) {
                console.error("Failed to load questions:", error);
            } finally {
                setLoading(false);
            }
        };

        loadQuestions();
    }, []);

    // Generate word pool when question changes
    useEffect(() => {
        if (!currentQuestion) return;

        const correctWords = currentQuestion.segments.map(s => s.word);
        const allDistractors: string[] = [];

        currentQuestion.segments.forEach(segment => {
            if (segment.distractors) {
                allDistractors.push(
                    ...segment.distractors.phonetic,
                    ...segment.distractors.semantic,
                    ...segment.distractors.grammatical
                );
            }
        });

        // Combine and shuffle
        const pool = [...correctWords, ...allDistractors];
        const shuffled = pool.sort(() => Math.random() - 0.5);
        setWordPool(shuffled);

        // Reset selection state
        setSelectedWords([]);
        setCurrentSlotIndex(0);
        setIsCorrect(null);
        setWrongWords(new Set());
    }, [currentQuestion]);

    // Play audio with screen fade effect
    const playAudio = useCallback(() => {
        if (!currentQuestion) return;

        // If no audio URL, skip directly to selection mode
        if (!currentQuestion.audioUrl) {
            console.log("No audio URL available, skipping to selection mode");
            setGameState('playing');
            setIsScreenDark(true);

            // Brief dark screen then show words
            setTimeout(() => {
                setIsScreenDark(false);
                setGameState('selecting');
            }, 800);
            return;
        }

        setGameState('playing');
        setIsScreenDark(true);

        const audio = new Audio(currentQuestion.audioUrl);
        audio.playbackRate = playbackSpeed;
        audioRef.current = audio;

        audio.onended = () => {
            // Fade in screen after audio ends
            setTimeout(() => {
                setIsScreenDark(false);
                setGameState('selecting');
            }, 300);
        };

        audio.onerror = () => {
            // On error, also go to selection mode
            console.warn("Audio failed, proceeding to selection");
            setTimeout(() => {
                setIsScreenDark(false);
                setGameState('selecting');
            }, 500);
        };

        audio.play().catch(err => {
            console.error("Audio play failed:", err);
            // On error, proceed to selection anyway
            setTimeout(() => {
                setIsScreenDark(false);
                setGameState('selecting');
            }, 500);
        });
    }, [currentQuestion, playbackSpeed]);

    // Handle word selection
    const handleWordSelect = (word: string, poolIndex: number) => {
        if (gameState !== 'selecting' || !currentQuestion) return;

        const correctWord = currentQuestion.segments[currentSlotIndex]?.word;

        if (word.toLowerCase() === correctWord.toLowerCase()) {
            // Correct selection
            setSelectedWords(prev => [...prev, { word, index: poolIndex }]);

            if (currentSlotIndex + 1 >= currentQuestion.segments.length) {
                // All words selected correctly
                setIsCorrect(true);
                setGameState('result');
                confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
            } else {
                setCurrentSlotIndex(prev => prev + 1);
            }
        } else {
            // Wrong selection - record error
            setWrongWords(prev => new Set(prev).add(poolIndex));

            if (user) {
                recordListeningError(user.uid, {
                    correctWord,
                    confusedWith: word,
                    errorType: 'Phonetic', // TODO: Detect actual error type
                    questionId: currentQuestion.id
                }).catch(console.error);
            }
        }
    };

    // Handle speed feedback
    const handleSpeedFeedback = (feedback: SpeedFeedback) => {
        if (feedback === 'too_fast') {
            setPlaybackSpeed(prev => Math.max(0.75, prev * 0.9));
        } else if (feedback === 'too_slow') {
            setPlaybackSpeed(prev => Math.min(1.25, prev * 1.1));
        }

        // Move to next question
        if (currentIndex + 1 < questions.length) {
            setCurrentIndex(prev => prev + 1);
            setGameState('ready');
        } else {
            // All questions done
            setGameState('loading'); // TODO: Show completion screen
        }
    };

    // Retry current question
    const handleRetry = () => {
        setSelectedWords([]);
        setCurrentSlotIndex(0);
        setIsCorrect(null);
        setWrongWords(new Set());
        setGameState('ready');
    };

    if (loading) {
        return (
            <div className="decoder-container">
                <div className="decoder-loading">
                    <div className="loading-spinner">⏳</div>
                    <p>加载题目中...</p>
                </div>
            </div>
        );
    }

    if (!currentQuestion) {
        return (
            <div className="decoder-container">
                <div className="decoder-empty">
                    <p>暂无题目</p>
                </div>
            </div>
        );
    }

    return (
        <div className="decoder-container">
            {/* Dark overlay for immersive listening */}
            <AnimatePresence>
                {isScreenDark && (
                    <motion.div
                        className="decoder-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                    />
                )}
            </AnimatePresence>

            {/* Progress indicator */}
            <div className="decoder-progress">
                <div className="progress-dots">
                    {questions.map((_, i) => (
                        <div
                            key={i}
                            className={`progress-dot ${i === currentIndex ? 'active' : ''} ${i < currentIndex ? 'completed' : ''}`}
                        />
                    ))}
                </div>
                <div className="progress-text">
                    {currentIndex + 1} / {questions.length}
                </div>
            </div>

            {/* Play button area */}
            <div className="decoder-play-area">
                {gameState === 'ready' && (
                    <motion.button
                        className="play-button"
                        onClick={playAudio}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span className="play-icon">🔊</span>
                        <span>播放题目</span>
                    </motion.button>
                )}

                {gameState === 'playing' && (
                    <div className="playing-indicator">
                        <div className="sound-waves">
                            <span></span><span></span><span></span><span></span><span></span>
                        </div>
                        <p>专心听...</p>
                    </div>
                )}
            </div>

            {/* Sentence construction area */}
            <AnimatePresence>
                {(gameState === 'selecting' || gameState === 'result') && (
                    <motion.div
                        className="decoder-slots"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        {currentQuestion.segments.map((segment, i) => (
                            <div
                                key={i}
                                className={`slot ${i < currentSlotIndex ? 'filled' : ''} ${i === currentSlotIndex ? 'active' : ''}`}
                            >
                                {selectedWords[i]?.word || (
                                    <span className="slot-hint">{segment.role}</span>
                                )}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Word pool */}
            <AnimatePresence>
                {gameState === 'selecting' && (
                    <motion.div
                        className="word-pool"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                    >
                        {wordPool.map((word, index) => {
                            const isSelected = selectedWords.some(s => s.index === index);
                            const isWrong = wrongWords.has(index);

                            return (
                                <motion.button
                                    key={`${word}-${index}`}
                                    className={`word-chip ${isSelected ? 'selected' : ''} ${isWrong ? 'wrong' : ''}`}
                                    onClick={() => handleWordSelect(word, index)}
                                    disabled={isSelected}
                                    whileHover={{ scale: isSelected ? 1 : 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.03 }}
                                >
                                    {word}
                                </motion.button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Result area */}
            <AnimatePresence>
                {gameState === 'result' && (
                    <motion.div
                        className="decoder-result"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {isCorrect ? (
                            <>
                                <div className="result-icon success">🎉</div>
                                <p className="result-text">完美！</p>
                            </>
                        ) : (
                            <>
                                <div className="result-icon">💪</div>
                                <p className="result-text">继续加油！</p>
                            </>
                        )}

                        {/* Speed feedback buttons */}
                        <div className="speed-feedback">
                            <p className="feedback-label">语速如何？</p>
                            <div className="feedback-buttons">
                                <button
                                    className="feedback-btn"
                                    onClick={() => handleSpeedFeedback('too_fast')}
                                >
                                    太快了
                                </button>
                                <button
                                    className="feedback-btn primary"
                                    onClick={() => handleSpeedFeedback('good')}
                                >
                                    刚好
                                </button>
                                <button
                                    className="feedback-btn"
                                    onClick={() => handleSpeedFeedback('too_slow')}
                                >
                                    太慢了
                                </button>
                            </div>
                        </div>

                        <button className="retry-btn" onClick={handleRetry}>
                            再听一次
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ListeningDecoder;
