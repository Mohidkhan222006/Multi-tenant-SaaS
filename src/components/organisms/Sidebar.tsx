'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession, signOut } from 'next-auth/react';
import { useBoardStore } from '@/stores/useBoardStore';
import { LayoutGrid, FolderPlus, LogOut, Briefcase, Plus, User } from 'lucide-react';
import Button from '../ui/Button';

export default function Sidebar() {
  const { data: session } = useSession();
  const { selectedProjectId, setSelectedProjectId, setCreateProjectOpen } = useBoardStore();

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    },
    enabled: !!session?.user?.organizationId,
  });

  const projects = projectsData?.data || [];

  // Automatically select the first project if none is selected
  React.useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId, setSelectedProjectId]);

  return (
    <aside className="w-64 border-r border-slate-900 bg-slate-950/50 flex flex-col h-full select-none">
      {/* Brand / Organization Banner */}
      <div className="p-6 border-b border-slate-900 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-violet-950/20">
          A
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-semibold text-slate-100 truncate">
            {session?.user?.name || 'My Workplace'}
          </span>
          <span className="text-xs text-slate-500 font-medium tracking-wider uppercase">
            {session?.user?.role || 'Member'}
          </span>
        </div>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6">
        <div>
          <div className="flex items-center justify-between px-2 mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Projects
            </span>
            <button
              onClick={() => setCreateProjectOpen(true)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors focus:outline-none"
              title="Create Project"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2 px-2">
              <div className="h-8 rounded-lg bg-slate-900/50 animate-pulse" />
              <div className="h-8 rounded-lg bg-slate-900/50 animate-pulse" />
            </div>
          ) : projects.length === 0 ? (
            <div className="px-2 py-4 rounded-xl border border-dashed border-slate-900 text-center flex flex-col items-center gap-2">
              <span className="text-xs text-slate-500">No projects yet</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-semibold py-1 px-2.5"
                onClick={() => setCreateProjectOpen(true)}
              >
                <FolderPlus className="h-3 w-3 mr-1" /> Add Project
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {projects.map((project: any) => {
                const isActive = selectedProjectId === project.id;
                return (
                  <li key={project.id}>
                    <button
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 focus:outline-none ${
                        isActive
                          ? 'bg-slate-800/80 text-violet-400 border border-slate-700/50'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
                      }`}
                    >
                      <Briefcase className={`h-4 w-4 ${isActive ? 'text-violet-400' : 'text-slate-500'}`} />
                      <span className="truncate">{project.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* User Section / Sign Out */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/20 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
            <User className="h-4 w-4" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-semibold text-slate-300 truncate">
              {session?.user?.email}
            </span>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/10 transition-all focus:outline-none"
          title="Sign Out"
        >
          <LogOut className="h-4.5 w-4.5" />
        </button>
      </div>
    </aside>
  );
}
