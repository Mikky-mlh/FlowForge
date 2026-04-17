import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarBlank, X } from '@phosphor-icons/react';
import { getWorkSchedule, saveWorkSchedule, toggleDayOverride, removeDayOverride, WorkScheduleSettings as WorkScheduleSettingsType } from '../lib/workSchedule';
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth } from 'date-fns';

export const WorkScheduleSettings: React.FC = () => {
  const [schedule, setSchedule] = useState<WorkScheduleSettingsType>(getWorkSchedule());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  const handleSaturdayToggle = () => {
    const newSchedule = { ...schedule, saturdayIsWorkday: !schedule.saturdayIsWorkday };
    setSchedule(newSchedule);
    saveWorkSchedule(newSchedule);
  };

  const handleSundayToggle = () => {
    const newSchedule = { ...schedule, sundayIsWorkday: !schedule.sundayIsWorkday };
    setSchedule(newSchedule);
    saveWorkSchedule(newSchedule);
  };

  const handleDayClick = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    const currentOverride = schedule.customDays[dateKey];
    
    if (currentOverride === undefined) {
      // No override, set opposite of default
      const day = date.getDay();
      const defaultIsWorking = day === 0 ? schedule.sundayIsWorkday : day === 6 ? schedule.saturdayIsWorkday : true;
      toggleDayOverride(date, !defaultIsWorking);
    } else {
      // Has override, remove it
      removeDayOverride(date);
    }
    setSchedule(getWorkSchedule());
  };

  const getDayStatus = (date: Date): 'working' | 'nonworking' | 'override-working' | 'override-nonworking' => {
    const dateKey = date.toISOString().split('T')[0];
    const day = date.getDay();
    const defaultIsWorking = day === 0 ? schedule.sundayIsWorkday : day === 6 ? schedule.saturdayIsWorkday : true;
    
    if (dateKey in schedule.customDays) {
      return schedule.customDays[dateKey] ? 'override-working' : 'override-nonworking';
    }
    
    return defaultIsWorking ? 'working' : 'nonworking';
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
      return newDate;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-app-text mb-4 flex items-center gap-2">
          <CalendarBlank className="w-5 h-5" />
          Work Schedule
        </h3>
        <p className="text-sm text-app-muted mb-4">
          Configure your working days for routine tasks
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-app-text">Saturday is a working day</span>
            <button
              onClick={handleSaturdayToggle}
              className={`w-12 h-6 rounded-full transition-colors ${
                schedule.saturdayIsWorkday ? 'bg-app-primary' : 'bg-app-border'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  schedule.saturdayIsWorkday ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>

        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-app-text">Sunday is a working day</span>
            <button
              onClick={handleSundayToggle}
              className={`w-12 h-6 rounded-full transition-colors ${
                schedule.sundayIsWorkday ? 'bg-app-primary' : 'bg-app-border'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  schedule.sundayIsWorkday ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>

        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="w-full bg-app-surface border border-app-border rounded-xl p-4 text-sm font-medium text-app-text hover:bg-app-border transition-colors flex items-center justify-between"
        >
          <span>Mark specific holidays/working days</span>
          <CalendarBlank className="w-5 h-5" />
        </button>

        {showCalendar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-app-card border border-app-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => navigateMonth('prev')} className="p-2 hover:bg-app-surface rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h4 className="text-sm font-semibold text-app-text">
                {format(currentMonth, 'MMMM yyyy')}
              </h4>
              <button onClick={() => navigateMonth('next')} className="p-2 hover:bg-app-surface rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-xs text-center text-app-muted font-medium py-1">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const status = getDayStatus(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                
                return (
                  <button
                    key={idx}
                    onClick={() => isCurrentMonth && handleDayClick(day)}
                    disabled={!isCurrentMonth}
                    className={`p-2 text-xs rounded-lg transition-colors ${
                      !isCurrentMonth ? 'text-app-muted/30' :
                      status === 'working' ? 'bg-app-primary/10 text-app-primary hover:bg-app-primary/20' :
                      status === 'nonworking' ? 'bg-app-surface text-app-muted hover:bg-app-border' :
                      status === 'override-working' ? 'bg-green-500 text-white hover:bg-green-600' :
                      'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-2 text-xs text-app-muted">
              <p className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-app-primary/10 border border-app-primary/20"></span>
                Working day (default)
              </p>
              <p className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-app-surface border border-app-border"></span>
                Non-working day (default)
              </p>
              <p className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-green-500"></span>
                Override: Working
              </p>
              <p className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-red-500"></span>
                Override: Non-working
              </p>
              <p className="text-xs text-app-muted/70 mt-2">Click any date to toggle override. Click again to remove override.</p>
            </div>
          </motion.div>
        )}

        <p className="text-xs text-app-muted">
          Monday through Friday are always working days by default
        </p>
      </div>
    </div>
  );
};
