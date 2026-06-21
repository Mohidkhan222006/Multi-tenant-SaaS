'use client';

import React from 'react';
import Sidebar from '@/components/organisms/Sidebar';
import KanbanBoard from '@/components/organisms/KanbanBoard';
import CreateProjectDialog from '@/components/organisms/CreateProjectDialog';
import CreateTaskDialog from '@/components/organisms/CreateTaskDialog';

export default function DashboardPage() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Kanban Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Banner */}
        <header className="px-8 py-5 border-b border-slate-900 bg-slate-950/20 flex items-center justify-between select-none">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-slate-100 bg-gradient-to-r from-slate-100 via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Kanban Board
            </h1>
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
