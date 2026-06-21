# Multi-Tenant SaaS Project Management Tool — Requirements Document

## 1. Project Overview

**What it is:** A multi-tenant SaaS project management tool (mini Linear/Trello hybrid) where organizations sign up, invite team members, and manage projects via Kanban boards. Includes subscription billing, role-based access control, and proper tenant data isolation.

**Why this project:** Demonstrates production-grade architecture skills — auth, billing, permissions, and multi-tenancy — that map directly to real-world SaaS engineering work.

**Target users:** Small teams (5–50 people) managing projects and tasks.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 14+ (App Router) + TypeScript | Server components where sensible, client components for interactivity |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent, accessible components |
| Backend | Next.js API routes or separate Node/Express service | Either is fine; keep business logic out of route handlers (service layer) |
| Database | PostgreSQL | Use Supabase, Neon, or Railway for hosting |
| ORM | Prisma or Drizzle | Drizzle if you want to show raw SQL comfort; Prisma if you want speed |
| Auth | Auth.js (NextAuth) or Clerk | Clerk is faster to implement; Auth.js shows more from-scratch understanding |
| Billing | Stripe (Subscriptions + Webhooks + Customer Portal) | Must be real subscription logic, not a one-time payment |
| Caching/Queue | Redis (Upstash) | For session caching, rate limiting, and background jobs |
| Background jobs | BullMQ or Inngest | For email sending, invite expiry, usage recalculation |
| Email | Resend or Postmark | Invite emails, billing notifications |
| File storage | S3-compatible (AWS S3 or Cloudflare R2) | For avatars, attachments |
| Hosting | Vercel (frontend) + Railway/Fly.io (if separate backend/workers) | |
| Testing | Vitest/Jest (unit) + Playwright (E2E) | |
| CI/CD | GitHub Actions | Lint, test, type-check, deploy on merge |
| Monitoring | Sentry (errors) + Vercel Analytics or PostHog | |

---

## 3. Core Architectural Requirements

