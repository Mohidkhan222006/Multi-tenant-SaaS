# Aether - Multi-Tenant SaaS Project Management Platform

A portfolio-grade, highly secure, and visually stunning multi-tenant project management tool (hybrid Linear/Trello board) built using Next.js 16+, TypeScript, Prisma 7, and PostgreSQL.

## 🚀 Core Features Implemented

1. **Multi-Tenancy with PostgreSQL Row-Level Security (RLS):**
   * Shared database schema where every tenant-scoped query is isolated at the database engine level.
   * Utilizes a thread-safe database transaction wrapper in [src/lib/db.ts](src/lib/db.ts) to set a session variable (`SET LOCAL app.current_tenant_id`) before query execution.
   * Database RLS SQL policies defined in [prisma/migrations/20260621000000_init/migration.sql](prisma/migrations/20260621000000_init/migration.sql) enforce that Tenant A can never access Tenant B's data, even if there is an application-level bug.

2. **Secure Authentication & Middleware Route Protection:**
   * Powered by **Auth.js (NextAuth)** with custom Credentials authentication and OAuth stubs (Google, GitHub).
   * Middleware protects routes (`/dashboard`, `/settings`, `/onboarding`) and automatically forces users without a workspace to complete onboarding before entering.

3. **Stripe Subscriptions & Webhook Handler (Stripe 2025 Standard):**
   * Integrates Stripe Checkout for upgrades and Stripe Customer Portal for subscription management.
   * Server-side plan limits enforced dynamically: Free tier tenants are capped at 3 projects and 5 team seats.
   * Webhook router at [src/app/api/billing/webhook/route.ts](src/app/api/billing/webhook/route.ts) parses events using the latest Stripe 2025 conventions (item-level billing period tracking and polymorphic invoice structures).

4. **Interactive Kanban Board Engine:**
   * Dynamic column and task cards with **Optimistic UI Updates** using TanStack Query and Zustand.
   * Real-time drag-and-drop position normalization logic implemented in [src/app/api/tasks/[taskId]/route.ts](src/app/api/tasks/[taskId]/route.ts) to maintain sequential indexing in PostgreSQL.

5. **Team Workspace Invitations & Comments:**
   * Admins can invite team members via secure, expiring email tokens. Accepting the invite dynamically updates the active NextAuth browser session.
   * Real-time comments, notification triggers, and workspace audit logs.

6. **Error Hardening & Testing:**
   * Custom glassmorphic React **ErrorBoundary** captures any runtime client-side rendering crashes.
   * Unit tests implemented using **Vitest** verify data isolation.
   * **Playwright** browser testing configurations ready for complete E2E flows.

---

## 🎨 Aesthetic & Theme Choices
* Sleek, high-end monochrome dark theme using dark slate backgrounds, subtle border highlights, and glowing neutral accents.

## 🛠️ Verification & Compile Checks
* **TypeScript Compilation:** Compiled with `npx tsc --noEmit` resulting in **0 errors**.
* **Vitest Unit Tests:** Fully operational, **100% tests passed**.
