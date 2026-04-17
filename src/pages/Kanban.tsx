'use client';

import React, { useState } from 'react';
import { useTasks, Task } from '../contexts/TaskContext';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Circle, CheckCircle, DotsThree } from '@phosphor-icons/react';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { InfoCard } from '../components/InfoCard';

interface Column { id: string; title: string; color: string; }

const COLUMNS: Column[] = [
  { id: 'todo', title: 'To Do', color: 'bg-zinc-100 dark:bg-zinc-900' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-amber-100 dark:bg-amber-950' },
  { id: 'done', title: 'Done', color: 'bg-emerald-100 dark:bg-emerald-950' },
];

function SortableTask({ task, onClick, onToggle }: { task: Task; onClick: () => void; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-app-card border border-app-border/30 rounded-xl p-4 mb-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow ${isDragging ? 'opacity-50 shadow-xl ring-2 ring-app-primary/30' : ''}`}
    >
      <div className="flex items-start gap-3">
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="shrink-0 mt-0.5">
          {task.status === 'done' ? <CheckCircle weight="fill" className="w-5 h-5 text-app-primary" /> : <Circle className="w-5 h-5 text-app-muted" />}
        </button>
        <div className="flex-1 min-w-0" onClick={onClick}>
          <p className={`font-medium truncate ${task.status === 'done' ? 'text-app-muted line-through' : 'text-app-text'}`}>{task.title}</p>
          {task.description && <p className="text-sm text-app-muted line-clamp-2 mt-1">{task.description}</p>}
          <div className="flex items-center gap-2 mt-2">
            {task.tags?.slice(0, 2).map(tag => <span key={tag} className="text-xs px-2 py-0.5 bg-app-surface text-app-muted rounded">{tag}</span>)}
            {task.priority === 'high' && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded font-semibold">!</span>}
          </div>
        </div>
        <button className="text-app-muted hover:text-app-text"><DotsThree className="w-5 h-5" /></button>
      </div>
    </motion.div>
  );
}

function KanbanColumn({ column, tasks, onTaskClick, onToggle }: { column: Column; tasks: Task[]; onTaskClick: (id: string) => void; onToggle: (id: string, updates?: Partial<Task>) => void }) {
  return (
    <div className="flex flex-col">
      <motion.div className={`${column.color} rounded-t-2xl px-5 py-4 flex items-center justify-between`} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{column.title}</h3>
        <span className="text-sm font-mono text-zinc-700 dark:text-zinc-300 bg-white/50 dark:bg-black/30 px-2 py-0.5 rounded">{tasks.length}</span>
      </motion.div>
      <div className="bg-app-surface/30 border-x border-b border-app-border/30 rounded-b-2xl p-4 flex-1 min-h-[60vh]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="text-center text-app-muted/50 py-12 text-sm italic">No tasks</div>
          ) : (
            tasks.map(task => <SortableTask key={task.id} task={task} onClick={() => onTaskClick(task.id)} onToggle={() => onToggle(task.id)} />)
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export const KanbanPage: React.FC = () => {
  const { tasks, updateTask } = useTasks();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const getTasksByStatus = (status: string) => {
    return tasks
      .filter(task => task.status === status)
      .sort((a, b) => {
        // Done column: most recently completed first
        if (status === 'done') {
          return (b.completedAt || 0) - (a.completedAt || 0);
        }
        // In-progress: high priority first, then by creation date
        if (status === 'in-progress') {
          const pMap = { high: 3, medium: 2, low: 1 };
          if (pMap[a.priority] !== pMap[b.priority]) {
            return pMap[b.priority] - pMap[a.priority];
          }
        }
        // Todo: by due date (soonest first), then priority, then creation
        const aDate = isTodoTask(a) && a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDate = isTodoTask(b) && b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (aDate !== bDate) return aDate - bDate;
        const pMap = { high: 3, medium: 2, low: 1 };
        if (pMap[a.priority] !== pMap[b.priority]) {
          return pMap[b.priority] - pMap[a.priority];
        }
        return b.createdAt - a.createdAt;
      });
  };
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;
  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;
    const overId = over.id as string;
    if (COLUMNS.some(col => col.id === overId)) { updateTask(activeTask.id, { status: overId as Task['status'] }); }
    else { const overTask = tasks.find(t => t.id === overId); if (overTask && activeTask.status !== overTask.status) updateTask(activeTask.id, { status: overTask.status }); }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-[100dvh]">
      <InfoCard
        id="kanban"
        title="📋 Kanban Board"
        description="Organize tasks visually by status. Drag and drop cards between columns to update progress."
        tips={[
          "Drag tasks from 'To Do' to 'In Progress' when you start working",
          "Move to 'Done' when complete",
          "Perfect for managing projects with multiple stages"
        ]}
      />
      <header className="mb-8">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold tracking-tight text-app-text leading-[0.9] mb-2">Kanban</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-app-muted">Drag tasks between columns to update their status</motion.p>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map((column, i) => (
            <motion.div key={column.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <KanbanColumn column={column} tasks={getTasksByStatus(column.id)} onTaskClick={setSelectedTaskId} onToggle={updateTask} />
            </motion.div>
          ))}
        </div>
        <DragOverlay>{activeTask && <div className="bg-app-card border-2 border-app-primary rounded-xl p-4 shadow-2xl opacity-90"><p className="font-medium text-app-text">{activeTask.title}</p></div>}</DragOverlay>
      </DndContext>

      <AnimatePresence>{selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTaskId(null)} />}</AnimatePresence>
    </div>
  );
};