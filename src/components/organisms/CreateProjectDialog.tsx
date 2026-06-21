'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBoardStore } from '@/stores/useBoardStore';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function CreateProjectDialog() {
  const queryClient = useQueryClient();
  const { isCreateProjectOpen, setCreateProjectOpen, setSelectedProjectId } = useBoardStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create project');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSelectedProjectId(data.data.id);
      handleClose();
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const handleClose = () => {
    setName('');
    setDescription('');
    setError('');
    setCreateProjectOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    createProjectMutation.mutate({ name, description });
  };

  return (
    <Modal isOpen={isCreateProjectOpen} onClose={handleClose} title="Create New Project">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400">
            {error}
          </div>
        )}

        <Input
          label="Project Name"
          placeholder="e.g. Website Redesign"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={createProjectMutation.isPending}
          autoFocus
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-sans">
            Description
          </label>
          <textarea
            placeholder="Describe the goals and scope of the project..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={createProjectMutation.isPending}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-zinc-500/50 dark:focus:ring-zinc-700/50 transition-all duration-200"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={createProjectMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={createProjectMutation.isPending}>
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
