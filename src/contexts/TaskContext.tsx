import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { addToSyncQueue, getSyncQueue, removeFromSyncQueue } from '../lib/idb';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done';
  tags: string[];
  dueDate?: string;
  syncId: string;
  createdAt: number;
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
            await removeFromSyncQueue(item.id);
          } catch (e) {
            console.error('Failed to sync item', e);
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
      console.error("Error fetching tasks:", error);
    });

    return unsubscribe;
  }, [syncId]);

  const addTask = async (taskData: Omit<Task, 'id' | 'syncId' | 'createdAt'>) => {
    if (!syncId) return;
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      syncId,
      createdAt: Date.now(),
    };

    // Optimistic update
    setTasks(prev => [newTask, ...prev]);

    if (isOnline) {
      try {
        await setDoc(doc(db, 'tasks', newTask.id), newTask);
      } catch (e) {
        await addToSyncQueue('ADD', 'tasks', newTask);
      }
    } else {
      await addToSyncQueue('ADD', 'tasks', newTask);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    
    if (isOnline) {
      try {
        await updateDoc(doc(db, 'tasks', id), updates);
      } catch (e) {
        await addToSyncQueue('UPDATE', 'tasks', { id, ...updates });
      }
    } else {
      await addToSyncQueue('UPDATE', 'tasks', { id, ...updates });
    }
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    
    if (isOnline) {
      try {
        await deleteDoc(doc(db, 'tasks', id));
      } catch (e) {
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
