import React from 'react';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import InviteAcceptButton from './InviteAcceptButton';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(`/login?callbackUrl=/invite/${token}`);
  }

  // Look up invite details in the database
  const invite = await db.invite.findUnique({
    where: { token },
    include: {
      organization: {
        select: { name: true },
      },
    },
  });

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 font-sans text-center transition-colors duration-200">
        <div className="max-w-md border border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-900/30 rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Invalid Invitation</h2>
          <p className="text-sm text-slate-500 mt-2">
            This invitation link is invalid or has already been used. Please request a new invite.
          </p>
        </div>
      </div>
    );
  }

  if (invite.status !== 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 font-sans text-center transition-colors duration-200">
        <div className="max-w-md border border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-900/30 rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Invite Already Accepted</h2>
          <p className="text-sm text-slate-500 mt-2">
            This invitation has already been accepted. Head over to your dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 font-sans text-center transition-colors duration-200">
        <div className="max-w-md border border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-900/30 rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-rose-650 dark:text-rose-400">Invitation Expired</h2>
          <p className="text-sm text-slate-500 mt-2">
            This invitation token has expired. Please contact your administrator to receive a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 select-none relative overflow-hidden font-sans transition-colors duration-200">
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-zinc-300/20 dark:bg-zinc-800/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-slate-300/20 dark:bg-slate-800/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-zinc-700 to-slate-800 items-center justify-center font-extrabold text-lg text-white shadow-xl shadow-slate-950/30 mb-6">
          A
        </div>
        
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-2">
          Accept Workspace Invite
        </h2>
        
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">
          You have been invited to join the <strong>{invite.organization.name}</strong> workspace as a {invite.role}. Click below to join the team.
        </p>

        <div className="border border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-900/35 backdrop-blur-md rounded-2xl p-8 shadow-2xl transition-colors duration-200">
          <InviteAcceptButton token={token} />
        </div>
      </div>
    </div>
  );
}
