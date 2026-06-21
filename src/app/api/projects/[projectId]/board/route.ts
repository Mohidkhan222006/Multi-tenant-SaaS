import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runInTenantContext } from '@/lib/db';
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(100),
  description: z.string().max(1000).optional(),
  columnId: z.string().uuid('Invalid column selection'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

const createColumnSchema = z.object({
  name: z.string().min(1, 'Column name is required').max(50),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const boardData = await runInTenantContext(session.user.organizationId, async (tx) => {
      // 1. Fetch project with board and columns
      const board = await tx.board.findFirst({
        where: { projectId },
        include: {
          columns: {
            orderBy: { position: 'asc' },
            include: {
              tasks: {
                orderBy: { position: 'asc' },
              },
            },
          },
        },
      });

      return board;
    });

    if (!boardData) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    return NextResponse.json({ data: boardData });
  } catch (error) {
    console.error('Error fetching board data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const isColumn = body.type === 'column';

    const result = await runInTenantContext(session.user.organizationId, async (tx) => {
      if (isColumn) {
        // Create Column
        const validation = createColumnSchema.safeParse(body);
        if (!validation.success) {
          throw new Error(validation.error.issues[0].message);
        }

        const board = await tx.board.findFirst({
          where: { projectId },
        });
        if (!board) throw new Error('Board not found');

        const lastColumn = await tx.column.findFirst({
          where: { boardId: board.id },
          orderBy: { position: 'desc' },
        });
        const position = lastColumn ? lastColumn.position + 1 : 0;

        return await tx.column.create({
          data: {
            name: validation.data.name,
            position,
            boardId: board.id,
          },
        });
      } else {
        // Create Task
        const validation = createTaskSchema.safeParse(body);
        if (!validation.success) {
          throw new Error(validation.error.issues[0].message);
        }

        const { title, description, columnId, priority } = validation.data;

        const lastTask = await tx.task.findFirst({
          where: { columnId },
          orderBy: { position: 'desc' },
        });
        const position = lastTask ? lastTask.position + 1 : 0;

        return await tx.task.create({
          data: {
            title,
            description,
            columnId,
            projectId,
            organizationId: session.user.organizationId!,
            position,
            priority,
          },
        });
      }
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating board item:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 400 });
  }
}
