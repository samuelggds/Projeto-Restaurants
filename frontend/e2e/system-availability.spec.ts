import { expect, test, type Page } from '@playwright/test';

const LOCAL_API = /^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/;

async function mockGlobalMaintenance(page: Page) {
  await page.route(LOCAL_API, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/platform/status') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: false,
          maintenanceMode: true,
          maintenanceMessage: 'Atualização programada dos servidores de pagamento.',
        }),
      });
      return;
    }
    if (pathname === '/auth/refresh') {
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
      return;
    }
    if (pathname === '/auth/google/client-id') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  });
  await page.addInitScript(() => localStorage.clear());
}

test('manutenção global cobre o negócio e mantém todos os logins acessíveis', async ({ page }) => {
  await mockGlobalMaintenance(page);
  await page.goto('/qualquer-restaurante');

  await expect(page.getByRole('heading', { name: 'Sistema em manutenção' })).toBeVisible();
  await expect(page.getByText('Tente novamente em alguns instantes')).toBeVisible();
  await expect(
    page.getByText('Atualização programada dos servidores de pagamento.'),
  ).not.toBeVisible();

  await page.getByRole('link', { name: 'Acesso técnico' }).click();
  await expect(page).toHaveURL(/\/super_admin\/login$/);
  await expect(page.getByRole('heading', { name: 'Acesso técnico' })).toBeVisible();
  await expect(page.getByText('conta exclusiva de Super Admin')).toBeVisible();

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Bem-vindo!' })).toBeVisible();
  await expect(page.getByLabel('E-mail')).toBeVisible();

  await page.goto('/super_admin');
  await expect(page).toHaveURL(/\/super_admin\/login$/);
  await expect(page.getByRole('heading', { name: 'Acesso técnico' })).toBeVisible();
});

test('ADMIN inadimplente acessa somente mensalidades e volta após a liberação', async ({
  page,
}) => {
  let blocked = true;
  const requestedPaths: string[] = [];
  const admin = {
    id: 17,
    name: 'Ana Administradora',
    email: 'ana@restaurante.test',
    role: 'ADMIN',
    restaurantId: 7,
  };

  await page.route(LOCAL_API, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    requestedPaths.push(pathname);
    if (pathname === '/platform/status') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ available: true, maintenanceMode: false }),
      });
      return;
    }
    if (pathname === '/auth/refresh') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: 'admin-e2e-token', userId: admin.id }),
      });
      return;
    }
    if (pathname === '/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: admin }),
      });
      return;
    }
    if (pathname === '/restaurants/7/availability') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ restaurantId: 7, available: !blocked }),
      });
      return;
    }
    if (pathname === '/billing/invoices') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          invoices: [
            {
              id: 91,
              month: 7,
              year: 2026,
              monthlyFee: 249.9,
              systemFees: 0,
              total: 249.9,
              status: blocked ? 'ATRASADO' : 'PAGO',
              dueDate: '2026-07-10T12:00:00.000Z',
              paidAt: blocked ? null : '2026-08-28T12:00:00.000Z',
              paymentLink: 'https://payment.test/91',
            },
          ],
          billing: {
            currentCycle: 2,
            completedMonths: 1,
            currentInvoiceId: 91,
            dueDate: '2026-07-10T12:00:00.000Z',
            graceLimitDate: '2026-07-17T12:00:00.000Z',
            pixAvailable: blocked,
          },
        }),
      });
      return;
    }
    if (pathname === '/billing/plans') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    if (pathname === '/subscription') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 3, plan: 'PREMIUM', status: blocked ? 'EXPIRADA' : 'ATIVA' }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.addInitScript((user) => {
    localStorage.clear();
    localStorage.setItem('user', JSON.stringify(user));
  }, admin);

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Mensalidades e faturas' })).toBeVisible();
  await expect(page.getByText('OPERAÇÃO TEMPORARIAMENTE PAUSADA')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pedidos' })).toBeDisabled();
  expect(requestedPaths).not.toContain('/orders');
  expect(requestedPaths).not.toContain('/products');

  blocked = false;
  await page.getByRole('button', { name: 'Verificar liberação' }).click();
  await expect(page.getByText('OPERAÇÃO TEMPORARIAMENTE PAUSADA')).not.toBeVisible();
});

test('login técnico recusa qualquer conta que não seja SUPER_ADMIN', async ({ page }) => {
  let logoutCalls = 0;
  await page.route(LOCAL_API, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === '/platform/status') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ available: true, maintenanceMode: false }),
      });
      return;
    }
    if (pathname === '/auth/refresh') {
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
      return;
    }
    if (pathname === '/auth/login') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'admin-token-that-must-be-revoked',
          user: { id: 8, name: 'Admin Restaurante', role: 'ADMIN', restaurantId: 3 },
        }),
      });
      return;
    }
    if (pathname === '/auth/logout') {
      logoutCalls += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }

    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
  await page.addInitScript(() => localStorage.clear());

  await page.goto('/super_admin/login');
  await page.getByLabel('E-mail').fill('admin@restaurante.test');
  await page.getByLabel('Senha').fill('Senha@123');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(
    page.getByText('Este acesso é exclusivo do Super Admin da plataforma.'),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/super_admin\/login$/);
  await expect.poll(() => logoutCalls).toBe(1);
});
