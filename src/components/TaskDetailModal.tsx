import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Task, useTasks } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { X, Plus, CheckCircle, Trash, CalendarBlank, Clock, Paperclip, Eye, DownloadSimple } from '@phosphor-icons/react';
import { syncTaskToCalendar, syncTaskToGoogleTask } from '../lib/googleApi';
import { uploadAttachment, formatFileSize, isImageFile, Attachment } from '../lib/storage';
import { useToast } from '../contexts/ToastContext';
import { TimePicker } from './TimePicker';

interface Props {
  task: Task;
  onClose: () => void;
}

export const TaskDetailModal: React.FC<Props> = ({ task, onClose }) => {
  const { tasks, updateTask, deleteTask } = useTasks();
  const { googleAccessToken, syncId } = useAuth();
  const { addToast } = useToast();
  const [newSubtask, setNewSubtask] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [dependentTasksToPrompt, setDependentTasksToPrompt] = useState<Task[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(task.dueDate ? new Date(task.dueDate) : new Date());
  const [selectedTime, setSelectedTime] = useState(() => {
    if (task.dueDate) {
      const date = new Date(task.dueDate);
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    return '09:00';
  });

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !syncId) return;

    setIsUploading(true);
    try {
      const attachment = await uploadAttachment(file, syncId, task.id);
      const currentAttachments = task.attachments || [];
      updateTask(task.id, {
        attachments: [...currentAttachments, attachment],
      });
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (attachment: Attachment) => {
    const currentAttachments = task.attachments || [];
    updateTask(task.id, {
      attachments: currentAttachments.filter(a => a.id !== attachment.id),
    });
  };

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
      addToast('Please sign in with Google to sync to Calendar.', 'error');
      return;
    }
    const eventId = await syncTaskToCalendar(task, googleAccessToken);
    if (eventId) {
      updateTask(task.id, { calendarEventId: eventId });
      addToast('Synced to Google Calendar!', 'success');
    } else {
      addToast('Failed to sync to Calendar.', 'error');
    }
  };

  const handleSyncToTasks = async () => {
    if (!googleAccessToken) {
      addToast('Please sign in with Google to sync to Tasks.', 'error');
      return;
    }
    if (!task.googleTaskId) {
      addToast("This task wasn't imported from Google Tasks, so it can't be synced back yet.", 'error');
      return;
    }
    const success = await syncTaskToGoogleTask(task, googleAccessToken);
    if (success) {
      addToast('Synced to Google Tasks!', 'success');
    } else {
      addToast('Failed to sync to Tasks.', 'error');
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
                <CalendarBlank className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full bg-app-bg border border-app-border rounded-xl pl-9 pr-3 py-2 text-sm text-app-text focus:border-app-primary outline-none transition-colors text-left"
                >
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Select date'}
                </button>
                {showCalendar && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowCalendar(false)}
                    />
                    <div className="fixed mt-2 bg-app-card border border-app-border rounded-xl p-4 shadow-xl z-50 w-80 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="flex items-center justify-between mb-4">
                        <button type="button" onClick={() => {
                          const newDate = new Date(calendarMonth);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setCalendarMonth(newDate);
                        }} className="p-2 hover:bg-app-surface rounded-lg transition-colors">
                          <svg className="w-5 h-5 text-app-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <h3 className="text-sm font-semibold text-app-text">
                          {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h3>
                        <button type="button" onClick={() => {
                          const newDate = new Date(calendarMonth);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setCalendarMonth(newDate);
                        }} className="p-2 hover:bg-app-surface rounded-lg transition-colors">
                          <svg className="w-5 h-5 text-app-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="text-xs text-center text-app-muted font-medium">{day}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const year = calendarMonth.getFullYear();
                          const month = calendarMonth.getMonth();
                          const firstDay = new Date(year, month, 1);
                          const lastDay = new Date(year, month + 1, 0);
                          const days = [];
                          
                          for (let i = 0; i < firstDay.getDay(); i++) {
                            days.push(null);
                          }
                          
                          for (let i = 1; i <= lastDay.getDate(); i++) {
                            days.push(new Date(year, month, i));
                          }
                          
                          return days.map((day, idx) => {
                            const currentDate = task.dueDate ? new Date(task.dueDate) : null;
                            const isSelected = day && currentDate && day.toDateString() === currentDate.toDateString();
                            
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  if (day) {
                                    const [hours, minutes] = selectedTime.split(':');
                                    const dateTime = new Date(day);
                                    dateTime.setHours(parseInt(hours), parseInt(minutes));
                                    updateTask(task.id, { dueDate: dateTime.toISOString() });
                                    setShowCalendar(false);
                                  }
                                }}
                                disabled={!day}
                                className={`p-2 text-sm rounded-lg ${
                                  isSelected
                                    ? 'bg-app-primary text-app-primary-fg'
                                    : day
                                    ? 'hover:bg-app-surface text-app-text'
                                    : 'invisible'
                                }`}
                              >
                                {day?.getDate()}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.1em] font-bold text-app-muted mb-2 block">Time</h3>
              <TimePicker 
                value={selectedTime} 
                onChange={(newTime) => {
                  setSelectedTime(newTime);
                  if (task.dueDate) {
                    const [hours, minutes] = newTime.split(':');
                    const dateTime = new Date(task.dueDate);
                    dateTime.setHours(parseInt(hours), parseInt(minutes));
                    updateTask(task.id, { dueDate: dateTime.toISOString() });
                  }
                }} 
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
            <h3 className="text-xs uppercase tracking-[0.1em] font-bold text-app-muted mb-2 block">Attachments</h3>
            <div className="space-y-2 mb-3">
              {(task.attachments || []).map(attachment => (
                <div key={attachment.id} className="flex items-center gap-3 p-2 bg-app-surface rounded-lg group">
                  {isImageFile(attachment.type) ? (
                    <img src={attachment.url} alt={attachment.name} className="w-10 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-10 bg-app-border rounded flex items-center justify-center">
                      <Paperclip className="w-5 h-5 text-app-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-app-text truncate">{attachment.name}</p>
                    <p className="text-xs text-app-muted">{formatFileSize(attachment.size)}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isImageFile(attachment.type) && (
                      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="p-1 text-app-muted hover:text-app-primary">
                        <Eye className="w-4 h-4" />
                      </a>
                    )}
                    <a href={attachment.url} download className="p-1 text-app-muted hover:text-app-primary">
                      <DownloadSimple className="w-4 h-4" />
                    </a>
                    <button onClick={() => handleRemoveAttachment(attachment)} className="p-1 text-app-muted hover:text-red-500">
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-app-muted hover:text-app-primary bg-app-surface rounded-lg transition-colors disabled:opacity-50"
            >
              <Paperclip className="w-4 h-4" />
              {isUploading ? 'Uploading...' : 'Add Attachment'}
            </button>
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
