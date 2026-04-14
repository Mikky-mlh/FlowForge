import React from 'react';
import { useTasks, Task } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { QuickAdd } from '../components/QuickAdd';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle, CalendarBlank, Tag } from '@phosphor-icons/react';
import { format } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { tasks, updateTask, isOnline } = useTasks();
  const { syncId } = useAuth();

  const incompleteTasks = tasks.filter(t => t.status !== 'done');
  const completedTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="p-10 max-w-6xl mx-auto min-h-[100dvh]">
      <header className="mb-12 flex items-end justify-between">
        <div>
          <h1 className="text-[56px] font-bold tracking-[-0.04em] leading-[0.9] text-zinc-950 mb-4">
            Focus. <span className="text-zinc-500">Flow.</span>
          </h1>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-zinc-500">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-teal-600' : 'bg-amber-500'}`} />
            <span>{isOnline ? 'Synced:' : 'Offline Mode'}</span>
            {isOnline && <span className="text-teal-600 font-mono">{syncId || 'WOLF-4821-BLUE'}</span>}
          </div>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-zinc-500 font-mono text-sm">{format(new Date(), 'EEEE, MMM do')}</p>
        </div>
      </header>

      <QuickAdd />

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-12">
        <div className="space-y-12">
          <section>
            <h2 className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-5 block">Today's Priorities</h2>
            <div className="flex flex-col">
              <AnimatePresence mode="popLayout">
                {incompleteTasks.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-8 text-center text-zinc-500"
                  >
                    No pending tasks. You're all caught up!
                  </motion.div>
                ) : (
                  incompleteTasks.map((task, i) => (
                    <TaskRow key={task.id} task={task} index={i} onToggle={() => updateTask(task.id, { status: 'done' })} />
                  ))
                )}
              </AnimatePresence>
            </div>
          </section>

          {completedTasks.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-5 block">Completed</h2>
              <div className="flex flex-col opacity-60">
                <AnimatePresence mode="popLayout">
                  {completedTasks.map((task, i) => (
                    <TaskRow key={task.id} task={task} index={i} onToggle={() => updateTask(task.id, { status: 'todo' })} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-10">
          <div className="bg-gradient-to-br from-teal-600 to-emerald-600 rounded-[24px] p-8 text-white text-center shadow-[0_20px_40px_-12px_rgba(13,148,136,0.25)]">
            <h3 className="text-xs uppercase tracking-[0.1em] opacity-80 mb-2">Productivity Score</h3>
            <div className="text-[64px] font-bold tracking-[-0.02em] my-2 leading-none">
              {tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%
            </div>
            <p className="text-sm opacity-90">Tasks completed today</p>
          </div>
          
          <div className="border-t border-zinc-200 pt-6">
             <span className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-5 block">Performance</span>
             <div className="flex justify-between py-3 border-b border-zinc-100">
                 <span className="text-sm text-zinc-500">Tasks Completed</span>
                 <span className="text-sm font-semibold text-zinc-950">{completedTasks.length} / {tasks.length}</span>
             </div>
             <div className="flex justify-between py-3 border-b border-zinc-100">
                 <span className="text-sm text-zinc-500">Focus Multiplier</span>
                 <span className="text-sm font-semibold text-emerald-500">1.4x</span>
             </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

const TaskRow = ({ task, index, onToggle }: { task: Task; index: number; onToggle: () => void }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: index * 0.05 }}
      className="group flex items-center gap-4 py-4 border-b border-zinc-200 transition-all"
    >
      <button onClick={onToggle} className="shrink-0 transition-colors">
        {task.status === 'done' ? (
          <div className="w-5 h-5 border-2 border-teal-600 bg-teal-600 rounded-md flex items-center justify-center">
            <CheckCircle weight="bold" className="w-4 h-4 text-white" />
          </div>
        ) : (
          <div className="w-5 h-5 border-2 border-zinc-300 rounded-md" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-base font-medium mb-1 truncate ${task.status === 'done' ? 'line-through text-zinc-400' : 'text-zinc-950'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-3 text-[13px] text-zinc-500">
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <CalendarBlank className="w-3 h-3" />
              {format(new Date(task.dueDate), 'MMM d, h:mm a')}
            </div>
          )}
          {task.tags?.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded bg-zinc-100 text-[11px] font-semibold text-zinc-500">{tag}</span>
          ))}
          {task.priority === 'high' && (
            <span className="px-2 py-0.5 rounded bg-red-100 text-[11px] font-semibold text-red-600">! High</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
