import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { captureReadmeScreenshot } from './helpers/readmeScreenshot';

const LOGIN_COVER_URL = 'https://assets.test/north-cover.jpg';
const LOGIN_COVER_FILE = new URL('./fixtures/readme/pizza-margherita.jpg', import.meta.url);

const MOBILE_VIEWPORTS = [
  { name: '320x568', width: 320, height: 568 },
  { name: '360x740', width: 360, height: 740 },
  { name: '375x667', width: 375, height: 667 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 },
  { name: '430x932', width: 430, height: 932 },
  { name: '440x956', width: 440, height: 956 },
];

async function mockLoginBranding(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.route('**/platform/status', (route) =>
    route.fulfill({ json: { available: true, maintenanceMode: false, maintenanceMessage: '' } }),
  );
  await page.route('**/auth/refresh', (route) =>
    route.fulfill({ status: 401, json: { error: 'Não autenticado.' } }),
  );
  await page.route('**/settings/public/slug/north-pizza?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        restaurantId: 3,
        primaryColor: '#d35d3c',
        restaurant: {
          id: 3,
          slug: 'north-pizza',
          name: 'North Pizza',
          description: 'Sabor que acolhe. Experiência que fica.',
          coverImage: LOGIN_COVER_URL,
          logo: null,
          category: 'PIZZARIA',
        },
      }),
    });
  });

  await page.route(LOGIN_COVER_URL, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/jpeg',
      body: await readFile(LOGIN_COVER_FILE),
    });
  });

  await page.route('**/auth/google/client-id**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ clientId: 'readme-client.apps.googleusercontent.com' }),
    });
  });

  await page.route('https://accounts.google.com/gsi/client', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: `
        window.google = {
          accounts: {
            id: {
              initialize: function () {},
              renderButton: function (container) {
                container.style.width = '100%';
                container.innerHTML = '<button type="button" aria-label="Continuar com Google" style="width:100%;height:46px;border:1px solid #ded5cc;border-radius:999px;background:#fff;color:#2c241f;font:600 14px Arial,sans-serif;cursor:pointer">Continuar com Google</button>';
              }
            }
          }
        };
      `,
    });
  });
}

test('login desktop preserva identidade e hierarquia visual', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await mockLoginBranding(page);
  await page.goto('/north-pizza/login');

  await expect(page.getByTestId('login-cover')).toBeVisible();
  await expect(page.getByTestId('login-card')).toBeVisible();
  await expect(page.getByText('North Pizza', { exact: true })).toBeVisible();
  await expect(page.getByText('Acesso do Cliente', { exact: true })).toBeVisible();
  await expect(page.getByText('Bem-vindo de volta!', { exact: true })).toBeVisible();
  await expect(page.getByTestId('login-hero-content')).toHaveAttribute('data-category', 'PIZZARIA');
  await expect(page.getByRole('button', { name: 'Entrar como cliente' })).toBeVisible();

  const [heroBox, formBox] = await Promise.all([
    page.getByTestId('login-cover').boundingBox(),
    page.getByTestId('login-card').boundingBox(),
  ]);
  expect(Math.abs((heroBox?.width || 0) - 680)).toBeLessThanOrEqual(1);
  expect(Math.abs((formBox?.width || 0) - 760)).toBeLessThanOrEqual(1);
  await captureReadmeScreenshot(page, 'login-desktop.png', { fullPage: true });

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
});

for (const viewport of MOBILE_VIEWPORTS) {
  test(`login mobile responsivo em ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockLoginBranding(page);
    await page.goto('/north-pizza/login');

    const layout = page.getByTestId('login-layout');
    const cover = page.getByTestId('login-cover');
    const coverImage = page.getByTestId('login-cover-image');
    const card = page.getByTestId('login-card');

    await expect(layout).toBeVisible();
    await expect(cover).toBeVisible();
    await expect(coverImage).toBeVisible();
    await expect(card).toBeVisible();
    await expect(page.getByText('North Pizza', { exact: true })).toBeVisible();
    await expect(page.getByText('Acesso do Cliente', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Acesse sua conta para continuar no North Pizza.'),
    ).toBeVisible();

    if (viewport.name === '390x844') {
      await captureReadmeScreenshot(page, 'login-mobile.png', { fullPage: true });
    }

    const [coverBox, imageBox, cardBox] = await Promise.all([
      cover.boundingBox(),
      coverImage.boundingBox(),
      card.boundingBox(),
    ]);

    expect(coverBox).not.toBeNull();
    expect(imageBox).not.toBeNull();
    expect(cardBox).not.toBeNull();

    expect(Math.abs((coverBox?.height || 0) - 320)).toBeLessThanOrEqual(1);
    expect(Math.abs((imageBox?.height || 0) - (coverBox?.height || 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((imageBox?.width || 0) - (coverBox?.width || 0))).toBeLessThanOrEqual(1);

    const imageFit = await coverImage.evaluate((element) => getComputedStyle(element).objectFit);
    expect(imageFit).toBe('cover');

    expect(coverBox?.x || 0).toBeGreaterThanOrEqual(0);
    expect(coverBox?.width || 0).toBeGreaterThanOrEqual(viewport.width - 1);
    expect(cardBox!.x).toBeGreaterThanOrEqual(0);
    expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(viewport.width + 1);

    const cardOffsetFromCover = cardBox!.y - (coverBox!.y + coverBox!.height);
    // O frame mobile do Figma inicia o card em y=280 enquanto o hero tem 320px.
    expect(Math.abs(cardOffsetFromCover + 40)).toBeLessThanOrEqual(1);

    const documentMetrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    }));

    expect(documentMetrics.scrollWidth).toBeLessThanOrEqual(documentMetrics.innerWidth);
    expect(documentMetrics.scrollHeight).toBeGreaterThanOrEqual(documentMetrics.innerHeight);

    const password = page.locator('#password');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar senha' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar senha' }).click();
    await expect(password).toHaveAttribute('type', 'password');

  });
}
