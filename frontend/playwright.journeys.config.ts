import { defineConfig } from '@playwright/test';
import config from './playwright.config';

export default defineConfig({
  ...config,
  // The real API/database stack has its own mandatory CI gate. README captures
  // are documentation artifacts, not application regression tests.
  testIgnore: ['**/integrated-stack.spec.ts', '**/readme-real-ui.spec.ts'],
});
