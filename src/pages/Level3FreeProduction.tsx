import React, { useState } from 'react';
import { MicrophoneButton } from '../components/MicrophoneButton';
import { simulateAnalysis } from '../utils/mockAI';
import confetti from 'canvas-confetti';

interface LevelProps {
    onNext: () => void;
}

const Level3FreeProduction: React.FC<LevelProps> = ({ onNext }) => {
    const [state, setState] = useState<'idle' | 'recording' | 'processing'>('idle');
    const [feedback, setFeedback] = useState<string | null>(null);

    const handleClick = async () => {
        if (state === 'idle') {
            setState('recording');
        } else if (state === 'recording') {
            setState('processing');
            const result = await simulateAnalysis(3, "I eat it every day...");
            if (result.success) {
                confetti({ particleCount: 150, spread: 100 });
                setFeedback(result.message);
                setTimeout(onNext, 2000);
            }
        }
    };

    return (
        <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ padding: '1rem', background: '#FEFCBF', borderRadius: '12px', marginBottom: '2rem', color: '#744210', width: '100%', textAlign: 'center' }}>
                🤖 <strong>AI 考官:</strong> "How often do you eat it?"
            </div>

            <div style={{
                marginBottom: '2rem',
                fontSize: '1.2rem',
                fontWeight: 'normal',
                textAlign: 'center',
                background: '#EDF2F7',
                padding: '2rem',
                borderRadius: '16px',
                color: '#718096',
                width: '100%',
                minHeight: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                (No text hint here. Speak freely!)
            </div>

            <div style={{ color: '#718096', marginBottom: '2rem' }}>
                尝试回答 1-2 句话
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

export default Level3FreeProduction;
