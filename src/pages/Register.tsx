import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

export const Register: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const { register, loginWithGoogle, isFirstTime } = useAuth();
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }

        if (password.length < 6) {
            setError('密码至少需要 6 位');
            return;
        }

        setLoading(true);

        try {
            await register(email, password);
            // Redirect to verify email page
            navigate('/verify-email');
        } catch (err: any) {
            console.error('Register error:', err);
            if (err.code === 'auth/email-already-in-use') {
                setError('该邮箱已被注册');
            } else if (err.code === 'auth/invalid-email') {
                setError('邮箱格式无效');
            } else if (err.code === 'auth/weak-password') {
                setError('密码强度不够');
            } else {
                setError('注册失败：' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setLoading(true);

        try {
            await loginWithGoogle();
            navigate(isFirstTime ? '/assessment' : '/');
        } catch (err: any) {
            console.error('Google login error:', err);
            setError('Google 登录失败：' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1 className="auth-title">创建账号</h1>
                    <p className="auth-subtitle">开始您的雅思口语之旅</p>
                </div>

                <form onSubmit={handleRegister} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">邮箱</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">密码</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="至少 6 位"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">确认密码</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="再次输入密码"
                            required
                            disabled={loading}
                        />
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
                        {loading ? '注册中...' : '注册'}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>或</span>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="auth-btn auth-btn-google"
                    disabled={loading}
                >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                        <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05" />
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                    </svg>
                    使用 Google 登录
                </button>

                <p className="auth-footer">
                    已有账号？<Link to="/login">立即登录</Link>
                </p>
            </div>
        </div>
    );
};
