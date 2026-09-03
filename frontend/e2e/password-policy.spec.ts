import { expect, test, type Page } from '@playwright/test';

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

async function mockRegistrationApi(page: Page, submitted: RegisterPayload[]) {
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === '/auth/register' && request.method() === 'POST') {
      submitted.push(request.postDataJSON() as RegisterPayload);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 91, name: 'Cliente E2E' }),
      });
      return;
    }

    if (pathname.startsWith('/settings/public/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          restaurantId: 9,
          restaurantName: 'Restaurante Teste',
          primaryColor: '#d64d08',
          restaurant: { id: 9, name: 'Restaurante Teste' },
        }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.addInitScript(() => localStorage.clear());
}

test('cadastro exige os seis requisitos e aceita senha forte com exatamente 8 caracteres', async ({
  page,
}) => {
  const submitted: RegisterPayload[] = [];
  await mockRegistrationApi(page, submitted);
  await page.goto('/register');

  const password = page.getByLabel('Senha', { exact: true });
  const confirmation = page.getByLabel('Confirmar Senha', { exact: true });
  const submit = page.getByRole('button', { name: 'Finalizar Cadastro' });
  const requirements = page.getByRole('region', { name: 'Requisitos da senha' });

  await expect(requirements).toHaveCount(0);
  await password.fill('Ab1!cde');
  await expect(requirements).toBeVisible();
  await expect(requirements.getByText('Pendente')).toHaveCount(0);
  await expect(requirements.getByText('Atendido')).toHaveCount(0);
  await confirmation.fill('Ab1!cde');
  await expect(submit).toBeDisabled();
  await expect(requirements.locator('[data-requirement="length"]')).toHaveAttribute(
    'data-met',
    'false',
  );

  await password.fill('Ab1!cdef');
  await confirmation.fill('Ab1!cdef');
  await expect(submit).toBeEnabled();
  await expect(requirements.locator('[data-requirement][data-met="true"]')).toHaveCount(6);

  await page.getByLabel('Nome Completo').fill('Cliente E2E');
  await page.getByLabel('E-mail').fill('cliente.e2e@example.test');
  await submit.click();

  await expect(page).toHaveURL(/\/login$/);
  expect(submitted).toEqual([
    {
      name: 'Cliente E2E',
      email: 'cliente.e2e@example.test',
      password: 'Ab1!cdef',
      confirmPassword: 'Ab1!cdef',
    },
  ]);
});

test('cadastro preserva o restaurante, anuncia o envio e apresenta o erro da API em 320px', async ({
  page,
}) => {
  let releaseRegistration: (() => void) | null = null;

  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === '/auth/register' && request.method() === 'POST') {
      await new Promise<void>((resolve) => {
        releaseRegistration = resolve;
      });
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Este e-mail já está cadastrado.' }),
      });
      return;
    }

    if (pathname.startsWith('/settings/public/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          restaurantId: 9,
          restaurantName: 'Restaurante Teste',
          primaryColor: '#d64d08',
        }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.addInitScript(() => localStorage.clear());
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/register?rid=9&next=%2Fmesa%2F5');

  await page.getByLabel('Nome Completo').fill('Cliente Existente');
  await page.getByLabel('E-mail').fill('existente@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('Ab1!cdef');
  await page.getByLabel('Confirmar Senha', { exact: true }).fill('Ab1!cdef');
  await page.getByRole('button', { name: 'Finalizar Cadastro' }).click();

  const submitting = page.getByRole('button', { name: 'Finalizando...' });
  await expect(submitting).toBeDisabled();
  await expect(submitting).toHaveAttribute('aria-busy', 'true');
  await expect.poll(() => Boolean(releaseRegistration)).toBe(true);
  releaseRegistration?.();

  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    'Este e-mail já está cadastrado.',
  );
  await expect(page.getByRole('button', { name: 'Finalizar Cadastro' })).toBeEnabled();
  await expect(page.getByRole('link', { name: 'Fazer Login' })).toHaveAttribute(
    'href',
    '/login?rid=9&next=%2Fmesa%2F5',
  );
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(321);
});
