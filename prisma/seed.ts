import 'dotenv/config';
import { db as prisma } from '../src/lib/db';
import bcrypt from 'bcrypt';

async function main() {
  console.log('Seeding local SQLite database...');

  // Hash password
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create User
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      passwordHash,
    },
  });

  console.log(`Created user: ${user.email}`);

  // 1b. Create Owner User for E2E Tests (initially has no organization)
  const owner = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: {
      email: 'owner@example.com',
      name: 'Owner User',
      passwordHash,
    },
  });

  console.log(`Created owner user: ${owner.email}`);

  // 2. Create Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-workspace' },
    update: {},
    create: {
      name: 'Demo Workspace',
      slug: 'demo-workspace',
      plan: 'free',
    },
  });

  console.log(`Created organization: ${org.name}`);

  // 3. Create Member
  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      role: 'owner',
    },
  });

  // 4. Create Project
  const project = await prisma.project.create({
    data: {
      name: 'Demo Project',
      description: 'This is a pre-seeded project to test your Kanban board. Drag tasks around columns!',
      organizationId: org.id,
      createdBy: user.id,
    },
  });

  // 5. Create Board
  const board = await prisma.board.create({
    data: {
      name: 'Main Board',
      projectId: project.id,
    },
  });

  // 6. Create Columns
  const todoCol = await prisma.column.create({
    data: { name: 'To Do', position: 0, boardId: board.id },
  });
  const inProgressCol = await prisma.column.create({
    data: { name: 'In Progress', position: 1, boardId: board.id },
  });
  const doneCol = await prisma.column.create({
    data: { name: 'Done', position: 2, boardId: board.id },
  });

  // 7. Create Tasks
  await prisma.task.createMany({
    data: [
      {
        title: 'Review Aether Platform Specs',
        description: 'Read the multi-tenant SaaS requirements sheet and guidelines context.',
        columnId: todoCol.id,
        projectId: project.id,
        organizationId: org.id,
        position: 0,
        priority: 'medium',
      },
      {
        title: 'Configure PostgreSQL RLS Policies',
        description: 'Verify database-level Row-Level Security rules match app context.',
        columnId: inProgressCol.id,
        projectId: project.id,
        organizationId: org.id,
        position: 0,
        priority: 'high',
      },
      {
        title: 'Stripe Webhook Integration stubs',
        description: 'Link the 2025 item billing period trackers and polymorphic invoice webhook checks.',
        columnId: todoCol.id,
        projectId: project.id,
        organizationId: org.id,
        position: 1,
        priority: 'urgent',
      },
      {
        title: 'Write Walkthrough Documentation',
        description: 'Review task.md and build walkthrough.md logs.',
        columnId: doneCol.id,
        projectId: project.id,
        organizationId: org.id,
        position: 0,
        priority: 'low',
      },
    ],
  });

  console.log('Database successfully seeded with demo workspace!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
