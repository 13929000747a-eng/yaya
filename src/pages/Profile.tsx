import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import '../pages/Auth.css'; // Re-use auth styles for consistency

interface UserProfileData {
    gender: string;
    age: string;
    targetScore: string;
    examDate: string;
    occupation: string;
    hometown?: string;
    major?: string; // If student
    jobTitle?: string; // If worker
    hobbies?: string;
    personalityTags?: string[];
    currentLevel?: string; // Read-only from system
}

const Profile: React.FC = () => {
    const { user } = useAuth();

    // IELTS Profile State
    const [profileData, setProfileData] = useState<UserProfileData>({
        gender: '',
        age: '',
        targetScore: '',
        examDate: '',
        occupation: '',
        hometown: '',
        major: '',
        jobTitle: '',
        hobbies: '',
        personalityTags: []
    });
    const [currentLevel, setCurrentLevel] = useState<string>('未测评');

    // Other State
    const [activationCode, setActivationCode] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [loading, setLoading] = useState(false);

    // Fetch user data on mount
    useEffect(() => {
        const fetchUserData = async () => {
            if (!user?.uid) return;
            try {
                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProfileData({
                        gender: data.gender || '',
                        age: data.age || '',
                        targetScore: data.targetScore || '',
                        examDate: data.examDate || '',
                        occupation: data.occupation || '',
                        hometown: data.hometown || '',
                        major: data.major || '',
                        jobTitle: data.jobTitle || '',
                        hobbies: data.hobbies || '',
                        personalityTags: data.personalityTags || []
                    });
                    // Logic to determine level based on completedAssessment or stored score
                    if (data.level) {
                        setCurrentLevel(data.level);
                    } else if (data.completedAssessment) {
                        setCurrentLevel('已完成 (Level 待定)');
                    }
                }
            } catch (err) {
                console.error("Error fetching user data:", err);
            }
        };
        fetchUserData();
    }, [user]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.uid) return;
        setLoading(true);
        setMessage(null);

        try {
            await setDoc(doc(db, 'users', user.uid), {
                ...profileData,
                updatedAt: serverTimestamp()
            }, { merge: true });
            setMessage({ type: 'success', text: '个人信息已保存' });
        } catch (err) {
            console.error("Error saving profile:", err);
            setMessage({ type: 'error', text: '保存失败，请重试' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        // TODO: Implement password change logic with Firebase
        setMessage({ type: 'success', text: '密码修改功能开发中...' });
    };

    const handleActivateCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        // TODO: Implement activation logic
        setMessage({ type: 'success', text: '激活码兑换功能开发中...' });
    };

    const toggleTag = (tag: string) => {
        setProfileData(prev => {
            const tags = prev.personalityTags || [];
            if (tags.includes(tag)) {
                return { ...prev, personalityTags: tags.filter(t => t !== tag) };
            } else {
                if (tags.length >= 3) return prev; // Max 3 tags
                return { ...prev, personalityTags: [...tags, tag] };
            }
        });
    };

    const PERSONALITY_OPTIONS = [
        "Introvert (内向)", "Extrovert (外向)",
        "Creative (有创意)", "Logical (逻辑强)",
        "Adventurous (爱冒险)", "Calm (沉稳)",
        "Humorous (幽默)", "Ambitious (有野心)"
    ];

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontFamily: 'Fredoka', color: 'var(--color-text)', marginBottom: '2rem' }}>个人设置</h1>

            {message && (
                <div style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    backgroundColor: message.type === 'success' ? '#C6F6D5' : '#FED7D7',
                    color: message.type === 'success' ? '#2F855A' : '#C53030'
                }}>
                    {message.text}
                </div>
            )}

            {/* Profile Card */}
            <div className="auth-card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>👤</span> 个人信息
                </h2>
                <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                    <label>邮箱账号</label>
                    <div style={{ color: '#666', marginTop: '0.2rem' }}>{user?.email}</div>
                </div>

                <form onSubmit={handleSaveProfile}>
                    {/* Fundamental Info */}
                    <h3 style={{ fontSize: '1rem', color: '#888', marginBottom: '1rem', borderLeft: '3px solid var(--color-primary)', paddingLeft: '0.5rem' }}>基础信息 (用于考务)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div className="form-group">
                            <label>性别</label>
                            <select
                                value={profileData.gender}
                                onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                            >
                                <option value="">请选择</option>
                                <option value="male">男</option>
                                <option value="female">女</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>年龄</label>
                            <input
                                type="number"
                                placeholder="例如: 22"
                                value={profileData.age}
                                onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>目标分数</label>
                            <select
                                value={profileData.targetScore}
                                onChange={(e) => setProfileData({ ...profileData, targetScore: e.target.value })}
                            >
                                <option value="">请选择</option>
                                <option value="5.0">5.0</option>
                                <option value="5.5">5.5</option>
                                <option value="6.0">6.0</option>
                                <option value="6.5">6.5 (推荐)</option>
                                <option value="7.0">7.0 +</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>考试时间</label>
                            <input
                                type="date"
                                value={profileData.examDate}
                                onChange={(e) => setProfileData({ ...profileData, examDate: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* AI Personalization Info */}
                    <h3 style={{ fontSize: '1rem', color: '#888', marginBottom: '1rem', borderLeft: '3px solid #9f7aea', paddingLeft: '0.5rem' }}>AI 定制信息 (用于生成高分答案 ✨)</h3>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label>家乡 (Hometown) <span style={{ fontSize: '0.8rem', color: '#999' }}>- 必填</span></label>
                        <input
                            type="text"
                            placeholder="例如: Chengdu, China / Shijiazhuang, Hebei"
                            value={profileData.hometown}
                            onChange={(e) => setProfileData({ ...profileData, hometown: e.target.value })}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label>当前身份</label>
                            <select
                                value={profileData.occupation}
                                onChange={(e) => setProfileData({ ...profileData, occupation: e.target.value })}
                            >
                                <option value="">请选择</option>
                                <option value="student">学生</option>
                                <option value="worker">在职</option>
                            </select>
                        </div>

                        {profileData.occupation === 'student' && (
                            <div className="form-group">
                                <label>专业 (Major)</label>
                                <input
                                    type="text"
                                    placeholder="例如: Computer Science"
                                    value={profileData.major}
                                    onChange={(e) => setProfileData({ ...profileData, major: e.target.value })}
                                />
                            </div>
                        )}

                        {profileData.occupation === 'worker' && (
                            <div className="form-group">
                                <label>职位/行业 (Job Title)</label>
                                <input
                                    type="text"
                                    placeholder="例如: Software Engineer"
                                    value={profileData.jobTitle}
                                    onChange={(e) => setProfileData({ ...profileData, jobTitle: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label>兴趣爱好 (Hobbies)</label>
                        <textarea
                            rows={2}
                            placeholder="例如: Traveling, Photography, Playing Guitar, Hiking..."
                            value={profileData.hobbies}
                            onChange={(e) => setProfileData({ ...profileData, hobbies: e.target.value })}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label>性格关键词 (Personality) <span style={{ fontSize: '0.8rem', color: '#999' }}>- 最多选3个</span></label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {PERSONALITY_OPTIONS.map(tag => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleTag(tag)}
                                    style={{
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '20px',
                                        border: profileData.personalityTags?.includes(tag) ? '1px solid var(--color-primary)' : '1px solid #eee',
                                        background: profileData.personalityTags?.includes(tag) ? '#fff7ed' : '#f9f9f9',
                                        color: profileData.personalityTags?.includes(tag) ? 'var(--color-primary)' : '#666',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="auth-btn auth-btn-primary" disabled={loading} style={{ marginTop: '1.5rem' }}>
                        {loading ? '保存中...' : '保存修改'}
                    </button>
                </form>
            </div>

            {/* Membership Activation */}
            <div className="auth-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--color-primary)' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🔑</span> 会员激活
                </h2>
                <form onSubmit={handleActivateCode}>
                    <div className="form-group">
                        <label>激活码</label>
                        <input
                            type="text"
                            placeholder="请输入您的会员激活码"
                            value={activationCode}
                            onChange={(e) => setActivationCode(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="auth-btn auth-btn-primary" style={{ marginTop: '1rem' }}>
                        立即激活
                    </button>
                </form>
            </div>

            {/* Password Change */}
            <div className="auth-card">
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🔒</span> 修改密码
                </h2>
                <form onSubmit={handleUpdatePassword}>
                    <div className="form-group">
                        <label>当前密码</label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>新密码</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="auth-btn" style={{ marginTop: '1rem', border: '1px solid #ddd', background: '#f9f9f9', color: '#333' }}>
                        更新密码
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Profile;
