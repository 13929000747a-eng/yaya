import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Failed to log out', error);
        }
    };

    const handleNavigate = (path: string) => {
        navigate(path);
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`sidebar-backdrop ${isOpen ? 'open' : ''}`}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <div className={`sidebar-container ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-user-info">
                        <div className="sidebar-avatar">
                            {user?.email?.charAt(0).toUpperCase() || 'Y'}
                        </div>
                        <div className="sidebar-email">{user?.email}</div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <button
                        className={`nav-item ${location.pathname === '/assessment' ? 'active' : ''}`}
                        onClick={() => handleNavigate('/assessment')}
                    >
                        <span className="nav-icon">📝</span>
                        <span className="nav-text">模考测评</span>
                    </button>

                    <button
                        className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}
                        onClick={() => handleNavigate('/profile')}
                    >
                        <span className="nav-icon">👤</span>
                        <span className="nav-text">个人设置</span>
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={handleLogout}>
                        退出登录
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
