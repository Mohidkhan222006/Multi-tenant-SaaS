'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBoardStore } from '@/stores/useBoardStore';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';

export default function CreateTaskDialog() {
  const queryClient = useQueryClient();
  const { isCreateTaskOpen, setCreateTaskOpen, selectedColumnId, selectedProjectId } = useBoardStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [error, setError] = useState('');

  const createTaskMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; priority: string; columnId: string }) => {
      const res = await fetch(`/api/projects/${selectedProjectId}/board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create task');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', selectedProjectId] });
      handleClose();
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setError('');
    setCreateTaskOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }
    if (!selectedColumnId) {
      setError('Invalid column selection');
      return;
    }
    createTaskMutation.mutate({
      title,
      description,
      priority,
      columnId: selectedColumnId,
    });
  };

  return (
    <Modal isOpen={isCreateTaskOpen} onClose={handleClose} title="Create New Task">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400">
            {error}
          </div>
        )}

        <Input
          label="Task Title"
          placeholder="e.g. Implement login API"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={createTaskMutation.isPending}
          autoFocus
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-sans">
            Description
          </label>
          <textarea
            placeholder="Describe this task in detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={createTaskMutation.isPending}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-zinc-700/50 transition-all duration-200"
            rows={3}
          />
        </div>

        <Select
          label="Priority"
          value={priority}
          onChange={(e: any) => setPriority(e.target.value)}
          disabled={createTaskMutation.isPending}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' },
          ]}
        />

        <div className="flex justify-end gap-3 mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={createTaskMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={createTaskMutation.isPending}>
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
