import { test, expect } from '@playwright/test';

test.describe('Aether Settings Page Validation', () => {
  test('should verify settings layout, billing status, members list, and invitation dialog', async ({ page }) => {
    // 1. Visit Login page and authenticate
    await page.goto('/login');
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // 2. Head directly to Onboarding (if no org exists yet)
    // For local dev tests, we can onboarding or navigate directly.
    // Let's handle onboarding first if it's visible, otherwise proceed
    if (page.url().includes('/onboarding')) {
      await page.fill('input[placeholder="e.g. Acme Corp"]', 'Acme Corporation');
      await page.click('button[type="submit"]');
    }

    // 3. Navigate to Settings page
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);

    // 4. Verify Layout and Sidebar
    await expect(page.locator('h2:has-text("Workspace Settings")')).toBeVisible();
    await expect(page.locator('text=General & Members')).toBeVisible();

    // 5. Verify Billing Section
    await expect(page.locator('h3:has-text("Billing Plan")')).toBeVisible();
    await expect(page.locator('text=Free Plan')).toBeVisible();
    
    // Check if Upgrade button exists and click it (will trigger mock Stripe API flow)
    const upgradeBtn = page.locator('button:has-text("Upgrade to Pro")');
    await expect(upgradeBtn).toBeVisible();

    // 6. Verify Workspace Members Section
    await expect(page.locator('h3:has-text("Workspace Members")')).toBeVisible();

    // 7. Verify Invite Modal Dialog trigger
    await page.click('button:has-text("Invite")');
    await expect(page.locator('text=Invite Team Member')).toBeVisible();

    // Fill out invite form
    await page.fill('input[placeholder="colleague@example.com"]', 'settings-test@example.com');
    await page.selectOption('select', 'admin');
    
    // Submit invite
    await page.click('button[type="submit"]:has-text("Send Invite")');

    // Verify Success Modal Feedback
    await expect(page.locator('text=Invitation sent successfully!')).toBeVisible();

    // 8. Test Navigation back to Dashboard
    await page.goto('/settings');
    await page.click('button:has-text("Back to Dashboard")');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
