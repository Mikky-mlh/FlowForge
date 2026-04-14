import React, { useState } from 'react';
import * as chrono from 'chrono-node';
import { useTasks } from '../contexts/TaskContext';
import { PaperPlaneRight } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

export const QuickAdd: React.FC = () => {
  const [input, setInput] = useState('');
  const { addTask } = useTasks();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const parsed = chrono.parse(input);
    let dueDate = undefined;
    let title = input;

    if (parsed.length > 0) {
      dueDate = parsed[0].start.date().toISOString();
      title = input.replace(parsed[0].text, '').trim();
    }

    await addTask({
      title,
      priority: 'medium',
      status: 'todo',
      tags: [],
      dueDate,
    });

    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full mb-12">
      <div className="h-14 bg-white border border-zinc-200 rounded-2xl flex items-center px-5 gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)] focus-within:border-teal-600 transition-colors">
        <span className="text-zinc-300 text-lg font-medium">+</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add task tomorrow 5pm #shopping !high..."
          className="flex-1 bg-transparent border-none outline-none text-[15px] text-zinc-950 placeholder:text-zinc-400"
        />
        <motion.button
          whileHover={{ scale: 0.98 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!input.trim()}
          className="w-8 h-8 flex items-center justify-center bg-teal-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PaperPlaneRight weight="fill" className="w-4 h-4" />
        </motion.button>
      </div>
    </form>
  );
};
