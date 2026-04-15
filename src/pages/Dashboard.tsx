import React, { useState, useMemo } from 'react';
import { useTasks, Task } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { QuickAdd } from '../components/QuickAdd';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle, CalendarBlank, Tag, MagnifyingGlass, SortAscending, Funnel, CalendarPlus, List, Clock, DownloadSimple } from '@phosphor-icons/react';
import { format, isSameDay } from 'date-fns';
import { fetchGoogleTasks, fetchGoogleCalendarEvents, syncTaskToCalendar, syncTaskToGoogleTask } from '../lib/googleApi';

const TAG_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-yellow-100 text-yellow-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
];

const getTagColor = (tag: string) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

export const Dashboard: React.FC = () => {
  const { tasks, updateTask, addTask, isOnline } = useTasks();
  const { syncId, googleAccessToken, signIn } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate' | 'priority'>('createdAt');

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    tasks.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [tasks]);

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.description?.toLowerCase().includes(q)
      );
    }

    if (filterTag) {
      result = result.filter(t => t.tags?.includes(filterTag));
    }

    result.sort((a, b) => {
      if (sortBy === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return b.createdAt - a.createdAt;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'priority') {
        const pMap = { high: 3, medium: 2, low: 1 };
        if (pMap[a.priority] !== pMap[b.priority]) {
          return pMap[b.priority] - pMap[a.priority];
        }
      }
      return b.createdAt - a.createdAt;
    });

    return result;
  }, [tasks, searchQuery, filterTag, sortBy]);

  const incompleteTasks = filteredAndSortedTasks.filter(t => t.status !== 'done');
  const completedTasks = filteredAndSortedTasks.filter(t => t.status === 'done');
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const handleCalendarSync = async () => {
    let token = googleAccessToken;
    
    if (!token) {
      alert("We need to quickly re-authenticate with Google to access your Calendar.");
      token = await signIn();
      if (!token) {
        return; // User cancelled or error occurred
      }
    }

    setIsSyncing(true);
    try {
      const tasksToSync = tasks.filter(t => t.dueDate && !t.calendarEventId && t.status !== 'done');
      
      if (tasksToSync.length === 0) {
        alert("No new tasks with due dates to sync!");
        setIsSyncing(false);
        return;
      }

      let successCount = 0;
      for (const task of tasksToSync) {
        const event = {
          summary: task.title,
          description: task.description || '',
          start: {
            dateTime: new Date(task.dueDate!).toISOString(),
          },
          end: {
            dateTime: new Date(new Date(task.dueDate!).getTime() + 60 * 60 * 1000).toISOString(), // +1 hour
          },
        };

        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        if (response.ok) {
          const data = await response.json();
          await updateTask(task.id, { calendarEventId: data.id });
          successCount++;
        } else {
          const errText = await response.text();
          console.error("Failed to sync task", task.title, errText);
          if (response.status === 401 || response.status === 403) {
            alert("Permission denied. Please make sure you check the box to grant Calendar access when signing in with Google.");
            setIsSyncing(false);
            return;
          }
        }
      }
      alert(`Successfully synced ${successCount} task(s) to Google Calendar!`);
    } catch (error) {
      console.error("Calendar sync error:", error);
      alert("Failed to sync with Google Calendar.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImport = async (source: 'calendar' | 'tasks') => {
    let token = googleAccessToken;
    if (!token) {
      alert("Please sign in to import.");
      token = await signIn();
      if (!token) return;
    }

    setIsImporting(true);
    try {
      let importedCount = 0;
      if (source === 'tasks') {
        const gTasks = await fetchGoogleTasks(token);
        for (const gt of gTasks) {
          // Check if we already have it (basic check by title)
          if (!tasks.some(t => t.title === gt.title)) {
            await addTask({
              title: gt.title,
              description: gt.notes || '',
              status: gt.status === 'completed' ? 'done' : 'todo',
              priority: 'medium',
              tags: ['imported', 'google-tasks'],
              dueDate: gt.due ? new Date(gt.due).toISOString() : undefined,
              googleTaskId: gt.id,
              googleTaskListId: defaultList.id,
            });
            importedCount++;
          }
        }
      } else if (source === 'calendar') {
        const events = await fetchGoogleCalendarEvents(token);
        for (const ev of events) {
          if (!tasks.some(t => t.calendarEventId === ev.id)) {
            const start = ev.start?.dateTime || ev.start?.date;
            const end = ev.end?.dateTime || ev.end?.date;
            let duration = 60;
            if (start && end && ev.start?.dateTime) {
               duration = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
            }
            await addTask({
              title: ev.summary || 'Untitled Event',
              description: ev.description || '',
              status: 'todo',
              priority: 'medium',
              tags: ['imported', 'calendar'],
              dueDate: start ? new Date(start).toISOString() : undefined,
              duration,
              calendarEventId: ev.id,
            });
            importedCount++;
          }
        }
      }
      alert(`Successfully imported ${importedCount} tasks!`);
    } catch (error: any) {
      console.error("Import error:", error);
      alert(`Failed to import: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const todayTasks = useMemo(() => {
    return filteredAndSortedTasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), new Date())).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [filteredAndSortedTasks]);

  return (
    <div className="p-10 max-w-6xl mx-auto min-h-[100dvh]">
      <header className="mb-12 flex items-end justify-between">
        <div>
          <h1 className="text-[56px] font-bold tracking-[-0.04em] leading-[0.9] text-app-text mb-4">
            Focus. <span className="text-app-muted">Flow.</span>
          </h1>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-app-muted">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-app-primary' : 'bg-amber-500'}`} />
            <span>{isOnline ? 'Synced:' : 'Offline Mode'}</span>
            {isOnline && <span className="text-app-primary font-mono">{syncId || 'WOLF-4821-BLUE'}</span>}
          </div>
        </div>
        <div className="text-right hidden md:flex flex-col items-end gap-2">
          <p className="text-app-muted font-mono text-sm mb-2">{format(new Date(), 'EEEE, MMM do')}</p>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button 
                disabled={isImporting}
                className="flex items-center gap-2 px-4 py-2 bg-app-surface border border-app-border rounded-xl text-sm font-medium hover:bg-app-border transition-colors disabled:opacity-50"
              >
                <DownloadSimple className="w-4 h-4" />
                {isImporting ? 'Importing...' : 'Import'}
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-app-card border border-app-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                <button onClick={() => handleImport('calendar')} className="w-full text-left px-4 py-3 text-sm hover:bg-app-surface transition-colors border-b border-app-border">From Google Calendar</button>
                <button onClick={() => handleImport('tasks')} className="w-full text-left px-4 py-3 text-sm hover:bg-app-surface transition-colors">From Google Tasks</button>
              </div>
            </div>
            <button 
              onClick={handleCalendarSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-app-card border border-app-border rounded-xl text-sm font-medium hover:bg-app-surface transition-colors disabled:opacity-50"
            >
              <CalendarPlus className="w-4 h-4" />
              {isSyncing ? 'Syncing...' : 'Sync to Calendar'}
            </button>
          </div>
        </div>
      </header>

      <QuickAdd />

      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div className="flex bg-app-surface p-1 rounded-xl">
          <button 
            onClick={() => setViewMode('list')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'list' ? 'bg-app-card shadow-sm text-app-text' : 'text-app-muted hover:text-app-text'}`}
          >
            <List className="w-4 h-4" /> List
          </button>
          <button 
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'timeline' ? 'bg-app-card shadow-sm text-app-text' : 'text-app-muted hover:text-app-text'}`}
          >
            <Clock className="w-4 h-4" /> Timeline
          </button>
        </div>

        <div className="flex-1 min-w-[200px] relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-4 py-2 text-sm text-app-text focus:border-app-primary outline-none transition-colors"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <SortAscending className="w-4 h-4 text-app-muted" />
          <select 
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-app-card border border-app-border rounded-xl px-3 py-2 text-sm text-app-text focus:border-app-primary outline-none transition-colors"
          >
            <option value="createdAt">Newest First</option>
            <option value="dueDate">Due Date</option>
            <option value="priority">Priority</option>
          </select>
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center gap-2">
            <Funnel className="w-4 h-4 text-app-muted" />
            <select 
              value={filterTag || ''}
              onChange={e => setFilterTag(e.target.value || null)}
              className="bg-app-card border border-app-border rounded-xl px-3 py-2 text-sm text-app-text focus:border-app-primary outline-none transition-colors max-w-[150px]"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-12">
        <div className="space-y-12">
          {viewMode === 'timeline' ? (
            <section>
              <h2 className="text-xs uppercase tracking-[0.1em] font-bold text-app-muted mb-8 block">Today's Timeline</h2>
              <div className="relative border-l-2 border-app-surface ml-4 space-y-8 pb-8">
                {todayTasks.length === 0 ? (
                  <p className="text-sm text-app-muted pl-6">No tasks scheduled for today.</p>
                ) : (
                  todayTasks.map((task) => {
                    const start = new Date(task.dueDate!);
                    const end = new Date(start.getTime() + (task.duration || 60) * 60000);
                    return (
                      <div key={task.id} className="relative pl-8 group cursor-pointer" onClick={() => setSelectedTaskId(task.id)}>
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-app-bg ${task.status === 'done' ? 'bg-app-primary' : 'bg-app-border group-hover:bg-app-primary'} transition-colors`} />
                        <div className="bg-app-card border border-app-border rounded-xl p-4 hover:border-app-primary transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className={`font-semibold ${task.status === 'done' ? 'line-through text-app-muted' : 'text-app-text'}`}>{task.title}</h4>
                            <span className="text-xs font-mono text-app-muted bg-app-surface px-2 py-1 rounded-md">
                              {format(start, 'h:mm a')} - {format(end, 'h:mm a')}
                            </span>
                          </div>
                          {task.description && <p className="text-sm text-app-muted line-clamp-2">{task.description}</p>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          ) : (
            <>
              <section>
                <h2 className="text-xs uppercase tracking-[0.1em] font-bold text-app-muted mb-5 block">Today's Priorities</h2>
                <div className="flex flex-col">
                  <AnimatePresence mode="popLayout">
                    {incompleteTasks.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-8 text-center text-app-muted"
                      >
                        No pending tasks found.
                      </motion.div>
                    ) : (
                      incompleteTasks.map((task, i) => (
                        <TaskRow 
                          key={task.id} 
                          task={task} 
                          index={i} 
                          onToggle={() => {
                            updateTask(task.id, { status: 'done' });
                            if (googleAccessToken) {
                              const updatedTask = { ...task, status: 'done' as const };
                              if (task.calendarEventId) syncTaskToCalendar(updatedTask, googleAccessToken);
                              if (task.googleTaskId) syncTaskToGoogleTask(updatedTask, googleAccessToken);
                            }
                          }} 
                          onClick={() => setSelectedTaskId(task.id)} 
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </section>

              {completedTasks.length > 0 && (
                <section>
                  <h2 className="text-xs uppercase tracking-[0.1em] font-bold text-app-muted mb-5 block">Completed</h2>
                  <div className="flex flex-col opacity-60">
                    <AnimatePresence mode="popLayout">
                      {completedTasks.map((task, i) => (
                        <TaskRow 
                          key={task.id} 
                          task={task} 
                          index={i} 
                          onToggle={() => {
                            updateTask(task.id, { status: 'todo' });
                            if (googleAccessToken) {
                              const updatedTask = { ...task, status: 'todo' as const };
                              if (task.calendarEventId) syncTaskToCalendar(updatedTask, googleAccessToken);
                              if (task.googleTaskId) syncTaskToGoogleTask(updatedTask, googleAccessToken);
                            }
                          }} 
                          onClick={() => setSelectedTaskId(task.id)} 
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <aside className="flex flex-col gap-10">
          <div className="bg-gradient-to-br from-app-primary to-app-primary/80 rounded-[24px] p-8 text-app-primary-fg text-center shadow-[0_20px_40px_-12px_rgba(13,148,136,0.25)]">
            <h3 className="text-xs uppercase tracking-[0.1em] opacity-80 mb-2">Productivity Score</h3>
            <div className="text-[64px] font-bold tracking-[-0.02em] my-2 leading-none">
              {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0}%
            </div>
            <p className="text-sm opacity-90">Tasks completed overall</p>
          </div>
          
          <div className="border-t border-app-border pt-6">
             <span className="text-xs uppercase tracking-[0.1em] font-bold text-app-muted mb-5 block">Performance</span>
             <div className="flex justify-between py-3 border-b border-app-surface">
                 <span className="text-sm text-app-muted">Tasks Completed</span>
                 <span className="text-sm font-semibold text-app-text">{tasks.filter(t => t.status === 'done').length} / {tasks.length}</span>
             </div>
             <div className="flex justify-between py-3 border-b border-app-surface">
                 <span className="text-sm text-app-muted">Focus Multiplier</span>
                 <span className="text-sm font-semibold text-app-primary">1.4x</span>
             </div>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal 
            task={selectedTask} 
            onClose={() => setSelectedTaskId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const TaskRow = ({ task, index, onToggle, onClick }: { task: Task; index: number; onToggle: () => void; onClick: () => void }) => {
  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: index * 0.05 }}
      className="group flex items-center gap-4 py-4 border-b border-app-border transition-all cursor-pointer hover:bg-app-surface px-2 -mx-2 rounded-xl"
      onClick={onClick}
    >
      <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="shrink-0 transition-colors">
        {task.status === 'done' ? (
          <div className="w-5 h-5 border-2 border-app-primary bg-app-primary rounded-md flex items-center justify-center">
            <CheckCircle weight="bold" className="w-4 h-4 text-app-primary-fg" />
          </div>
        ) : (
          <div className="w-5 h-5 border-2 border-app-border rounded-md group-hover:border-app-primary transition-colors" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-base font-medium mb-1 truncate ${task.status === 'done' ? 'line-through text-app-muted/80' : 'text-app-text'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-3 text-[13px] text-app-muted">
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <CalendarBlank className="w-3 h-3" />
              {format(new Date(task.dueDate), 'MMM d, h:mm a')}
            </div>
          )}
          {totalSubtasks > 0 && (
            <span className="px-2 py-0.5 rounded bg-app-surface text-[11px] font-semibold text-app-muted">
              {completedSubtasks}/{totalSubtasks} subtasks
            </span>
          )}
          {task.tags?.map(tag => (
            <span key={tag} className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getTagColor(tag)}`}>{tag}</span>
          ))}
          {task.priority === 'high' && (
            <span className="px-2 py-0.5 rounded bg-red-100 text-[11px] font-semibold text-red-600">! High</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
