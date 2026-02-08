
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AdminLayout.css'; // We'll create simple styles

const AdminLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        // Enforce full width for admin panel
        const root = document.getElementById('root');
        if (root) root.classList.add('admin-mode');

        // Simple protection: Redirect guests or non-users
        // In real app, check role == 'admin'
        if (!user) {
            // navigate('/login');
        }

        return () => {
            if (root) root.classList.remove('admin-mode');
        };
    }, [user, navigate]);

    return (
        <div className="admin-container">
            <aside className="admin-sidebar">
                <div className="admin-brand">YaYa Admin</div>
                <nav className="admin-nav">
                    <NavLink to="/admin/listening" className={({ isActive }) => isActive ? 'active' : ''}>
                        🎧 Listening Decoder
                    </NavLink>
                    <NavLink to="/admin/speaking" className={({ isActive }) => isActive ? 'active' : ''}>
                        🗣️ Speaking
                    </NavLink>
                    <NavLink to="/admin/question-bank" className={({ isActive }) => isActive ? 'active' : ''}>
                        📚 Question Bank
                    </NavLink>
                    <div className="divider"></div>
                    <button onClick={logout} className="logout-btn">Logout</button>
                    <button onClick={() => navigate('/')} className="back-home-btn">← Back to App</button>
                </nav>
            </aside>
            <main className="admin-content">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
