import React, { useState, useEffect, useRef } from 'react';
import { MicrophoneButton } from '../components/MicrophoneButton';
import confetti from 'canvas-confetti';
import { BrowserSpeechService } from '../utils/browserSpeechService';
import { DeepSeekService } from '../services/deepSeekService';
import { QuestionService, type Question } from '../services/questionService';
import { AssessmentService } from '../services/assessmentService';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight } from 'lucide-react';

interface LevelProps {
    onNext: () => void;
}

type Stage = 'loading' | 'part2_prep' | 'part2_recording' | 'part2_review' | 'part3_intro' | 'part3_recording' | 'part3_review' | 'processing' | 'completed';

const Level3FreeProduction: React.FC<LevelProps> = ({ onNext }) => {
    const { user } = useAuth();
    const [stage, setStage] = useState<Stage>('loading');

    // Data
    const [part2Question, setPart2Question] = useState<Question | null>(null);
    const [part3Questions, setPart3Questions] = useState<Question[]>([]);
    const [currentPart3Index, setCurrentPart3Index] = useState(0);

    // State
    const [timeLeft, setTimeLeft] = useState(60); // Prep time or recording limit
    const [transcript, setTranscript] = useState("");
    const [micState, setMicState] = useState<'idle' | 'recording' | 'processing'>('idle');
    const [feedback, setFeedback] = useState<any>(null); // For intermediate feedback

    // Refs
    // const recorderRef = useRef<AudioRecorder | null>(null); // REMOVED
    const speechServiceRef = useRef<BrowserSpeechService | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const transcriptRef = useRef("");

    useEffect(() => {
        loadQuestions();
        speechServiceRef.current = new BrowserSpeechService();
        return () => {
            stopTimer();
            if (speechServiceRef.current) speechServiceRef.current.stop();
        };
    }, []);

    // Timer Logic
    useEffect(() => {
        if (stage === 'part2_prep') {
            setTimeLeft(60);
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        startPart2Recording();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (stage === 'part2_recording') {
            stopTimer(); // Clear prep timer
            setTimeLeft(120); // 2 mins for Part 2
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        stopPart2Recording(); // Auto stop
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            stopTimer();
        }
        return () => stopTimer();
    }, [stage]);

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const loadQuestions = async () => {
        const data = await QuestionService.getLevel3Questions();
        setPart2Question(data.part2);
        setPart3Questions(data.part3);
        setStage('part2_prep');
    };

    const startRecording = async () => {
        try {
            setTranscript("");
            transcriptRef.current = "";
            setMicState('recording');

            if (speechServiceRef.current) {
                speechServiceRef.current.start(
                    (text) => {
                        setTranscript(text);
                        transcriptRef.current = text;
                    },
                    (err) => console.error("Speech Error:", err)
                );
            }
        } catch (e) {
            console.error("Mic Error:", e);
            setMicState('idle');
        }
    };

    // --- Part 2 Logic ---
    const startPart2Recording = () => {
        stopTimer();
        setStage('part2_recording');
        startRecording();
    };

    const stopPart2Recording = async () => {
        if (speechServiceRef.current) speechServiceRef.current.stop();
        setMicState('processing');
        setStage('processing');

        // Evaluate Part 2
        const result = await DeepSeekService.evaluate(
            'part2',
            part2Question?.topic || "Topic",
            transcriptRef.current,
            'Hard'
        );

        console.log("Part 2 Result:", result);
        setFeedback(result);
        setStage('part2_review'); // New Review Stage
        setMicState('idle');
    };

    const finishPart2Review = () => {
        setFeedback(null);
        setTranscript("");
        setStage('part3_intro');
    };

    // --- Part 3 Logic ---
    const startPart3 = () => {
        setStage('part3_recording');
        startRecording();
    };

    const nextPart3 = async () => {
        if (speechServiceRef.current) speechServiceRef.current.stop();
        setMicState('processing');
        setStage('processing');

        const currentQ = part3Questions[currentPart3Index];
        const result = await DeepSeekService.evaluate(
            'part3',
            currentQ.text,
            transcriptRef.current,
            'Hard'
        );
        console.log("Part 3 Q1 Result:", result);
        setFeedback(result);
        setStage('part3_review'); // New Review Stage
        setMicState('idle');
    };

    const finishPart3Review = () => {
        setFeedback(null);
        setTranscript("");

        if (currentPart3Index < part3Questions.length - 1) {
            setCurrentPart3Index(prev => prev + 1);
            setStage('part3_intro'); // Go to next intro
        } else {
            finishAssessment();
        }
    };

    const finishAssessment = async () => {
        setStage('completed');
        confetti({ particleCount: 200, spread: 120 });
        if (user?.uid) {
            await AssessmentService.saveLevel(user.uid, 6.0); // Mock final score for now
        }
        // No auto navigate from here? Or allow user to click 'Return Home'
        setTimeout(onNext, 4000);
    };

    // --- Render Helpers ---

    if (stage === 'loading') return <div>Loading Assessment...</div>;

    if (stage === 'part2_prep') {
        return (
            <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem', color: '#E53E3E', fontWeight: 'bold' }}>
                    ⏱️ Preparation Time: {timeLeft}s
                </div>

                <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: 'var(--shadow-lg)', border: '2px solid var(--color-primary)' }}>
                    <h3 style={{ color: '#744210', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                        📝 IELTS Part 2: Topic Card
                    </h3>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                        {part2Question?.text}
                    </div>
                    <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: '#4A5568', lineHeight: '1.8' }}>
                        {part2Question?.bullets?.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <div style={{ fontSize: '0.9rem', color: '#718096', marginBottom: '0.5rem' }}>💡 <strong>Safety Net (Useful Phrases):</strong></div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {["I'm going to talk about...", "This experience took place...", "Initially...", "Eventually...", "Looking back..."].map(p => (
                            <span key={p} style={{ background: '#EBF8FF', color: '#2B6CB0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{p}</span>
                        ))}
                    </div>
                </div>

                <button
                    onClick={startPart2Recording}
                    style={{ marginTop: '2rem', width: '100%', padding: '1rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    Start Speaking Now ➡️
                </button>
            </div>
        );
    }

    if (stage === 'part2_recording') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div style={{ fontSize: '2rem', marginBottom: '2rem', fontWeight: 'bold' }}>
                    🗣️ Speaking... {timeLeft}s
                </div>
                <div style={{ color: '#718096', marginBottom: '2rem' }}>
                    Topic: {part2Question?.topic}
                </div>
                <MicrophoneButton state="recording" onClick={stopPart2Recording} />
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#CBD5E0' }}>⚡ Native Speed Engine</div>
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#A0AEC0' }}>
                    Click mic to finish early
                </div>
                <div style={{ marginTop: '2rem', padding: '1rem', background: '#F7FAFC', borderRadius: '8px', width: '80%', minHeight: '60px' }}>
                    {transcript}
                </div>
            </div>
        );
    }

    // Part 2 Review Screen
    if (stage === 'part2_review') {
        return (
            <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                <h2 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>📊 Part 2 Feedback</h2>

                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-md)', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Overall Score: {feedback?.scores?.Overall}</div>
                    </div>
                    <div style={{ background: '#F0FFF4', padding: '1rem', borderRadius: '8px', color: '#276749' }}>
                        {feedback?.feedback_cn}
                    </div>
                </div>

                <button
                    onClick={finishPart2Review}
                    style={{ width: '100%', padding: '1rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    Continue to Part 3 <ArrowRight />
                </button>
            </div>
        )
    }

    if (stage === 'part3_intro' || stage === 'part3_recording') {
        const currentQ = part3Questions[currentPart3Index];
        return (
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ padding: '0.5rem 1rem', background: '#9F7AEA', color: 'white', borderRadius: '20px', marginBottom: '2rem', fontSize: '0.9rem' }}>
                    Part 3: Discussion ({currentPart3Index + 1}/{part3Questions.length})
                </div>

                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '3rem' }}>
                    "{currentQ?.text}"
                </div>

                {stage === 'part3_intro' ? (
                    <button
                        onClick={startPart3}
                        style={{ padding: '1rem 3rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '99px', fontSize: '1.2rem', cursor: 'pointer' }}
                    >
                        Start Answer 🎙️
                    </button>
                ) : (
                    <>
                        <MicrophoneButton state="recording" onClick={nextPart3} />
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#CBD5E0' }}>⚡ Native Speed Engine</div>
                        <div style={{ marginTop: '2rem', padding: '1rem', background: '#F7FAFC', borderRadius: '8px', width: '80%', minHeight: '60px' }}>
                            {transcript}
                        </div>
                    </>
                )}
            </div>
        );
    }

    // Part 3 Review Screen
    if (stage === 'part3_review') {
        return (
            <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                <h2 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>📊 Part 3 Feedback</h2>

                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-md)', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Overall Score: {feedback?.scores?.Overall}</div>
                    </div>
                    <div style={{ background: '#F0FFF4', padding: '1rem', borderRadius: '8px', color: '#276749' }}>
                        {feedback?.feedback_cn}
                    </div>
                    <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#718096' }}>
                        Logic Tip: {feedback?.logic_correction || "Keep points relevant."}
                    </div>
                </div>

                <button
                    onClick={finishPart3Review}
                    style={{ width: '100%', padding: '1rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    Next Question <ArrowRight />
                </button>
            </div>
        )
    }

    if (stage === 'completed') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-success)' }}>
                    Assessment Completed!
                </div>
                <div style={{ color: '#718096', marginTop: '1rem' }}>
                    Generating your comprehensive report...
                </div>
            </div>
        );
    }

    // Processing state
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div className="animate-spin" style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <div>Analyzing your response...</div>
        </div>
    );
};

export default Level3FreeProduction;
