'use client';

import React from 'react';
import Sidebar from '@/components/organisms/Sidebar';
import KanbanBoard from '@/components/organisms/KanbanBoard';
import CreateProjectDialog from '@/components/organisms/CreateProjectDialog';
import CreateTaskDialog from '@/components/organisms/CreateTaskDialog';

export default function DashboardPage() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Kanban Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Banner */}
        <header className="px-8 py-5 border-b border-slate-200 dark:border-slate-900 bg-white/40 dark:bg-slate-950/20 flex items-center justify-between select-none transition-colors duration-200">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                Kanban Board
              </h1>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                <span>Live</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Manage tasks, priority milestones, and track progress.
            </p>
          </div>
        </header>

        {/* Board View */}
        <KanbanBoard />
      </main>

      {/* Modal Dialogs */}
      <CreateProjectDialog />
      <CreateTaskDialog />
    </div>
  );
}
