import { expect, test, type Page } from '@playwright/test';

import { mockAuthRefresh } from './helpers/mockAuthRefresh';

async function mockSession(page: Page, user: Record<string, unknown> | null) {
  const requests: string[] = [];
  await page.route('http://127.0.0.1:3000/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    requests.push(`${route.request().method()} ${pathname}`);
    if (pathname === '/auth/me' && user) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.addInitScript((sessionUser) => {
    localStorage.clear();
    sessionStorage.clear();
    if (sessionUser) {
      sessionStorage.setItem('user', JSON.stringify(sessionUser));
    }
  }, user);

  if (user) {
    await mockAuthRefresh(page, Number(user.id), 'e2e-token');
  }
  return { requests };
}

test('Home é pública e rota privada sem restaurante pede contexto antes do login', async ({
  page,
}) => {
  await mockSession(page, null);
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/restaurant-required$/);
  await expect(page.getByRole('heading', { name: 'Restaurante não informado' })).toBeVisible();
});

const restrictedProfiles = [
  { role: 'MOTOQUEIRO', allowed: '/courier', forbidden: '/profile' },
  { role: 'FUNCIONARIO', subRole: 'COZINHA', allowed: '/kitchen', forbidden: '/waiter' },
  { role: 'FUNCIONARIO', subRole: 'GARCOM', allowed: '/waiter', forbidden: '/kitchen' },
];

test('sair do portal SUPER_ADMIN encerra a sessão sem abrir o painel do restaurante', async ({
  page,
}) => {
  const state = await mockSession(page, { id: 1, name: 'Super Admin', role: 'SUPER_ADMIN' });
  await page.goto('/super_admin');
  await expect(page).toHaveURL(/\/super_admin$/);

  await page.goto('/admin');

  await expect(page).toHaveURL(/\/restaurant-required$/);
  await expect
    .poll(() => state.requests.filter((request) => request === 'POST /auth/logout').length)
    .toBe(1);
  expect(await page.evaluate(() => sessionStorage.getItem('user'))).toBeNull();
  expect(state.requests).not.toContain('GET /orders');
});

for (const profile of restrictedProfiles) {
  test(`${profile.role} ${profile.subRole || ''} permanece na área autorizada`, async ({
    page,
  }) => {
    const user = { id: 1, name: 'Teste E2E', restaurantId: 1, ...profile };
    await mockSession(page, user);
    await page.goto(profile.allowed);
    await expect(page).toHaveURL(new RegExp(`${profile.allowed.replace('/', '\\/')}$`));
    await page.goto(profile.forbidden);
    await expect(page).toHaveURL(new RegExp(`${profile.allowed.replace('/', '\\/')}$`));
  });
}

test('cliente acompanha pedido, mas não acessa painel operacional', async ({ page }) => {
  await mockSession(page, { id: 2, name: 'Cliente', role: 'CLIENTE' });
  await page.goto('/orders/48/tracking');
  await expect(page).toHaveURL(/\/orders\/48\/tracking$/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/restaurant-required$/);
});

test('admin acessa operação, mas nunca o Super Admin', async ({ page }) => {
  await mockSession(page, { id: 3, name: 'Admin', role: 'ADMIN', restaurantId: 1 });
  await page.goto('/kitchen');
  await expect(page).toHaveURL(/\/kitchen$/);
  await page.goto('/super_admin');
  await expect(page).toHaveURL(/\/admin$/);
});
