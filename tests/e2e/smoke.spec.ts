import { test, expect } from '@playwright/test';

test('홈 진입: canvas 와 click-to-play 노출', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('#click-to-play')).toBeVisible();
});

test('click-to-play 클릭 후 click 오버레이가 사라진다', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(800);
  await page.locator('#click-to-play').click();
  await expect(page.locator('#click-to-play')).toHaveClass(/hidden/);
});
