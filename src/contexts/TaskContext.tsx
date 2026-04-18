import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc, limit, orderBy, startAfter } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { addToSyncQueue, getSyncQueue, removeFromSyncQueue } from '../lib/idb';
import { Attachment } from '../lib/storage';
import { scheduleTaskNotification, scheduleRoutineNotification, cancelNotification, restoreNotifications } from '../lib/notificationScheduler';
import { recordCompletion } from '../lib/habitTracking';

// Helper function to sync task updates to Google Tasks
const syncTaskToGoogleTasks = async (task: TodoTask) => {
  try {
    const token = localStorage.getItem('flowforge_google_token');
    if (!token) {
      console.log('No Google token available for sync');
      return;
    }
    if (!task.googleTaskId || !task.googleTaskListId) {
      console.log('Task has no googleTaskId, skipping sync');
      return;
    }
    
    const gTask = {
      title: task.title,
      notes: task.description || '',
      status: task.status === 'done' ? 'completed' : 'needsAction',
      due: task.dueDate || undefined,
    };
    
    console.log('Syncing task to Google Tasks:', task.title, 'Status:', task.status);
    
    const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${task.googleTaskListId}/tasks/${task.googleTaskId}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(gTask)
    });
    
    if (response.ok) {
      console.log('Successfully synced task to Google Tasks');
    } else {
      const errorText = await response.text();
      console.error('Failed to sync to Google Tasks:', response.status, errorText);
    }
  } catch (error) {
    console.error('Failed to sync task to Google Tasks:', error);
  }
};

