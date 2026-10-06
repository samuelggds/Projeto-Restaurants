import { orderFixtureResponse } from './helpers/orderFixtures';
import { expect, test } from '@playwright/test';

import { mockAuthRefresh } from './helpers/mockAuthRefresh';
import { captureReadmeScreenshot } from './helpers/readmeScreenshot';

test('cliente consulta cupons válidos, histórico e o novo ciclo no perfil', async ({ page }) => {
  let loyaltyRestaurantId = '';
  const quotePayloads: Array<Record<string, unknown>> = [];
  const paymentCreatePayloads: Array<Record<string, unknown>> = [];
  const mfaPreferencePayloads: Array<Record<string, unknown>> = [];

  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;

    if (pathname === '/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
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

    if (pathname === '/settings/public/9/card-payment-config') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ provider: 'ASAAS' }),
      });
      return;
    }

    if (
      pathname === '/settings/public/9' ||
      pathname === '/settings/public/slug/restaurante-teste'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          restaurantId: 9,
          restaurantName: 'North Pizza',
          primaryColor: '#d05632',
          averageDeliveryTime: 45,
          restaurant: {
            id: 9,
            name: 'North Pizza',
            slug: 'restaurante-teste',
            logo: 'https://cdn.example.test/north-pizza-logo.png',
            description: 'Pizzas artesanais e entrega rápida.',
          },
        }),
      });
      return;
    }

    if (pathname === '/products') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          products: [
            {
              id: 101,
              name: 'Prato artesanal',
              description: 'Prepare do seu jeito.',
              price: 40,
              active: true,
              stock: null,
              category: { name: 'Principais' },
              optionGroups: [],
            },
          ],
        }),
      });
      return;
    }

    if (pathname === '/orders/my-orders') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          orderFixtureResponse(route.request().url(), [
            {
              id: 312,
              status: 'PREPARANDO',
              createdAt: '2099-09-22T12:00:00.000Z',
              total: 58.9,
              items: [
                {
                  product: {
                    name: 'Pizza artesanal',
                    image:
                      'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=400&q=80',
                  },
                },
              ],
            },
            {
              id: 311,
              status: 'ENTREGUE',
              createdAt: '2099-09-18T20:00:00.000Z',
              total: 72.5,
              items: [
                {
                  product: {
                    name: 'Pizza Margherita',
                    image:
                      'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=400&q=80',
                  },
                },
              ],
            },
            {
              id: 310,
              status: 'ENTREGUE',
              createdAt: '2099-09-12T20:00:00.000Z',
              total: 96.8,
              items: [
                {
                  product: {
                    name: 'Pizza Calabresa',
                    image:
                      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80',
                  },
                },
                { product: { name: 'Suco artesanal' } },
              ],
            },
          ]),
        ),
      });
      return;
    }

    if (pathname === '/customer-addresses') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          addresses: [
            {
              id: 1,
              label: 'Casa',
              address: 'Rua Francisco Calaça',
              number: '1688',
              district: 'Floresta',
              city: 'Fortaleza',
              state: 'CE',
              complement: 'Apto 302',
              isDefault: true,
            },
          ],
        }),
      });
      return;
    }

    if (pathname === '/customer-payment-methods') {
      if (route.request().method() === 'POST') {
        const payload = route.request().postDataJSON() as Record<string, unknown>;
        paymentCreatePayloads.push(payload);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            paymentMethod: {
              publicId: 'card-created',
              provider: 'ASAAS',
              brand: payload.brand || 'mastercard',
              last4: payload.last4 || '4444',
              expMonth: payload.expMonth || 12,
              expYear: payload.expYear || 2030,
              holderName: payload.holderName || 'Cliente Teste',
              isDefault: false,
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          paymentMethods: [
            {
              publicId: 'card-1',
              provider: 'ASAAS',
              brand: 'visa',
              last4: '4242',
              expMonth: 12,
              expYear: 2030,
              holderName: 'Cliente Teste',
              isDefault: true,
              createdAt: '2026-09-15T12:00:00.000Z',
            },
          ],
        }),
      });
      return;
    }

    if (pathname === '/auth/mfa' && route.request().method() === 'PATCH') {
      mfaPreferencePayloads.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ enabled: true }),
      });
      return;
    }

    if (pathname === '/coupons/loyalty') {
      loyaltyRestaurantId = url.searchParams.get('restaurantId') || '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          restaurantId: 9,
          purchasesCompleted: 0,
          rewards: [
            {
              coupon: {
                id: 7,
                code: 'CLIENTE10',
                title: '10% de desconto',
                description: 'Recompensa por dez pedidos entregues.',
                discountType: 'PERCENTAGE',
                discount: 10,
                minimumSubtotal: 30,
                redemptionValidityDays: 30,
              },
              purchasesCompleted: 0,
              purchasesRequired: 10,
              remaining: 10,
              progressPercent: 0,
              canRedeem: false,
              redemptions: [
                {
                  id: 73,
                  cycle: 3,
                  status: 'CLAIMED',
                  expiresAt: '2099-09-22T12:00:00.000Z',
                  expired: false,
                },
                {
                  id: 72,
                  cycle: 2,
                  status: 'USED',
                  expiresAt: '2099-08-22T12:00:00.000Z',
                  expired: false,
                },
              ],
            },
          ],
          redemptions: [
            {
              id: 74,
              cycle: 2,
              status: 'CLAIMED',
              expiresAt: '2099-10-22T12:00:00.000Z',
              expired: false,
              coupon: {
                id: 8,
                code: 'ANTIGO5',
                title: 'Campanha anterior',
                description: 'Cupom emitido antes de a campanha ser pausada.',
                discountType: 'PERCENTAGE',
                discount: 5,
                minimumSubtotal: 0,
                loyaltyPurchasesRequired: 10,
                perCustomerLimit: 2,
              },
            },
            {
              id: 71,
              cycle: 1,
              status: 'EXPIRED',
              expiresAt: '2025-08-22T12:00:00.000Z',
              expired: true,
              coupon: {
                id: 8,
                code: 'ANTIGO5',
                title: 'Campanha anterior',
                description: 'Benefício de uma campanha já encerrada.',
                discountType: 'PERCENTAGE',
                discount: 5,
                minimumSubtotal: 0,
              },
            },
            ...Array.from({ length: 7 }, (_, index) => ({
              id: 80 + index,
              cycle: index + 1,
              status: 'EXPIRED',
              expiresAt: `2025-0${index + 1}-22T12:00:00.000Z`,
              expired: true,
              coupon: {
                id: 20 + index,
                code: `HISTORICO${index + 1}`,
                title: `Cupom histórico ${index + 1}`,
                description: 'Benefício utilizado em um ciclo anterior.',
                discountType: 'FIXED',
                discount: 10 + index,
                minimumSubtotal: 20,
              },
            })),
          ],
        }),
      });
      return;
    }

    if (pathname === '/orders/quote' && route.request().method() === 'POST') {
      quotePayloads.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          itemsSubtotal: 40,
          productDiscountTotal: 0,
          couponDiscount: 2,
          deliveryFeeAmount: 0,
          total: 38,
          couponCode: 'ANTIGO5',
        }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 22,
        name: 'Cliente Teste',
        email: 'cliente@teste.com',
        role: 'CLIENTE',
        restaurantId: 9,
      }),
    );
    localStorage.setItem('menuRestaurantId', '9');
    localStorage.setItem('cartRestaurantId', '9');
    localStorage.setItem(
      'cartItems:9',
      JSON.stringify([
        {
          productId: '101',
          name: 'Prato artesanal',
          price: 40,
          quantity: 1,
          image: '',
          selectedOptionIds: [],
          selectedOptions: [],
        },
      ]),
    );
  });

  await mockAuthRefresh(page, 22, 'e2e-customer-token');

  await page.goto('/profile');
  const visibleProfileContent = page.locator('main:visible');
  const profileCartButton = page.getByRole('button', { name: 'Sacola com 1 item' });
  await expect(profileCartButton).toBeVisible();

  await page.getByRole('button', { name: 'Voltar para o restaurante' }).click();
  await expect(page).toHaveURL(/\/restaurante-teste/);
  const productSearch = page.getByRole('searchbox', { name: 'Pesquisar produto pelo nome' });
  await expect(productSearch).toBeVisible();
  await productSearch.fill('artesanal');
  const searchResults = page.getByLabel('Produtos encontrados');
  await expect(searchResults).toBeVisible();
  await expect(searchResults.getByRole('button').filter({ hasText: 'Prato artesanal' })).toBeVisible();

  await page.goto('/profile');
  await page.getByRole('button', { name: 'Sacola com 1 item' }).click();
  const checkout = page.getByRole('dialog', { name: 'Finalizar pedido' });
  await expect(checkout).toBeVisible();
  await expect(checkout.getByText('Prato artesanal', { exact: true })).toBeVisible();
  await expect(checkout.getByText('R$ 40,00', { exact: true }).last()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(checkout).toBeHidden();

  await page.goto('/profile');
  await page.getByRole('button', { name: /^Meus pedidos/ }).click();
  await expect(page.getByRole('heading', { name: 'Meus Pedidos', exact: true })).toBeVisible();
  const visibleActiveOrderId = visibleProfileContent.getByText(/Pedido #0312/);
  await expect(visibleActiveOrderId).toHaveCount(1);
  await expect(visibleActiveOrderId).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: 'Voltar para minha conta' }).click();

  await page.getByRole('button', { name: /^Endereços salvos/ }).click();
  await expect(page.getByRole('heading', { name: 'Endereços Salvos', exact: true })).toBeVisible();
  await expect(visibleProfileContent.getByText(/Rua Francisco Calaça/)).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: 'Voltar para minha conta' }).click();

  await page.getByRole('button', { name: /^Métodos de pagamento/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Cartões Salvos', exact: true }),
  ).toBeVisible();
  const savedCards = page.getByLabel('Cartões salvos');
  const primaryVisa = savedCards.getByRole('button', {
    name: 'Ver detalhes do cartão final 4242',
  });
  await expect(primaryVisa).toContainText('Visa');
  await expect(primaryVisa).toContainText('4242');
  await expect(primaryVisa).toContainText('Principal');
  await expect(savedCards.getByRole('button', { name: 'Adicionar novo cartão' })).toBeVisible();

  await primaryVisa.click();
  await expect(page.getByRole('heading', { name: 'Detalhes do Cartão' })).toBeVisible();
  const savedCardDetails = page.getByLabel('Detalhes do cartão salvo');
  await expect(savedCardDetails).toContainText('Método de pagamento principal');
  await expect(savedCardDetails).toContainText('Visa');
  await expect(savedCardDetails).toContainText('4242');
  await expect(savedCardDetails).toContainText('Cliente Teste');
  await expect(savedCardDetails).toContainText('12/30');
  await expect(savedCardDetails).toContainText('15 set 2026');
  await expect(savedCardDetails.locator('.card-waves')).toBeVisible();
  await expect(savedCardDetails.locator('.contactless-icon')).toBeVisible();
  await expect(savedCardDetails.locator('img[alt="Visa"]')).toBeVisible();
  await expect(savedCardDetails.getByRole('button', { name: 'Definir como principal' })).toBeDisabled();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(savedCardDetails).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(391);
  await page.getByRole('main').getByRole('button', { name: 'Voltar para minha conta' }).click();
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.getByRole('button', { name: 'Adicionar novo cartão' }).click();
  await expect(page.getByRole('heading', { name: 'Adicionar Novo Cartão' })).toBeVisible();

  await expect(page.getByText('North Pizza', { exact: true }).first()).toBeVisible();
  await expect(page.locator('footer').filter({ hasText: 'North Pizza' }).last()).toContainText(
    'North Pizza',
  );
  await expect(
    page.locator('footer img[src="https://cdn.example.test/north-pizza-logo.png"]').last(),
  ).toBeVisible();

  // rodapé da nova tela usa a identidade dinâmica vinda das configurações do restaurante
  const paymentForm = page.getByRole('form', { name: 'Cadastrar cartão' });
  await expect(paymentForm.locator('.card-waves')).toBeVisible();
  await expect(paymentForm.locator('.contactless-icon')).toBeVisible();
  await expect(paymentForm.locator('.payment-chip')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText('Novo Cartão', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: 'Voltar para minha conta' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(391);
  await page.setViewportSize({ width: 1280, height: 900 });

  await paymentForm.getByLabel('Nome impresso no cartão').fill('CLIENTE TESTE');
  await paymentForm.getByLabel('Número do cartão').fill('5555555555554444');
  await expect(paymentForm.locator('img[alt="Mastercard"]').first()).toBeVisible();
  await paymentForm.getByLabel('Validade').fill('1230');
  await paymentForm.getByLabel('CVV').fill('123');
  await expect(paymentForm.getByLabel('E-mail do pagador')).toHaveValue('cliente@teste.com');
  await paymentForm.getByLabel('E-mail do pagador').fill('pagador-cartao@teste.com');
  await paymentForm.getByLabel('CPF do titular').fill('12345678909');
  await paymentForm.getByRole('button', { name: 'Salvar Novo Cartão' }).click();

  await expect.poll(() => paymentCreatePayloads.length).toBe(1);
  expect(paymentCreatePayloads[0]).toMatchObject({
    restaurantId: 9,
    holderName: 'CLIENTE TESTE',
    payerEmail: 'pagador-cartao@teste.com',
    holderTaxId: '123.456.789-09',
    brand: 'mastercard',
    last4: '4444',
    expMonth: 12,
    expYear: 2030,
  });

  await page.getByRole('main').getByRole('button', { name: 'Voltar para minha conta' }).click();
  await page.getByRole('button', { name: /^Meus Cupons/ }).click();
  await expect(page.getByRole('heading', { name: 'Meus Cupons', exact: true })).toBeVisible();
  const cliente10Coupons = visibleProfileContent
    .locator('article')
    .filter({ hasText: 'CLIENTE10' });
  await expect(cliente10Coupons).toHaveCount(2);
  await expect(cliente10Coupons.filter({ hasText: 'Disponível' })).toHaveCount(1);
  await expect(cliente10Coupons.filter({ hasText: 'Utilizado' })).toHaveCount(1);

  const antigo5Coupons = visibleProfileContent
    .locator('article')
    .filter({ hasText: 'ANTIGO5' });
  await expect(antigo5Coupons).toHaveCount(2);
  await expect(antigo5Coupons.filter({ hasText: 'Disponível' })).toHaveCount(1);
  await expect(antigo5Coupons.filter({ hasText: 'Expirado' })).toHaveCount(1);
  expect(loyaltyRestaurantId).toBe('9');

  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width + 1);
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await captureReadmeScreenshot(page, 'customer-profile-coupons.png', { fullPage: true });

  const previousCampaign = antigo5Coupons
    .filter({ hasText: 'Disponível' })
    .filter({ hasText: 'Campanha anterior' });
  await expect(previousCampaign).toBeVisible();
  await previousCampaign.getByRole('button', { name: 'Usar Cupom' }).click();

  await expect(page).toHaveURL(/\/restaurante-teste$/);
  const couponCheckout = page.getByRole('dialog', { name: 'Finalizar pedido' });
  await expect(couponCheckout).toBeVisible();
  await expect(couponCheckout.getByRole('textbox', { name: 'Código do cupom' })).toHaveValue(
    'ANTIGO5',
  );
  await expect(couponCheckout.getByRole('button', { name: 'Aplicado', exact: true })).toBeVisible();
  await expect
    .poll(() => quotePayloads.find((payload) => payload.couponRedemptionId === 74))
    .toMatchObject({ restaurantId: 9, couponRedemptionId: 74 });

  await page.goto('/profile');
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.getByRole('button', { name: 'Ativar MFA' }).click();
  await expect(page.getByText('Ativar MFA', { exact: true })).toBeVisible();
  await page.getByLabel('Senha atual').fill('senha-atual-teste');
  await page.getByRole('button', { name: 'Confirmar ativação' }).click();

  await expect.poll(() => mfaPreferencePayloads.length).toBe(1);
  expect(mfaPreferencePayloads[0]).toEqual({
    enabled: true,
    currentPassword: 'senha-atual-teste',
  });
  await expect(page).toHaveURL(/\/login/u);
});
