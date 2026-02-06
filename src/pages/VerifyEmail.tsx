import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

export const VerifyEmail: React.FC = () => {
    const { user, resendVerificationEmail, logout, isFirstTime } = useAuth();
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Check if email is verified
    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (user.emailVerified) {
            navigate(isFirstTime ? '/assessment' : '/');
        }

        // Poll for verification status
        const interval = setInterval(async () => {
            await user.reload();
            if (user.emailVerified) {
                navigate(isFirstTime ? '/assessment' : '/');
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [user, navigate, isFirstTime]);

    const handleResend = async () => {
        setLoading(true);
        setMessage(null);
        try {
            await resendVerificationEmail();
            setMessage('验证邮件已发送！请检查您的邮箱');
        } catch (err: any) {
            setMessage('发送失败：' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📧</div>
                    <h1 className="auth-title">验证您的邮箱</h1>
                    <p className="auth-subtitle">
                        我们已向 <strong>{user?.email}</strong> 发送了验证邮件
                    </p>
                </div>

                <div className="verify-instructions">
                    <p>请检查您的邮箱（包括垃圾邮件文件夹），点击验证链接完成注册。</p>
                    <p style={{ color: '#718096', fontSize: '0.9rem', marginTop: '1rem' }}>
                        验证完成后，页面将自动跳转...
                    </p>
                </div>

                {message && (
                    <div className={message.includes('失败') ? 'auth-error' : 'auth-success'}>
                        {message}
                    </div>
                )}

                <button
                    onClick={handleResend}
                    className="auth-btn auth-btn-secondary"
                    disabled={loading}
                >
                    {loading ? '发送中...' : '重新发送验证邮件'}
                </button>

                <button
                    onClick={handleLogout}
                    className="auth-btn auth-btn-text"
                >
                    使用其他账号登录
                </button>
            </div>
        </div>
    );
};
