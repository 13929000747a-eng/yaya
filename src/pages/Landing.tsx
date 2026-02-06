import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Landing.css';

// Minimalist SVG Duck Components
const MomDuck: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} style={{ overflow: 'visible' }}>
        {/* Body */}
        <path
            d="M20,60 Q20,90 50,90 L70,90 Q90,90 90,65 Q90,40 65,40 L65,30 Q65,5 40,5 Q15,5 15,30 Q15,40 25,45 L20,60"
            className="duck-body"
        />
        {/* Wing */}
        <path
            d="M40,55 Q55,55 60,70 Q45,80 35,70"
            fill="#FBC02D" // Slightly darker yellow
        />
        {/* Beak */}
        <path d="M15,25 L5,28 L15,31" className="duck-beak" strokeWidth="3" strokeLinecap="round" />
        {/* Eye */}
        <circle cx="35" cy="20" r="3" className="duck-eye" />
    </svg>
);

const BabyDuck: React.FC<{ className?: string; delay?: string }> = ({ className, delay }) => (
    <svg
        viewBox="0 0 100 100"
        className={className}
        style={{ overflow: 'visible', animationDelay: delay }}
    >
        {/* Body */}
        <path
            d="M25,65 Q25,85 45,85 L60,85 Q75,85 75,65 Q75,50 60,50 L60,40 Q60,20 40,20 Q20,20 20,40 Q20,50 30,55 L25,65"
            className="duck-body"
        />
        {/* Wing */}
        <path
            d="M40,60 Q50,60 53,70 Q40,75 35,70"
            fill="#FBC02D"
        />
        {/* Beak */}
        <path d="M20,35 L12,37 L20,39" className="duck-beak" />
        {/* Eye */}
        <circle cx="35" cy="32" r="2.5" className="duck-eye" />
    </svg>
);

const Landing: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleStart = () => {
        if (user) {
            navigate('/assessment');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="landing-container">
            <div className="landing-content">
                <h1 className="landing-title">YaYa IELTS</h1>

                <div className="duck-wrapper">
                    {/* Baby Ducks */}
                    <BabyDuck className="baby-duck" delay="0s" />
                    <BabyDuck className="baby-duck" delay="0.1s" />
                    <BabyDuck className="baby-duck" delay="0.2s" />

                    {/* Mom Duck Leading */}
                    <MomDuck className="mom-duck" />
                </div>

                <button className="start-btn" onClick={handleStart}>
                    Start Learning
                </button>
            </div>
        </div>
    );
};

export default Landing;
