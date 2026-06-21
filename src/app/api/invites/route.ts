import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmail, getInviteEmailTemplate } from '@/lib/mail';
import { z } from 'zod';
import crypto from 'crypto';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member']),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify Role: Only Owner or Admin can invite members
  if (session.user.role !== 'owner' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Only administrators can invite members' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validation = inviteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { email, role } = validation.data;

    // Enforce seat limits for Free plan
    const result = await db.$transaction(async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: session.user.organizationId! },
        select: { name: true, plan: true },
      });

      if (!org) throw new Error('Organization not found');

      if (org.plan === 'free') {
        const memberCount = await tx.organizationMember.count({
          where: { organizationId: session.user.organizationId! },
        });

        const pendingInvitesCount = await tx.invite.count({
          where: {
            organizationId: session.user.organizationId!,
            status: 'pending',
            expiresAt: { gt: new Date() },
          },
        });

        if (memberCount + pendingInvitesCount >= 5) {
          throw new Error('You have reached the maximum seat limit of 5 members on the Free plan. Please upgrade to Pro.');
        }
      }

      // Check if user is already a member
      const existingMember = await tx.organizationMember.findFirst({
        where: {
          organizationId: session.user.organizationId!,
          user: { email },
        },
      });

      if (existingMember) {
        throw new Error('User is already a member of this organization');
      }

      // Create unique invite token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiration

      const invite = await tx.invite.create({
        data: {
          organizationId: session.user.organizationId!,
          email,
          role,
          token,
          expiresAt,
        },
      });

      // Write Activity Log
      await tx.activityLog.create({
        data: {
          organizationId: session.user.organizationId!,
          actorId: session.user.id,
          action: 'member.invite',
          targetType: 'invite',
          targetId: invite.id,
          metadata: { email, role },
        },
      });

      return { invite, orgName: org.name };
    });

    // Send Invite Email (asynchronously outside transaction)
    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteUrl = `${appUrl}/invite/${result.invite.token}`;

    await sendEmail({
      to: email,
      subject: `Invite to join ${result.orgName} on Aether`,
      html: getInviteEmailTemplate(result.orgName, inviteUrl),
    });

    return NextResponse.json({ data: { success: true } }, { status: 201 });
  } catch (error: any) {
    console.error('Error inviting member:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 400 });
  }
}
