import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Timeline from './pages/Timeline';
import Profile from './pages/Profile';
import NotificationsPage from './pages/NotificationsPage';
import TweetDetail from './pages/TweetDetail';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Toaster
          position="bottom-center"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '12px',
              fontFamily: 'var(--font-family, Inter, sans-serif)',
              fontSize: '14px',
              fontWeight: 500,
            },
          }}
        />
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Main Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Timeline />} />
              <Route path="profile" element={<Profile />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="tweet/:id" element={<TweetDetail />} />
            </Route>

            {/* Fallback Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
