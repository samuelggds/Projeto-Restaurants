import { expect, test, type Page } from '@playwright/test';

async function mockCustomerMfa(page: Page) {
  const state = {
    loginPayloads: [] as Array<Record<string, unknown>>,
    resendPayloads: [] as Array<Record<string, unknown>>,
    verifyPayloads: [] as Array<Record<string, unknown>>,
  };

  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (url.pathname === '/settings/public/slug/restaurante-teste') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          restaurantId: 9,
          restaurantName: 'North Pizza',
          primaryColor: '#e85a2b',
          restaurant: { id: 9, name: 'North Pizza', slug: 'restaurante-teste' },
        }),
      });
      return;
    }

    if (url.pathname === '/auth/login' && method === 'POST') {
      state.loginPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          mfaRequired: true,
          mfaToken: 'mfa-e2e-token',
          destination: 'c***@teste.com',
          resendAfterSeconds: 0,
        }),
      });
      return;
    }

    if (url.pathname === '/auth/login/resend-2fa' && method === 'POST') {
      state.resendPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          mfaRequired: true,
          mfaToken: 'mfa-e2e-token',
          destination: 'c***@teste.com',
          selectedChannel: 'EMAIL',
          resendAfterSeconds: 60,
        }),
      });
      return;
    }

    if (url.pathname === '/auth/login/verify-2fa' && method === 'POST') {
      state.verifyPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'customer-e2e-token',
          user: {
            id: 22,
            name: 'Cliente Teste',
            email: 'cliente@teste.com',
            role: 'CLIENTE',
            restaurantId: 9,
          },
        }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  return state;
}

async function openMfa(page: Page) {
  await page.goto('/restaurante-teste/login');
  await page.getByLabel('E-mail').fill('cliente@teste.com');
  await page.locator('#password').fill('senha-de-teste');
  await page.locator('form').getByRole('button', { name: /Entrar/u }).click();
  await expect(page.getByRole('heading', { name: 'Verificação em duas etapas' })).toBeVisible();
}

test('MFA do cliente usa somente e-mail no desktop', async ({ page }) => {
  const state = await mockCustomerMfa(page);
  await openMfa(page);

  await expect(page.getByText(/código de 6 dígitos enviado para seu e-mail/i)).toBeVisible();
  await expect(page.getByText(/app autenticador/i)).toHaveCount(0);
  await expect(page.getByText(/outro método/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ajuda' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'GastroNexa' })).toBeVisible();

  await page.getByRole('button', { name: 'Reenviar código' }).click();
  await expect.poll(() => state.resendPayloads.length).toBe(1);
  expect(state.resendPayloads[0]).toMatchObject({ mfaToken: 'mfa-e2e-token' });
  await expect(page.getByText(/Reenviar em \d+:\d{2}/u)).toBeVisible();

  const codeInputs = page.locator('[aria-label^="Dígito "][aria-label$=" do código"]');
  await expect(codeInputs).toHaveCount(6);
  await codeInputs.first().fill('123456');

  const verifyButton = page.getByRole('button', { name: /Verificar e Continuar/u });
  await expect(verifyButton).toBeEnabled();
  await verifyButton.click();
  await expect.poll(() => state.verifyPayloads.length).toBe(1);
  expect(state.verifyPayloads[0]).toEqual({ mfaToken: 'mfa-e2e-token', code: '123456' });
});

test('MFA do cliente mantém o layout mobile sem método alternativo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockCustomerMfa(page);
  await openMfa(page);

  await expect(page.getByText('Verificação', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Voltar ao login' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Verificar', exact: true })).toBeVisible();
  await expect(page.getByText(/outro método/i)).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(391);
});
