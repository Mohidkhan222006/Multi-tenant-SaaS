import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runInTenantContext } from '@/lib/db';
import { z } from 'zod';

const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment text cannot be empty').max(1000),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const comments = await runInTenantContext(session.user.organizationId, async (tx) => {
      // Direct RLS checks will filter this based on current organizationId
      return await tx.comment.findMany({
        where: { taskId },
        include: {
          user: {
            select: { name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    return NextResponse.json({ data: comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validation = createCommentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const newComment = await runInTenantContext(session.user.organizationId, async (tx) => {
      // 1. Verify that the task belongs to this organization
      const task = await tx.task.findUnique({
        where: { id: taskId },
        select: { title: true, assigneeId: true },
      });

      if (!task) {
        throw new Error('Task not found');
      }

      // 2. Create the comment
      const comment = await tx.comment.create({
        data: {
          taskId,
          userId: session.user.id,
          body: validation.data.body,
        },
        include: {
          user: {
            select: { name: true, email: true, image: true },
          },
        },
      });

      // 3. Write Activity Log
      await tx.activityLog.create({
        data: {
          organizationId: session.user.organizationId!,
          actorId: session.user.id,
          action: 'task.comment',
          targetType: 'comment',
          targetId: comment.id,
          metadata: { taskTitle: task.title },
        },
      });

      // 4. Create notification for task assignee if it's someone else
      if (task.assigneeId && task.assigneeId !== session.user.id) {
        await tx.notification.create({
          data: {
            userId: task.assigneeId,
            type: 'comment.created',
            payload: {
              taskId,
              taskTitle: task.title,
              actorName: session.user.name || session.user.email,
              commentBody: validation.data.body.substring(0, 100),
            },
          },
        });
      }

      return comment;
    });

    return NextResponse.json({ data: newComment }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 400 });
  }
}
