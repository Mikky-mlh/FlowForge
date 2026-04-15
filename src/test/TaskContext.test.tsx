import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { TaskProvider, useTasks } from '../contexts/TaskContext';
import { AuthProvider } from '../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock Firebase
const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockOnSnapshot = vi.fn((query, onSuccess) => {
  onSuccess({ 
    forEach: (cb: any) => cb({ data: () => ({ id: 'task-1', title: 'Test Task', status: 'todo', priority: 'medium', tags: [], syncId: 'TEST-123', createdAt: Date.now() }) }) 
  });
  return () => {};
});

vi.mock('../firebase', () => ({
  db: {
    collection: () => ({
      where: () => ({ onSnapshot: mockOnSnapshot }),
    }),
  },
  doc: (db: any, col: string, id: string) => ({ col, id }),
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
}));

// Mock IndexedDB
const mockAddToSyncQueue = vi.fn().mockResolvedValue(undefined);
const mockGetSyncQueue = vi.fn().mockResolvedValue([]);
const mockRemoveFromSyncQueue = vi.fn().mockResolvedValue(undefined);

vi.mock('../lib/idb', () => ({
  addToSyncQueue: mockAddToSyncQueue,
  getSyncQueue: mockGetSyncQueue,
  removeFromSyncQueue: mockRemoveFromSyncQueue,
}));

// Mock navigator.onLine
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true },
  writable: true,
});

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TaskProvider>
          {children}
        </TaskProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('TaskContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetSyncQueue.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('addTask', () => {
    it('should add a task to the list', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.tasks).toBeDefined();
      });

      await act(async () => {
        await result.current.addTask({
          title: 'New Task',
          priority: 'high',
          status: 'todo',
          tags: ['test'],
        });
      });

      // Task should be added to local state (optimistic update)
      expect(result.current.tasks.length).toBeGreaterThan(0);
    });

    it('should call setDoc when online', async () => {
      Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, writable: true });
      
      const { result } = renderHook(() => useTasks(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.tasks).toBeDefined();
      });

      await act(async () => {
        await result.current.addTask({
          title: 'Online Task',
          priority: 'medium',
          status: 'todo',
          tags: [],
        });
      });

      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('should queue to sync queue when offline', async () => {
      Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, writable: true });
      
      const { result } = renderHook(() => useTasks(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.tasks).toBeDefined();
      });

      await act(async () => {
        await result.current.addTask({
          title: 'Offline Task',
          priority: 'low',
          status: 'todo',
          tags: [],
        });
      });

      expect(mockAddToSyncQueue).toHaveBeenCalledWith('ADD', 'tasks', expect.objectContaining({
        title: 'Offline Task',
      }));
    });
  });

  describe('updateTask', () => {
    it('should update task locally (optimistic)', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.tasks).toBeDefined();
      });

      // First add a task
      await act(async () => {
        await result.current.addTask({
          title: 'Task to Update',
          priority: 'medium',
          status: 'todo',
          tags: [],
        });
      });

      const taskId = result.current.tasks[0]?.id;

      // Now update it
      await act(async () => {
        await result.current.updateTask(taskId, { title: 'Updated Title' });
      });

      const updatedTask = result.current.tasks.find(t => t.id === taskId);
      expect(updatedTask?.title).toBe('Updated Title');
    });

    it('should set completedAt when status changes to done', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.tasks).toBeDefined();
      });

      await act(async () => {
        await result.current.addTask({
          title: 'Complete Me',
          priority: 'medium',
          status: 'todo',
          tags: [],
        });
      });

      const taskId = result.current.tasks[0]?.id;

      await act(async () => {
        await result.current.updateTask(taskId, { status: 'done' });
      });

      const updatedTask = result.current.tasks.find(t => t.id === taskId);
      expect(updatedTask?.status).toBe('done');
      expect(updatedTask?.completedAt).toBeDefined();
    });

    it('should call updateDoc when online', async () => {
      Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, writable: true });
      
      const { result } = renderHook(() => useTasks(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.tasks).toBeDefined();
      });

      await act(async () => {
        await result.current.addTask({
          title: 'Task to Update',
          priority: 'medium',
          status: 'todo',
          tags: [],
        });
      });

      const taskId = result.current.tasks[0]?.id;

      await act(async () => {
        await result.current.updateTask(taskId, { priority: 'high' });
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
    });
  });

  describe('deleteTask', () => {
    it('should remove task locally', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.tasks).toBeDefined();
      });

      await act(async () => {
        await result.current.addTask({
          title: 'Task to Delete',
          priority: 'medium',
          status: 'todo',
          tags: [],
        });
      });

      const taskId = result.current.tasks[0]?.id;
      const initialCount = result.current.tasks.length;

      await act(async () => {
        await result.current.deleteTask(taskId);
      });

      expect(result.current.tasks.length).toBeLessThan(initialCount);
    });

    it('should call deleteDoc when online', async () => {
      Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, writable: true });
      
      const { result } = renderHook(() => useTasks(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.tasks).toBeDefined();
      });

      await act(async () => {
        await result.current.addTask({
          title: 'Task to Delete',
          priority: 'medium',
          status: 'todo',
          tags: [],
        });
      });

      const taskId = result.current.tasks[0]?.id;

      await act(async () => {
        await result.current.deleteTask(taskId);
      });

      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });

  describe('isOnline', () => {
    it('should return true when online', () => {
      Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, writable: true });
      
      const { result } = renderHook(() => useTasks(), { wrapper: TestWrapper });
      
      expect(result.current.isOnline).toBe(true);
    });

    it('should return false when offline', () => {
      Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, writable: true });
      
      const { result } = renderHook(() => useTasks(), { wrapper: TestWrapper });
      
      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('offline sync', () => {
    it('should process sync queue when coming online', async () => {
      // Add items to queue
      mockGetSyncQueue.mockResolvedValueOnce([
        { id: 'queue-1', action: 'ADD', collection: 'tasks', data: { id: 'task-1', title: 'Queued Task' }, timestamp: Date.now() }
      ]);

      Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, writable: true });
      
      const { result } = renderHook(() => useTasks(), { wrapper: TestWrapper });
      
      // Wait for initial load
      await waitFor(() => {
        expect(result.current.tasks).toBeDefined();
      });

      // Wait for sync effect
      await waitFor(() => {
        // Queue should be processed
      }, { timeout: 1000 });

      expect(mockSetDoc).toHaveBeenCalled();
    });
  });
});