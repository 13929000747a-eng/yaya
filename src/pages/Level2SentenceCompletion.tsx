import React, { useState, useRef, useEffect } from 'react';
import { MicrophoneButton } from '../components/MicrophoneButton';
import confetti from 'canvas-confetti';
import { IatService } from '../utils/iatService';
import { AudioRecorder } from '../utils/audioRecorder';
import { DeepSeekService, type EvaluationResult } from '../services/deepSeekService';
import { QuestionService, type Question } from '../services/questionService';
import { AssessmentService } from '../services/assessmentService';
import { useAuth } from '../contexts/AuthContext';

interface LevelProps {
    onNext: () => void;
}

const Level2SentenceCompletion: React.FC<LevelProps> = ({ onNext }) => {
    const { user } = useAuth();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentStep, setCurrentStep] = useState(0); // 0, 1, 2
    const [state, setState] = useState<'idle' | 'recording' | 'processing'>('idle');
    const [transcript, setTranscript] = useState("");
    const [feedbackData, setFeedbackData] = useState<EvaluationResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [volume, setVolume] = useState(0);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Services
    const iatServiceRef = useRef<IatService | null>(null);
    const recorderRef = useRef<AudioRecorder | null>(null);
    const transcriptRef = useRef("");
    const scoresRef = useRef<number[]>([]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                let data = await QuestionService.getLevel2Questions();
                if (data.length < 3) {
                    try {
                        await QuestionService.seedLevel2Data();
                        await new Promise(r => setTimeout(r, 1000));
                        data = await QuestionService.getLevel2Questions();
                    } catch (seedErr) {
                        console.error("Seeding failed", seedErr);
                        setErrorMsg("Seeding failed: " + (seedErr as any).message);
                    }
                }

                if (data.length === 0) {
                    setErrorMsg("No questions found after init. Possible DB connection or permission issue.");
                }
                setQuestions(data);
            } catch (err) {
                console.error("Failed to load questions", err);
                setErrorMsg("Load Error: " + (err as any).message);
            }
            setLoading(false);
        };
        init();
        return () => stopAudioRecorder();
    }, []);

    const currentQuestion = questions[currentStep];

    const startAudioRecorder = async () => {
        try {
            console.log('[L2 DEBUG] Starting recording...');
            setFeedbackData(null);
            setTranscript("");
            transcriptRef.current = "";
            setState('recording');

            iatServiceRef.current = new IatService();
            iatServiceRef.current.connect(
                (text, isLast) => {
                    console.log('[L2 DEBUG] IAT received:', JSON.stringify(text), 'isLast:', isLast);
                    setTranscript(text);
                    transcriptRef.current = text;
                    if (isLast) handleStop();
                },
                (err) => console.error('[L2 DEBUG] IAT Error:', err)
            );

            recorderRef.current = new AudioRecorder();
            await recorderRef.current.start(
                (data) => {
                    if (iatServiceRef.current) {
                        // console.log('[L2 DEBUG] Sending audio chunk, size:', data.byteLength);
                        iatServiceRef.current.sendAudio(data);
                    }
                },
                (rms) => {
                    // Update volume for visual feedback
                    setVolume(rms);
                }
            );
            console.log('[L2 DEBUG] Recording started successfully');

        } catch (e) {
            console.error('[L2 DEBUG] Failed to start recording:', e);
            setState('idle');
        }
    };

    const stopAudioRecorder = () => {
        if (recorderRef.current) {
            recorderRef.current.stop();
            recorderRef.current = null;
        }
        if (iatServiceRef.current) {
            iatServiceRef.current.stop();
        }
    };

    const handleStop = () => {
        console.log('[L2 DEBUG] handleStop called, current state:', state);
        if (state !== 'recording') {
            console.log('[L2 DEBUG] handleStop aborted, not in recording state');
            return;
        }

        setState('processing');
        stopAudioRecorder();

        setTimeout(async () => {
            if (!currentQuestion) return;

            // With WPGS, transcript is real-time. We can evaluate immediately.
            const finalTranscript = transcriptRef.current;
            console.log('[L2 DEBUG] Final Transcript:', finalTranscript);

            // Updated Call Signature
            const result = await DeepSeekService.evaluate(
                'sentence_completion',
                currentQuestion.template || currentQuestion.text,
                finalTranscript,
                currentQuestion.level
            );

            setFeedbackData(result);
            setState('idle');

            const score = result.scores?.Overall || 0;

            // Always record score
            scoresRef.current.push(score);

            // Confetti only for good scores
            if (score >= 6.0) {
                confetti({ particleCount: 50, spread: 60 });
            }

            // Always proceed after delay
            setTimeout(async () => {
                if (currentStep < questions.length - 1) {
                    setCurrentStep(s => s + 1);
                    setTranscript("");
                    setFeedbackData(null);
                } else {
                    // Finish
                    const allScores = scoresRef.current;
                    const avg = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
                    if (user?.uid) await AssessmentService.saveLevel(user.uid, avg);
                    onNext();
                }
            }, 4000);
        }, 2000);
    };

    const getRenderedSentence = () => {
        if (!currentQuestion) return null;
        const parts = (currentQuestion.template || currentQuestion.text).split('______');
        return (
            <>
                {parts.map((part, i) => (
                    <React.Fragment key={i}>
                        {part}
                        {i < parts.length - 1 && (
                            <span style={{
                                borderBottom: '2px solid #CBD5E0',
                                display: 'inline-block',
                                width: '80px',
                                margin: '0 5px'
                            }} />
                        )}
                    </React.Fragment>
                ))}
            </>
        );
    };

    if (loading) return <div>Loading Questions...</div>;
    if (!currentQuestion) return <div>No questions available.</div>;

    return (
        <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem' }}>
                {questions.map((_, i) => (
                    <div key={i} style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: i === currentStep ? 'var(--color-primary)' : i < currentStep ? 'var(--color-success)' : '#E2E8F0',
                        transition: 'all 0.3s'
                    }} />
                ))}
            </div>

            <div style={{ padding: '1rem', background: '#FEFCBF', borderRadius: '12px', marginBottom: '2rem', color: '#744210', width: '100%', textAlign: 'center' }}>
                🤖 <strong>Level 2: {currentQuestion.level}</strong>
            </div>

            <div style={{
                marginBottom: '2rem',
                fontSize: '1.4rem',
                fontWeight: '500',
                textAlign: 'center',
                background: '#FFF',
                padding: '2rem',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-sm)',
                width: '100%',
                lineHeight: '2'
            }}>
                {getRenderedSentence()}
            </div>

            {transcript && (
                <div style={{ marginBottom: '1rem', color: '#718096', fontSize: '0.9rem' }}>
                    Listening: {transcript}
                </div>
            )}

            <MicrophoneButton
                state={state}
                onClick={() => state === 'idle' ? startAudioRecorder() : handleStop()}
                volume={volume}
            />

            {feedbackData && (
                <div style={{ marginTop: '2rem', width: '100%', background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                            Score: {feedbackData.scores.Overall}
                        </div>
                        <div style={{ color: '#718096' }}>
                            {/* Assessment Mode: No Pass Threshold Text */}
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#F0FFF4', borderRadius: '4px', color: '#2F855A' }}>
                        🎯 <strong>Feedback:</strong> {feedbackData.feedback_cn}
                    </div>

                    {feedbackData.improved_sample && (
                        <div style={{ fontSize: '0.9rem', color: '#4A5568' }}>
                            <strong>Try saying:</strong> "{feedbackData.improved_sample}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Level2SentenceCompletion;
