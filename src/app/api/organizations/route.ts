import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const createOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const org = await db.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { id: true, name: true, slug: true, plan: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ data: org });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validation = createOrgSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { name, slug } = validation.data;

    // Check if slug is unique
    const existingOrg = await db.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      return NextResponse.json({ error: 'This slug/subdomain is already taken' }, { status: 400 });
    }

    // Create organization and member mapping in a transaction
    // Note: RLS is not yet active for this organization since the user is not a member yet,
    // so we execute directly on db client (not using runInTenantContext).
    const result = await db.$transaction(async (tx) => {
      // 1. Create organization
      const org = await tx.organization.create({
        data: {
          name,
          slug,
          plan: 'free',
        },
      });

      // 2. Add current user as OWNER
      await tx.organizationMember.create({
        data: {
          userId: session.user.id,
          organizationId: org.id,
          role: 'owner',
        },
      });

      // 3. Create default project
      const project = await tx.project.create({
        data: {
          name: 'Welcome Project',
          description: 'Your default workspace project. Get started by organizing your tasks!',
          organizationId: org.id,
          createdBy: session.user.id,
        },
      });

      // 4. Initialize Board
      const board = await tx.board.create({
        data: {
          name: 'Main Board',
          projectId: project.id,
        },
      });

      // 5. Initialize Columns
      await tx.column.createMany({
        data: [
          { name: 'To Do', position: 0, boardId: board.id },
          { name: 'In Progress', position: 1, boardId: board.id },
          { name: 'Done', position: 2, boardId: board.id },
        ],
      });

      return org;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
