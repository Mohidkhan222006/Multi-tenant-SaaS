'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Shield, UserPlus, Users, Check, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Fetch Organization & Billing details
  const { data: orgData, isLoading: isOrgLoading } = useQuery({
    queryKey: ['organization', session?.user?.organizationId],
    queryFn: async () => {
      const res = await fetch('/api/organizations');
      if (!res.ok) throw new Error('Failed to fetch organization');
      return res.json();
    },
    enabled: !!session?.user?.organizationId,
  });

  // Fetch Workspace Members
  const { data: membersData, isLoading: isMembersLoading } = useQuery({
    queryKey: ['members', session?.user?.organizationId],
    queryFn: async () => {
      const res = await fetch('/api/organizations/members');
      if (!res.ok) throw new Error('Failed to fetch members');
      return res.json();
    },
    enabled: !!session?.user?.organizationId,
  });

  const members = membersData?.data || [];

  // Upgrade Plan Mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/billing/checkout', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to initialize checkout');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.data?.url) {
        window.location.href = data.data.url;
      }
    },
  });

  // Manage Billing Mutation
  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to initialize billing portal');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.data?.url) {
        window.location.href = data.data.url;
      }
    },
  });

  // Send Invite Mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send invitation');
      }
      return res.json();
    },
    onSuccess: () => {
      setInviteSuccess(true);
      setInviteEmail('');
      setTimeout(() => {
        setInviteSuccess(false);
        setIsInviteOpen(false);
      }, 2000);
    },
    onError: (err: any) => {
      setInviteError(err.message);
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteError('');
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const isPro = orgData?.data?.plan === 'pro';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-12 select-none relative overflow-hidden">
      {/* Back to Dashboard */}
      <div className="max-w-4xl mx-auto mb-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        {/* Navigation Sidebar */}
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-100 mb-6">Workspace Settings</h2>
          <div className="px-3 py-2 rounded-xl bg-slate-900/40 text-zinc-400 border border-slate-800 text-sm font-semibold flex items-center gap-3">
            <Shield className="h-4.5 w-4.5" /> General & Members
          </div>
        </div>

        {/* Settings Body */}
        <div className="md:col-span-2 flex flex-col gap-8">
          {/* Subscription Section */}
          <div className="border border-slate-900 bg-slate-900/20 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-200">Billing Plan</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage your subscription tier, billing invoices, and plan seat limits.
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-xl text-3xs font-extrabold uppercase tracking-wider border ${
                isPro ? 'bg-zinc-800/10 border-zinc-700/20 text-zinc-400' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                {isPro ? 'Pro Subscription' : 'Free Plan'}
              </span>
            </div>

            <div className="flex items-center gap-4 bg-slate-950/40 rounded-xl p-4 border border-slate-900 mb-6">
              <CreditCard className="h-5 w-5 text-slate-500 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-xs font-semibold text-slate-300">
                  {isPro ? 'Unlimited projects and team seats' : 'Maximum 3 projects and 5 team seats'}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              {isPro ? (
                <Button
                  onClick={() => portalMutation.mutate()}
                  isLoading={portalMutation.isPending}
                  variant="secondary"
                >
                  Manage Subscription
                </Button>
              ) : (
                <Button
                  onClick={() => checkoutMutation.mutate()}
                  isLoading={checkoutMutation.isPending}
                >
                  Upgrade to Pro ($19/mo)
                </Button>
              )}
            </div>
          </div>

          {/* Members list */}
          <div className="border border-slate-900 bg-slate-900/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-slate-200">Workspace Members</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Invite your colleagues to join and collaborate on board tasks.
                </p>
              </div>
              <Button size="sm" onClick={() => setIsInviteOpen(true)} className="gap-1.5 py-1.5 px-3">
                <UserPlus className="h-4 w-4" /> Invite
              </Button>
            </div>

            {isMembersLoading ? (
              <div className="flex flex-col gap-3">
                <div className="h-10 rounded-xl bg-slate-900/30 animate-pulse" />
                <div className="h-10 rounded-xl bg-slate-900/30 animate-pulse" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-900 rounded-xl">
                <Users className="h-8 w-8 text-slate-800 mx-auto mb-2" />
                <span className="text-xs text-slate-600">No active members found</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {members.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-900/50 bg-slate-950/20">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-300">
                        {member.user?.name || member.user?.email}
                      </span>
                      <span className="text-3xs text-slate-500 font-semibold">{member.user?.email}</span>
                    </div>
                    <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite Team Member">
        <form onSubmit={handleInviteSubmit} className="flex flex-col gap-4">
          {inviteError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          {inviteSuccess ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm font-medium text-emerald-400 flex items-center justify-center gap-2">
              <Check className="h-5 w-5" /> Invitation sent successfully!
            </div>
          ) : (
            <>
              <Input
                label="Email Address"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviteMutation.isPending}
                required
                type="email"
                autoFocus
              />

              <Select
                label="Workspace Role"
                value={inviteRole}
                onChange={(e: any) => setInviteRole(e.target.value)}
                disabled={inviteMutation.isPending}
                options={[
                  { value: 'member', label: 'Member' },
                  { value: 'admin', label: 'Admin' },
                ]}
              />

              <div className="flex justify-end gap-3 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsInviteOpen(false)}
                  disabled={inviteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={inviteMutation.isPending}>
                  Send Invite
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
