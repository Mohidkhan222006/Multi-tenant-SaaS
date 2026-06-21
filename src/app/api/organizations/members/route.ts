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
    const members = await runInTenantContext(session.user.organizationId, async (tx) => {
      // Direct RLS checks will filter this list to only show current tenant's members
      return await tx.organizationMember.findMany({
        where: { organizationId: session.user.organizationId! },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
      });
    });

    return NextResponse.json({ data: members });
  } catch (error) {
    console.error('Error fetching organization members:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
