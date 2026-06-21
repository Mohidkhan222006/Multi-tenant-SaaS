'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBoardStore } from '@/stores/useBoardStore';
import { Search, Plus, Calendar, AlertCircle, Trash2, ArrowUpDown, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';

export default function KanbanBoard() {
  const queryClient = useQueryClient();
  const {
    selectedProjectId,
    setCreateTaskOpen,
    setSelectedColumnId,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    resetFilters,
  } = useBoardStore();

  // Fetch Board columns and tasks
  const { data: boardData, isLoading } = useQuery({
    queryKey: ['board', selectedProjectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${selectedProjectId}/board`);
      if (!res.ok) throw new Error('Failed to fetch board data');
      return res.json();
    },
    enabled: !!selectedProjectId,
  });

  const columns = boardData?.data?.columns || [];

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = React.useState<string | null>(null);

  // Task Position Update Mutation (with Optimistic Updates!)
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, columnId, position }: { taskId: string; columnId: string; position: number }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId, position }),
      });
      if (!res.ok) throw new Error('Failed to update task position');
      return res.json();
    },
    // Optimistic UI updates
    onMutate: async ({ taskId, columnId, position }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['board', selectedProjectId] });

      // Snapshot the previous value
      const previousBoard = queryClient.getQueryData(['board', selectedProjectId]);

      // Optimistically update the cache
      queryClient.setQueryData(['board', selectedProjectId], (old: any) => {
        if (!old || !old.data || !old.data.columns) return old;

        let foundTask: any = null;

        // 1. Remove task from its original column
        const newColumns = old.data.columns.map((col: any) => {
          const originalTask = col.tasks.find((t: any) => t.id === taskId);
          if (originalTask) {
            foundTask = { ...originalTask, columnId }; // update columnId reference
            return {
              ...col,
              tasks: col.tasks.filter((t: any) => t.id !== taskId),
            };
          }
          return col;
        });

        if (!foundTask) return old;

        // 2. Insert task into destination column at the target position index
        return {
          ...old,
          data: {
            ...old.data,
            columns: newColumns.map((col: any) => {
              if (col.id === columnId) {
                const tasks = [...col.tasks];
                tasks.splice(position, 0, foundTask);
                // Re-calculate positions
                return {
                  ...col,
                  tasks: tasks.map((t, idx) => ({ ...t, position: idx })),
                };
              }
              return col;
            }),
          },
        };
      });

      // Return context with snapshotted value
      return { previousBoard };
    },
    // If mutation fails, rollback to snapshot
    onError: (err, variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(['board', selectedProjectId], context.previousBoard);
      }
    },
    // Always refetch on success or error to sync database indices
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['board', selectedProjectId] });
    },
  });

  // Task Delete Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', selectedProjectId] });
    },
  });

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    // Set transparent image or drag data for compatibility
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop
  };

  const handleDropOnColumn = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    // Find the target column in state
    const col = columns.find((c: any) => c.id === columnId);
    if (!col) return;

    // Default to putting it at the end of the column list
    const position = col.tasks.length;

    updateTaskMutation.mutate({ taskId: draggedTaskId, columnId, position });
    setDraggedTaskId(null);
  };

  const handleDropOnTask = (e: React.DragEvent, destColumnId: string, destTaskId: string, destPosition: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedTaskId || draggedTaskId === destTaskId) return;

    updateTaskMutation.mutate({ taskId: draggedTaskId, columnId: destColumnId, position: destPosition });
    setDraggedTaskId(null);
  };

  const priorityColors = {
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    urgent: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  if (!selectedProjectId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-8 text-center select-none">
        <SlidersHorizontal className="h-10 w-10 text-slate-700 mb-4 animate-pulse" />
        <h3 className="text-lg font-semibold text-slate-300">Select or Create a Project</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-2">
          Choose a project from the sidebar to manage your task columns and track milestones.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-8 overflow-x-auto flex flex-col gap-6 bg-slate-950 select-none">
        <div className="h-8 w-48 rounded bg-slate-900 animate-pulse" />
        <div className="flex gap-6 h-full">
          <div className="w-80 flex-shrink-0 bg-slate-900/20 rounded-2xl h-[500px] animate-pulse" />
          <div className="w-80 flex-shrink-0 bg-slate-900/20 rounded-2xl h-[500px] animate-pulse" />
          <div className="w-80 flex-shrink-0 bg-slate-900/20 rounded-2xl h-[500px] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/80">
      {/* Control Bar (Filters & Search) */}
      <div className="px-8 py-4 border-b border-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/30 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-violet-500/50 transition-all duration-200"
          />
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto overflow-x-auto">
          {/* Priority filter buttons */}
          {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => {
            const isActive = priorityFilter === priority;
            return (
              <button
                key={priority}
                onClick={() => setPriorityFilter(isActive ? null : priority)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all duration-200 focus:outline-none ${
                  isActive
                    ? 'bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-950/30'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {priority}
              </button>
            );
          })}

          {(priorityFilter || searchQuery) && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors focus:outline-none ml-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Columns Container */}
      <div className="flex-1 p-8 overflow-x-auto flex gap-6 items-start h-full">
        {columns.map((col: any) => {
          // Client-side filtering logic
          const filteredTasks = col.tasks.filter((task: any) => {
            const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesPriority = !priorityFilter || task.priority === priorityFilter;
            return matchesSearch && matchesPriority;
          });

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnColumn(e, col.id)}
              className="w-80 flex-shrink-0 flex flex-col max-h-full bg-slate-900/10 border border-slate-900 rounded-2xl p-4 transition-all duration-200"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 px-1 select-none">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-200">{col.name}</span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-900/80 px-2 py-0.5 rounded-full">
                    {filteredTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedColumnId(col.id);
                    setCreateTaskOpen(true);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-[150px]">
                {filteredTasks.map((task: any, index: number) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnTask(e, col.id, task.id, index)}
                    className="group relative bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 shadow-sm hover:border-slate-700/80 hover:shadow-md hover:shadow-slate-950/20 transition-all duration-200 cursor-grab active:cursor-grabbing"
                  >
                    {/* Priority Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-3xs font-extrabold uppercase tracking-widest border ${priorityColors[task.priority as keyof typeof priorityColors] || ''}`}>
                        {task.priority}
                      </span>
                      <button
                        onClick={() => deleteTaskMutation.mutate(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/10 rounded-lg transition-all focus:outline-none"
                        title="Delete Task"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <h4 className="text-sm font-semibold text-slate-200 mb-1 tracking-tight leading-snug">
                      {task.title}
                    </h4>

                    {task.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                        {task.description}
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center gap-3 text-3xs font-semibold text-slate-500 select-none">
                      {task.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {filteredTasks.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-center select-none">
                    <CheckCircle2 className="h-7 w-7 text-slate-800 mb-2" />
                    <span className="text-xs text-slate-600">No tasks here</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
