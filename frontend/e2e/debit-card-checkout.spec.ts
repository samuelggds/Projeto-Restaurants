import { expect, test, type Page, type Route } from '@playwright/test';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';

const RESTAURANT_ID = 9;
const RESTAURANT_SLUG = 'restaurante-teste';
const LOCAL_API = /^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/;

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockDebitCheckout(page: Page) {
  let submitted: Record<string, unknown> | null = null;

  await page.addInitScript(() => {
    class MockField {
      name: string;
      binChange?: (event: { bin?: string | null }) => void;

      constructor(name: string) {
        this.name = name;
      }

      mount() {
        if (this.name === 'cardNumber' && this.binChange) {
          queueMicrotask(() => this.binChange?.({ bin: '411111' }));
        }
      }

      unmount() {}

      on(event: string, callback: (event: { bin?: string | null }) => void) {
        if (event === 'binChange') this.binChange = callback;
        return this;
      }
    }

    class MockMercadoPago {
      fields = {
        create: (name: string) => new MockField(name),
        createCardToken: async () => ({
          id: 'e2e-debit-token',
          payment_method_id: 'visa',
        }),
      };

      async getPaymentMethods() {
        return {
          results: [
            { id: 'visa-credit', payment_type_id: 'credit_card' },
            { id: 'visa', payment_type_id: 'debit_card' },
          ],
        };
      }
    }

    (window as unknown as { MercadoPago: typeof MockMercadoPago }).MercadoPago =
      MockMercadoPago;
  });

  await page.route(LOCAL_API, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === '/auth/me') {
      return json(route, {
        user: {
          id: 22,
          name: 'Cliente Teste',
          email: 'cliente@example.com',
          phone: '85999999999',
          role: 'CLIENTE',
        },
      });
    }

    if (pathname.endsWith('/card-payment-config')) {
      return json(route, {
        provider: 'MERCADO_PAGO',
        publicKey: 'TEST-public-key',
      });
    }

    if (pathname.startsWith('/settings/public/')) {
      return json(route, {
        restaurantId: RESTAURANT_ID,
        restaurantName: 'Restaurante Teste',
        primaryColor: '#d05632',
        isOpenForOrders: true,
        acceptsDelivery: true,
        acceptsPickup: true,
        acceptsPix: true,
        acceptsCard: true,
        acceptsDebitCard: true,
        pixProvider: 'MERCADO_PAGO',
        restaurant: {
          id: RESTAURANT_ID,
          name: 'Restaurante Teste',
          slug: RESTAURANT_SLUG,
        },
      });
    }

    if (pathname === '/products') {
      return json(route, {
        products: [
          {
            id: 101,
            name: 'Prato artesanal',
            description: 'Feito na hora.',
            price: 36,
            active: true,
            stock: null,
            category: { name: 'Principais' },
            optionGroups: [
              {
                id: 10,
                name: 'Escolha a base',
                required: true,
                selectionType: 'SINGLE',
                minSelections: 1,
                maxSelections: 1,
                options: [
                  {
                    id: 1001,
                    ingredientId: 1,
                    active: true,
                    ingredient: {
                      id: 1,
                      name: 'Base tradicional',
                      price: 0,
                      active: true,
                    },
                  },
                ],
              },
            ],
          },
        ],
      });
    }

    if (pathname === '/orders/quote') {
      return json(route, {
        itemsSubtotal: 36,
        productDiscountTotal: 0,
        couponDiscount: 0,
        deliveryFeeAmount: 0,
        total: 36,
      });
    }

    if (pathname === '/customer-payment-methods') {
      return json(route, { paymentMethods: [] });
    }

    if (pathname === '/coupons/loyalty') {
      return json(route, { restaurantId: RESTAURANT_ID, rewards: [], redemptions: [] });
    }

    if (pathname === '/orders/card/checkout' && request.method() === 'POST') {
      submitted = request.postDataJSON() as Record<string, unknown>;
      return json(route, {
        orderId: 501,
        orderPublicId: '323e4567-e89b-42d3-a456-426614174705',
        provider: 'MERCADO_PAGO',
        paid: true,
        totalAmount: 36,
      }, 201);
    }

    return json(route, {});
  });

  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await mockAuthRefresh(page, 22, 'debit-checkout-customer-token');

  return {
    submitted: () => submitted,
  };
}

test('cliente paga no débito sem converter para crédito e sem enviar dados brutos do cartão', async ({
  page,
}) => {
  const state = await mockDebitCheckout(page);

  await page.goto(`/${RESTAURANT_SLUG}`);
  await page.getByRole('button', { name: 'Ver detalhes de Prato artesanal' }).click();
  await page.getByText('Base tradicional', { exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar à sacola' }).click();
  await page.getByRole('button', { name: /Meu Carrinho, [1-9]\d* (?:item|itens)/ }).click();

  const checkout = page.getByRole('dialog', { name: 'Finalizar pedido' });
  await checkout.getByRole('button', { name: 'Continuar', exact: true }).click();
  await checkout.getByRole('button', { name: 'Retirada', exact: true }).click();
  await checkout.getByRole('button', { name: 'Continuar', exact: true }).click();

  const debit = checkout.getByRole('button', { name: 'Cartão de débito', exact: true });
  await expect(debit).toBeEnabled();
  await debit.click();

  await expect(checkout.getByText('Dados do cartão de débito', { exact: true })).toBeVisible();
  await checkout.getByLabel('Nome impresso no cartão').fill('Cliente Teste');
  await checkout.getByLabel('E-mail do comprador').fill('cliente@example.com');
  await checkout.getByLabel('CPF/CNPJ do titular').fill('12345678901');

  await checkout.getByRole('button', { name: /Finalizar Pedido|Confirmar Pagamento/ }).first().click();

  await expect.poll(() => state.submitted()).not.toBeNull();
  expect(state.submitted()).toMatchObject({
    restaurantId: RESTAURANT_ID,
    type: 'RETIRADA',
    paymentMethod: 'CARTAO',
    cardPaymentType: 'debit',
    cardToken: 'e2e-debit-token',
    cardPaymentMethodId: 'visa',
  });

  const body = state.submitted()!;
  expect(body).not.toHaveProperty('cardData.number');
  expect(JSON.stringify(body)).not.toContain('4111111111111111');
  expect(JSON.stringify(body)).not.toContain('"securityCode"');
});
