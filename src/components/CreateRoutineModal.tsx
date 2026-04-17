import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Bell } from '@phosphor-icons/react';
import { useTasks } from '../contexts/TaskContext';
import { sanitizeTitle } from '../lib/sanitize';
import { TimePicker } from './TimePicker';

interface CreateRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRoutineModal: React.FC<CreateRoutineModalProps> = ({ isOpen, onClose }) => {
  const { addTask } = useTasks();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [routineType, setRoutineType] = useState<'all' | 'working' | 'nonworking'>('all');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await addTask({
      type: 'routine',
      title: sanitizeTitle(title),
      description: description.trim() || undefined,
      priority: 'medium',
      status: 'todo',
      tags: [],
      scheduleTime: selectedTime,
      routineType,
      notificationsEnabled,
    });

    resetForm();
    onClose();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedTime('09:00');
    setRoutineType('all');
    setNotificationsEnabled(true);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-app-card border border-app-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-app-card border-b border-app-border px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-bold text-app-text">Create Daily Routine</h2>
            <button onClick={onClose} className="text-app-muted hover:text-app-text transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-app-text mb-2">Routine Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Morning workout, Review emails..."
                className="w-full bg-app-surface border border-app-border rounded-xl px-4 py-3 text-app-text focus:border-app-primary outline-none"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text mb-2">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add more details..."
                rows={3}
                className="w-full bg-app-surface border border-app-border rounded-xl px-4 py-3 text-app-text focus:border-app-primary outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Daily Time
              </label>
              <TimePicker value={selectedTime} onChange={setSelectedTime} />
              <p className="text-xs text-app-muted mt-2">This routine will repeat at this time every day</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text mb-2">Repeat On</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={routineType === 'all'} onChange={() => setRoutineType('all')} className="text-app-primary" />
                  <span className="text-sm text-app-text">All days</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={routineType === 'working'} onChange={() => setRoutineType('working')} className="text-app-primary" />
                  <span className="text-sm text-app-text">Working days only</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={routineType === 'nonworking'} onChange={() => setRoutineType('nonworking')} className="text-app-primary" />
                  <span className="text-sm text-app-text">Non-working days only</span>
                </label>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={e => setNotificationsEnabled(e.target.checked)}
                  className="w-5 h-5 rounded border-app-border text-app-primary focus:ring-app-primary"
                />
                <span className="text-sm font-medium text-app-text flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Enable notifications for this routine
                </span>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-app-surface text-app-text rounded-xl font-medium hover:bg-app-border transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="flex-1 px-4 py-3 bg-app-primary text-app-primary-fg rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Create Routine
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
