'use client';

import React, { useState, useMemo } from 'react';
import { useTasks, Task, isRoutine, isTodoTask } from '../contexts/TaskContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretLeft, CaretRight, Calendar, List, Clock, CheckCircle, Circle } from '@phosphor-icons/react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, isPast, startOfDay, endOfDay, addDays } from 'date-fns';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { InfoCard } from '../components/InfoCard';

type ViewMode = 'month' | 'week' | 'day';

function BentoCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`bg-app-card border border-app-border/30 rounded-2xl overflow-hidden ${className}`}>{children}</motion.div>;
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <motion.div className={`p-4 rounded-xl ${color} dark:bg-app-surface`} whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 200 }}>
      <p className="text-xs font-medium text-app-muted/70 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-app-text mt-1">{value}</p>
    </motion.div>
  );
}

export const CalendarPage: React.FC = () => {
  const { tasks, updateTask } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const getTasksForDate = (date: Date): Task[] => {
    const todos = tasks
      .filter(isTodoTask)
      .filter(task => task.dueDate && isSameDay(new Date(task.dueDate), date));
    
    const dayRoutines = tasks
      .filter(isRoutine)
      .filter(routine => {
        if (routine.status === 'done') return false;
        return true;
      });
    
    return [...todos, ...dayRoutines];
  };
  
  const navigateMonth = (dir: 'prev' | 'next') => setCurrentDate(dir === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  const navigateWeek = (dir: 'prev' | 'next') => setCurrentDate(dir === 'prev' ? addDays(currentDate, -7) : addDays(currentDate, 7));
  const navigateDay = (dir: 'prev' | 'next') => setCurrentDate(dir === 'prev' ? addDays(currentDate, -1) : addDays(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const dayStart = startOfDay(currentDate);
  const dayEnd = endOfDay(currentDate);

  const upcomingTasks = useMemo(() => tasks.filter(isTodoTask).filter(t => t.dueDate && (!isPast(new Date(t.dueDate)) || t.status !== 'done')).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()).slice(0, 10), [tasks]);

  const stats = useMemo(() => ({ total: tasks.filter(isTodoTask).filter(t => t.dueDate).length, completed: tasks.filter(isTodoTask).filter(t => t.dueDate && t.status === 'done').length, upcoming: upcomingTasks.length }), [tasks, upcomingTasks]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-[100dvh]">
      <InfoCard
        id="calendar"
        title="📅 Calendar View"
        description="Visualize your tasks by date. See what's due today, this week, and beyond."
        tips={[
          "Click any task to view details and edit",
          "Tasks with due dates appear on their scheduled day",
          "Use this to plan your week and avoid deadline surprises"
        ]}
      />
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold tracking-tight text-app-text leading-[0.9]">Calendar</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-app-muted mt-2">View and manage your tasks by date</motion.p>
        </div>
        <div className="flex gap-3">
          <StatCard label="Total" value={stats.total} color="bg-app-surface dark:bg-app-card p-4 rounded-xl" />
          <StatCard label="Done" value={stats.completed} color="bg-app-primary/10 dark:bg-app-primary/20 p-4 rounded-xl" />
          <StatCard label="Upcoming" value={stats.upcoming} color="bg-amber-50 dark:bg-amber-950 p-4 rounded-xl" />
        </div>
      </header>

      <BentoCard>
        <div className="flex flex-col md:flex-row items-center justify-between p-5 border-b border-app-border/30">
          <div className="flex items-center gap-3">
            <motion.button 
              onClick={() => {
                if (viewMode === 'month') navigateMonth('prev');
                else if (viewMode === 'week') navigateWeek('prev');
                else navigateDay('prev');
              }} 
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-app-surface text-app-muted hover:text-app-text transition-colors" 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              <CaretLeft className="w-5 h-5" />
            </motion.button>
            <h2 className="text-xl font-semibold text-app-text min-w-[180px] text-center">
              {viewMode === 'day' 
                ? format(currentDate, 'MMMM d, yyyy')
                : viewMode === 'week'
                ? `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
                : format(currentDate, 'MMMM yyyy')}
            </h2>
            <motion.button 
              onClick={() => {
                if (viewMode === 'month') navigateMonth('next');
                else if (viewMode === 'week') navigateWeek('next');
                else navigateDay('next');
              }} 
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-app-surface text-app-muted hover:text-app-text transition-colors" 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              <CaretRight className="w-5 h-5" />
            </motion.button>
            <motion.button onClick={goToToday} className="px-4 py-2 bg-app-surface text-app-text rounded-xl text-sm font-medium hover:bg-app-border transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Today</motion.button>
          </div>
          <div className="flex bg-app-surface/50 p-1 rounded-xl mt-4 md:mt-0">
            {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
              <motion.button key={mode} onClick={() => setViewMode(mode)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === mode ? 'bg-app-card text-app-primary shadow-sm' : 'text-app-muted hover:text-app-text'}`} whileTap={{ scale: 0.95 }}>
                {mode === 'month' && <Calendar className="w-4 h-4" />}{mode === 'week' && <List className="w-4 h-4" />}{mode === 'day' && <Clock className="w-4 h-4" />}{mode.charAt(0).toUpperCase() + mode.slice(1)}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        {viewMode === 'month' && (
          <>
            <div className="grid grid-cols-7 border-b border-app-border/30">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                <motion.div key={day} className="py-3 text-center text-xs font-semibold text-app-muted/50 uppercase tracking-wider" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>{day}</motion.div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                const dayTasks = getTasksForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);
                return (
                  <motion.div key={index} className={`min-h-[100px] p-2 border-b border-r border-app-border/20 transition-colors cursor-pointer ${!isCurrentMonth ? 'bg-app-surface/30' : ''}`} whileHover={{ backgroundColor: 'var(--app-surface)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.01 }} onClick={() => { setCurrentDate(day); setViewMode('day'); }}>
                    <div className={`text-sm font-medium mb-2 ${isCurrentDay ? 'w-7 h-7 bg-app-primary text-app-primary-fg rounded-full flex items-center justify-center' : isCurrentMonth ? 'text-app-text' : 'text-app-muted/40'}`}>{format(day, 'd')}</div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map(task => (
                        <motion.div key={task.id} onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task.id); }} className={`text-xs px-2 py-1 rounded truncate cursor-pointer transition-colors ${
                          isRoutine(task) 
                            ? 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                            : task.status === 'done' ? 'bg-app-surface/50 text-app-muted/60 line-through' : task.priority === 'high' ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400' : task.priority === 'medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' : 'bg-app-surface text-app-text'}`} whileHover={{ scale: 1.02 }}>{isRoutine(task) ? '🔄 ' : ''}{task.title}</motion.div>
                      ))}
                      {dayTasks.length > 3 && <div className="text-xs text-app-muted/50 px-2">+{dayTasks.length - 3}</div>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-4">
              {weekDays.map((day, index) => {
                const dayTasks = getTasksForDate(day);
                const isCurrentDay = isToday(day);
                return (
                  <div key={index} className="space-y-2">
                    <button
                      onClick={() => {
                        setCurrentDate(day);
                        setViewMode('day');
                      }}
                      className={`w-full text-center py-2 rounded-lg transition-colors ${isCurrentDay ? 'bg-app-primary text-app-primary-fg' : 'bg-app-surface hover:bg-app-border'}`}
                    >
                      <div className="text-xs font-medium">{format(day, 'EEE')}</div>
                      <div className="text-lg font-bold">{format(day, 'd')}</div>
                    </button>
                    <div className="space-y-2">
                      {dayTasks.map(task => (
                        <motion.div key={task.id} onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task.id); }} className={`text-xs px-3 py-2 rounded-lg cursor-pointer ${
                          isRoutine(task)
                            ? 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                            : task.status === 'done' ? 'bg-app-surface/50 text-app-muted/60 line-through' : 'bg-app-card border border-app-border hover:border-app-primary'}`} whileHover={{ scale: 1.02 }}>
                          <p className="font-medium truncate">{isRoutine(task) ? '🔄 ' : ''}{task.title}</p>
                          {isTodoTask(task) && task.dueDate && <p className="text-xs text-app-muted mt-1">{format(new Date(task.dueDate), 'h:mm a')}</p>}
                          {isRoutine(task) && <p className="text-xs text-app-muted mt-1">Daily at {task.scheduleTime}</p>}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Day View */}
        {viewMode === 'day' && (
          <div className="p-6">
            <div className="space-y-3">
              {getTasksForDate(currentDate).map(task => (
                <motion.div key={task.id} onClick={() => setSelectedTaskId(task.id)} className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-app-border transition-colors ${
                  isRoutine(task) ? 'bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800' : 'bg-app-surface'
                }`} whileHover={{ x: 4 }}>
                  <button onClick={(e) => { e.stopPropagation(); updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' }); }}>
                    {task.status === 'done' ? <CheckCircle weight="fill" className="w-6 h-6 text-app-primary" /> : <Circle className="w-6 h-6 text-app-muted" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${task.status === 'done' ? 'text-app-muted line-through' : 'text-app-text'}`}>{isRoutine(task) ? '🔄 ' : ''}{task.title}</p>
                    {isTodoTask(task) && task.dueDate && <p className="text-sm text-app-muted">{format(new Date(task.dueDate), 'h:mm a')}</p>}
                    {isRoutine(task) && <p className="text-sm text-purple-600 dark:text-purple-400">Daily routine at {task.scheduleTime}</p>}
                    {task.description && <p className="text-sm text-app-muted mt-1">{task.description}</p>}
                  </div>
                  {task.priority === 'high' && <span className="px-3 py-1 bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400 text-xs font-semibold rounded">High</span>}
                </motion.div>
              ))}
              {getTasksForDate(currentDate).length === 0 && (
                <div className="text-center py-12 text-app-muted">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No tasks or routines scheduled for this day</p>
                </div>
              )}
            </div>
          </div>
        )}
      </BentoCard>

      {/* Upcoming Tasks */}
      <BentoCard className="mt-8 p-6">
        <h3 className="text-lg font-semibold text-app-text mb-4">Upcoming Tasks</h3>
        <div className="space-y-2">
          {upcomingTasks.filter(isTodoTask).map(task => (
            <motion.div key={task.id} onClick={() => setSelectedTaskId(task.id)} className="flex items-center gap-4 p-3 bg-app-surface/50 rounded-xl cursor-pointer hover:bg-app-surface transition-colors" whileHover={{ x: 4 }}>
              <button onClick={(e) => { e.stopPropagation(); updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' }); }}>{task.status === 'done' ? <CheckCircle weight="fill" className="w-5 h-5 text-app-primary" /> : <Circle className="w-5 h-5 text-app-muted" />}</button>
              <div className="flex-1 min-w-0"><p className={`font-medium truncate ${task.status === 'done' ? 'text-app-muted line-through' : 'text-app-text'}`}>{task.title}</p><p className="text-xs text-app-muted">{task.dueDate && format(new Date(task.dueDate), 'MMM d, h:mm a')}</p></div>
              {task.priority === 'high' && <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded">High</span>}
            </motion.div>
          ))}
        </div>
      </BentoCard>

      <AnimatePresence>{selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTaskId(null)} />}</AnimatePresence>
    </div>
  );
};