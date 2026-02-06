import React, { useState, useRef, useEffect } from 'react';
import { MicrophoneButton } from '../components/MicrophoneButton';
import confetti from 'canvas-confetti';
import { AudioRecorder } from '../utils/audioRecorder';
import { IseService, type IseResult } from '../utils/iseService';

import { QuestionService, type Question } from '../services/questionService';

interface LevelProps {
    onNext: () => void;
}

const Level1ReadAloud: React.FC<LevelProps> = ({ onNext }) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [step, setStep] = useState(0); // 0, 1, 2
    const [state, setState] = useState<'idle' | 'recording' | 'processing'>('idle');
    const [feedback, setFeedback] = useState<string | null>(null);
    const [score, setScore] = useState<number | null>(null);
    const [volume, setVolume] = useState<number>(0);
    const [canProceed, setCanProceed] = useState(false);
    const [loading, setLoading] = useState(true);

    const recorderRef = useRef<AudioRecorder | null>(null);
    const iseServiceRef = useRef<IseService | null>(null);

    const currentSentence = questions[step];

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            let data = await QuestionService.getLevel1Questions();
            if (data.length === 0) {
                console.log("No questions found. Seeding initial data...");
                await QuestionService.seedInitialData();
                data = await QuestionService.getLevel1Questions();
            }
            setQuestions(data);
            setLoading(false);
        };
        loadData();

        return () => {
            if (recorderRef.current) recorderRef.current.stop();
            if (iseServiceRef.current) iseServiceRef.current.close();
        };
    }, []);

    const convertToIELTS = (iseScore: number) => {
        if (iseScore >= 4.6) return "9.0";
        if (iseScore >= 4.2) return "8.0 - 8.5";
        if (iseScore >= 3.8) return "7.0 - 7.5";
        if (iseScore >= 3.0) return "6.0 - 6.5";
        if (iseScore >= 2.0) return "5.0 - 5.5";
        return "Below 5.0";
    };

    const startTimeRef = useRef<number>(0);
    const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const startRecord = async () => {
        try {
            setFeedback(null);
            setScore(null);
            setState('recording');
            startTimeRef.current = Date.now();

            iseServiceRef.current = new IseService();
            iseServiceRef.current.connect(
                currentSentence.text,
                (result: IseResult) => {
                    console.log("ISE Result:", result);
                    handleResult(result);
                    if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
                },
                (error: any) => {
                    console.error("ISE Error:", error);
                    // If error is an object, try to show message, otherwise show string
                    const errorMsg = typeof error === 'string' ? error : (error.message || "Unknown error occurred");
                    setFeedback("Error: " + errorMsg);
                    setState('idle');
                    if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
                }
            );

            recorderRef.current = new AudioRecorder();
            await recorderRef.current.start(
                (data) => {
                    if (iseServiceRef.current) iseServiceRef.current.sendAudio(data);
                },
                (rms) => setVolume(rms)
            );

        } catch (err) {
            console.error("Failed to start recording:", err);
            setState('idle');
            setFeedback("Microphone access failed.");
        }
    };

    const stopRecord = () => {
        if (state !== 'recording') return;

        const duration = Date.now() - startTimeRef.current;
        if (duration < 1000) {
            setFeedback("Recording too short. Please speak longer.");
            setState('idle');
            if (recorderRef.current) recorderRef.current.stop();
            if (iseServiceRef.current) iseServiceRef.current.close(); // Close immediately
            return;
        }

        setState('processing');
        if (recorderRef.current) recorderRef.current.stop();
        if (iseServiceRef.current) iseServiceRef.current.stop();

        // Safety timeout to prevent infinite loading
        processingTimeoutRef.current = setTimeout(() => {
            if (state === 'processing') {
                setState('idle');
                setFeedback("Analysis timed out. Please try again.");
                if (iseServiceRef.current) iseServiceRef.current.close();
            }
        }, 10000); // 10 seconds timeout
    };

    const handleResult = (result: IseResult) => {
        setState('idle');
        setScore(result.score);
        const band = convertToIELTS(result.score);

        // Always encourage, but provide specific feedback
        const isPass = result.score > 2.5;

        // Always allow to proceed regardless of score
        setCanProceed(true);

        if (isPass) {
            setFeedback(`🎉 Sentence ${step + 1} Passed! Band: ${band}`);
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        } else {
            setFeedback(`💪 Good effort! Band: ${band}. Let's try the next one!`);
        }
    };

    const handleNextStep = () => {
        if (step < questions.length - 1) {
            setStep(s => s + 1);
            setFeedback(null);
            setScore(null);
            setCanProceed(false);
        } else {
            onNext(); // All 3 done
        }
    };

    const handleClick = () => {
        if (state === 'idle') startRecord();
        else if (state === 'recording') stopRecord();
    };

    if (loading) {
        return <div style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="animate-spin text-4xl">⏳</div>
            <div style={{ marginLeft: '10px' }}>Loading Assessment...</div>
        </div>;
    }

    if (!currentSentence) return <div>No data available. Please check Firebase config.</div>;

    return (
        <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

            {/* Progress Dots */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem' }}>
                {questions.map((_, i) => (
                    <div key={i} style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: i === step ? 'var(--color-primary)' : i < step ? 'var(--color-success)' : '#E2E8F0',
                        transition: 'all 0.3s'
                    }} />
                ))}
            </div>

            <div style={{
                marginBottom: '1rem',
                fontSize: '1.4rem',
                fontWeight: 'bold',
                textAlign: 'center',
                background: '#FFF',
                padding: '2rem',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-md)',
                width: '100%',
                maxWidth: '400px',
                position: 'relative'
            }}>
                <div style={{
                    position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                    background: '#EDF2F7', padding: '4px 12px', borderRadius: '12px',
                    fontSize: '0.8rem', color: '#718096', fontWeight: 'bold'
                }}>
                    {currentSentence.level}
                </div>
                "{currentSentence.text}"
            </div>

            <div style={{ color: '#718096', marginBottom: '1rem', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>🎯 考察重点: {currentSentence.focus}</div>
                <div style={{ fontSize: '0.9rem' }}>💡 提示: {currentSentence.guide}</div>
            </div>

            {!canProceed ? (
                <MicrophoneButton state={state} onClick={handleClick} volume={volume} />
            ) : (
                <button
                    onClick={handleNextStep}
                    style={{
                        marginTop: '1rem',
                        padding: '12px 24px',
                        borderRadius: '9999px', // pill shape
                        backgroundColor: 'var(--color-primary)', // Assuming --color-primary is defined
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-md)',
                        transition: 'background-color 0.3s ease, transform 0.3s ease',
                        animation: 'bounce 1s infinite' // Placeholder for animate-bounce
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)'} // Darker on hover
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
                >
                    {step < questions.length - 1 ? "Next Challenge ➡️" : "Finish Assessment 🎉"}
                </button>
            )}

            {feedback && (
                <div style={{ marginTop: '1rem', color: score && score > 2.5 ? 'var(--color-success)' : 'var(--color-accent)', fontWeight: 'bold' }}>
                    {feedback}
                </div>
            )}
        </div>
    );
};

export default Level1ReadAloud;
