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
import { ToastProvider } from './components/ToastProvider';
import { Help } from './pages/Help';
import { CalendarPage } from './pages/Calendar';
import { HabitsPage } from './pages/HabitsNew';
import { KanbanPage } from './pages/Kanban';
import { GettingStartedPopup } from './components/GettingStartedPopup';

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
      <ToastProvider>
        <AuthProvider>
          <ThemeProvider>
            <TaskProvider>
              <GettingStartedPopup />
              <RequireAuth>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="timer" element={<PomodoroTimer />} />
                    <Route path="link" element={<LinkDevice />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="help" element={<Help />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route path="habits" element={<HabitsPage />} />
                    <Route path="kanban" element={<KanbanPage />} />
                  </Route>
                </Routes>
              </RequireAuth>
            </TaskProvider>
          </ThemeProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
