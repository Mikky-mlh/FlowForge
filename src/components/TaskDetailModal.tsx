import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Task, useTasks } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { X, Plus, CheckCircle, Trash, CalendarBlank, Clock } from '@phosphor-icons/react';
import { syncTaskToCalendar, syncTaskToGoogleTask } from '../lib/googleApi';

interface Props {
  task: Task;
  onClose: () => void;
}

export const TaskDetailModal: React.FC<Props> = ({ task, onClose }) => {
  const { tasks, updateTask, deleteTask } = useTasks();
  const { googleAccessToken } = useAuth();
  const [newSubtask, setNewSubtask] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [dependentTasksToPrompt, setDependentTasksToPrompt] = useState<Task[] | null>(null);

  // Auto-sync changes to Google Calendar / Tasks
  useEffect(() => {
    if (!googleAccessToken) return;
    if (!task.calendarEventId && !task.googleTaskId) return;

    const timer = setTimeout(() => {
      if (task.calendarEventId) syncTaskToCalendar(task, googleAccessToken);
      if (task.googleTaskId) syncTaskToGoogleTask(task, googleAccessToken);
    }, 1500); // Debounce for 1.5s after user stops typing

    return () => clearTimeout(timer);
  }, [task, googleAccessToken]);

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    
    const subtask = {
      id: crypto.randomUUID(),
      title: newSubtask.trim(),
      completed: false
    };

    updateTask(task.id, {
      subtasks: [...(task.subtasks || []), subtask]
    });
    setNewSubtask('');
  };

  const toggleSubtask = (subtaskId: string) => {
    const updatedSubtasks = (task.subtasks || []).map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    
    const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.completed);
    const updates: Partial<Task> = { subtasks: updatedSubtasks };
    
    let newlyDone = false;
    if (allCompleted && task.status !== 'done') {
      updates.status = 'done';
      newlyDone = true;
    } else if (!allCompleted && task.status === 'done') {
      updates.status = 'in-progress';
    }

    updateTask(task.id, updates);

    if (newlyDone) {
      const deps = tasks.filter(t => t.dependentTaskId === task.id && t.status !== 'done');
      if (deps.length > 0) {
        setDependentTasksToPrompt(deps);
      }
    }
  };

  const handleDelete = () => {
    deleteTask(task.id);
    onClose();
  };

  const availableTasks = tasks.filter(t => t.id !== task.id);

  const handleSyncToCalendar = async () => {
    if (!googleAccessToken) {
      alert("Please sign in with Google to sync to Calendar.");
      return;
    }
    const eventId = await syncTaskToCalendar(task, googleAccessToken);
    if (eventId) {
      updateTask(task.id, { calendarEventId: eventId });
      alert("Synced to Google Calendar!");
    } else {
      alert("Failed to sync to Calendar.");
    }
  };

  const handleSyncToTasks = async () => {
    if (!googleAccessToken) {
      alert("Please sign in with Google to sync to Tasks.");
      return;
    }
    if (!task.googleTaskId) {
      alert("This task wasn't imported from Google Tasks, so it can't be synced back yet.");
      return;
    }
    const success = await syncTaskToGoogleTask(task, googleAccessToken);
    if (success) {
      alert("Synced to Google Tasks!");
    } else {
      alert("Failed to sync to Tasks.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-app-card border border-app-border rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="p-6 border-b border-app-surface flex justify-between items-center">
          <input 
            type="text" 
            value={task.title} 
            onChange={(e) => updateTask(task.id, { title: e.target.value })}
            className="text-xl font-bold text-app-text bg-transparent border-none outline-none flex-1 mr-4"
          />
          <button onClick={onClose} className="p-2 text-app-muted/80 hover:text-app-text transition-colors rounded-full hover:bg-app-bg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div>
            <h3 className="text-xs uppercase tracking-[0.1em] font-bold text-app-muted mb-2 block">Description</h3>
            <textarea 
              value={task.description || ''}
              onChange={(e) => updateTask(task.id, { description: e.target.value })}
              placeholder="Add a description..."
              className="w-full bg-app-bg border border-app-border rounded-xl p-3 text-sm text-app-text focus:border-app-primary outline-none transition-colors resize-none h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-xs uppercase tracking-[0.1em] font-bold text-app-muted mb-2 block">Due Date</h3>
              <div className="relative">
                <CalendarBlank className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
                <input 
                  type="datetime-local" 
                  value={task.dueDate ? new Date(new Date(task.dueDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                  onChange={(e) => updateTask(task.id, { dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  className="w-full bg-app-bg border border-app-border rounded-xl pl-9 pr-3 py-2 text-sm text-app-text focus:border-app-primary outline-none transition-colors"
                />
              </div>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.1em] font-bold text-app-muted mb-2 block">Duration (mins)</h3>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
                <input 
                  type="number" 
                  min="5"
                  step="5"
                  value={task.duration || 60}
                  onChange={(e) => updateTask(task.id, { duration: parseInt(e.target.value) || 60 })}
                  className="w-full bg-app-bg border border-app-border rounded-xl pl-9 pr-3 py-2 text-sm text-app-text focus:border-app-primary outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <h3 className="text-xs uppercase tracking-[0.1em] font-bold text-app-muted mb-2 block">Status</h3>
              <select 
                value={task.status}
                onChange={(e) => {
                  const newStatus = e.target.value as any;
                  updateTask(task.id, { status: newStatus });
                  if (newStatus === 'done') {
                    const deps = tasks.filter(t => t.dependentTaskId === task.id && t.status !== 'done');
                    if (deps.length > 0) {
                      setDependentTasksToPrompt(deps);
                    }
                  }
                }}
                className="w-full bg-app-bg border border-app-border rounded-xl p-2 text-sm text-app-text focus:border-app-primary outline-none transition-colors"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.1em] font-bold text-app-muted mb-2 block">Priority</h3>
              <select 
                value={task.priority}
                onChange={(e) => updateTask(task.id, { priority: e.target.value as any })}
                className="w-full bg-app-bg border border-app-border rounded-xl p-2 text-sm text-app-text focus:border-app-primary outline-none transition-colors"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.1em] font-bold text-app-muted mb-2 block">Depends On</h3>
              <select 
                value={task.dependentTaskId || ''}
                onChange={(e) => updateTask(task.id, { dependentTaskId: e.target.value || undefined })}
                className="w-full bg-app-bg border border-app-border rounded-xl p-2 text-sm text-app-text focus:border-app-primary outline-none transition-colors"
              >
                <option value="">None</option>
                {availableTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-[0.1em] font-bold text-app-muted mb-2 block">Tags (comma separated)</h3>
            <input 
              type="text" 
              value={task.tags.join(', ')}
              onChange={(e) => updateTask(task.id, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              placeholder="work, urgent"
              className="w-full bg-app-bg border border-app-border rounded-xl p-2 text-sm text-app-text focus:border-app-primary outline-none transition-colors"
            />
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-[0.1em] font-bold text-app-muted mb-4 block">Subtasks</h3>
            <div className="space-y-2 mb-4">
              {(task.subtasks || []).map(st => (
                <div key={st.id} className="flex items-center gap-3 group">
                  <button onClick={() => toggleSubtask(st.id)} className="shrink-0 transition-colors">
                    {st.completed ? (
                      <div className="w-5 h-5 border-2 border-app-primary bg-app-primary rounded-md flex items-center justify-center">
                        <CheckCircle weight="bold" className="w-4 h-4 text-app-primary-fg" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 border-2 border-app-border rounded-md group-hover:border-app-primary transition-colors" />
                    )}
                  </button>
                  <span className={`text-sm ${st.completed ? 'line-through text-app-muted/80' : 'text-app-text'}`}>
                    {st.title}
                  </span>
                </div>
              ))}
              {(!task.subtasks || task.subtasks.length === 0) && (
                <p className="text-sm text-app-muted italic">No subtasks yet.</p>
              )}
            </div>

            <form onSubmit={handleAddSubtask} className="flex gap-2">
              <input 
                type="text" 
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                placeholder="Add a subtask..."
                className="flex-1 bg-app-bg border border-app-border rounded-xl px-4 py-2 text-sm text-app-text focus:border-app-primary outline-none transition-colors"
              />
              <button 
                type="submit"
                disabled={!newSubtask.trim()}
                className="px-4 bg-app-primary text-app-primary-fg rounded-xl flex items-center justify-center disabled:opacity-50 transition-opacity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="p-4 border-t border-app-surface bg-app-bg/50 flex justify-between items-center">
          <div className="flex gap-2">
            <button onClick={handleSyncToCalendar} className="flex items-center gap-2 text-app-muted hover:text-app-primary transition-colors px-2 py-1 rounded-lg hover:bg-app-primary/10">
              <CalendarBlank className="w-4 h-4" />
              <span className="text-sm font-medium">Sync to Calendar</span>
            </button>
            {task.googleTaskId && (
              <button onClick={handleSyncToTasks} className="flex items-center gap-2 text-app-muted hover:text-app-primary transition-colors px-2 py-1 rounded-lg hover:bg-app-primary/10">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Sync to Tasks</span>
              </button>
            )}
          </div>
          {isDeleting ? (
            <div className="flex items-center gap-2 w-full">
              <span className="text-sm text-red-500 font-medium flex-1">Are you sure?</span>
              <button onClick={() => setIsDeleting(false)} className="px-3 py-1.5 text-sm font-medium text-app-text hover:bg-app-surface rounded-lg transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-3 py-1.5 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">Delete</button>
            </div>
          ) : (
            <button onClick={() => setIsDeleting(true)} className="flex items-center gap-2 text-app-muted hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10">
              <Trash className="w-4 h-4" />
              <span className="text-sm font-medium">Delete Task</span>
            </button>
          )}
        </div>

        {dependentTasksToPrompt && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <div className="bg-app-card border border-app-border rounded-2xl p-6 shadow-xl w-full max-w-sm text-center">
              <h3 className="text-lg font-bold text-app-text mb-2">Dependencies Met</h3>
              <p className="text-sm text-app-muted mb-6">
                This task is a prerequisite for {dependentTasksToPrompt.length} other task(s). Do you want to mark them as ready to work on (In Progress)?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDependentTasksToPrompt(null)}
                  className="flex-1 px-4 py-2 bg-app-surface text-app-text rounded-xl font-medium hover:bg-app-border transition-colors"
                >
                  No
                </button>
                <button 
                  onClick={() => {
                    dependentTasksToPrompt.forEach(t => updateTask(t.id, { status: 'in-progress' }));
                    setDependentTasksToPrompt(null);
                  }}
                  className="flex-1 px-4 py-2 bg-app-primary text-app-primary-fg rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  Yes, update
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
