import type { Page } from '@playwright/test';

const LOCAL_API = /^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/;
const TRACKING_ROUTE = /^\/orders\/\d+\/tracking$/;
const PUBLIC_RESTAURANT_SETTINGS = /^\/settings\/public\/(\d+)$/;

function pathnameFromUrl(value: string | undefined) {
  if (!value) return '';

  try {
    return new URL(value).pathname;
  } catch {
    return '';
  }
}

/**
 * Simula a rotação do cookie HttpOnly usada pela aplicação real.
 *
 * Registre este handler depois dos mocks de domínio. O `fallback` mantém os
 * demais endpoints sob responsabilidade do cenário que está sendo testado.
 */
export async function mockAuthRefresh(page: Page, userId: number, accessToken: string) {
  // Os cenários E2E alternam personas substituindo o cookie mockado. Como a
  // aplicação real guarda o snapshot do usuário apenas em sessionStorage,
  // cada nova sessão mockada precisa começar sem a identidade anterior. Isso
  // evita reaproveitar o snapshot de outra conta e preserva o mesmo requisito
  // de segurança usado em dispositivos compartilhados.
  await page.addInitScript(() => {
    sessionStorage.removeItem('user');
  });

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

    const publicSettingsMatch = pathname.match(PUBLIC_RESTAURANT_SETTINGS);
    const refererPathname = pathnameFromUrl(request.headers().referer);
    const pagePathname = pathnameFromUrl(page.url());
    const authorization = request.headers().authorization;
    const isTrackingPage =
      TRACKING_ROUTE.test(refererPathname) || TRACKING_ROUTE.test(pagePathname);

    if (
      publicSettingsMatch &&
      request.method() === 'GET' &&
      isTrackingPage &&
      authorization === `Bearer ${accessToken}`
    ) {
      const restaurantId = Number(publicSettingsMatch[1]);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          restaurantId,
          restaurantName: 'Restaurante do pedido',
          restaurantCategory: 'RESTAURANTE',
          restaurant: {
            id: restaurantId,
            name: 'Restaurante do pedido',
          },
        }),
      });
      return;
    }

    await route.fallback();
  });
}
