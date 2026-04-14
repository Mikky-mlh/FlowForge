import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ArrowCounterClockwise } from '@phosphor-icons/react';

export const PomodoroTimer: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Play sound or notification here
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const switchMode = (newMode: 'focus' | 'break') => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto p-6">
      <div className="flex gap-2 mb-12 p-1 bg-zinc-100 rounded-full border border-zinc-200">
        <button
          onClick={() => switchMode('focus')}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'focus' ? 'bg-white text-teal-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          Focus
        </button>
        <button
          onClick={() => switchMode('break')}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'break' ? 'bg-white text-teal-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          Break
        </button>
      </div>

      <div className="relative flex items-center justify-center w-64 h-64 mb-12">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="128"
            cy="128"
            r="120"
            className="stroke-zinc-100 fill-none"
            strokeWidth="4"
          />
          <motion.circle
            cx="128"
            cy="128"
            r="120"
            className="stroke-teal-600 fill-none"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 1 }}
            animate={{ pathLength: timeLeft / (mode === 'focus' ? 25 * 60 : 5 * 60) }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </svg>
        <span className="text-6xl font-bold tracking-[-0.02em] text-zinc-950">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>

      <div className="flex items-center gap-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={resetTimer}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-950 transition-colors shadow-sm"
        >
          <ArrowCounterClockwise className="w-5 h-5" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTimer}
          className="w-16 h-16 flex items-center justify-center rounded-full bg-teal-600 text-white shadow-[0_8px_20px_rgba(13,148,136,0.3)]"
        >
          {isActive ? <Pause weight="fill" className="w-8 h-8" /> : <Play weight="fill" className="w-8 h-8 ml-1" />}
        </motion.button>
      </div>
    </div>
  );
};
