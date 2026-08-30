import { expect, test } from '@playwright/test';

const MOBILE_VIEWPORTS = [
  { name: '320x568', width: 320, height: 568 },
  { name: '360x740', width: 360, height: 740 },
  { name: '375x667', width: 375, height: 667 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 },
  { name: '430x932', width: 430, height: 932 },
  { name: '440x956', width: 440, height: 956 },
];

async function mockLoginBranding(page) {
  await page.route('**/settings/public/default**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        restaurantId: 3,
        primaryColor: '#d35d3c',
        restaurant: {
          name: 'North Pizza',
          description: 'Sabor que acolhe. Experiência que fica.',
          coverImage: 'https://assets.test/north-cover.svg',
          logo: null,
        },
      }),
    });
  });

  await page.route('https://assets.test/north-cover.svg', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: `
        <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#241a14" />
              <stop offset="0.48" stop-color="#9c4f33" />
              <stop offset="1" stop-color="#17110e" />
            </linearGradient>
          </defs>
          <rect width="1600" height="1200" fill="url(#g)" />
          <circle cx="800" cy="500" r="280" fill="#d9a52f" opacity="0.72" />
        </svg>
      `,
    });
  });

  await page.route('**/auth/google/client-id**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ clientId: null }),
    });
  });

  await page.route('https://accounts.google.com/gsi/client', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
  });
}

for (const viewport of MOBILE_VIEWPORTS) {
  test(`login mobile responsivo em ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockLoginBranding(page);
    await page.goto('/login');

    const layout = page.getByTestId('login-layout');
    const cover = page.getByTestId('login-cover');
    const coverImage = page.getByTestId('login-cover-image');
    const card = page.getByTestId('login-card');

    await expect(layout).toBeVisible();
    await expect(cover).toBeVisible();
    await expect(coverImage).toBeVisible();
    await expect(card).toBeVisible();
    await expect(page.getByText('North Pizza', { exact: true })).toBeVisible();
    await expect(page.getByText('Sabor que acolhe. Experiência que fica.')).toBeVisible();

    const [coverBox, imageBox, cardBox] = await Promise.all([
      cover.boundingBox(),
      coverImage.boundingBox(),
      card.boundingBox(),
    ]);

    expect(coverBox).not.toBeNull();
    expect(imageBox).not.toBeNull();
    expect(cardBox).not.toBeNull();

    const expectedCoverHeight = Math.min(330, Math.max(230, viewport.height * 0.34));
    expect(Math.abs((coverBox?.height || 0) - expectedCoverHeight)).toBeLessThanOrEqual(4);
    expect(Math.abs((imageBox?.height || 0) - (coverBox?.height || 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((imageBox?.width || 0) - (coverBox?.width || 0))).toBeLessThanOrEqual(1);

    const imageFit = await coverImage.evaluate((element) => getComputedStyle(element).objectFit);
    expect(imageFit).toBe('cover');

    expect(coverBox?.x || 0).toBeGreaterThanOrEqual(0);
    expect(coverBox?.width || 0).toBeGreaterThanOrEqual(viewport.width - 1);
    expect(cardBox?.left || 0).toBeGreaterThanOrEqual(0);
    expect(cardBox?.right || 0).toBeLessThanOrEqual(viewport.width + 1);

    const cardOffsetFromCover = (cardBox?.top || 0) - (coverBox?.bottom || 0);
    expect(cardOffsetFromCover).toBeGreaterThanOrEqual(-4);
    expect(cardOffsetFromCover).toBeLessThanOrEqual(48);

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

    const cardBackgroundBefore = await card.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    await page.getByRole('button', { name: 'Ativar modo escuro' }).click();
    const cardBackgroundAfter = await card.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    expect(cardBackgroundAfter).not.toBe(cardBackgroundBefore);
  });
}
