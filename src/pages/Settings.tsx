import React, { useState, useRef, useEffect } from 'react';
import { useTheme, defaultTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { PaintBrush, Image as ImageIcon, ArrowCounterClockwise, Sun, Moon, Laptop, DownloadSimple, UploadSimple, CloudArrowDown } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { exportTasksAsJSON, exportTasksAsCSV, exportTasksAsMarkdown, downloadFile, readFileAsText } from '../lib/exportImport';
import { WorkScheduleSettings } from '../components/WorkScheduleSettings';
import { NotificationSettings } from '../components/NotificationSettings';
import { fetchGoogleTasks, fetchGoogleCalendarEvents } from '../lib/googleApi';

function BentoCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`bg-app-card border border-app-border/30 rounded-2xl p-6 ${className}`}>{children}</motion.div>;
}

export const Settings: React.FC = () => {
  const { theme, updateTheme, setMode } = useTheme();
  const { tasks, addTask } = useTasks();
  const { googleAccessToken, getValidGoogleToken, signIn } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPulling, setIsPulling] = useState(false);

  const handlePullFromGoogle = async () => {
    setIsPulling(true);
    try {
      let token = await getValidGoogleToken();
      if (!token) {
        token = await signIn(true);
        if (!token) {
          addToast('Please sign in with Google', 'error');
          return;
        }
      }

      const { tasks: gTasks } = await fetchGoogleTasks(token);
      const calendarEvents = await fetchGoogleCalendarEvents(token);
      let importedCount = 0;

      for (const gTask of gTasks) {
        const exists = tasks.some(t => t.googleTaskId === gTask.id);
        if (!exists) {
          await addTask({
            type: 'task',
            title: gTask.title || 'Untitled Task',
            description: gTask.notes || '',
            priority: 'medium',
            status: gTask.status === 'completed' ? 'done' : 'todo',
            tags: ['imported-from-google'],
            dueDate: gTask.due || undefined,
            googleTaskId: gTask.id,
          });
          importedCount++;
        }
      }

      for (const event of calendarEvents) {
        if (!event.start?.dateTime) continue;
        const exists = tasks.some(t => t.calendarEventId === event.id);
        if (!exists) {
          const startDate = new Date(event.start.dateTime);
          const scheduleTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
          await addTask({
            type: 'routine',
            title: event.summary || 'Untitled Event',
            description: event.description || '',
            priority: 'medium',
            status: 'todo',
            tags: ['imported-from-calendar'],
            scheduleTime,
            routineType: 'all',
            calendarEventId: event.id,
          });
          importedCount++;
        }
      }

      addToast(`Imported ${importedCount} items from Google`, 'success');
    } catch (error) {
      console.error('Pull error:', error);
      addToast('Failed to pull from Google', 'error');
    } finally {
      setIsPulling(false);
    }
  };

  const handleColorChange = (key: keyof typeof theme, value: string) => {
    updateTheme({ [key]: value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateTheme({ bgImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const resetTheme = () => {
    updateTheme(defaultTheme);
  };

  const handleExportJSON = () => {
    const json = exportTasksAsJSON(tasks);
    downloadFile(json, `flowforge-export-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    addToast('Exported as JSON', 'success');
  };

  const handleExportCSV = () => {
    const csv = exportTasksAsCSV(tasks);
    downloadFile(csv, `flowforge-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    addToast('Exported as CSV', 'success');
  };

  const handleExportMarkdown = () => {
    const md = exportTasksAsMarkdown(tasks);
    downloadFile(md, `flowforge-export-${new Date().toISOString().split('T')[0]}.md`, 'text/markdown');
    addToast('Exported as Markdown', 'success');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const content = await readFileAsText(file);
      if (file.name.endsWith('.json')) {
        const imported = JSON.parse(content);
        if (imported.tasks && Array.isArray(imported.tasks)) {
          addToast(`Imported ${imported.tasks.length} tasks`, 'success');
        }
      } else {
        addToast('Unsupported file format', 'error');
      }
    } catch (error) {
      addToast('Failed to import file', 'error');
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto min-h-[100dvh]">
      <header className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold tracking-tight text-app-text leading-[0.9] mb-2">Appearance</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-app-muted">Customize how FlowForge looks and feels.</motion.p>
        </div>
        <motion.button onClick={() => updateTheme(defaultTheme)} className="flex items-center gap-2 px-4 py-2 bg-app-surface text-app-text rounded-xl hover:bg-app-border transition-colors text-sm font-medium" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <ArrowCounterClockwise className="w-4 h-4" />Reset to Default
        </motion.button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <BentoCard>
            <NotificationSettings />
          </BentoCard>

          <BentoCard>
            <WorkScheduleSettings />
          </BentoCard>

          <BentoCard>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-app-primary/10 flex items-center justify-center text-app-primary"><Laptop className="w-5 h-5" /></div>
              <h2 className="text-lg font-semibold text-app-text">Theme Mode</h2>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setMode('light')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                  theme.mode === 'light' 
                    ? 'border-app-primary bg-app-primary/10 text-app-primary' 
                    : 'border-app-border text-app-muted hover:border-app-text'
                }`}
              >
                <Sun className="w-5 h-5" />
                Light
              </button>
              <button
                onClick={() => setMode('dark')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                  theme.mode === 'dark' 
                    ? 'border-app-primary bg-app-primary/10 text-app-primary' 
                    : 'border-app-border text-app-muted hover:border-app-text'
                }`}
              >
                <Moon className="w-5 h-5" />
                Dark
              </button>
              <button
                onClick={() => setMode('system')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                  theme.mode === 'system' 
                    ? 'border-app-primary bg-app-primary/10 text-app-primary' 
                    : 'border-app-border text-app-muted hover:border-app-text'
                }`}
              >
                <Laptop className="w-5 h-5" />
                System
              </button>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-app-primary/10 flex items-center justify-center text-app-primary">
                <PaintBrush className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-app-text">Color Palette</h2>
            </div>

            <div className="space-y-6">
              <ColorPicker label="Primary Accent" value={theme.appPrimary} onChange={(v) => handleColorChange('appPrimary', v)} />
              <ColorPicker label="Primary Text (on Accent)" value={theme.appPrimaryFg} onChange={(v) => handleColorChange('appPrimaryFg', v)} />
              <div className="h-px w-full bg-app-border my-4" />
              <ColorPicker label="Background" value={theme.appBg} onChange={(v) => handleColorChange('appBg', v)} />
              <ColorPicker label="Card Background" value={theme.appCard} onChange={(v) => handleColorChange('appCard', v)} />
              <ColorPicker label="Surface (Hover/Secondary)" value={theme.appSurface} onChange={(v) => handleColorChange('appSurface', v)} />
              <div className="h-px w-full bg-app-border my-4" />
              <ColorPicker label="Main Text" value={theme.appText} onChange={(v) => handleColorChange('appText', v)} />
              <ColorPicker label="Muted Text" value={theme.appMuted} onChange={(v) => handleColorChange('appMuted', v)} />
              <ColorPicker label="Borders" value={theme.appBorder} onChange={(v) => handleColorChange('appBorder', v)} />
            </div>
          </BentoCard>
        </div>

        <div className="space-y-8">
          <BentoCard>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-app-primary/10 flex items-center justify-center text-app-primary">
                <CloudArrowDown className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-app-text">Pull from Google</h2>
            </div>

            <p className="text-sm text-app-muted mb-6">
              Import tasks from Google Tasks and events from Google Calendar as routines.
            </p>

            <button
              onClick={handlePullFromGoogle}
              disabled={isPulling}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-app-primary text-app-primary-fg rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <CloudArrowDown className="w-5 h-5" />
              {isPulling ? 'Pulling...' : 'Pull from Google'}
            </button>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-app-primary/10 flex items-center justify-center text-app-primary">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-app-text">Background Image</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-app-text mb-2">Image URL</label>
                <input 
                  type="text" 
                  value={theme.bgImage}
                  onChange={(e) => handleColorChange('bgImage', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full bg-app-surface border border-app-border rounded-xl px-4 py-3 text-app-text focus:border-app-primary outline-none transition-colors"
                />
              </div>

              <div className="relative w-full flex items-center py-2">
                <div className="flex-grow border-t border-app-border"></div>
                <span className="flex-shrink-0 mx-4 text-app-muted text-sm">or</span>
                <div className="flex-grow border-t border-app-border"></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-app-text mb-2">Upload Image</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full text-sm text-app-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-app-primary/10 file:text-app-primary hover:file:bg-app-primary/20 transition-all cursor-pointer"
                />
              </div>

              {theme.bgImage && (
                <div className="mt-4">
                  <p className="text-xs text-app-muted mb-2 uppercase tracking-widest">Preview</p>
                  <div 
                    className="w-full h-32 rounded-xl border border-app-border bg-cover bg-center"
                    style={{ backgroundImage: `url(${theme.bgImage})` }}
                  />
                  <button 
                    onClick={() => handleColorChange('bgImage', '')}
                    className="mt-2 text-sm text-red-500 hover:text-red-600 font-medium"
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-app-primary/10 flex items-center justify-center text-app-primary">
                <DownloadSimple className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-app-text">Export Data</h2>
            </div>

            <p className="text-sm text-app-muted mb-6">
              Download your tasks in different formats for backup or use in other apps.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handleExportJSON}
                className="flex flex-col items-center gap-2 p-4 bg-app-surface rounded-xl hover:bg-app-border transition-colors"
              >
                <DownloadSimple className="w-6 h-6 text-app-primary" />
                <span className="text-sm font-medium text-app-text">JSON</span>
                <span className="text-xs text-app-muted">Full backup</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="flex flex-col items-center gap-2 p-4 bg-app-surface rounded-xl hover:bg-app-border transition-colors"
              >
                <DownloadSimple className="w-6 h-6 text-app-primary" />
                <span className="text-sm font-medium text-app-text">CSV</span>
                <span className="text-xs text-app-muted">Spreadsheet</span>
              </button>
              <button
                onClick={handleExportMarkdown}
                className="flex flex-col items-center gap-2 p-4 bg-app-surface rounded-xl hover:bg-app-border transition-colors"
              >
                <DownloadSimple className="w-6 h-6 text-app-primary" />
                <span className="text-sm font-medium text-app-text">Markdown</span>
                <span className="text-xs text-app-muted">Obsidian/Notes</span>
              </button>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-app-primary/10 flex items-center justify-center text-app-primary">
                <UploadSimple className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-app-text">Import Data</h2>
            </div>

            <p className="text-sm text-app-muted mb-6">
              Restore tasks from a JSON backup file.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImport}
              className="w-full text-sm text-app-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-app-primary/10 file:text-app-primary hover:file:bg-app-primary/20 transition-all cursor-pointer"
            />
          </BentoCard>
        </div>


      </div>


    </div>
  );
};

const ColorPicker = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-app-text">{label}</label>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-app-muted uppercase">{value}</span>
        <div className="relative w-10 h-10 rounded-full overflow-hidden border border-app-border shadow-sm cursor-pointer">
          <input 
            type="color" 
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -inset-2 w-14 h-14 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
