import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runInTenantContext } from '@/lib/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await runInTenantContext(session.user.organizationId, async (tx) => {
      // Find the project first to verify it belongs to this organization
      const project = await tx.project.findFirst({
        where: {
          id: projectId,
          organizationId: session.user.organizationId!,
        },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Delete the project (cascade will handle boards, columns, and tasks)
      await tx.project.delete({
        where: { id: projectId },
      });
    });

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message === 'Project not found' ? 404 : 500 }
    );
  }
}
