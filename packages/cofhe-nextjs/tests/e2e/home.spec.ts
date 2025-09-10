import { test, expect } from '@playwright/test';

test('homepage renders and shows key UI', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Equle');

  await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible();

  await expect(page.getByRole('button', { name: /how to play/i })).toBeVisible();
});

