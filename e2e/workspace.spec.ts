import { test, expect } from '@playwright/test';

test.describe('Aether Multi-Tenant Workspace flow', () => {
  test('should complete login, tenant onboarding, board creation, and task dragging flow', async ({ page }) => {
    // 1. Visit Login page
    await page.goto('/login');
    await expect(page).toHaveTitle(/Aether/);
    await expect(page.locator('text=Sign in to Aether')).toBeVisible();

    // 2. Perform Sign In using Credentials
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // 3. Authenticated without Org -> Redirects to Onboarding
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.locator('text=Set up your Organization')).toBeVisible();

    // 4. Fill in Workspace details
    await page.fill('input[placeholder="e.g. Acme Corp"]', 'Acme Corporation');
    // Subdomain slug auto-populates, click Create
    await page.click('button[type="submit"]');

    // 5. Success -> Redirects to Dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Welcome Project')).toBeVisible();
    await expect(page.locator('text=To Do')).toBeVisible();

    // 6. Create New Task
    await page.click('button:has-text("Add Task")'); // Click column add task plus button
    await page.fill('input[placeholder="e.g. Implement login API"]', 'Database Integration');
    await page.fill('textarea[placeholder="Describe this task in detail..."]', 'Configure Prisma models and migration stubs');
    await page.selectOption('select', 'high');
    await page.click('button:has-text("Create Task")');

    // 7. Verify Task Card is visible in "To Do" Column
    await expect(page.locator('text=Database Integration')).toBeVisible();

    // 8. Go to Settings and Invite Member
    await page.goto('/settings');
    await expect(page.locator('text=Workspace Settings')).toBeVisible();
    await page.click('button:has-text("Invite")');

    await page.fill('input[type="email"]', 'colleague@example.com');
    await page.selectOption('select', 'member');
    await page.click('button:has-text("Send Invite")');

    // 9. Verify Success Feedback
    await expect(page.locator('text=Invitation sent successfully!')).toBeVisible();
  });
});
