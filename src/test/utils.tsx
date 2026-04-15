import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { TaskProvider } from '../contexts/TaskContext';
import { ThemeProvider } from '../contexts/ThemeContext';

interface WrapperProps {
  children: React.ReactNode;
}

function Wrapper({ children }: WrapperProps) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <TaskProvider>
            {children}
          </TaskProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';
export { customRender as render };

// Helper to create mock tasks
export const createMockTask = (overrides = {}) => ({
  id: 'test-task-' + Math.random().toString(36).substr(2, 9),
  title: 'Test Task',
  description: 'Test description',
  priority: 'medium' as const,
  status: 'todo' as const,
  tags: [],
  syncId: 'TEST-SYNC-123',
  createdAt: Date.now(),
  ...overrides,
});

// Helper to create mock user
export const createMockUser = (overrides = {}) => ({
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  ...overrides,
});