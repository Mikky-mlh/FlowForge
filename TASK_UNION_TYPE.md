# Task Interface Split - Union Type Implementation

## Date: 2025

## Objective
Split the Task interface into a discriminated union type to properly distinguish between TodoTasks and Routines, improving type safety and code clarity.

## Changes Made

### `src/contexts/TaskContext.tsx`

#### New Type Structure
Created three interfaces:

1. **BaseItem** - Common fields shared by both types:
   - id, title, description, priority, status
   - tags, category, syncId
   - createdAt, completedAt, lastModified
   - subtasks, notificationsEnabled, attachments

2. **TodoTask** - One-time or recurring tasks:
   - `type: 'task'` (discriminator)
   - dueDate, duration
   - recurring, recurrenceRule, customRecurrenceDays
   - recurrenceEnd, parentTaskId
   - dependentTaskId
   - calendarEventId, googleTaskId, googleTaskListId

3. **Routine** - Daily habits at specific times:
   - `type: 'routine'` (discriminator)
   - `scheduleTime: string` (HH:mm format, replaces dueDate)
   - `routineType: 'all' | 'working' | 'nonworking'`

#### Union Type
```typescript
export type Task = TodoTask | Routine;
```

#### Type Guards
```typescript
export const isRoutine = (task: Task): task is Routine => task.type === 'routine';
export const isTodoTask = (task: Task): task is TodoTask => task.type === 'task';
```

#### Migration Logic
Added automatic migration in onSnapshot callback:
- Detects tasks without `type` field
- Assigns `type: 'routine'` if `isRoutine` was true, otherwise `type: 'task'`
- For routines, migrates `dueDate` to `scheduleTime` format (HH:mm)

#### Field Stripping in addTask()
When creating tasks, invalid fields are stripped based on type:

**For Routines** (type === 'routine'), removes:
- dueDate, duration
- recurring, recurrenceRule, customRecurrenceDays, recurrenceEnd
- parentTaskId, dependentTaskId
- calendarEventId, googleTaskId, googleTaskListId

**For Tasks** (type === 'task'), removes:
- scheduleTime
- routineType

#### Field Stripping in updateTask()
When updating tasks, invalid fields are stripped based on current task type:
- Same field removal logic as addTask()
- Ensures Firestore documents stay clean even when updates contain wrong fields
- Uses type guards to safely check task type before recurring task logic

### `src/components/CreateTaskModal.tsx`
Updated to create TodoTask type:
- Added `type: 'task'` field
- Fixed subtask structure (removed `order` field, renamed `text` to `title`)
- Changed `dependsOn` to `dependentTaskId`
- Removed `attachments` from initial creation (handled separately)

### `src/components/CreateRoutineModal.tsx`
Updated to create Routine type:
- Added `type: 'routine'` field
- Changed from `dueDate` to `scheduleTime` (HH:mm format)
- Removed unnecessary date calculation
- Removed `isRoutine` flag (replaced by `type`)
- **Simplified form**: Removed priority field (routines are habits, not prioritized)
- **Simplified form**: Removed tags section (keep routines simple)
- **Hardcoded defaults**: priority='medium', tags=[] (required by BaseItem but not user-facing)
- Only essential fields: title, description, scheduleTime, routineType, notifications

## Benefits

### Type Safety
- TypeScript now enforces correct fields for each type
- Can't accidentally add `dueDate` to a Routine
- Can't accidentally add `scheduleTime` to a TodoTask
- Type guards enable safe narrowing

### Code Clarity
- Clear distinction between tasks and routines
- `scheduleTime` is more semantic than `dueDate` for routines
- Discriminated union enables exhaustive checking

### Clean Firestore Documents
- No dead fields in database
- Routines don't have task-specific fields
- Tasks don't have routine-specific fields
- Reduces document size and query complexity

### Backward Compatibility
- Migration logic handles existing data
- Old tasks without `type` field are automatically migrated
- No data loss during transition

## Usage Examples

### Type Guards
```typescript
if (isRoutine(task)) {
  // TypeScript knows task.scheduleTime exists
  console.log(task.scheduleTime);
} else {
  // TypeScript knows task.dueDate exists
  console.log(task.dueDate);
}
```

### Creating Tasks
```typescript
// TodoTask
addTask({
  type: 'task',
  title: 'Review PR',
  dueDate: '2025-01-15T10:00:00Z',
  recurring: false,
  // ...
});

// Routine
addTask({
  type: 'routine',
  title: 'Morning workout',
  scheduleTime: '07:00',
  routineType: 'working',
  // ...
});
```

### Field Stripping Example
```typescript
// Even if you accidentally pass wrong fields:
addTask({
  type: 'routine',
  title: 'Morning workout',
  scheduleTime: '07:00',
  routineType: 'all',
  dueDate: '2025-01-15', // ❌ Will be stripped out
  recurring: true,        // ❌ Will be stripped out
});

// Firestore will only save:
{
  type: 'routine',
  title: 'Morning workout',
  scheduleTime: '07:00',
  routineType: 'all',
  // Clean! No task-specific fields
}
```

## Next Steps
- Update Calendar.tsx to use type guards
- Update Dashboard.tsx to filter by type
- Update recurringTasks.ts to handle new structure
- Consider adding more specific types (e.g., RecurringTask extends TodoTask)
