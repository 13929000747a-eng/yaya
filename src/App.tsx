import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Assessment from './pages/Assessment';
import Report from './pages/Report';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { VerifyEmail } from './pages/VerifyEmail';
import ListeningDecoder from './pages/ListeningDecoder';
import AdminLayout from './layouts/AdminLayout';
import ListeningAdmin from './pages/admin/ListeningAdmin';
import ListeningEditor from './pages/admin/ListeningEditor';
import QuestionBankAdmin from './pages/admin/QuestionBankAdmin';
import QuestionBankTopicAdmin from './pages/admin/QuestionBankTopicAdmin';
import QuestionBankQuestionAdmin from './pages/admin/QuestionBankQuestionAdmin';
import DevLogsAdmin from './pages/admin/DevLogsAdmin';

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

  // Returning users go to Dashboard
  return <Navigate to="/dashboard" replace />;
};

import MainLayout from './components/MainLayout';
import Profile from './pages/Profile';

import Dashboard from './pages/Dashboard';
import TopicStudio from './pages/TopicStudio';
import ImportTool from './pages/admin/ImportTool';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
      <Route path="/register" element={<AuthRedirect><Register /></AuthRedirect>} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Protected Routes with Layout */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/topic/:topicId" element={
        <ProtectedRoute>
          <MainLayout>
            <TopicStudio />
          </MainLayout>
        </ProtectedRoute>
      } />

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

      <Route path="/listening-decoder" element={
        <ProtectedRoute>
          <MainLayout>
            <ListeningDecoder />
          </MainLayout>
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="listening" replace />} />
        <Route path="listening" element={<ListeningAdmin />} />
        <Route path="listening/new" element={<ListeningEditor />} />
        <Route path="listening/:id" element={<ListeningEditor />} />

        {/* Question Bank AdminRoutes */}
        <Route path="question-bank" element={<QuestionBankAdmin />} />
        <Route path="question-bank/:seasonId" element={<QuestionBankTopicAdmin />} />
        <Route path="question-bank/topic/:topicId" element={<QuestionBankQuestionAdmin />} />
        <Route path="question-bank/topic/:topicId" element={<QuestionBankQuestionAdmin />} />
        <Route path="import" element={<ImportTool />} />
        <Route path="dev-logs" element={<DevLogsAdmin />} />
      </Route>
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
