import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runInTenantContext } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const logs = await runInTenantContext(session.user.organizationId, async (tx) => {
      // Direct RLS filters will restrict activity logs to current organizationId
      return await tx.activityLog.findMany({
        where: { organizationId: session.user.organizationId! },
        include: {
          actor: {
            select: { name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 30, // get recent 30
      });
    });

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
