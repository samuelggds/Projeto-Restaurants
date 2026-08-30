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
          coverImage: 'https://assets.test/north-cover.jpg',
          logo: null,
        },
      }),
    });
  });

  await page.route('https://assets.test/north-cover.jpg', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: `
        <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#2d2219" />
              <stop offset="0.45" stop-color="#9c4f33" />
              <stop offset="1" stop-color="#1b1714" />
            </linearGradient>
          </defs>
          <rect width="1600" height="1200" fill="url(#g)" />
          <circle cx="800" cy="510" r="270" fill="#d9a52f" opacity="0.75" />
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
  test(`login permanece responsivo em ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockLoginBranding(page);
    await page.goto('/login');

    const coverImage = page.getByAltText('Capa North Pizza');
    await expect(coverImage).toBeVisible();
    await expect(page.getByText('North Pizza', { exact: true })).toBeVisible();
    await expect(page.getByText('Sabor que acolhe. Experiência que fica.')).toBeVisible();

    const banner = coverImage.locator('xpath=../..');
    const formWrapper = page.locator('#email').locator('xpath=../../..');

    const [bannerBox, imageBox, formBox] = await Promise.all([
      banner.boundingBox(),
      coverImage.boundingBox(),
      formWrapper.boundingBox(),
    ]);

    expect(bannerBox).not.toBeNull();
    expect(imageBox).not.toBeNull();
    expect(formBox).not.toBeNull();

    const expectedCoverHeight = Math.min(330, Math.max(230, viewport.width * 0.67));
    expect(Math.abs((bannerBox?.height || 0) - expectedCoverHeight)).toBeLessThanOrEqual(3);
    expect(Math.abs((imageBox?.height || 0) - (bannerBox?.height || 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((imageBox?.width || 0) - (bannerBox?.width || 0))).toBeLessThanOrEqual(1);

    expect((bannerBox?.width || 0)).toBeGreaterThanOrEqual(viewport.width - 20);
    expect((bannerBox?.width || 0)).toBeLessThanOrEqual(viewport.width);
    expect((formBox?.right || 0)).toBeLessThanOrEqual(viewport.width + 1);
    expect((formBox?.bottom || 0)).toBeGreaterThanOrEqual(viewport.height - 16);

    const layout = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth);

    const password = page.locator('#password');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar senha' }).click();
    await expect(password).toHaveAttribute('type', 'text');

    const formBackgroundBefore = await formWrapper.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    await page.getByRole('button', { name: 'Ativar modo escuro' }).click();
    const formBackgroundAfter = await formWrapper.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    expect(formBackgroundAfter).not.toBe(formBackgroundBefore);
  });
}
