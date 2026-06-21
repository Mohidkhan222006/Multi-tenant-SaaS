'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, Sparkles, AlertCircle } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Helper to convert name to url-friendly slug
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    // Generate slug draft: lowercase letters, numbers, and hyphens
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // remove special characters
      .replace(/\s+/g, '-'); // replace spaces with hyphens
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      // Update next-auth session context dynamically!
      await update({
        organizationId: data.data.id,
        role: 'owner',
      });

      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 select-none relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 items-center justify-center font-extrabold text-lg text-white shadow-xl shadow-violet-950/20 mb-4">
            <Sparkles className="h-5.5 w-5.5 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">
            Set up your Organization
          </h2>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            Create a workspace to collaborate and manage projects.
          </p>
        </div>

        <div className="border border-slate-900 bg-slate-900/35 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400 flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Organization Name"
              placeholder="e.g. Acme Corp"
              value={name}
              onChange={handleNameChange}
              disabled={isLoading}
              required
            />

            <div className="flex flex-col gap-1.5">
              <Input
                label="Workspace URL Subdomain"
                placeholder="e.g. acme-corp"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                disabled={isLoading}
                required
              />
              <span className="text-3xs text-slate-500 font-semibold uppercase tracking-wider pl-1">
                Your workspace will be accessible at: {slug || 'your-subdomain'}.aether.com
              </span>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full mt-2 font-semibold">
              Create Workspace
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
