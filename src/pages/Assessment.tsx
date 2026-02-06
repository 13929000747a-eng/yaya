import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Level1ReadAloud from './Level1ReadAloud';
import Level2SentenceCompletion from './Level2SentenceCompletion';
import Level3FreeProduction from './Level3FreeProduction';

const Assessment: React.FC = () => {
    const [level, setLevel] = useState<1 | 2 | 3>(1);
    const navigate = useNavigate();

    const handleNext = (nextLevel: number) => {
        if (nextLevel > 3) {
            navigate('/report');
        } else {
            setLevel(nextLevel as 1 | 2 | 3);
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-secondary)' }}>
            {/* Progress Header removed - now in Sidebar/Layout or internal to Assessment */}
            {/* Moving level indicator inside the content area for now */}
            <div style={{ padding: '1rem', textAlign: 'right', fontSize: '0.8rem', color: '#aaa' }}>
                ASSESSMENT LEVEL {level} / 3
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                    width: '100%',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto'
                }}>
                    {level === 1 && <Level1ReadAloud onNext={() => handleNext(2)} />}
                    {level === 2 && <Level2SentenceCompletion onNext={() => handleNext(3)} />}
                    {level === 3 && <Level3FreeProduction onNext={() => handleNext(4)} />}
                </div>
            </div>
        </div>
    );
};

export default Assessment;
