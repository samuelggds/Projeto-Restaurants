import type { Page } from '@playwright/test';

const LOCAL_API = /^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/;

/**
 * Simula a rotação do cookie HttpOnly usada pela aplicação real.
 *
 * Registre este handler depois dos mocks de domínio. O `fallback` mantém os
 * demais endpoints sob responsabilidade do cenário que está sendo testado.
 */
export async function mockAuthRefresh(page: Page, userId: number, accessToken: string) {
  await page.route(LOCAL_API, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === '/auth/refresh' && request.method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken, userId }),
      });
      return;
    }

    await route.fallback();
  });
}
