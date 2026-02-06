import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Assessment from './pages/Assessment';
import Report from './pages/Report';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { VerifyEmail } from './pages/VerifyEmail';

// Redirect component for authenticated users
const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isFirstTime } = useAuth();

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

  // If logged in, redirect away from auth pages
  if (user) {
    if (!user.emailVerified && user.providerData[0]?.providerId === 'password') {
      return <Navigate to="/verify-email" replace />;
    }
    return <Navigate to={isFirstTime ? '/assessment' : '/'} replace />;
  }

  return <>{children}</>;
};

// Home redirect based on user status
const HomeRedirect: React.FC = () => {
  const { user, loading, isFirstTime } = useAuth();

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
    return <Landing />;
  }

  // Check email verification for password users
  if (!user.emailVerified && user.providerData[0]?.providerId === 'password') {
    return <Navigate to="/verify-email" replace />;
  }

  // First time users go to assessment
  if (isFirstTime) {
    return <Navigate to="/assessment" replace />;
  }

  // Returning users see landing (could be dashboard in future)
  return <Landing />;
};

import MainLayout from './components/MainLayout';
import Profile from './pages/Profile';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
      <Route path="/register" element={<AuthRedirect><Register /></AuthRedirect>} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Protected Routes with Layout */}
      <Route path="/assessment" element={
        <ProtectedRoute>
          <MainLayout>
            <Assessment />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute>
          <MainLayout>
            <Profile />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/report" element={
        <ProtectedRoute>
          <MainLayout>
            <Report />
          </MainLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
