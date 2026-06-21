import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const acceptSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in to accept the invite.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validation = acceptSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { token } = validation.data;

    // Process invitation acceptance in a transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Find the invite
      const invite = await tx.invite.findUnique({
        where: { token },
      });

      if (!invite) {
        throw new Error('Invalid invitation token');
      }

      if (invite.status !== 'pending') {
        throw new Error('This invitation has already been accepted or revoked');
      }

      if (invite.expiresAt < new Date()) {
        throw new Error('This invitation token has expired');
      }

      // Check if user is already a member
      const existingMember = await tx.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: session.user.id,
            organizationId: invite.organizationId,
          },
        },
      });

      if (existingMember) {
        // Just mark the invite as accepted and return the organizationId
        await tx.invite.update({
          where: { id: invite.id },
          data: { status: 'accepted' },
        });

        return { organizationId: invite.organizationId };
      }

      // 2. Add user to organization members
      await tx.organizationMember.create({
        data: {
          userId: session.user.id,
          organizationId: invite.organizationId,
          role: invite.role,
        },
      });

      // 3. Mark invite as accepted
      await tx.invite.update({
        where: { id: invite.id },
        data: { status: 'accepted' },
      });

      // 4. Log Activity
      await tx.activityLog.create({
        data: {
          organizationId: invite.organizationId,
          actorId: session.user.id,
          action: 'member.join',
          targetType: 'member',
          targetId: session.user.id,
          metadata: { role: invite.role },
        },
      });

      return { organizationId: invite.organizationId, role: invite.role };
    });

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 400 });
  }
}
