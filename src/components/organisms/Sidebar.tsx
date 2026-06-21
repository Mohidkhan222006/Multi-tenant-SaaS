'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession, signOut } from 'next-auth/react';
import { useBoardStore } from '@/stores/useBoardStore';
import { FolderPlus, LogOut, Briefcase, Plus, User, Sun, Moon, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import { useTheme } from '@/providers/ThemeProvider';

export default function Sidebar() {
  const { data: session } = useSession();
  const { selectedProjectId, setSelectedProjectId, setCreateProjectOpen } = useBoardStore();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

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

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete project');
      }
      return res.json();
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // If we deleted the currently selected project, clear it
      if (selectedProjectId === deletedId) {
        setSelectedProjectId('');
      }
    },
  });

  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project? All columns, tasks, and comments will be permanently deleted.')) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  return (
    <aside className="w-64 border-r border-slate-200/60 dark:border-slate-900/60 bg-slate-50/90 dark:bg-slate-950/70 backdrop-blur-lg flex flex-col h-full select-none transition-all duration-300">
      {/* Brand / Organization Banner */}
      <div className="p-6 border-b border-slate-200/60 dark:border-slate-900/60 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-zinc-700 via-slate-800 to-zinc-900 flex items-center justify-center font-bold text-white shadow-md shadow-slate-200/20 dark:shadow-slate-950/30">
          A
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
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
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Projects
            </span>
            <button
              onClick={() => setCreateProjectOpen(true)}
              className="p-1 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-850/80 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none"
              title="Create Project"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2 px-2">
              <div className="h-8 rounded-lg bg-slate-250/50 dark:bg-slate-900/50 animate-pulse" />
              <div className="h-8 rounded-lg bg-slate-250/50 dark:bg-slate-900/50 animate-pulse" />
            </div>
          ) : projects.length === 0 ? (
            <div className="px-2 py-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center flex flex-col items-center gap-2">
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
                  <li key={project.id} className="group/item relative flex items-center">
                    <button
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`flex-1 flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-300 focus:outline-none pr-10 ${
                        isActive
                          ? 'bg-white dark:bg-slate-800/80 text-slate-900 dark:text-zinc-100 border border-slate-200/80 dark:border-slate-700/50 shadow-sm shadow-slate-200/50 dark:shadow-none translate-x-1 font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/50 border border-transparent hover:translate-x-0.5'
                      }`}
                    >
                      <Briefcase className={`h-4 w-4 transition-transform duration-200 ${isActive ? 'text-slate-700 dark:text-zinc-400 scale-105' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span className="truncate">{project.name}</span>
                    </button>
                    
                    <button
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      className={`absolute right-2 opacity-0 group-hover/item:opacity-100 p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/10 rounded-lg transition-all focus:outline-none ${
                        isActive ? 'translate-x-1' : ''
                      }`}
                      title="Delete Project"
                      disabled={deleteProjectMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* User Section / Sign Out */}
      <div className="p-4 border-t border-slate-200/60 dark:border-slate-900/60 bg-slate-100/30 dark:bg-slate-950/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-900 border border-slate-350 dark:border-slate-800 flex items-center justify-center text-slate-655 dark:text-slate-300 flex-shrink-0">
            <User className="h-4 w-4" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
              {session?.user?.email}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-850 hover:rotate-45 active:scale-90 transition-all duration-300 focus:outline-none"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-955/10 transition-all active:scale-95 focus:outline-none"
            title="Sign Out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
