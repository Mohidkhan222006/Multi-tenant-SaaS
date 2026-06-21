import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runInTenantContext } from '@/lib/db';
import { z } from 'zod';

const updateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(100).optional(),
  description: z.string().max(1000).optional(),
  columnId: z.string().uuid('Invalid column selection').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  position: z.number().nonnegative().optional(),
});

export async function PATCH(
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
    const validation = updateTaskSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const updateData = validation.data;

    const result = await runInTenantContext(session.user.organizationId, async (tx) => {
      // 1. Fetch current task to verify existence and check original columnId
      const currentTask = await tx.task.findUnique({
        where: { id: taskId },
      });

      if (!currentTask) {
        throw new Error('Task not found');
      }

      // If moving columns or positions, normalize the ordering
      if (updateData.columnId !== undefined || updateData.position !== undefined) {
        const destColumnId = updateData.columnId ?? currentTask.columnId;
        const newPosition = updateData.position ?? currentTask.position;

        // Update the target task first
        const updatedTask = await tx.task.update({
          where: { id: taskId },
          data: {
            columnId: destColumnId,
            position: newPosition,
            title: updateData.title,
            description: updateData.description,
            priority: updateData.priority,
          },
        });

        // Normalize destination column tasks
        const destTasks = await tx.task.findMany({
          where: { columnId: destColumnId },
          orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        });

        // Filter out our task and re-insert at newPosition index
        const remainingTasks = destTasks.filter((t) => t.id !== taskId);
        remainingTasks.splice(newPosition, 0, updatedTask);

        // Normalize indices in DB
        for (let i = 0; i < remainingTasks.length; i++) {
          await tx.task.update({
            where: { id: remainingTasks[i].id },
            data: { position: i },
          });
        }

        // If moved between columns, normalize source column as well
        if (destColumnId !== currentTask.columnId) {
          const sourceTasks = await tx.task.findMany({
            where: { columnId: currentTask.columnId },
            orderBy: { position: 'asc' },
          });

          for (let i = 0; i < sourceTasks.length; i++) {
            await tx.task.update({
              where: { id: sourceTasks[i].id },
              data: { position: i },
            });
          }
        }

        return updatedTask;
      } else {
        // Direct field updates without moving positions
        return await tx.task.update({
          where: { id: taskId },
          data: {
            title: updateData.title,
            description: updateData.description,
            priority: updateData.priority,
          },
        });
      }
    });

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await runInTenantContext(session.user.organizationId, async (tx) => {
      const task = await tx.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new Error('Task not found');
      }

      // Delete the task
      await tx.task.delete({
        where: { id: taskId },
      });

      // Shift position indices of remaining tasks in the column
      const remainingTasks = await tx.task.findMany({
        where: { columnId: task.columnId },
        orderBy: { position: 'asc' },
      });

      for (let i = 0; i < remainingTasks.length; i++) {
        await tx.task.update({
          where: { id: remainingTasks[i].id },
          data: { position: i },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 400 });
  }
}
