import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TaskProvider } from './contexts/TaskContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { LinkDevice } from './pages/LinkDevice';
import { PomodoroTimer } from './components/PomodoroTimer';
import { Settings } from './pages/Settings';

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, syncId, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user && !syncId && location.pathname !== '/link') {
      navigate('/link');
    }
  }, [user, syncId, loading, navigate, location]);

  if (loading) return null;

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <TaskProvider>
            <RequireAuth>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="timer" element={<PomodoroTimer />} />
                  <Route path="link" element={<LinkDevice />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Routes>
            </RequireAuth>
          </TaskProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
