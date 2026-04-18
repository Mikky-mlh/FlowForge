import React, { useState, useEffect } from 'react';
import { Bell, BellSlash, Clock, Repeat } from '@phosphor-icons/react';
import { useTasks } from '../contexts/TaskContext';
import { restoreNotifications, getNotificationSettings, saveNotificationSettings, NotificationSettings as NotifSettings } from '../lib/notificationScheduler';
import { useToast } from '../contexts/ToastContext';

export const NotificationSettings: React.FC = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotifSettings>(getNotificationSettings());
  const { tasks } = useTasks();
  const { addToast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      const enabled = localStorage.getItem('flowforge_notifications_enabled') === 'true';
      setNotificationsEnabled(enabled && Notification.permission === 'granted');
    }
  }, []);

  const handleToggle = async () => {
    if (!('Notification' in window)) {
      addToast('This browser does not support notifications', 'error');
      return;
    }

    if (Notification.permission === 'denied') {
      addToast('Notifications are blocked. Please enable them in your browser settings.', 'error');
      return;
    }

    if (!notificationsEnabled) {
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
          setNotificationsEnabled(true);
          localStorage.setItem('flowforge_notifications_enabled', 'true');
          new Notification('FlowForge Notifications Enabled', {
            body: 'You will now receive reminders for your tasks',
            icon: '/icon-192.svg'
          });
          // Restore all notifications
          restoreNotifications(tasks);
        }
      } else if (Notification.permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('flowforge_notifications_enabled', 'true');
        restoreNotifications(tasks);
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('flowforge_notifications_enabled', 'false');
    }
  };

  const handleSettingChange = (key: keyof NotifSettings, value: number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
    // Reschedule all notifications with new settings
    if (notificationsEnabled) {
      restoreNotifications(tasks);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {notificationsEnabled ? (
            <Bell className="w-5 h-5 text-app-primary" />
          ) : (
            <BellSlash className="w-5 h-5 text-app-muted" />
          )}
          <div>
            <h3 className="text-sm font-medium text-app-text">Task Notifications</h3>
            <p className="text-xs text-app-muted">Get reminders for upcoming tasks</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          className={`w-12 h-6 rounded-full transition-colors ${
            notificationsEnabled ? 'bg-app-primary' : 'bg-app-border'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-transform ${
              notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {permission === 'denied' && (
        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-600 dark:text-red-400">
            Notifications are blocked. Please enable them in your browser settings to receive task reminders.
          </p>
        </div>
      )}

      {notificationsEnabled && (
        <>
          <div className="p-4 bg-app-surface rounded-lg space-y-4 mt-4">
            <div>
              <label className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-app-text flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Task Warning Time
                </span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={settings.taskWarningMinutes}
                  onChange={(e) => handleSettingChange('taskWarningMinutes', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-app-border rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-mono text-app-text min-w-[60px] text-right">
                  {settings.taskWarningMinutes === 0 ? 'At time' : `${settings.taskWarningMinutes} min`}
                </span>
              </div>
              <p className="text-xs text-app-muted mt-1">Notify this many minutes before task due time</p>
            </div>

            <div>
              <label className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-app-text flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Routine Reminder Time
                </span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="5"
                  value={settings.routineReminderMinutes}
                  onChange={(e) => handleSettingChange('routineReminderMinutes', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-app-border rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-mono text-app-text min-w-[60px] text-right">
                  {settings.routineReminderMinutes === 0 ? 'At time' : `${settings.routineReminderMinutes} min`}
                </span>
              </div>
              <p className="text-xs text-app-muted mt-1">Notify this many minutes before routine time</p>
            </div>

            <div>
              <label className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-app-text flex items-center gap-2">
                  <Repeat className="w-4 h-4" />
                  Repeat Interval
                </span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="5"
                  value={settings.repeatInterval}
                  onChange={(e) => handleSettingChange('repeatInterval', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-app-border rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-mono text-app-text min-w-[60px] text-right">
                  {settings.repeatInterval === 0 ? 'Off' : `${settings.repeatInterval} min`}
                </span>
              </div>
              <p className="text-xs text-app-muted mt-1">Repeat task notifications every X minutes (0 = no repeat)</p>
            </div>
          </div>

          <div className="p-3 bg-app-surface rounded-lg mt-4">
            <div className="flex items-start gap-2">
              <Bell className="w-4 h-4 text-app-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-app-text mb-1">Current Settings</p>
                <ul className="text-xs text-app-muted space-y-1">
                  <li>• Tasks: {settings.taskWarningMinutes === 0 ? 'At due time' : `${settings.taskWarningMinutes} minutes before`}</li>
                  <li>• Routines: {settings.routineReminderMinutes === 0 ? 'At scheduled time' : `${settings.routineReminderMinutes} minutes before`}</li>
                  <li>• Repeats: {settings.repeatInterval === 0 ? 'Disabled' : `Every ${settings.repeatInterval} minutes`}</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