### 3.1 Multi-Tenancy Strategy
- **Approach:** Shared database, shared schema, with a `tenant_id` (organization_id) column on every tenant-scoped table, enforced via **Postgres Row-Level Security (RLS)** — not just application-level filtering.
- Every query must be scoped to the current tenant. No table should be queryable without an explicit tenant filter.
- Middleware must resolve the current tenant from the session/subdomain/path before any data access.
- **Stretch:** support custom subdomains per organization (`acme.yourapp.com`).
- Write at least one test that proves cross-tenant data leakage is impossible (e.g., attempt to fetch another tenant's project by ID and assert 403/404).

### 3.2 Authentication & Authorization
- Email/password + at least one OAuth provider (Google or GitHub).
- Email verification required before full access.
- Password reset flow (token-based, expiring links).
- Session management via JWT or database sessions (document your choice and why).
- **Role-Based Access Control (RBAC)** with at least three roles per organization:
  - **Owner** — full control, billing access, can delete org
  - **Admin** — manage members, projects, settings (no billing/deletion)
  - **Member** — create/edit tasks and projects, no admin actions
  - *(Optional 4th role: Viewer — read-only)*
- Permission checks must exist at the API/service layer, not just hidden in the UI (i.e., a Member hitting an admin-only API route directly must get a 403).
- Support inviting users by email with a pending-invite state, expiring invite tokens, and resend/revoke invite actions.

### 3.3 Billing & Subscriptions (Stripe)
- Real subscription model with at least 2 tiers (e.g., Free and Pro), each with different limits (e.g., Free = 3 projects max, 5 members; Pro = unlimited).
- Stripe Checkout for upgrading.
- Stripe Customer Portal integration for managing/cancelling subscriptions.
- **Webhook handling** for at minimum:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- Webhook signature verification (no trusting unverified payloads).
- Webhook idempotency (handle duplicate webhook delivery without double-processing).
- Usage limits enforced server-side (e.g., reject project creation past the plan limit, don't just hide the button).
- Grace period / dunning handling on failed payments (e.g., 3-day grace period before downgrading).

---

## 4. Functional Requirements

### 4.1 Organization (Tenant) Management
- Create organization on signup (becomes Owner automatically).
- Update organization name, logo, slug/subdomain.
- View list of members with roles.
- Change a member's role (Owner/Admin only).
- Remove a member (Owner/Admin only, cannot remove the last Owner).
- Delete organization (Owner only) — must cascade-delete or archive all tenant data, with a confirmation step (type org name to confirm).
- Switch between multiple organizations if a user belongs to more than one.

### 4.2 Projects
- Create/edit/archive/delete a project within an organization.
- Each project has: name, description, status (active/archived), created date, owner.
- Project-level membership (optional stretch: restrict a project to a subset of org members).

### 4.3 Boards & Tasks (Core Feature)
- Each project has a Kanban board with customizable columns (default: To Do / In Progress / Done).
- Create/rename/reorder/delete columns.
- Create a task with: title, description (rich text or markdown), assignee, due date, priority (Low/Medium/High/Urgent), labels/tags.
- Drag-and-drop tasks between columns (optimistic UI update, persisted on drop, rollback on failure).
- Reorder tasks within a column (persisted order, not just visual).
- Comment on tasks (with @mentions that trigger a notification).
- File attachments on tasks (uploaded to S3/R2, with size/type validation).
- Task activity log (who changed what, when) — at least status changes and assignment changes.
- Filter/search tasks by assignee, label, priority, status.

### 4.4 Notifications
- In-app notification center (bell icon with unread count).
- Notify on: task assigned to you, mentioned in a comment, due date approaching, invited to an org.
- Email notifications for invites and (optionally) daily/weekly digest — must be able to opt out.

### 4.5 Dashboard
- Per-organization dashboard showing: active projects, tasks due soon, recent activity feed.
- Basic analytics: tasks completed this week, tasks per status, overdue task count.

### 4.6 Settings
- User profile settings (name, avatar, password change, connected OAuth accounts).
- Organization settings (name, logo, billing, danger zone for deletion).
- Notification preferences.

---

## 5. Non-Functional Requirements

### 5.1 Security
- All tenant-scoped queries enforced via RLS as the source of truth (app-layer checks are defense-in-depth, not the only layer).
- Input validation on every API route (Zod or similar) — both client and server side.
- Rate limiting on auth endpoints (login, signup, password reset) to prevent brute force — implement via Redis token bucket or similar.
- CSRF protection on state-changing requests if using cookie-based sessions.
- Secrets (Stripe keys, DB URL, etc.) only in environment variables, never committed.
- Sanitize any rendered user content (task descriptions/comments) to prevent XSS if using rich text/markdown.
- Audit log for sensitive actions (role changes, member removal, billing changes, org deletion).

### 5.2 Performance
- Paginate all list endpoints (projects, tasks, members, activity log) — no unbounded queries.
- Add database indexes on `tenant_id`, foreign keys, and frequently filtered columns.
- Cache read-heavy, rarely-changing data (e.g., org settings) in Redis with sensible invalidation.
- Seed the database with realistic volume (e.g., 50+ orgs, thousands of tasks) to actually exercise pagination/indexing — not 10 rows.

### 5.3 Reliability
- Webhook handlers must be idempotent and retried safely.
- Background jobs (email sending, invite expiry cleanup) must have retry logic with backoff.
- Graceful error handling everywhere — no unhandled promise rejections, no raw stack traces shown to users.
- Health check endpoint for uptime monitoring.

### 5.4 Testing
- Unit tests for service-layer business logic (permission checks, billing limit enforcement, tenant isolation).
- Integration tests for critical API routes (auth flow, task CRUD, webhook handling).
- At least one E2E test (Playwright) covering: signup → create org → create project → create task → invite member.
- A specific test proving tenant isolation (cross-tenant access attempt fails).

### 5.5 Observability
- Error tracking via Sentry (or similar) wired up in both frontend and backend.
- Structured logging (not just `console.log`) for key events: auth, billing, tenant access denials.

---

## 6. Data Model (High-Level)

Entities required at minimum:

- **User** — id, email, name, avatar_url, password_hash (nullable if OAuth-only), email_verified, created_at
- **Organization** — id, name, slug, logo_url, stripe_customer_id, plan, created_at
- **OrganizationMember** — id, user_id, organization_id, role, joined_at
- **Invite** — id, organization_id, email, role, token, expires_at, status
- **Project** — id, organization_id, name, description, status, created_by, created_at
- **Board** — id, project_id, name (if supporting multiple boards per project, otherwise fold into Project)
- **Column** — id, board_id, name, position
- **Task** — id, column_id, project_id, organization_id, title, description, assignee_id, priority, due_date, position, created_at
- **Comment** — id, task_id, user_id, body, created_at
- **Attachment** — id, task_id, file_url, file_name, uploaded_by, created_at
- **ActivityLog** — id, organization_id, actor_id, action, target_type, target_id, metadata (jsonb), created_at
- **Subscription** — id, organization_id, stripe_subscription_id, plan, status, current_period_end
- **Notification** — id, user_id, type, payload (jsonb), read_at, created_at

Every tenant-scoped table must include `organization_id` directly or transitively, with RLS policies written accordingly.

---

## 7. API Design Requirements

- RESTful or tRPC — pick one and be consistent (tRPC is a nice signal of type-safety awareness in a Next.js project).
- Versioning strategy noted, even if just `/api/v1/...` as a placeholder for future-proofing.
- Consistent error response shape across all endpoints.
- All endpoints documented (OpenAPI/Swagger if REST, or auto-generated types if tRPC).
- Webhook endpoint isolated from regular API auth middleware (Stripe doesn't send your session cookie).

---

## 8. Stretch Goals (Nice-to-Haves, Not Required)

- Custom subdomains per organization with SSL.
- SSO (SAML) for enterprise tier — even a basic implementation signals advanced understanding.
- Real-time updates via WebSockets (live task updates without refresh) instead of polling.
- Public API with API key auth for third-party integrations.
- Usage-based billing (e.g., per-seat pricing) instead of flat-tier billing.
- Audit log export (CSV) for compliance-minded customers.
- Dark mode.
- Mobile-responsive board view (drag-and-drop is hard on mobile — even a simplified list view counts).

---

## 9. Deployment & DevOps Requirements

- CI pipeline (GitHub Actions): lint → type-check → test → build on every PR.
- Separate environments: local, staging, production — with separate Stripe test/live keys and separate databases.
- Database migrations tracked in version control (Prisma Migrate or Drizzle Kit), never manual schema changes in prod.
- Environment variables documented in a `.env.example` file.
- Deployed live with a working demo (include seeded demo account credentials in the README so reviewers don't have to sign up).

---

## 10. Documentation Requirements (for the README)

- Architecture overview diagram (even a simple one) showing how auth, tenancy, and billing flow together.
- Explanation of the multi-tenancy approach and *why* you chose RLS over alternatives (schema-per-tenant, app-level filtering).
- Local setup instructions that actually work end-to-end (test them yourself before publishing).
- A "Decisions & Tradeoffs" section — this matters more than people think. Briefly note 2–3 places where you chose one approach over another and why (e.g., "Chose Prisma over Drizzle for faster iteration given the project timeline" or "Used JWT sessions over DB sessions to avoid an extra DB round-trip per request").
- Known limitations / what you'd do differently with more time.

---

## 11. Suggested Build Order (Phased)

1. **Phase 1 — Foundation:** Auth, organization creation, RBAC, tenant isolation (RLS) with tests proving isolation.
2. **Phase 2 — Core Feature:** Projects, boards, columns, tasks, drag-and-drop.
3. **Phase 3 — Billing:** Stripe checkout, webhooks, plan limits enforced server-side.
4. **Phase 4 — Collaboration:** Invites, comments, mentions, notifications.
5. **Phase 5 — Polish:** Dashboard/analytics, activity log, search/filter, E2E tests, deployment, README.
6. **Phase 6 (optional) — Stretch goals** from Section 8 if time allows.

Build in this order — a fully isolated, secure multi-tenant foundation is worth more to an interviewer than a flashy UI sitting on a leaky data layer.
