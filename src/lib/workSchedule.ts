export interface WorkScheduleSettings {
  saturdayIsWorkday: boolean;
  sundayIsWorkday: boolean;
  customDays: Record<string, boolean>; // 'YYYY-MM-DD': true/false
}

const STORAGE_KEY = 'flowforge_work_schedule';

export const getWorkSchedule = (): WorkScheduleSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { saturdayIsWorkday: false, sundayIsWorkday: false, customDays: {} };
  } catch {
    return { saturdayIsWorkday: false, sundayIsWorkday: false, customDays: {} };
  }
};

export const saveWorkSchedule = (settings: WorkScheduleSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const isWorkingDay = (date: Date): boolean => {
  const schedule = getWorkSchedule();
  const day = date.getDay();
  const dateKey = date.toISOString().split('T')[0];
  
  // Check custom override first
  if (dateKey in schedule.customDays) {
    return schedule.customDays[dateKey];
  }
  
  if (day === 0) return schedule.sundayIsWorkday;
  if (day === 6) return schedule.saturdayIsWorkday;
  
  return true;
};

export const toggleDayOverride = (date: Date, isWorking: boolean): void => {
  const schedule = getWorkSchedule();
  const dateKey = date.toISOString().split('T')[0];
  schedule.customDays[dateKey] = isWorking;
  saveWorkSchedule(schedule);
};

export const removeDayOverride = (date: Date): void => {
  const schedule = getWorkSchedule();
  const dateKey = date.toISOString().split('T')[0];
  delete schedule.customDays[dateKey];
  saveWorkSchedule(schedule);
};