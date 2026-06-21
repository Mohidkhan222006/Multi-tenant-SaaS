'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function InviteAcceptButton({ token }: { token: string }) {
  const { update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      // Update next-auth session token dynamically with the new workspace context!
      await update({
        organizationId: data.data.organizationId,
        role: data.data.role,
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
    <div className="flex flex-col gap-4">
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400">
          {error}
        </div>
      )}

      <Button
        onClick={handleAccept}
        isLoading={isLoading}
        className="w-full font-semibold"
      >
        Accept and Enter Dashboard
      </Button>
    </div>
  );
}
