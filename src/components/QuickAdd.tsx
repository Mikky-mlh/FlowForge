import React, { useState } from 'react';
import * as chrono from 'chrono-node';
import { useTasks } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { PaperPlaneRight } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { sanitizeTitle, sanitizeTags } from '../lib/sanitize';

export const QuickAdd: React.FC = () => {
  const [input, setInput] = useState('');
  const { addTask } = useTasks();
  const { googleAccessToken } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const parsed = chrono.parse(input);
    let dueDate = undefined;
    let duration = undefined;
    let title = input;
    let category: string | undefined;

    if (parsed.length > 0) {
      dueDate = parsed[0].start.date().toISOString();
      if (parsed[0].end) {
        duration = Math.round((parsed[0].end.date().getTime() - parsed[0].start.date().getTime()) / 60000);
      }
      title = title.replace(parsed[0].text, '').trim();
    }

    // Parse tags (#tag)
    const tags = (title.match(/#\w+/g) || []).map(t => t.slice(1));
    title = title.replace(/#\w+/g, '').trim();

    // Parse priority (!high, !medium, !low)
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (title.includes('!high')) {
      priority = 'high';
      title = title.replace('!high', '').trim();
    } else if (title.includes('!low')) {
      priority = 'low';
      title = title.replace('!low', '').trim();
    } else if (title.includes('!medium')) {
      priority = 'medium';
      title = title.replace('!medium', '').trim();
    }

    // Parse category (@categoryName)
    const categoryMatch = title.match(/@(\w+)/);
    if (categoryMatch) {
      category = categoryMatch[1].toLowerCase();
      title = title.replace(/@\w+/, '').trim();
    }

    // Parse recurring (!!daily, !!weekly, !!monthly)
    let recurring: boolean = false;
    let recurrenceRule: 'daily' | 'weekly' | 'monthly' | undefined;
    if (title.includes('!!monthly')) {
      recurring = true;
      recurrenceRule = 'monthly';
      title = title.replace('!!monthly', '').trim();
    } else if (title.includes('!!weekly')) {
      recurring = true;
      recurrenceRule = 'weekly';
      title = title.replace('!!weekly', '').trim();
    } else if (title.includes('!!daily')) {
      recurring = true;
      recurrenceRule = 'daily';
      title = title.replace('!!daily', '').trim();
    }

    // Clean up extra spaces
    title = title.replace(/\s+/g, ' ').trim();

    // If title is empty after parsing, use original input as fallback
    if (!title || title.length === 0) {
      title = input.trim();
    }

    // If still empty after fallback, show error
    if (!title || title.length === 0) {
      return;
    }

    // Sanitize inputs for security
    const sanitizedTitle = sanitizeTitle(title);
    const sanitizedTags = sanitizeTags(tags);
    const sanitizedCategory = category ? sanitizeTitle(category).toLowerCase().replace(/[^a-z0-9]/g, '') : undefined;

    await addTask({
      title: sanitizedTitle,
      priority,
      status: 'todo',
      tags: sanitizedTags,
      category: sanitizedCategory,
      dueDate,
      duration,
      recurring,
      recurrenceRule,
    });

    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full mb-12">
      <div className="h-14 bg-app-card border border-app-border rounded-2xl flex items-center px-5 gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)] focus-within:border-app-primary transition-colors">
        <span className="text-app-muted/50 text-lg font-medium">+</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add task tomorrow 5pm #shopping !high @work !!daily..."
          className="flex-1 bg-transparent border-none outline-none text-[15px] text-app-text placeholder:text-app-muted/80"
        />
        <motion.button
          whileHover={{ scale: 0.98 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!input.trim()}
          className="w-8 h-8 flex items-center justify-center bg-app-primary text-app-primary-fg rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PaperPlaneRight weight="fill" className="w-4 h-4" />
        </motion.button>
      </div>
    </form>
  );
};
