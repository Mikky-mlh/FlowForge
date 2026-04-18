'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Flame, Calendar, TrendUp } from '@phosphor-icons/react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { InfoCard } from '../components/InfoCard';
import { useTasks, isRoutine } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { getHabitStats, getWeeklyProgress } from '../lib/habitTrackingFirestore';

function BentoCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`bg-app-card border border-app-border/30 rounded-2xl ${className}`}>{children}</motion.div>;
}

function StatCard({ icon: Icon, label, value, sublabel, delay, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; sublabel: string; delay: number; color: string }) {
  return (
    <motion.div className="bg-app-card border border-app-border/30 rounded-2xl p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: 'spring', stiffness: 100, damping: 20 }}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} dark:bg-app-surface`}><Icon className="w-5 h-5 dark:text-app-primary" /></div>
        <span className="text-app-muted text-sm">{label}</span>
      </div>
      <div className="text-3xl font-bold text-app-text">{value}</div>
      <div className="text-xs text-app-muted mt-1">{sublabel}</div>
    </motion.div>
  );
}

export const HabitsPage: React.FC = () => {
  const { tasks, updateTask } = useTasks();
  const { syncId } = useAuth();
  const routines = useMemo(() => tasks.filter(isRoutine), [tasks]);
  const [habitStatsMap, setHabitStatsMap] = React.useState<Map<string, any>>(new Map());
  const [weeklyProgressMap, setWeeklyProgressMap] = React.useState<Map<string, boolean[]>>(new Map());

  // Load habit stats from Firestore
  React.useEffect(() => {
    if (!syncId) return;
    
    const loadStats = async () => {
      const statsMap = new Map();
      const progressMap = new Map();
      
      for (const routine of routines) {
        try {
          const stats = await getHabitStats(routine, syncId);
          const progress = await getWeeklyProgress(routine, syncId);
          statsMap.set(routine.id, stats);
          progressMap.set(routine.id, progress);
        } catch (error) {
          console.error('Failed to load habit stats:', error);
        }
      }
      
      setHabitStatsMap(statsMap);
      setWeeklyProgressMap(progressMap);
    };
    
    loadStats();
  }, [routines, syncId]);

  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const stats = useMemo(() => {
    const totalRoutines = routines.length;
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const completedToday = routines.filter(r => r.status === 'done' && r.completedAt && format(new Date(r.completedAt), 'yyyy-MM-dd') === todayKey).length;
    const totalStreaks = Array.from(habitStatsMap.values()).reduce((sum, s) => sum + s.currentStreak, 0);
    const longestStreak = Math.max(...Array.from(habitStatsMap.values()).map(s => s.longestStreak), 0);
    return { totalRoutines, completedToday, totalStreaks, longestStreak };
  }, [routines, habitStatsMap]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-[100dvh]">
      <InfoCard
        id="habits"
        title="🔥 Build Better Habits"
        description="Track your daily routines and build consistency. Routines you create appear here with streak tracking."
        tips={[
          "Create routines from Dashboard to track them here",
          "Complete routines daily to build streaks",
          "View weekly progress and completion rates"
        ]}
      />
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold tracking-tight text-app-text leading-[0.9]" tabIndex={-1}>Habits</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-app-muted mt-2">Track your daily routines</motion.p>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Calendar} label="Today" value={`${stats.completedToday}/${stats.totalRoutines}`} sublabel="completed" delay={0.1} color="bg-app-primary/10" />
        <StatCard icon={Flame} label="Streak Days" value={stats.totalStreaks} sublabel="total days" delay={0.2} color="bg-orange-50" />
        <StatCard icon={Flame} label="Best Streak" value={stats.longestStreak} sublabel="days" delay={0.3} color="bg-amber-50" />
        <StatCard icon={TrendUp} label="Routines" value={stats.totalRoutines} sublabel="active" delay={0.4} color="bg-app-surface" />
      </div>

      <BentoCard>
        <div className="grid grid-cols-8 border-b border-app-border/30">
          <div className="col-span-2 p-4 text-xs font-semibold text-app-muted/50 uppercase tracking-wider">Routine</div>
          {weekDays.map((day, i) => <div key={i} className="p-4 text-center text-xs font-semibold text-app-muted/50 uppercase tracking-wider">{format(day, 'EEE')}</div>)}
          <div className="p-4 text-center text-xs font-semibold text-app-muted/50 uppercase tracking-wider">Best</div>
        </div>

        {routines.length === 0 ? (
          <div className="p-16 text-center text-app-muted">
            <Flame className="w-12 h-12 mx-auto mb-4 text-app-muted/30" />
            <p className="mb-2">No routines yet. Create routines from the Dashboard!</p>
            <p className="text-xs">Routines are daily habits tracked here with streaks.</p>
          </div>
        ) : (
          <div className="divide-y divide-app-border/30">
            {routines.map((routine, idx) => {
              const stats = habitStatsMap.get(routine.id);
              const weekProgress = weeklyProgressMap.get(routine.id) || [false, false, false, false, false, false, false];
              
              return (
                <motion.div key={routine.id} className="grid grid-cols-8 items-center py-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                  <div className="col-span-2 px-4 flex items-center gap-3">
                    <motion.button onClick={() => updateTask(routine.id, { status: routine.status === 'done' ? 'todo' : 'done' })} className={`shrink-0 ${routine.status === 'done' ? 'text-app-primary' : 'text-app-muted'}`} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      {routine.status === 'done' ? <CheckCircle weight="fill" className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                    </motion.button>
                    <div className="min-w-0">
                      <p className={`font-medium truncate ${routine.status === 'done' ? 'text-app-muted line-through' : 'text-app-text'}`}>{routine.title}</p>
                      <div className="flex items-center gap-2 text-xs text-app-muted">
                        <Flame className="w-3 h-3" />
                        <span>{stats?.currentStreak || 0} day streak</span>
                        <span className="text-app-muted/50">•</span>
                        <span>{stats?.completionRate || 0}% rate</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-5 flex items-center gap-2 px-2">
                    {weekProgress.map((completed, i) => (
                      <div key={i} className={`flex-1 h-8 rounded-lg transition-colors ${
                        completed ? 'bg-app-primary' : 'bg-app-surface/50'
                      }`} title={format(weekDays[i], 'MMM d')} />
                    ))}
                  </div>
                  <div className="px-4 text-center">
                    <div className="text-sm font-bold text-app-text">{stats?.longestStreak || 0}</div>
                    <div className="text-xs text-app-muted">best</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </BentoCard>
    </div>
  );
};
