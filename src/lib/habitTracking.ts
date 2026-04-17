import { Task, Routine, isRoutine } from '../contexts/TaskContext';

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  completionRate: number; // percentage
  lastCompleted?: number; // timestamp
}

const STORAGE_KEY = 'flowforge_habit_stats';

interface StoredHabitStats {
  [routineId: string]: {
    completions: number[]; // array of timestamps
    longestStreak: number;
  };
}

const getStoredStats = (): StoredHabitStats => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveStoredStats = (stats: StoredHabitStats) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

export const recordCompletion = (routineId: string) => {
  const stats = getStoredStats();
  if (!stats[routineId]) {
    stats[routineId] = { completions: [], longestStreak: 0 };
  }
  
  const now = Date.now();
  stats[routineId].completions.push(now);
  
  // Calculate current streak
  const streak = calculateCurrentStreak(stats[routineId].completions);
  if (streak > stats[routineId].longestStreak) {
    stats[routineId].longestStreak = streak;
  }
  
  saveStoredStats(stats);
};

export const getHabitStats = (routine: Routine): HabitStats => {
  const stats = getStoredStats();
  const routineStats = stats[routine.id] || { completions: [], longestStreak: 0 };
  
  const currentStreak = calculateCurrentStreak(routineStats.completions);
  const totalCompletions = routineStats.completions.length;
  
  // Calculate completion rate (last 30 days)
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentCompletions = routineStats.completions.filter(t => t > thirtyDaysAgo).length;
  const completionRate = Math.round((recentCompletions / 30) * 100);
  
  const lastCompleted = routineStats.completions.length > 0 
    ? routineStats.completions[routineStats.completions.length - 1]
    : undefined;
  
  return {
    currentStreak,
    longestStreak: routineStats.longestStreak,
    totalCompletions,
    completionRate,
    lastCompleted,
  };
};

const calculateCurrentStreak = (completions: number[]): number => {
  if (completions.length === 0) return 0;
  
  // Sort completions by date (newest first)
  const sorted = [...completions].sort((a, b) => b - a);
  
  // Group by day
  const dayGroups = new Map<string, number>();
  sorted.forEach(timestamp => {
    const date = new Date(timestamp);
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    dayGroups.set(dayKey, timestamp);
  });
  
  // Count consecutive days from today
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dayKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
    
    if (dayGroups.has(dayKey)) {
      streak++;
    } else if (i > 0) {
      // Break streak if we miss a day (but allow today to be incomplete)
      break;
    }
  }
  
  return streak;
};

export const getAllHabitStats = (routines: Routine[]): Map<string, HabitStats> => {
  const statsMap = new Map<string, HabitStats>();
  routines.forEach(routine => {
    statsMap.set(routine.id, getHabitStats(routine));
  });
  return statsMap;
};

export const getWeeklyProgress = (routine: Routine): boolean[] => {
  const stats = getStoredStats();
  const routineStats = stats[routine.id] || { completions: [], longestStreak: 0 };
  
  const weekProgress: boolean[] = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dayKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
    
    const completed = routineStats.completions.some(timestamp => {
      const date = new Date(timestamp);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      return key === dayKey;
    });
    
    weekProgress.push(completed);
  }
  
  return weekProgress;
};
