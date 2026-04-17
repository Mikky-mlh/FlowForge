# Notification Scheduling Implementation

## Date: 2025

## Overview
Implemented comprehensive notification scheduling system for both tasks and routines with persistence across page reloads and full timing customization.

## Files Created

### `src/lib/notificationScheduler.ts`
Complete notification scheduling system with:
- **Task Notifications**: Customizable warning time (0-60 minutes before due)
- **Routine Notifications**: Customizable reminder time (0-30 minutes before scheduled time)
- **Repeat Notifications**: Optional repeat interval for tasks (0-30 minutes)
- **Persistence**: Stores scheduled notifications in localStorage
- **Auto-restore**: Restores notifications on app reload
- **Cleanup**: Cancels notifications when tasks are completed/deleted

## Files Modified

### `src/contexts/TaskContext.tsx`
- Imported notification scheduler functions
- Integrated `restoreNotifications()` in useEffect after tasks load
- Added `scheduleTaskNotification()` / `scheduleRoutineNotification()` when tasks are created
- Added notification rescheduling when tasks are updated
- Added `cancelNotification()` when tasks are deleted or completed

### `src/components/NotificationSettings.tsx`
- Added `useTasks()` hook to access tasks
- Calls `restoreNotifications(tasks)` when notifications are enabled
- **NEW**: Added timing customization UI with sliders:
  - Task Warning Time (0-60 minutes)
  - Routine Reminder Time (0-30 minutes)
  - Repeat Interval (0-30 minutes)
- Real-time settings update with automatic rescheduling
- Visual feedback showing current settings

## How It Works

### Task Notifications
1. When a task with `dueDate` is created/updated:
   - Calculates notification time: `dueDate - [customizable minutes]`
   - Default: 15 minutes before, customizable 0-60 minutes
   - Schedules browser notification if within next 24 hours
   - Stores schedule in localStorage for persistence
   - Shows notification: "Task Due Soon ⏰ - {title} is due in X minutes"
   - **NEW**: Optional repeat notifications every X minutes

2. Respects per-task settings:
   - Only schedules if `notificationsEnabled !== false`
   - Skips completed tasks (`status === 'done'`)

### Routine Notifications
1. When a routine is created/updated:
   - Parses `scheduleTime` (HH:mm format)
   - **NEW**: Applies customizable reminder offset (0-30 minutes before)
   - Schedules notification for today or tomorrow
   - Checks `routineType` before showing:
     - `'all'`: Shows every day
     - `'working'`: Only on working days
     - `'nonworking'`: Only on non-working days
   - Auto-reschedules for next day after firing
   - Shows notification: "Daily Routine 🔄 - {title} starts in X minutes"

### Persistence
- All scheduled notifications stored in localStorage
- On app reload: `restoreNotifications()` is called
- Cleans up expired notifications
- Reschedules all active tasks/routines

### Cleanup
- Notifications cancelled when:
  - Task is marked as done
  - Task is deleted
  - Task is updated (old notification cancelled, new one scheduled)

## API Functions

### `getNotificationSettings(): NotificationSettings`
Retrieve current notification timing settings.

### `saveNotificationSettings(settings: NotificationSettings)`
Save notification timing preferences.

### `scheduleTaskNotification(task: Task)`
Schedules notification based on custom warning time before task due time.

### `scheduleRoutineNotification(task: Task)`
Schedules notification based on custom reminder time before routine's scheduled time.

### `cancelNotification(taskId: string)`
Cancels scheduled notification for a task (including repeat notifications).

### `scheduleAllNotifications(tasks: Task[])`
Schedules notifications for all tasks (used on app load).

### `restoreNotifications(tasks: Task[])`
Restores notifications from localStorage and reschedules all.

### `clearAllNotifications()`
Clears all scheduled notifications (cleanup utility).

## User Experience

### Enabling Notifications
1. Go to Settings → Notifications
2. Toggle "Enable notifications"
3. Browser prompts for permission
4. All tasks/routines are automatically scheduled

### Customizing Timing
1. **Task Warning Time**: Slider from 0-60 minutes
   - 0 = notify at due time
   - 15 = notify 15 minutes before (default)
   - 60 = notify 1 hour before

2. **Routine Reminder Time**: Slider from 0-30 minutes
   - 0 = notify at scheduled time (default)
   - 10 = notify 10 minutes before
   - 30 = notify 30 minutes before

3. **Repeat Interval**: Slider from 0-30 minutes
   - 0 = no repeat (default)
   - 5 = repeat every 5 minutes
   - 30 = repeat every 30 minutes

4. Settings auto-save and reschedule all notifications immediately

### Per-Task Control
- Each task has `notificationsEnabled` field
- Can be toggled in task detail modal
- Defaults to `true` if not specified

### Notification Display
- **Tasks**: "Task Due Soon ⏰" or "Task Reminder ⏰" (for repeats)
- **Routines**: "Daily Routine 🔄" + time info
- Uses browser's native notification system
- Shows app icon (`/icon-192.svg`)
- Non-intrusive (doesn't require interaction)
- Repeat notifications show "Task Reminder" instead of "Task Due Soon"

## Technical Details

### Browser Compatibility
- Requires `Notification` API support
- Gracefully degrades if not supported
- Checks permission status before scheduling

### Performance
- Uses `setTimeout` for scheduling (efficient)
- Stores only essential data in localStorage
- Cleans up expired notifications automatically
- Maximum 24-hour lookahead for tasks

### Edge Cases Handled
- ✅ Tasks due in past (not scheduled)
- ✅ Tasks due more than 24 hours away (not scheduled)
- ✅ Routines on non-matching days (checked before showing)
- ✅ Page reload (notifications restored)
- ✅ Browser closed (notifications lost, restored on reopen)
- ✅ Notifications disabled globally (respects setting)
- ✅ Notifications disabled per-task (respects setting)

## Testing Checklist

- [x] Create task with due date → notification scheduled
- [x] Create routine → notification scheduled for today/tomorrow
- [x] Complete task → notification cancelled
- [x] Delete task → notification cancelled
- [x] Update task due date → notification rescheduled
- [x] Reload page → notifications restored
- [x] Disable notifications globally → all cancelled
- [x] Enable notifications → all scheduled
- [x] Task with `notificationsEnabled: false` → not scheduled
- [x] Routine on working day → shows only on working days
- [x] Routine on non-working day → shows only on non-working days

## Status: ✅ COMPLETE

Goal #9 and #10 from Target.txt are now fully implemented:
- ✅ Browser notification permission system
- ✅ Per-task `notificationsEnabled` field
- ✅ Notification scheduling logic (customizable timing)
- ✅ Persistence across page reloads
- ✅ Automatic cleanup and rescheduling
- ✅ **Timing customization** (how early to notify)
- ✅ **Repeat notifications** (how often to remind)
- ✅ Real-time settings update with auto-reschedule
