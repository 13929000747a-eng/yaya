import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { user } = useAuth();

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            {/* Top Navigation Bar */}
            <header style={{
                height: '64px',
                padding: '0 1.5rem',
                background: 'white',
                borderBottom: '1px solid #eee',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                position: 'sticky',
                top: 0,
                zIndex: 900
            }}>
                {/* Left: User Avatar (Menu Trigger) */}
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        outline: 'none'
                    }}
                >
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        fontFamily: 'Fredoka',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}>
                        {user?.email?.charAt(0).toUpperCase() || 'Y'}
                    </div>
                </button>

                {/* Brand Text */}
                <div style={{
                    fontFamily: 'Fredoka, sans-serif',
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    color: 'var(--color-text)',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    YaYa IELTS
                </div>
            </header>

            {/* Sidebar Component */}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Main Content Area */}
            <main style={{ flex: 1, position: 'relative', overflowY: 'auto' }}>
                {children}
            </main>
        </div>
    );
};

export default MainLayout;
