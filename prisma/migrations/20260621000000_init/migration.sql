-- CreateTable: users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "avatar_url" TEXT,
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: accounts
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sessions
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: verification_tokens
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable: organizations
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "stripe_customer_id" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: organization_members
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable: invites
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable: projects
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable: boards
CREATE TABLE "boards" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable: columns
CREATE TABLE "columns" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tasks
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "column_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignee_id" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "due_date" TIMESTAMP(3),
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: comments
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: attachments
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: activity_logs
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: subscriptions
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notifications
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: users
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex: accounts
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex: sessions
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex: verification_tokens
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex: organizations
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex: organization_members
CREATE UNIQUE INDEX "organization_members_user_id_organization_id_key" ON "organization_members"("user_id", "organization_id");

-- CreateIndex: invites
CREATE UNIQUE INDEX "invites_token_key" ON "invites"("token");

-- CreateIndex: subscriptions
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- AddForeignKey: accounts
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: sessions
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: organization_members
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: invites
ALTER TABLE "invites" ADD CONSTRAINT "invites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: projects
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: boards
ALTER TABLE "boards" ADD CONSTRAINT "boards_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: columns
ALTER TABLE "columns" ADD CONSTRAINT "columns_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: tasks
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_column_id_fkey" FOREIGN KEY ("column_id") REFERENCES "columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: comments
ALTER TABLE "comments" ADD CONSTRAINT "comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: attachments
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: activity_logs
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: subscriptions
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: notifications
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =========================================================================
-- Enforce Row-Level Security (RLS) policies
-- =========================================================================

-- Enable RLS
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
CREATE POLICY tenant_project_policy ON "projects" FOR ALL USING (organization_id::uuid = get_current_tenant_id());
CREATE POLICY tenant_task_policy ON "tasks" FOR ALL USING (organization_id::uuid = get_current_tenant_id());
CREATE POLICY tenant_member_policy ON "organization_members" FOR ALL USING (organization_id::uuid = get_current_tenant_id());
CREATE POLICY tenant_invite_policy ON "invites" FOR ALL USING (organization_id::uuid = get_current_tenant_id());
CREATE POLICY tenant_activity_log_policy ON "activity_logs" FOR ALL USING (organization_id::uuid = get_current_tenant_id());
CREATE POLICY tenant_subscription_policy ON "subscriptions" FOR ALL USING (organization_id::uuid = get_current_tenant_id());

-- Transitive Tenant Policies (based on parent relations)
CREATE POLICY tenant_board_policy ON "boards" FOR ALL USING (
    project_id IN (
        SELECT id FROM "projects" WHERE organization_id::uuid = get_current_tenant_id()
    )
);

CREATE POLICY tenant_column_policy ON "columns" FOR ALL USING (
    board_id IN (
        SELECT b.id FROM "boards" b
        INNER JOIN "projects" p ON b.project_id = p.id
        WHERE p.organization_id::uuid = get_current_tenant_id()
    )
);

CREATE POLICY tenant_comment_policy ON "comments" FOR ALL USING (
    task_id IN (
        SELECT id FROM "tasks" WHERE organization_id::uuid = get_current_tenant_id()
    )
);

CREATE POLICY tenant_attachment_policy ON "attachments" FOR ALL USING (
    task_id IN (
        SELECT id FROM "tasks" WHERE organization_id::uuid = get_current_tenant_id()
    )
);
