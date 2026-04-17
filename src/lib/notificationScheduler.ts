import { Task, isRoutine, isTodoTask } from '../contexts/TaskContext';
import { isWorkingDay } from './workSchedule';

const STORAGE_KEY = 'flowforge_scheduled_notifications';
const SETTINGS_KEY = 'flowforge_notification_settings';

interface ScheduledNotification {
  taskId: string;
  scheduledTime: number;
  type: 'task' | 'routine';
}

export interface NotificationSettings {
  taskWarningMinutes: number; // How many minutes before due date
  routineReminderMinutes: number; // How many minutes before routine time
  repeatInterval: number; // Minutes between repeat notifications (0 = no repeat)
}

const DEFAULT_SETTINGS: NotificationSettings = {
  taskWarningMinutes: 15,
  routineReminderMinutes: 0,
  repeatInterval: 0,
};

export const getNotificationSettings = (): NotificationSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveNotificationSettings = (settings: NotificationSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// Store scheduled notifications in localStorage for persistence
const getScheduledNotifications = (): ScheduledNotification[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveScheduledNotifications = (notifications: ScheduledNotification[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
};

const activeTimeouts = new Map<string, number>();

export const clearAllNotifications = () => {
  activeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
  activeTimeouts.clear();
  localStorage.removeItem(STORAGE_KEY);
};

export const cancelNotification = (taskId: string) => {
  const timeoutId = activeTimeouts.get(taskId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    activeTimeouts.delete(taskId);
  }
  
  // Also cancel repeat notification
  const repeatTimeoutId = activeTimeouts.get(taskId + '-repeat');
  if (repeatTimeoutId) {
    clearTimeout(repeatTimeoutId);
    activeTimeouts.delete(taskId + '-repeat');
  }
  
  const scheduled = getScheduledNotifications();
  saveScheduledNotifications(scheduled.filter(n => n.taskId !== taskId));
};

const showNotification = (title: string, body: string, taskId: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  const enabled = localStorage.getItem('flowforge_notifications_enabled') === 'true';
  if (!enabled) return;

  new Notification(title, {
    body,
    icon: '/icon-192.svg',
    tag: taskId,
    requireInteraction: false,
  });
};

export const scheduleTaskNotification = (task: Task) => {
  if (!isTodoTask(task) || !task.dueDate || task.status === 'done') return;
  if (task.notificationsEnabled === false) return;
  
  cancelNotification(task.id);
  
  const settings = getNotificationSettings();
  const dueTime = new Date(task.dueDate).getTime();
  const now = Date.now();
  const warningTime = settings.taskWarningMinutes * 60 * 1000;
  const notificationTime = dueTime - warningTime;
  const timeUntil = notificationTime - now;
  
  // Only schedule if notification is in the future and within 24 hours
  if (timeUntil > 0 && timeUntil < 24 * 60 * 60 * 1000) {
    const scheduleNotif = (delay: number, isRepeat: boolean = false) => {
      const timeoutId = window.setTimeout(() => {
        const minutesText = settings.taskWarningMinutes === 0 ? 'now' : `in ${settings.taskWarningMinutes} minutes`;
        showNotification(
          isRepeat ? 'Task Reminder ⏰' : 'Task Due Soon ⏰',
          `${task.title} is due ${minutesText}`,
          task.id
        );
        
        // Schedule repeat notification if enabled
        if (!isRepeat && settings.repeatInterval > 0) {
          const repeatDelay = settings.repeatInterval * 60 * 1000;
          scheduleNotif(repeatDelay, true);
        } else {
          cancelNotification(task.id);
        }
      }, delay);
      
      activeTimeouts.set(task.id + (isRepeat ? '-repeat' : ''), timeoutId);
    };
    
    scheduleNotif(timeUntil);
    
    const scheduled = getScheduledNotifications();
    scheduled.push({ taskId: task.id, scheduledTime: notificationTime, type: 'task' });
    saveScheduledNotifications(scheduled);
  }
};

export const scheduleRoutineNotification = (task: Task) => {
  if (!isRoutine(task) || task.status === 'done') return;
  if (task.notificationsEnabled === false) return;
  
  cancelNotification(task.id);
  
  const settings = getNotificationSettings();
  const [hours, minutes] = task.scheduleTime.split(':').map(Number);
  const now = new Date();
  const scheduledTime = new Date();
  scheduledTime.setHours(hours, minutes, 0, 0);
  
  // Apply reminder offset
  const reminderTime = new Date(scheduledTime.getTime() - settings.routineReminderMinutes * 60 * 1000);
  
  // If time has passed today, schedule for tomorrow
  if (reminderTime <= now) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }
  
  const timeUntil = reminderTime.getTime() - now.getTime();
  
  const timeoutId = window.setTimeout(() => {
    const today = new Date();
    const shouldShow = 
      task.routineType === 'all' ||
      (task.routineType === 'working' && isWorkingDay(today)) ||
      (task.routineType === 'nonworking' && !isWorkingDay(today));
    
    if (shouldShow) {
      const timeText = settings.routineReminderMinutes === 0 ? 'now' : `in ${settings.routineReminderMinutes} minutes`;
      showNotification(
        'Daily Routine 🔄',
        `${task.title} starts ${timeText}`,
        task.id
      );
    }
    
    // Reschedule for next day
    cancelNotification(task.id);
    scheduleRoutineNotification(task);
  }, timeUntil);
  
  activeTimeouts.set(task.id, timeoutId);
  
  const scheduled = getScheduledNotifications();
  scheduled.push({ taskId: task.id, scheduledTime: reminderTime.getTime(), type: 'routine' });
  saveScheduledNotifications(scheduled);
};

export const scheduleAllNotifications = (tasks: Task[]) => {
  clearAllNotifications();
  
  tasks.forEach(task => {
    if (isRoutine(task)) {
      scheduleRoutineNotification(task);
    } else if (isTodoTask(task)) {
      scheduleTaskNotification(task);
    }
  });
};

// Restore notifications on app load
export const restoreNotifications = (tasks: Task[]) => {
  const scheduled = getScheduledNotifications();
  const now = Date.now();
  
  // Clean up expired notifications
  const validScheduled = scheduled.filter(n => n.scheduledTime > now);
  saveScheduledNotifications(validScheduled);
  
  // Reschedule all tasks
  scheduleAllNotifications(tasks);
};
