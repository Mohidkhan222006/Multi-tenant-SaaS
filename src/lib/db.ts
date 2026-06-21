import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import pg from 'pg';

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  
  // Stubs for build step when DATABASE_URL is not available in non-production,
  // or default to local docker db
  const defaultUrl = 'postgresql://postgres:postgres_secure_pass_123@localhost:5432/multi_tenant_saas?schema=public';
  const url = connectionString || defaultUrl;

  if (url.startsWith('file:')) {
    const dbPath = url.replace('file:', '');
    const adapter = new PrismaBetterSqlite3({ url: dbPath });
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  const pool = new pg.Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const db = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = db;
}

/**
 * Thread-safe wrapper to run queries within a specific tenant context.
 * Utilizes a transaction and SET LOCAL to isolate current_tenant_id at the DB level,
 * enforcing Postgres Row-Level Security (RLS) policies.
 */
export async function runInTenantContext<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return await db.$transaction(async (tx) => {
    try {
      // Set session variable for PostgreSQL RLS
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    } catch (error) {
      // Graceful fallback for local development testing (e.g. SQLite)
      console.warn('RLS session context could not be set (expected if using SQLite locally).');
    }
    return await fn(tx);
  });
}
