import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Page } from '@playwright/test';

const SCREENSHOT_FLAG = 'CAPTURE_README_SCREENSHOTS';

export async function captureReadmeScreenshot(
  page: Page,
  filename: string,
  options: { fullPage?: boolean } = {},
) {
  if (process.env[SCREENSHOT_FLAG] !== 'true') return;

  const outputDirectory = path.resolve(process.cwd(), '..', 'docs', 'assets', 'screenshots');
  await mkdir(outputDirectory, { recursive: true });

  await page.screenshot({
    path: path.join(outputDirectory, filename),
    fullPage: options.fullPage ?? false,
    animations: 'disabled',
  });
}
