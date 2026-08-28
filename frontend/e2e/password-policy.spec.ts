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
