import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runInTenantContext } from '@/lib/db';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const projects = await runInTenantContext(session.user.organizationId, async (tx) => {
      return await tx.project.findMany({
        where: { organizationId: session.user.organizationId! },
        orderBy: { createdAt: 'desc' },
      });
    });

    return NextResponse.json({ data: projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validation = createProjectSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { name, description } = validation.data;

    // Enforce Plan Limits
    const newProject = await runInTenantContext(session.user.organizationId, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: session.user.organizationId! },
        select: { plan: true },
      });

      if (org?.plan === 'free') {
        const count = await tx.project.count({
          where: { organizationId: session.user.organizationId! },
        });
        if (count >= 3) {
          throw new Error('You have reached the maximum limit of 3 projects on the Free plan. Please upgrade to Pro.');
        }
      }

      // 1. Create project
      const project = await tx.project.create({
        data: {
          name,
          description,
          organizationId: session.user.organizationId!,
          createdBy: session.user.id,
        },
      });

      // 2. Auto-initialize default Kanban board
      const board = await tx.board.create({
        data: {
          name: 'Main Board',
          projectId: project.id,
        },
      });

      // 3. Auto-initialize default Kanban columns
      await tx.column.createMany({
        data: [
          { name: 'To Do', position: 0, boardId: board.id },
          { name: 'In Progress', position: 1, boardId: board.id },
          { name: 'Done', position: 2, boardId: board.id },
        ],
      });

      return project;
    });

    return NextResponse.json({ data: newProject }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