// Helper function to delete from Google Tasks
const deleteFromGoogleTasks = async (googleTaskId: string, googleTaskListId: string) => {
  try {
    const token = localStorage.getItem('flowforge_google_token');
    if (!token) return;
    
    await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${googleTaskListId}/tasks/${googleTaskId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (error) {
    console.error('Failed to delete from Google Tasks:', error);
  }
};

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface BaseItem {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done';
  tags: string[];
  category?: string;
  syncId: string;
  createdAt: number;
  completedAt?: number;
  lastModified?: number;
  subtasks?: Subtask[];
  notificationsEnabled?: boolean;
  attachments?: Attachment[];
}

interface TodoTask extends BaseItem {
  type: 'task';
  dueDate?: string;
  duration?: number;
  recurring?: boolean;
  recurrenceRule?: 'weekly' | 'monthly' | 'custom';
  customRecurrenceDays?: number[];
  recurrenceEnd?: number;
  parentTaskId?: string;
  dependentTaskId?: string;
  calendarEventId?: string;
  googleTaskId?: string;
  googleTaskListId?: string;
}

interface Routine extends BaseItem {
  type: 'routine';
  scheduleTime: string; // HH:mm format
  routineType: 'all' | 'working' | 'nonworking';
}

export type Task = TodoTask | Routine;

// Type guards
export const isRoutine = (task: Task): task is Routine => task.type === 'routine';
export const isTodoTask = (task: Task): task is TodoTask => task.type === 'task';

interface TaskContextType {
  tasks: Task[];
  hasMore: boolean;
  loadMore: () => Promise<void>;
  isLoadingMore: boolean;
  addTask: (task: Omit<Task, 'id' | 'syncId' | 'createdAt' | 'lastModified'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  isOnline: boolean;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const PAGE_SIZE = 50;

/*
 * FIRESTORE INDEXES REQUIRED
 * 
 * The following composite indexes need to be created in Firebase Console
 * for optimal query performance at scale:
 * 
 * 1. tasks collection:
 *    - Fields: syncId (asc), createdAt (desc) - [AUTO-CREATED for main query]
 *    - Fields: syncId (asc), status (asc), createdAt (desc) - [for status filtering + pagination]
 *    - Fields: syncId (asc), category (asc), createdAt (desc) - [for category filtering + pagination]
 * 
 * To create indexes, go to:
 * Firebase Console -> Firestore -> Indexes -> Composite Indexes
 */

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastTask, setLastTask] = useState<Task | null>(null);
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
            // Remove immediately after successful sync
            await removeFromSyncQueue(item.id);
          } catch (e) {
            console.error('Failed to sync item', item.id, e);
            // Leave in queue for retry
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
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      // Only update state from confirmed server data, not local pending writes
      // This prevents the flash where optimistic state gets overwritten
      if (snapshot.metadata.hasPendingWrites) return;
      
      const tasksData: Task[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        // Migration: add type field if missing
        if (!data.type) {
          data.type = data.isRoutine ? 'routine' : 'task';
          // Migrate scheduleTime for routines
          if (data.type === 'routine' && data.dueDate && !data.scheduleTime) {
            const date = new Date(data.dueDate);
            data.scheduleTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          }
        }
        tasksData.push(data as Task);
      });
      const sortedTasks = tasksData.sort((a, b) => b.createdAt - a.createdAt);
      setTasks(sortedTasks);
      
      // Restore notifications after tasks are loaded
      restoreNotifications(sortedTasks);
    }, (error) => {
      console.error('Firestore listen error:', error);
    });

    return unsubscribe;
  }, [syncId]);

  const addTask = async (taskData: Omit<Task, 'id' | 'syncId' | 'createdAt' | 'lastModified'>) => {
    if (!syncId) return;
    const now = Date.now();
    
    // Create base task with common fields
    let cleanTask: any = {
      ...taskData,
      id: crypto.randomUUID(),
      syncId,
      createdAt: now,
      lastModified: now,
    };

    // Strip out invalid fields based on type
    if (taskData.type === 'routine') {
      // Remove task-specific fields from routines
      delete cleanTask.dueDate;
      delete cleanTask.duration;
      delete cleanTask.recurring;
      delete cleanTask.recurrenceRule;
      delete cleanTask.customRecurrenceDays;
      delete cleanTask.recurrenceEnd;
      delete cleanTask.parentTaskId;
      delete cleanTask.dependentTaskId;
      delete cleanTask.calendarEventId;
      delete cleanTask.googleTaskId;
      delete cleanTask.googleTaskListId;
    } else if (taskData.type === 'task') {
      // Remove routine-specific fields from tasks
      delete cleanTask.scheduleTime;
      delete cleanTask.routineType;
    }

    const newTask = cleanTask as Task;

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
    
    // Schedule notification for new task
    if (isRoutine(newTask)) {
      scheduleRoutineNotification(newTask);
    } else if (isTodoTask(newTask)) {
      scheduleTaskNotification(newTask);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    // Add completedAt and lastModified timestamps
    const now = Date.now();
    let finalUpdates: any = updates.status === 'done' 
      ? { ...updates, completedAt: now, lastModified: now }
      : { ...updates, lastModified: now };
    
    const currentTask = tasks.find(t => t.id === id);
    
    // Strip out invalid fields based on current task type
    if (currentTask) {
      if (currentTask.type === 'routine') {
        // Remove task-specific fields from routine updates
        delete finalUpdates.dueDate;
        delete finalUpdates.duration;
        delete finalUpdates.recurring;
        delete finalUpdates.recurrenceRule;
        delete finalUpdates.customRecurrenceDays;
        delete finalUpdates.recurrenceEnd;
        delete finalUpdates.parentTaskId;
        delete finalUpdates.dependentTaskId;
        delete finalUpdates.calendarEventId;
        delete finalUpdates.googleTaskId;
        delete finalUpdates.googleTaskListId;
      } else if (currentTask.type === 'task') {
        // Remove routine-specific fields from task updates
        delete finalUpdates.scheduleTime;
        delete finalUpdates.routineType;
      }
    }
    
    const isCompletingRecurring = currentTask?.status !== 'done' && updates.status === 'done' && isTodoTask(currentTask) && currentTask.recurring;
    
    const updatedTask = { ...currentTask, ...finalUpdates } as Task;
    setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
    
    // Record habit completion for routines
    if (updates.status === 'done' && currentTask && isRoutine(currentTask)) {
      recordCompletion(currentTask.id);
    }
    
    // Update notifications
    if (updates.status === 'done') {
      cancelNotification(id);
    } else if (currentTask) {
      if (isRoutine(updatedTask)) {
        scheduleRoutineNotification(updatedTask);
      } else if (isTodoTask(updatedTask)) {
        scheduleTaskNotification(updatedTask);
      }
    }
    
    // Sync to Google Tasks if task has googleTaskId
    if (isTodoTask(updatedTask) && updatedTask.googleTaskId && updatedTask.googleTaskListId) {
      syncTaskToGoogleTasks(updatedTask);
    }
    
    if (isOnline) {
      try {
        await updateDoc(doc(db, 'tasks', id), finalUpdates);
        
        // If completing a recurring task, create the next instance
        if (isCompletingRecurring && currentTask && isTodoTask(currentTask)) {
          const nextDueDate = getNextRecurrenceDate(currentTask.dueDate, currentTask.recurrenceRule!);
          if (nextDueDate && (!currentTask.recurrenceEnd || nextDueDate.getTime() < currentTask.recurrenceEnd)) {
            const nextTask: TodoTask = {
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

  const getNextRecurrenceDate = (currentDueDate: string | undefined, rule: 'weekly' | 'monthly' | 'custom'): Date | null => {
    if (!currentDueDate) return null;
    
    const date = new Date(currentDueDate);
    const now = new Date();
    
    switch (rule) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'custom':
        date.setDate(date.getDate() + 1);
        break;
    }
    
    return date > now ? date : null;
  };

  const deleteTask = async (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    cancelNotification(id);
    
    // Delete from Google Tasks if it has googleTaskId
    if (taskToDelete && isTodoTask(taskToDelete) && taskToDelete.googleTaskId && taskToDelete.googleTaskListId) {
      deleteFromGoogleTasks(taskToDelete.googleTaskId, taskToDelete.googleTaskListId);
    }
    
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

  const loadMore = useCallback(async () => {
    if (!syncId || isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      const lastTaskDoc = lastTask 
        ? await import('firebase/firestore').then(m => m.doc(db, 'tasks', lastTask.id))
        : null;
      
      const q = lastTaskDoc
        ? query(
            collection(db, 'tasks'),
            where('syncId', '==', syncId),
            orderBy('createdAt', 'desc'),
            startAfter(lastTaskDoc),
            limit(PAGE_SIZE)
          )
        : query(
            collection(db, 'tasks'),
            where('syncId', '==', syncId),
            orderBy('createdAt', 'desc'),
            limit(PAGE_SIZE)
          );
      
      const snapshot = await import('firebase/firestore').then(m => 
        new Promise<any>((resolve) => {
          const unsubscribe = onSnapshot(q, (snap) => {
            resolve(snap);
            unsubscribe();
          }, () => resolve({ empty: true, docs: [] }));
        })
      );
      
      if (snapshot.empty || snapshot.docs.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        const newTasks: Task[] = [];
        snapshot.docs.forEach((docSnap: any) => {
          newTasks.push(docSnap.data() as Task);
        });
        setTasks(prev => [...prev, ...newTasks]);
        setLastTask(newTasks[newTasks.length - 1]);
      }
    } catch (e) {
      console.error('Failed to load more tasks', e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [syncId, isLoadingMore, hasMore, lastTask]);

  return (
    <TaskContext.Provider value={{ tasks, hasMore, loadMore, isLoadingMore, addTask, updateTask, deleteTask, isOnline }}>
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
