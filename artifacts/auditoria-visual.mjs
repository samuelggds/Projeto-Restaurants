import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const output = (name) => fileURLToPath(new URL(name, import.meta.url));
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  await page.goto('http://127.0.0.1:4173/north-pizza', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Todos os produtos', exact: true }).waitFor({ timeout: 30000 });
  await page.screenshot({ path: output('auditoria-home-desktop.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: output('auditoria-home-mobile.png'), animations: 'disabled' });
  const geometry = await page.evaluate(() => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth,
    nestedInteractive: document.querySelectorAll('[role="button"] button').length,
    visibleDialogs: document.querySelectorAll('[role="dialog"]').length,
  }));
  await page.getByRole('button', { name: 'Ver detalhes de Bife e cavalo', exact: true }).click();
  await page.screenshot({ path: output('auditoria-produto-mobile.png'), animations: 'disabled' });
  await writeFile(output('auditoria-visual-geometria.json'), JSON.stringify(geometry, null, 2));
  console.log(JSON.stringify(geometry));
} finally { await browser.close(); }
