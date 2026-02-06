import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireVerified?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requireVerified = false
}) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'var(--color-bg)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                    <div style={{ color: '#718096' }}>加载中...</div>
                </div>
            </div>
        );
    }

    if (!user) {
        // Not logged in - redirect to login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requireVerified && !user.emailVerified) {
        // Email not verified - redirect to verify page
        return <Navigate to="/verify-email" replace />;
    }

    return <>{children}</>;
};
