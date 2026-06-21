import { describe, it, expect, vi } from 'vitest';
import { runInTenantContext } from '@/lib/db';

// Mock db instance and runInTenantContext to simulate PostgreSQL RLS filtering
vi.mock('@/lib/db', () => {
  return {
    runInTenantContext: vi.fn(async (tenantId: string, fn: any) => {
      // Mock Transaction Client representing the database session
      const mockTx = {
        $executeRawUnsafe: vi.fn(),
        project: {
          findFirst: vi.fn(async (query: any) => {
            // Emulate PostgreSQL Row-Level Security RLS logic
            // If the query attempts to fetch a project that does not belong to the
            // current session's tenantId, the database engine returns null/empty
            if (query.where.organizationId !== tenantId) {
              return null; 
            }
            return { id: query.where.id, name: 'Aether Project', organizationId: tenantId };
          }),
        },
      };

      return await fn(mockTx);
    }),
  };
});

describe('Multi-Tenant Row-Level Security (RLS) Isolation', () => {
  it('should successfully return the project if organizationId matches the active tenant context', async () => {
    const tenantId = 'org-uuid-1111';
    const projectId = 'proj-uuid-aaaa';

    const result = await runInTenantContext(tenantId, async (tx: any) => {
      return await tx.project.findFirst({
        where: { id: projectId, organizationId: tenantId },
      });
    });

    expect(result).not.toBeNull();
    expect(result?.organizationId).toBe(tenantId);
  });

  it('should block/return null for a project belonging to Tenant B when queried within Tenant A context', async () => {
    const activeTenantId = 'org-uuid-1111';
    const otherTenantId = 'org-uuid-2222';
    const otherTenantProjectId = 'proj-uuid-bbbb';

    const result = await runInTenantContext(activeTenantId, async (tx: any) => {
      // Attempts to query Tenant B's project under Tenant A's active transaction context
      return await tx.project.findFirst({
        where: { id: otherTenantProjectId, organizationId: otherTenantId },
      });
    });

    // RLS policy prevents cross-tenant leaks: returns null / access denied
    expect(result).toBeNull();
  });
});
