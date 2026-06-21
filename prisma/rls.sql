-- Enable Row-Level Security (RLS) on all tenant-scoped and dependent tables.
-- FORCE ROW LEVEL SECURITY ensures policies apply even to the table owner / Prisma superuser connection.

-- 1. Enable RLS
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;

ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;

ALTER TABLE "organization_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_members" FORCE ROW LEVEL SECURITY;

ALTER TABLE "invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invites" FORCE ROW LEVEL SECURITY;

ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_logs" FORCE ROW LEVEL SECURITY;

ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" FORCE ROW LEVEL SECURITY;

ALTER TABLE "boards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "boards" FORCE ROW LEVEL SECURITY;

ALTER TABLE "columns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "columns" FORCE ROW LEVEL SECURITY;

ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comments" FORCE ROW LEVEL SECURITY;

ALTER TABLE "attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attachments" FORCE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist
DROP POLICY IF EXISTS tenant_project_policy ON "projects";
DROP POLICY IF EXISTS tenant_task_policy ON "tasks";
DROP POLICY IF EXISTS tenant_member_policy ON "organization_members";
DROP POLICY IF EXISTS tenant_invite_policy ON "invites";
DROP POLICY IF EXISTS tenant_activity_log_policy ON "activity_logs";
DROP POLICY IF EXISTS tenant_subscription_policy ON "subscriptions";
DROP POLICY IF EXISTS tenant_board_policy ON "boards";
DROP POLICY IF EXISTS tenant_column_policy ON "columns";
DROP POLICY IF EXISTS tenant_comment_policy ON "comments";
DROP POLICY IF EXISTS tenant_attachment_policy ON "attachments";

-- 3. Define Row-Level Security Policies using PostgreSQL session variables
-- Helper function to get the current tenant ID from session context safely
CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Direct Tenant Policies (based on organization_id)
CREATE POLICY tenant_project_policy ON "projects"
  FOR ALL
  USING (organization_id = get_current_tenant_id());

CREATE POLICY tenant_task_policy ON "tasks"
  FOR ALL
  USING (organization_id = get_current_tenant_id());

CREATE POLICY tenant_member_policy ON "organization_members"
  FOR ALL
  USING (organization_id = get_current_tenant_id());

CREATE POLICY tenant_invite_policy ON "invites"
  FOR ALL
  USING (organization_id = get_current_tenant_id());

CREATE POLICY tenant_activity_log_policy ON "activity_logs"
  FOR ALL
  USING (organization_id = get_current_tenant_id());

CREATE POLICY tenant_subscription_policy ON "subscriptions"
  FOR ALL
  USING (organization_id = get_current_tenant_id());

-- Transitive Tenant Policies (based on parent relations)
CREATE POLICY tenant_board_policy ON "boards"
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM "projects" WHERE organization_id = get_current_tenant_id()
    )
  );

CREATE POLICY tenant_column_policy ON "columns"
  FOR ALL
  USING (
    board_id IN (
      SELECT b.id FROM "boards" b
      INNER JOIN "projects" p ON b.project_id = p.id
      WHERE p.organization_id = get_current_tenant_id()
    )
  );

CREATE POLICY tenant_comment_policy ON "comments"
  FOR ALL
  USING (
    task_id IN (
      SELECT id FROM "tasks" WHERE organization_id = get_current_tenant_id()
    )
  );

CREATE POLICY tenant_attachment_policy ON "attachments"
  FOR ALL
  USING (
    task_id IN (
      SELECT id FROM "tasks" WHERE organization_id = get_current_tenant_id()
    )
  );
