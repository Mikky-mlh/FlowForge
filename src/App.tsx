import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TaskProvider } from './contexts/TaskContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { LinkDevice } from './pages/LinkDevice';
import { PomodoroTimer } from './components/PomodoroTimer';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TaskProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="timer" element={<PomodoroTimer />} />
              <Route path="link" element={<LinkDevice />} />
            </Route>
          </Routes>
        </TaskProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
