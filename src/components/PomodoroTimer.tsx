import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, ArrowCounterClockwise, Bell, Gear, CheckCircle } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

interface TimerSettings {
  focusDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  autoStartBreak: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  notificationEnabled: boolean;
}

const DEFAULT_SETTINGS: TimerSettings = {
  focusDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreak: false,
  autoStartFocus: false,
  soundEnabled: true,
  notificationEnabled: true,
};

const STORAGE_KEY = 'flowforge_pomodoro';
const SETTINGS_KEY = 'flowforge_pomodoro_settings';

interface TimerState {
  timeLeft: number;
  isActive: boolean;
  mode: 'focus' | 'break' | 'long-break';
  sessionsCompleted: number;
}

const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.warn('Could not play notification sound', e);
  }
};

const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false;
  
  if (Notification.permission === 'granted') return true;
  
  if (Notification.permission === 'denied') return false;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

const sendBrowserNotification = (title: string, body: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  try {
    new Notification(title, {
      body,
      icon: '/icon.png',
      badge: '/icon.png',
    });
  } catch (e) {
    console.warn('Could not send notification', e);
  }
};

export const PomodoroTimer: React.FC = () => {
  const [settings, setSettings] = useState<TimerSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  
  const [state, setState] = useState<TimerState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const saved = JSON.parse(stored) as TimerState & { savedAt: number };
        const elapsed = Math.floor((Date.now() - saved.savedAt) / 1000);
        const newTimeLeft = Math.max(0, saved.timeLeft - elapsed);
        return { ...saved, timeLeft: newTimeLeft, savedAt: undefined };
      }
    } catch {}
    return {
      timeLeft: DEFAULT_SETTINGS.focusDuration * 60,
      isActive: false,
      mode: 'focus',
      sessionsCompleted: 0,
    };
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  
  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const saveState = useCallback((newState: TimerState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...newState, savedAt: Date.now() }));
    } catch {}
  }, []);

  const getDuration = useCallback((mode: TimerState['mode']) => {
    switch (mode) {
      case 'focus': return settings.focusDuration * 60;
      case 'break': return settings.breakDuration * 60;
      case 'long-break': return settings.longBreakDuration * 60;
    }
  }, [settings]);

  const handleTimerComplete = useCallback(() => {
    setState(prev => {
      let nextMode: TimerState['mode'];
      let newSessionsCompleted = prev.sessionsCompleted;
      
      if (prev.mode === 'focus') {
        newSessionsCompleted = prev.sessionsCompleted + 1;
        if (newSessionsCompleted % settings.sessionsBeforeLongBreak === 0) {
          nextMode = 'long-break';
        } else {
          nextMode = 'break';
        }
      } else {
        nextMode = 'focus';
      }
      
      const newState: TimerState = {
        mode: nextMode,
        isActive: false,
        timeLeft: nextMode === 'focus' ? settings.focusDuration * 60 : 
                  nextMode === 'break' ? settings.breakDuration * 60 : 
                  settings.longBreakDuration * 60,
        sessionsCompleted: newSessionsCompleted,
      };
      
      saveState(newState);
      return newState;
    });

    if (settings.soundEnabled) {
      playNotificationSound();
    }
    
    const message = state.mode === 'focus' 
      ? 'Focus session complete! Time for a break.' 
      : 'Break is over! Ready to focus?';
    
    if (settings.notificationEnabled && notificationPermission === 'granted') {
      sendBrowserNotification(
        state.mode === 'focus' ? 'Focus Complete! 🍅' : 'Break Over! ⏰',
        message
      );
    }
    
    toast.success(message);
    
    const shouldAutoStart = (state.mode === 'focus' && settings.autoStartFocus) ||
                           (state.mode !== 'focus' && settings.autoStartBreak);
    if (shouldAutoStart) {
      setState(prev => ({ ...prev, isActive: true }));
    }
  }, [settings, state.mode, notificationPermission, saveState]);

  useEffect(() => {
    if (state.isActive && state.timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setState(prev => {
          if (prev.timeLeft <= 1) {
            return prev;
          }
          const newTimeLeft = prev.timeLeft - 1;
          const newState = { ...prev, timeLeft: newTimeLeft };
          saveState(newState);
          return newState;
        });
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isActive, saveState]);

  useEffect(() => {
    if (state.timeLeft === 0 && state.isActive) {
      handleTimerComplete();
    }
  }, [state.timeLeft, state.isActive, handleTimerComplete]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const toggleTimer = () => {
    setState(prev => ({ ...prev, isActive: !prev.isActive }));
  };
  
  const resetTimer = () => {
    setState(prev => {
      const newState = {
        ...prev,
        isActive: false,
        timeLeft: getDuration(prev.mode),
      };
      saveState(newState);
      return newState;
    });
  };
  
  const switchMode = (newMode: TimerState['mode']) => {
    setState(prev => {
      const newState = {
        ...prev,
        mode: newMode,
        isActive: false,
        timeLeft: newMode === 'focus' ? settings.focusDuration * 60 :
                  newMode === 'break' ? settings.breakDuration * 60 :
                  settings.longBreakDuration * 60,
      };
      saveState(newState);
      return newState;
    });
  };

  const requestNotification = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(granted);
    if (!granted) {
      toast.error('Notification permission denied');
    } else {
      toast.success('Notifications enabled');
    }
  };

  const minutes = Math.floor(state.timeLeft / 60);
  const seconds = state.timeLeft % 60;
  const totalDuration = getDuration(state.mode);
  const progress = state.timeLeft / totalDuration;

  const modeLabels = {
    'focus': 'Focus',
    'break': 'Short Break',
    'long-break': 'Long Break',
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto p-6">
      <div className="flex gap-2 mb-8 p-1 bg-app-surface rounded-full border border-app-border">
        {(['focus', 'break', 'long-break'] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${state.mode === m ? 'bg-app-card text-app-primary shadow-sm' : 'text-app-muted hover:text-app-text'}`}
          >
            {modeLabels[m]}
          </button>
        ))}
      </div>

      <div className="relative flex items-center justify-center w-64 h-64 mb-8">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="128"
            cy="128"
            r="120"
            className="stroke-app-surface fill-none"
            strokeWidth="4"
          />
          <motion.circle
            cx="128"
            cy="128"
            r="120"
            className="stroke-app-primary fill-none"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 1 }}
            animate={{ pathLength: progress }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </svg>
        <span className="text-6xl font-bold tracking-[-0.02em] text-app-text">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-8 text-app-muted text-sm">
        <CheckCircle className="w-4 h-4" />
        <span>{state.sessionsCompleted} sessions today</span>
      </div>

      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={resetTimer}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-app-card border border-app-border text-app-muted hover:text-app-text transition-colors shadow-sm"
        >
          <ArrowCounterClockwise className="w-5 h-5" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTimer}
          className="w-16 h-16 flex items-center justify-center rounded-full bg-app-primary text-app-primary-fg shadow-[0_8px_20px_rgba(13,148,136,0.3)]"
        >
          {state.isActive ? <Pause weight="fill" className="w-8 h-8" /> : <Play weight="fill" className="w-8 h-8 ml-1" />}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSettings(!showSettings)}
          className={`w-12 h-12 flex items-center justify-center rounded-full border transition-colors ${showSettings ? 'bg-app-primary text-app-primary-fg' : 'bg-app-card border-app-border text-app-muted hover:text-app-text'}`}
        >
          <Gear className="w-5 h-5" />
        </motion.button>
      </div>

      {showSettings && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 w-full bg-app-card border border-app-border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-app-text mb-4">Timer Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-app-muted">Focus Duration (min)</label>
              <input 
                type="number" 
                value={settings.focusDuration}
                onChange={(e) => setSettings(s => ({ ...s, focusDuration: Math.max(1, parseInt(e.target.value) || 25) }))}
                className="w-16 bg-app-surface border border-app-border rounded-lg px-2 py-1 text-center"
                min={1}
                max={120}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-app-muted">Break Duration (min)</label>
              <input 
                type="number" 
                value={settings.breakDuration}
                onChange={(e) => setSettings(s => ({ ...s, breakDuration: Math.max(1, parseInt(e.target.value) || 5) }))}
                className="w-16 bg-app-surface border border-app-border rounded-lg px-2 py-1 text-center"
                min={1}
                max={60}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-app-muted">Long Break (min)</label>
              <input 
                type="number" 
                value={settings.longBreakDuration}
                onChange={(e) => setSettings(s => ({ ...s, longBreakDuration: Math.max(1, parseInt(e.target.value) || 15) }))}
                className="w-16 bg-app-surface border border-app-border rounded-lg px-2 py-1 text-center"
                min={1}
                max={60}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-app-muted">Sessions before long break</label>
              <input 
                type="number" 
                value={settings.sessionsBeforeLongBreak}
                onChange={(e) => setSettings(s => ({ ...s, sessionsBeforeLongBreak: Math.max(1, parseInt(e.target.value) || 4) }))}
                className="w-16 bg-app-surface border border-app-border rounded-lg px-2 py-1 text-center"
                min={1}
                max={10}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-app-muted flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Sound
              </label>
              <button 
                onClick={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
                className={`w-12 h-6 rounded-full transition-colors ${settings.soundEnabled ? 'bg-app-primary' : 'bg-app-border'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-app-muted flex items-center gap-2">
                Notifications
              </label>
              {notificationPermission === 'unsupported' ? (
                <span className="text-app-muted text-sm">Not supported</span>
              ) : notificationPermission === 'denied' ? (
                <button onClick={requestNotification} className="text-app-primary text-sm">Enable in browser</button>
              ) : (
                <button 
                  onClick={() => setSettings(s => ({ ...s, notificationEnabled: !s.notificationEnabled }))}
                  className={`w-12 h-6 rounded-full transition-colors ${settings.notificationEnabled ? 'bg-app-primary' : 'bg-app-border'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.notificationEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-app-muted">Auto-start break</label>
              <button 
                onClick={() => setSettings(s => ({ ...s, autoStartBreak: !s.autoStartBreak }))}
                className={`w-12 h-6 rounded-full transition-colors ${settings.autoStartBreak ? 'bg-app-primary' : 'bg-app-border'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.autoStartBreak ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-app-muted">Auto-start focus</label>
              <button 
                onClick={() => setSettings(s => ({ ...s, autoStartFocus: !s.autoStartFocus }))}
                className={`w-12 h-6 rounded-full transition-colors ${settings.autoStartFocus ? 'bg-app-primary' : 'bg-app-border'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.autoStartFocus ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};