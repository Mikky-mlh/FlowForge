import { Task } from '../contexts/TaskContext';

export const syncTaskToCalendar = async (task: Task, token: string): Promise<string | null> => {
  if (!task.dueDate) return null;
  
  const start = new Date(task.dueDate);
  const durationMinutes = task.duration || 60;
  const end = new Date(start.getTime() + durationMinutes * 60000);

  const summary = task.status === 'done' ? `✅ ${task.title}` : task.title;

  const event = {
    summary,
    description: task.description || '',
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };

  const method = task.calendarEventId ? 'PUT' : 'POST';
  const url = task.calendarEventId 
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${task.calendarEventId}`
    : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

  try {
    const res = await fetch(url, {
      method,
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(event)
    });

    if (res.ok) {
      const data = await res.json();
      return data.id;
    } else {
      console.error('Failed to sync task to calendar:', await res.text());
      return null;
    }
  } catch (error) {
    console.error('Error syncing to calendar:', error);
    return null;
  }
};

export const syncTaskToGoogleTask = async (task: Task, token: string): Promise<boolean> => {
  if (!task.googleTaskId || !task.googleTaskListId) return false;
  
  const gTask = {
    id: task.googleTaskId,
    title: task.title,
    notes: task.description || '',
    status: task.status === 'done' ? 'completed' : 'needsAction',
    due: task.dueDate ? new Date(task.dueDate).toISOString() : null,
  };

  try {
    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${task.googleTaskListId}/tasks/${task.googleTaskId}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(gTask)
    });
    return res.ok;
  } catch (error) {
    console.error('Error syncing to Google Tasks:', error);
    return false;
  }
};

export const fetchGoogleTasks = async (token: string): Promise<{ tasks: any[], taskListId: string }> => {
  try {
    const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!listsRes.ok) {
      const err = await listsRes.text();
      throw new Error(`Failed to fetch task lists: ${err}`);
    }
    
    const listsData = await listsRes.json();
    const defaultList = listsData.items?.[0];
    if (!defaultList) return { tasks: [], taskListId: '' };

    const tasksRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${defaultList.id}/tasks?showHidden=false`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!tasksRes.ok) {
      const err = await tasksRes.text();
      throw new Error(`Failed to fetch tasks: ${err}`);
    }
    
    const tasksData = await tasksRes.json();
    return { tasks: tasksData.items || [], taskListId: defaultList.id };
  } catch (error) {
    console.error('Error fetching Google Tasks:', error);
    throw error;
  }
};

export const fetchGoogleCalendarEvents = async (token: string) => {
  try {
    const timeMin = new Date();
    timeMin.setHours(0, 0, 0, 0);
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 7); // Next 7 days

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch calendar events: ${err}`);
    }
    
    const data = await res.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching Calendar Events:', error);
    throw error;
  }
};
