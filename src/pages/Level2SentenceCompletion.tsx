import React, { useState } from 'react';
import { MicrophoneButton } from '../components/MicrophoneButton';
import { simulateAnalysis } from '../utils/mockAI';
import confetti from 'canvas-confetti';

interface LevelProps {
    onNext: () => void;
}

const Level2SentenceCompletion: React.FC<LevelProps> = ({ onNext }) => {
    const [state, setState] = useState<'idle' | 'recording' | 'processing'>('idle');
    const [feedback, setFeedback] = useState<string | null>(null);

    const handleClick = async () => {
        if (state === 'idle') {
            setState('recording');
        } else if (state === 'recording') {
            setState('processing');
            const result = await simulateAnalysis(2, "My favorite food is...");
            if (result.success) {
                confetti({ particleCount: 50, spread: 60 });
                setFeedback(result.message);
                setTimeout(onNext, 2000);
            }
        }
    };

    return (
        <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ padding: '1rem', background: '#FEFCBF', borderRadius: '12px', marginBottom: '2rem', color: '#744210', width: '100%', textAlign: 'center' }}>
                🤖 <strong>AI 考官:</strong> "What's your favorite food?"
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
                "My favorite food is <span style={{ borderBottom: '2px solid #CBD5E0', display: 'inline-block', width: '80px', margin: '0 5px' }}></span><br /> because it is <span style={{ borderBottom: '2px solid #CBD5E0', display: 'inline-block', width: '80px', margin: '0 5px' }}></span>."
            </div>

            <div style={{ color: '#718096', marginBottom: '2rem' }}>
                请填空并完整读出句子
            </div>

            <MicrophoneButton state={state} onClick={handleClick} />

            {feedback && (
                <div style={{ marginTop: '1rem', color: 'var(--color-success)', fontWeight: 'bold' }}>
                    {feedback}
                </div>
            )}
        </div>
    );
};

export default Level2SentenceCompletion;
