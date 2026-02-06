import React from 'react';
import { Mic, Loader } from 'lucide-react';
import './MicrophoneButton.css';

interface MicrophoneButtonProps {
    state: 'idle' | 'recording' | 'processing' | 'disabled';
    onClick: () => void;
    volume?: number; // 0 to 1 (RMS)
}

export const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({ state, onClick, volume = 0 }) => {
    // Map RMS (usually 0-0.3 for speech) to a scale factor (1-1.5)
    const scale = 1 + Math.min(volume * 5, 0.5);

    return (
        <div className="mic-container">
            {state === 'recording' && (
                <div
                    className="volume-ring"
                    style={{ transform: `scale(${1 + volume * 10})` }}
                />
            )}
            <button
                className={`mic-btn mic-btn-${state}`}
                onClick={onClick}
                disabled={state === 'disabled' || state === 'processing'}
                style={{ transform: state === 'recording' ? `scale(${scale})` : 'scale(1)' }}
            >
                {state === 'processing' ? (
                    <Loader className="animate-spin" />
                ) : (
                    <Mic />
                )}
            </button>
            <div className="mic-label">
                {state === 'idle' && "点击开始录音 (Tap to Record)"}
                {state === 'recording' && "点击停止 (Tap to Stop)"}
                {state === 'processing' && "AI 正在分析... (Analyzing...)"}
            </div>
        </div>
    )
}
