import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { addToSyncQueue, getSyncQueue, removeFromSyncQueue } from '../lib/idb';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done';
  tags: string[];
  category?: string;
  dueDate?: string;
  duration?: number;
  syncId: string;
  createdAt: number;
  completedAt?: number;
  lastModified?: number;
  subtasks?: Subtask[];
  dependentTaskId?: string;
  calendarEventId?: string;
  googleTaskId?: string;
  googleTaskListId?: string;
  recurring?: boolean;
  recurrenceRule?: 'daily' | 'weekly' | 'monthly';
  recurrenceEnd?: number;
}

interface TaskContextType {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'syncId' | 'createdAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  isOnline: boolean;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { syncId } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync offline queue when coming back online
  useEffect(() => {
    if (isOnline && syncId) {
      const syncOfflineData = async () => {
        const queue = await getSyncQueue();
        for (const item of queue) {
          try {
            if (item.action === 'ADD' || item.action === 'UPDATE') {
              await setDoc(doc(db, item.collection, item.data.id), item.data, { merge: true });
            } else if (item.action === 'DELETE') {
              await deleteDoc(doc(db, item.collection, item.data.id));
            }
            // Only remove from queue AFTER successful sync
            await removeFromSyncQueue(item.id);
          } catch (e) {
            console.error('Failed to sync item', e);
            // Keep in queue for retry
          }
        }
      };
      syncOfflineData();
    }
  }, [isOnline, syncId]);

  useEffect(() => {
    if (!syncId) {
      setTasks([]);
      return;
    }

    const q = query(collection(db, 'tasks'), where('syncId', '==', syncId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData: Task[] = [];
      snapshot.forEach((doc) => {
        tasksData.push(doc.data() as Task);
      });
      setTasks(tasksData.sort((a, b) => b.createdAt - a.createdAt));
    }, (error) => {
      console.error('Firestore listen error:', error);
    });

    return unsubscribe;
  }, [syncId]);

  const addTask = async (taskData: Omit<Task, 'id' | 'syncId' | 'createdAt' | 'lastModified'>) => {
    if (!syncId) return;
    const now = Date.now();
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      syncId,
      createdAt: now,
      lastModified: now,
    };

    // Optimistic update
    setTasks(prev => [newTask, ...prev]);

    if (isOnline) {
      try {
        await setDoc(doc(db, 'tasks', newTask.id), newTask);
      } catch (e) {
        console.error('Failed to create task', e);
        await addToSyncQueue('ADD', 'tasks', newTask);
      }
    } else {
      await addToSyncQueue('ADD', 'tasks', newTask);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    // Add completedAt and lastModified timestamps
    const now = Date.now();
    const finalUpdates = updates.status === 'done' 
      ? { ...updates, completedAt: now, lastModified: now }
      : { ...updates, lastModified: now };
    
    const currentTask = tasks.find(t => t.id === id);
    const isCompletingRecurring = currentTask?.status !== 'done' && updates.status === 'done' && currentTask?.recurring;
    
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...finalUpdates } : t));
    
    if (isOnline) {
      try {
        await updateDoc(doc(db, 'tasks', id), finalUpdates);
        
        // If completing a recurring task, create the next instance
        if (isCompletingRecurring && currentTask) {
          const nextDueDate = getNextRecurrenceDate(currentTask.dueDate, currentTask.recurrenceRule!);
          if (nextDueDate && (!currentTask.recurrenceEnd || nextDueDate < currentTask.recurrenceEnd)) {
            const nextTask: Task = {
              ...currentTask,
              id: crypto.randomUUID(),
              status: 'todo',
              dueDate: nextDueDate.toISOString(),
              completedAt: undefined,
              createdAt: now,
              lastModified: now,
              parentTaskId: id,
            };
            await setDoc(doc(db, 'tasks', nextTask.id), nextTask);
            setTasks(prev => [nextTask, ...prev]);
          }
        }
      } catch (e) {
        console.error('Failed to update task', e);
        await addToSyncQueue('UPDATE', 'tasks', { id, ...finalUpdates });
      }
    } else {
      await addToSyncQueue('UPDATE', 'tasks', { id, ...finalUpdates });
    }
  };

  const getNextRecurrenceDate = (currentDueDate: string | undefined, rule: 'daily' | 'weekly' | 'monthly'): Date | null => {
    if (!currentDueDate) return null;
    
    const date = new Date(currentDueDate);
    const now = new Date();
    
    switch (rule) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
    }
    
    return date > now ? date : null;
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    
    if (isOnline) {
      try {
        await deleteDoc(doc(db, 'tasks', id));
      } catch (e) {
        console.error('Failed to delete task', e);
        await addToSyncQueue('DELETE', 'tasks', { id });
      }
    } else {
      await addToSyncQueue('DELETE', 'tasks', { id });
    }
  };

  return (
    <TaskContext.Provider value={{ tasks, addTask, updateTask, deleteTask, isOnline }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
