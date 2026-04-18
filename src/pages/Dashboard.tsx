'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTasks, Task, TodoTask, isTodoTask } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { QuickAdd } from '../components/QuickAdd';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { InfoCard } from '../components/InfoCard';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { CreateRoutineModal } from '../components/CreateRoutineModal';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckCircle, Circle, CalendarBlank, Tag, MagnifyingGlass, SortAscending, Funnel, CalendarPlus, List, Clock, Square, CheckSquare, Plus } from '@phosphor-icons/react';
import { format, isSameDay } from 'date-fns';

const TAG_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300', 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300', 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300', 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
];

const getTagColor = (tag: string) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

function TaskRow({ task, index, onToggle, onClick, selected, onSelect }: { task: Task; index: number; onToggle: () => void; onClick: () => void; selected?: boolean; onSelect?: (checked: boolean) => void }) {
  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20, delay: index * 0.03 }}
      className={`group flex items-center gap-4 py-4 border-b border-app-border/30 transition-all cursor-pointer hover:bg-app-surface/50 px-3 -mx-3 rounded-xl ${selected ? 'bg-app-primary/5 ring-1 ring-app-primary/30' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {onSelect && (
        <button onClick={(e) => { e.stopPropagation(); onSelect(!selected); }} className="shrink-0" aria-label={selected ? 'Deselect task' : 'Select task'}>
          {selected ? (
            <div className="w-5 h-5 rounded-md bg-app-primary flex items-center justify-center">
              <CheckCircle weight="bold" className="w-4 h-4 text-app-primary-fg" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-md border-2 border-app-border group-hover:border-app-primary transition-colors" />
          )}
        </button>
      )}
      {!onSelect && (
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="shrink-0" aria-label={task.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}>
          {task.status === 'done' ? (
            <div className="w-5 h-5 rounded-md bg-app-primary flex items-center justify-center">
              <CheckCircle weight="bold" className="w-4 h-4 text-app-primary-fg" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-md border-2 border-app-border group-hover:border-app-primary transition-colors" />
          )}
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-base font-medium mb-1 truncate ${task.status === 'done' ? 'line-through text-app-muted/60' : 'text-app-text'}`}>{task.title}</p>
        <div className="flex items-center gap-3 text-[13px] text-app-muted">
          {task.dueDate && <div className="flex items-center gap-1"><CalendarBlank className="w-3 h-3" />{format(new Date(task.dueDate), 'MMM d, h:mm a')}</div>}
          {totalSubtasks > 0 && <span className="px-2 py-0.5 rounded bg-app-surface/80 text-[11px] font-semibold">{completedSubtasks}/{totalSubtasks}</span>}
          {task.tags?.slice(0, 2).map(tag => <span key={tag} className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getTagColor(tag)}`}>{tag}</span>)}
          {task.priority === 'high' && <span className="px-2 py-0.5 rounded bg-red-100 text-red-600 text-[11px] font-semibold">!</span>}
        </div>
      </div>
    </motion.div>
  );
}

function TaskVirtualList({ tasks, showBulkActions, selectedTasks, onSelectTask, onToggle, onTaskClick }: {
  tasks: Task[]; showBulkActions: boolean; selectedTasks: Set<string>;
  onSelectTask: (taskId: string, checked: boolean) => void;
  onToggle: (id: string, updates: Partial<Task>) => Promise<void>;
  onTaskClick: (id: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({ count: tasks.length, getScrollElement: () => parentRef.current, estimateSize: () => 80, overscan: 5 });

  return (
    <div ref={parentRef} className="flex flex-col overflow-auto" style={{ height: '65vh' }}>
      <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const task = tasks[virtualRow.index];
          return (
            <div key={task.id} data-index={virtualRow.index} ref={virtualizer.measureElement} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}>
              <TaskRow task={task} index={virtualRow.index} onToggle={() => onToggle(task.id, { status: task.status === 'done' ? 'todo' : 'done' })} onClick={() => onTaskClick(task.id)} selected={showBulkActions && selectedTasks.has(task.id)} onSelect={showBulkActions ? ((checked: boolean) => onSelectTask(task.id, checked)) : undefined} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, sublabel, delay }: { label: string; value: string | number; sublabel: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: 'spring', stiffness: 100, damping: 20 }} className="bg-app-card border border-app-border/30 rounded-2xl p-5 dark:bg-app-card">
      <p className="text-xs font-medium text-app-muted/70 uppercase tracking-wider mb-1">{label}</p>
      <motion.p className="text-3xl font-bold text-app-text" key={value} initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>{value}</motion.p>
      <p className="text-xs text-app-muted mt-1">{sublabel}</p>
    </motion.div>
  );
}

function BentoCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 100, damping: 20 }} className={`bg-app-card border border-app-border/30 rounded-2xl p-6 shadow-diffusion ${className}`}>{children}</motion.div>;
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <motion.div className="relative w-32 h-32" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.2 }}>
      <svg className="w-full h-full -rotate-90">
        <circle cx="64" cy="64" r="40" fill="none" stroke="var(--app-surface)" strokeWidth="8" />
        <motion.circle cx="64" cy="64" r="40" fill="none" stroke="var(--app-primary)" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset }} transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="text-4xl font-bold text-app-text" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.8 } }}>{score}%</motion.span>
        <span className="text-[10px] text-app-muted uppercase tracking-wider">Today</span>
      </div>
    </motion.div>
  );
}

export const Dashboard: React.FC = () => {
  const { tasks, updateTask, deleteTask, isOnline, hasMore, loadMore, isLoadingMore, addTask } = useTasks();
  const { getValidGoogleToken, signIn, syncId } = useAuth();
  const { addToast } = useToast();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate' | 'priority'>('createdAt');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const allTags = useMemo(() => { const tags = new Set<string>(); tasks.forEach(t => t.tags?.forEach(tag => tags.add(tag))); return Array.from(tags); }, [tasks]);
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];
    if (searchQuery) { const q = searchQuery.toLowerCase(); result = result.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.tags?.some(tag => tag.toLowerCase().includes(q))); }
    if (filterTag) result = result.filter(t => t.tags?.includes(filterTag));
    result.sort((a, b) => {
      if (sortBy === 'dueDate') { if (!a.dueDate && !b.dueDate) return b.createdAt - a.createdAt; if (!a.dueDate) return 1; if (!b.dueDate) return -1; return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(); }
      if (sortBy === 'priority') { const pMap = { high: 3, medium: 2, low: 1 }; if (pMap[a.priority] !== pMap[b.priority]) return pMap[b.priority] - pMap[a.priority]; }
      return b.createdAt - a.createdAt;
    });
    return result;
  }, [tasks, searchQuery, filterTag, sortBy]);

  const incompleteTasks = filteredAndSortedTasks.filter(t => t.status !== 'done');
  const completedTasks = filteredAndSortedTasks.filter(t => t.status === 'done');
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const todayStart = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const todayEnd = useMemo(() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; }, []);
  
  const todayMetrics = useMemo(() => {
    const tasksWithDueDate = tasks.filter(t => t.dueDate && new Date(t.dueDate!) >= todayStart && new Date(t.dueDate!) <= todayEnd);
    const completedToday = tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt >= todayStart.getTime() && t.completedAt <= todayEnd.getTime());
    const score = tasksWithDueDate.length > 0 ? Math.round((completedToday.length / tasksWithDueDate.length) * 100) : tasks.length > 0 ? Math.round((completedToday.length / tasks.length) * 100) : 0;
    return { completedToday: completedToday.length, tasksWithDueDate: tasksWithDueDate.length, totalTasks: tasks.length, score, completedAllTime: tasks.filter(t => t.status === 'done').length };
  }, [tasks, todayStart, todayEnd]);

  const stats = useMemo(() => {
    const now = new Date(); const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); const startOfWeek = startOfToday - (now.getDay() * 24 * 60 * 60 * 1000);
    return { completedToday: tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt >= startOfToday).length, completedThisWeek: tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt >= startOfWeek).length, createdThisWeek: tasks.filter(t => t.createdAt >= startOfWeek).length };
  }, [tasks]);

  const handleCalendarSync = async () => {
    let token = await getValidGoogleToken();
    if (!token) {
      token = await signIn(true); // Request calendar scope
      if (!token) return;
    }
    
    if (!syncId) {
      addToast('Sync ID not available', 'error');
      return;
    }
    
    setIsSyncing(true);
    try {
      // Step 1: Get Google Tasks list
      const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let taskListId = '';
      if (listsRes.ok) {
        const listsData = await listsRes.json();
        taskListId = listsData.items?.[0]?.id || '';
      }
      
      if (!taskListId) {
        throw new Error('No Google Tasks list found');
      }
      
      // Step 2: Import from Google Tasks
      const tasksRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let importCount = 0;
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        
        for (const gTask of tasksData.items || []) {
          if (gTask.title) {
            const existingTask = tasks.find(t => isTodoTask(t) && t.googleTaskId === gTask.id);
            if (!existingTask) {
              const newTask: TodoTask = {
                id: crypto.randomUUID(),
                type: 'task',
                title: gTask.title,
                description: gTask.notes || undefined,
                dueDate: gTask.due || undefined,
                status: gTask.status === 'completed' ? 'done' : 'todo',
                priority: 'medium',
                googleTaskId: gTask.id,
                googleTaskListId: taskListId,
                tags: [],
                syncId: syncId,
                createdAt: Date.now(),
                lastModified: Date.now(),
              };
              await addTask(newTask);
              importCount++;
            }
          }
        }
      }

      // Step 3: Export tasks to Google Tasks (not Calendar)
      const tasksToExport = tasks.filter(t => isTodoTask(t) && !t.googleTaskId);
      let exportCount = 0;
      
      for (const task of tasksToExport) {
        if (!isTodoTask(task)) continue;
        
        const gTask = {
          title: task.title,
          notes: task.description || '',
          status: task.status === 'done' ? 'completed' : 'needsAction',
          due: task.dueDate || undefined,
        };
        
        const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, { 
          method: 'POST', 
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, 
          body: JSON.stringify(gTask) 
        });
        
        if (response.ok) { 
          const data = await response.json(); 
          await updateTask(task.id, { googleTaskId: data.id, googleTaskListId: taskListId }); 
          exportCount++;
        } else {
          const errorText = await response.text();
          console.error('Failed to create Google Task:', errorText);
        }
      }
      
      addToast(`Synced! Imported ${importCount} task(s), exported ${exportCount} task(s) to Google Tasks.`, 'success');
    } catch (error: any) { 
      console.error("Sync error:", error); 
      addToast(error.message || 'Failed to sync with Google.', 'error'); 
    }
    finally { setIsSyncing(false); }
  };



  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-[100dvh]">
      <InfoCard
        id="dashboard"
        title="✨ Welcome to FlowForge"
        description="Your central hub for task management. Add tasks quickly, track progress, and stay focused."
        tips={[
          "Use Quick Add (+ button) to create tasks instantly",
          "Click any task to view details, add subtasks, or set due dates",
          "Check the score ring to see your daily completion rate"
        ]}
      />
      {/* Hero Header - Asymmetric Layout */}
      <header className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="text-4xl md:text-5xl font-bold tracking-tight text-app-text leading-[0.9]">
            Focus. <span className="text-app-muted">Flow.</span>
          </motion.h1>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-app-primary animate-pulse' : 'bg-amber-500'}`} /><span className="text-app-muted">{isOnline ? 'Synced' : 'Offline'}</span></div>
            <div className="flex gap-3 text-app-muted"><span><strong className="text-app-text">{stats.completedToday}</strong> today</span><span><strong className="text-app-text">{stats.completedThisWeek}</strong> this week</span></div>
          </motion.div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-3">
          <p className="text-sm text-app-muted font-mono">{format(new Date(), 'EEEE, MMM do')}</p>
          <div className="flex gap-2">
            <motion.button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-app-primary text-app-primary-fg rounded-xl font-medium shadow-lg shadow-app-primary/20"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-5 h-5" />
              New Task
            </motion.button>
            <motion.button
              onClick={() => setShowRoutineModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-app-card border border-app-border rounded-xl font-medium hover:bg-app-surface"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Clock className="w-5 h-5" />
              New Routine
            </motion.button>
            <motion.button onClick={handleCalendarSync} disabled={isSyncing} className="flex items-center gap-2 px-4 py-2 bg-app-card border border-app-border/50 rounded-xl text-sm font-medium hover:bg-app-surface transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <CalendarPlus className="w-4 h-4" />{isSyncing ? 'Syncing...' : 'Sync Google Tasks'}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex bg-app-surface/50 p-1 rounded-xl">
          <motion.button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'list' ? 'bg-app-card shadow-sm text-app-text' : 'text-app-muted hover:text-app-text'}`} whileTap={{ scale: 0.95 }}><List className="w-4 h-4" />List</motion.button>
          <motion.button onClick={() => setViewMode('timeline')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'timeline' ? 'bg-app-card shadow-sm text-app-text' : 'text-app-muted hover:text-app-text'}`} whileTap={{ scale: 0.95 }}><Clock className="w-4 h-4" />Timeline</motion.button>
          <motion.button onClick={() => { if (showBulkActions) setSelectedTasks(new Set()); setShowBulkActions(!showBulkActions); }} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${showBulkActions ? 'bg-app-primary text-app-primary-fg' : 'text-app-muted hover:text-app-text'}`} whileTap={{ scale: 0.95 }}>
            {showBulkActions ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}Bulk
          </motion.button>
        </div>
        
        <div className="flex-1 min-w-[180px] relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
          <input ref={searchRef} type="text" placeholder="Search tasks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-app-card border border-app-border/30 rounded-xl pl-9 pr-4 py-2.5 text-sm text-app-text focus:border-app-primary outline-none transition-colors" />
        </div>
        
        <div className="flex items-center gap-2">
          <SortAscending className="w-4 h-4 text-app-muted" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-app-card border border-app-border/30 rounded-xl px-3 py-2.5 text-sm text-app-text focus:border-app-primary outline-none">
            <option value="createdAt">Newest</option>
            <option value="dueDate">Due Date</option>
            <option value="priority">Priority</option>
          </select>
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center gap-2">
            <Funnel className="w-4 h-4 text-app-muted" />
            <select value={filterTag || ''} onChange={e => setFilterTag(e.target.value || null)} className="bg-app-card border border-app-border/30 rounded-xl px-3 py-2.5 text-sm text-app-text focus:border-app-primary outline-none max-w-[130px]">
              <option value="">All Tags</option>{allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          </div>
        )}
      </motion.div>

      {/* Bulk Actions */}
      {selectedTasks.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-center gap-3 p-3 bg-app-primary/10 border border-app-primary/20 rounded-xl">
          <span className="text-sm font-medium text-app-primary">{selectedTasks.size} selected</span>
          <motion.button onClick={async () => { for (const id of selectedTasks) await updateTask(id, { status: 'done' }); setSelectedTasks(new Set()); }} className="px-3 py-1.5 text-sm bg-app-primary text-app-primary-fg rounded-lg" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Complete</motion.button>
          <motion.button onClick={async () => { for (const id of selectedTasks) await deleteTask(id); setSelectedTasks(new Set()); }} className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Delete</motion.button>
          <motion.button onClick={() => setSelectedTasks(new Set())} className="px-3 py-1.5 text-sm text-app-muted" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Cancel</motion.button>
        </motion.div>
      )}

      {/* Main Content Grid - Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
        <div className="space-y-8">
          {/* Task List */}
          <section>
            <h2 className="text-xs uppercase tracking-[0.15em] font-semibold text-app-muted/60 mb-5">Today's Priorities</h2>
            {incompleteTasks.length === 0 ? (
              <BentoCard><div className="py-16 text-center text-app-muted">No pending tasks found.</div></BentoCard>
            ) : (
              <TaskVirtualList tasks={incompleteTasks} showBulkActions={showBulkActions} selectedTasks={selectedTasks} onSelectTask={(taskId, checked) => { const newSet = new Set(selectedTasks); checked ? newSet.add(taskId) : newSet.delete(taskId); setSelectedTasks(newSet); }} onToggle={updateTask} onTaskClick={setSelectedTaskId} />
            )}
            {hasMore && incompleteTasks.length > 0 && <div className="py-4 text-center"><button onClick={() => loadMore()} disabled={isLoadingMore} className="px-6 py-2 bg-app-surface/50 border border-app-border/30 rounded-xl text-sm text-app-muted hover:text-app-text hover:border-app-primary transition-colors">{isLoadingMore ? 'Loading...' : 'Load More'}</button></div>}
            
            {/* Completed */}
            {completedTasks.length > 0 && (
              <section className="mt-10">
                <h2 className="text-xs uppercase tracking-[0.15em] font-semibold text-app-muted/60 mb-5">Completed</h2>
                <div className="flex flex-col opacity-50">
                  <AnimatePresence mode="popLayout">{completedTasks.map((task, i) => <TaskRow key={task.id} task={task} index={i} onToggle={() => updateTask(task.id, { status: 'todo' })} onClick={() => setSelectedTaskId(task.id)} selected={showBulkActions && selectedTasks.has(task.id)} onSelect={showBulkActions ? ((checked: boolean) => { const newSet = new Set(selectedTasks); checked ? newSet.add(task.id) : newSet.delete(task.id); setSelectedTasks(newSet); }) : undefined} />)}</AnimatePresence>
                </div>
              </section>
            )}
          </section>
        </div>

        {/* Sidebar Metrics */}
        <aside className="flex flex-col gap-6">
          <BentoCard className="flex items-center justify-center py-8 bg-gradient-to-br from-app-primary/10 to-emerald-500/5">
            <ScoreRing score={todayMetrics.score} />
          </BentoCard>
          
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Done Today" value={todayMetrics.completedToday} sublabel="tasks" delay={0.3} />
            <StatCard label="This Week" value={stats.completedThisWeek} sublabel="completed" delay={0.4} />
            <StatCard label="Created" value={stats.createdThisWeek} sublabel="new tasks" delay={0.5} />
            <StatCard label="Total" value={todayMetrics.totalTasks} sublabel="all time" delay={0.6} />
          </div>
        </aside>
      </div>

      {/* Task Detail Modal */}
      <AnimatePresence>{selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTaskId(null)} />}</AnimatePresence>
      
      {/* Create Task Modal */}
      <CreateTaskModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      
      {/* Create Routine Modal */}
      <CreateRoutineModal isOpen={showRoutineModal} onClose={() => setShowRoutineModal(false)} />
    </div>
  );
};