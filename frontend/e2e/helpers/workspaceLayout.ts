import { expect, type Locator, type Page } from '@playwright/test';

export async function expectWorkspaceWidth(main: Locator, left: number) {
  await expect(main).toBeVisible();
  await expect
    .poll(() =>
      main.evaluate((element, expectedLeft) => {
        const rect = element.getBoundingClientRect();
        const parent = element.parentElement!.getBoundingClientRect();
        const viewport = document.documentElement.clientWidth;
        return Math.max(
          Math.abs(rect.left - expectedLeft),
          Math.abs(rect.right - viewport),
          Math.abs(rect.top - parent.top),
          document.documentElement.scrollWidth - viewport,
        );
      }, left),
    )
    .toBeLessThanOrEqual(1);
}

export async function exerciseWorkspaceSidebar(
  page: Page,
  options: {
    navigation: string;
    collapse: string;
    expand: string;
    sidebarWidth: number;
  },
) {
  const main = page.getByRole('main').first();
  const navigation = page.getByRole('navigation', { name: options.navigation, exact: true });
  await expect(navigation).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 480 });
  const sidebar = navigation.locator('xpath=ancestor::aside[1]');
  await sidebar.hover();
  await page.mouse.wheel(0, 3000);
  await expect(sidebar.getByRole('button').last()).toBeInViewport();
  await page.setViewportSize({ width: 1440, height: 960 });
  const count = await navigation.getByRole('button').count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index++) {
    await navigation.getByRole('button').nth(index).click();
    await expectWorkspaceWidth(main, options.sidebarWidth);
    await page.getByRole('button', { name: options.collapse, exact: true }).click();
    await expect(navigation).toBeHidden();
    await expectWorkspaceWidth(main, 0);
    await page.getByRole('button', { name: options.expand, exact: true }).click();
    await expect(navigation).toBeVisible();
    await expectWorkspaceWidth(main, options.sidebarWidth);
  }
  await page.getByRole('button', { name: options.collapse, exact: true }).click();
  for (const width of [1920, 1024, 390, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await expectWorkspaceWidth(main, 0);
  }
  await page.getByRole('button', { name: options.expand, exact: true }).click();
  await expectWorkspaceWidth(main, options.sidebarWidth);
}
