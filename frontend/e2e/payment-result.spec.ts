import { expect, test, type Locator, type Page, type Route } from '@playwright/test';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';

const RESTAURANT_ID = 9;
const RESTAURANT_SLUG = 'restaurante-teste';
const ORDER_PUBLIC_ID = '323e4567-e89b-42d3-a456-426614174704';
const PIX_CODE = '00020101021226890014br.gov.bcb.pix.payment-result-e2e';
const LOCAL_API = /^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/;

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-07T12:00:00.000Z') });
});

type PaymentState = {
  cardStatus: 'PENDING' | 'PAID' | 'CANCELED';
  cardPaid: boolean;
  cardUnavailable: boolean;
  cardReads: number;
  pixStatus: 'pending' | 'approved' | 'rejected';
  pixConfirmed: boolean;
  pixReads: number;
  pixConfirmationReads: number;
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockPaymentApi(page: Page, overrides: Partial<PaymentState> = {}) {
  const state: PaymentState = {
    cardStatus: 'PENDING',
    cardPaid: false,
    cardUnavailable: false,
    cardReads: 0,
    pixStatus: 'pending',
    pixConfirmed: false,
    pixReads: 0,
    pixConfirmationReads: 0,
    ...overrides,
  };

  await page.route(LOCAL_API, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/auth/me') {
      return json(route, {
        user: { id: 22, name: 'Cliente Teste', phone: '85999999999', role: 'CLIENTE' },
      });
    }
    if (pathname.startsWith('/settings/public/')) {
      return json(route, {
        restaurantId: RESTAURANT_ID,
        restaurantName: 'Restaurante Teste',
        revision: 'payment-result-e2e',
        primaryColor: '#d05632',
        isOpenForOrders: true,
        acceptsPix: true,
        acceptsCard: true,
        acceptsPickup: true,
        pixProvider: 'MERCADO_PAGO',
        restaurant: { id: RESTAURANT_ID, name: 'Restaurante Teste' },
      });
    }
    if (pathname === '/products') {
      return json(route, {
        products: [
          {
            id: 101,
            name: 'Prato artesanal',
            description: 'Feito na hora, do seu jeito.',
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
                    ingredient: { id: 1, name: 'Base tradicional', price: 0, active: true },
                  },
                ],
              },
            ],
          },
        ],
      });
    }
    if (pathname === '/coupons/loyalty') {
      return json(route, { restaurantId: RESTAURANT_ID, rewards: [], redemptions: [] });
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
    if (pathname === '/orders/card/checkout/status') {
      state.cardReads += 1;
      expect(route.request().postDataJSON()).toMatchObject({
        restaurantId: RESTAURANT_ID,
        orderPublicId: ORDER_PUBLIC_ID,
      });
      return state.cardUnavailable
        ? json(route, { error: 'Internal provider trace: upstream timeout' }, 503)
        : json(route, {
            orderPublicId: ORDER_PUBLIC_ID,
            status: state.cardStatus,
            paid: state.cardPaid,
          });
    }
    if (pathname === '/orders/pix/payment') {
      expect(route.request().postDataJSON()).toMatchObject({
        restaurantId: RESTAURANT_ID,
        type: 'RETIRADA',
        items: [{ productId: 101, quantity: 1 }],
      });
      return json(route, {
        orderId: 501,
        totalAmount: 36,
        paymentId: 'pix-result-e2e',
        provider: 'MERCADO_PAGO',
        qrCode: PIX_CODE,
        qrCodeBase64: null,
        requiresStatusCheck: true,
      });
    }
    if (pathname === '/orders/pix/payment/status') {
      state.pixReads += 1;
      return json(route, {
        isApproved: state.pixStatus === 'approved',
        status: state.pixStatus,
      });
    }
    if (pathname === '/orders/pix/payment/confirm') {
      state.pixConfirmationReads += 1;
      return json(route, { paid: state.pixConfirmed });
    }
    return json(route, {});
  });

  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await mockAuthRefresh(page, 22, 'payment-result-customer-token');
  return state;
}

function paymentResult(page: Page, status: string) {
  return page.locator(`main[data-status="${status}"]`);
}

async function openCardReturn(page: Page, providerStatus = 'success') {
  await page.goto(
    `/${RESTAURANT_SLUG}?cardCheckoutStatus=${providerStatus}&orderPublicId=${ORDER_PUBLIC_ID}`,
  );
}

async function startPixCheckout(page: Page) {
  await page.goto(`/${RESTAURANT_SLUG}`);
  await page.getByRole('button', { name: 'Ver detalhes de Prato artesanal' }).click();
  await page.getByText('Base tradicional', { exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar à sacola' }).click();
  await page.getByRole('button', { name: /^Sacola com [1-9]\d* ite(?:m|ns)$/ }).click();
  const cart = page.getByRole('dialog', { name: 'Minha sacola' });
  await cart.getByRole('button', { name: 'Retirada', exact: true }).click();
  await cart.getByRole('button', { name: /Gerar código Pix/ }).click();
}

async function expectNoHorizontalOverflow(page: Page) {
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width + 1);
}

async function pauseBeforePaymentResult(page: Page) {
  // A pausa acontece enquanto o resultado ainda é pendente. Assim, o prazo
  // de retorno não é consumido por consultas, assertions ou screenshots.
  await page.clock.pauseAt(new Date('2026-09-07T12:05:00.000Z'));
  await expect(page.getByRole('button', { name: 'Verificar pagamento' })).toBeEnabled();
}

async function expectAutomaticReturnAfterFiveSeconds(page: Page, result: Locator) {
  await page.clock.runFor(4_999);
  await expect(result).toBeVisible();
  await page.clock.runFor(1);
  await expect(result).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/${RESTAURANT_SLUG}$`));
  await expect(page.getByRole('button', { name: 'Ver detalhes de Prato artesanal' })).toBeVisible();
}

async function expectResultIcon(result: Locator, type: 'success' | 'failure') {
  const icon = result
    .getByRole('status')
    .locator(type === 'success' ? 'svg.lucide-check' : 'svg.lucide-x');
  await expect(icon).toBeVisible();
  await expect(icon).toHaveCSS(
    'color',
    type === 'success' ? 'rgb(24, 115, 71)' : 'rgb(186, 50, 50)',
  );
  // O símbolo entra com escala reduzida. Verifique o tamanho após sua entrada,
  // não em um frame intermediário da animação.
  await expect.poll(async () => (await icon.boundingBox())?.width).toBeGreaterThanOrEqual(48);
  await expect.poll(async () => (await icon.boundingBox())?.height).toBeGreaterThanOrEqual(48);
}

test('cartão só mostra o check verde após confirmação canônica, com tela responsiva e retorno ao cardápio', async ({
  page,
}, testInfo) => {
  const state = await mockPaymentApi(page);
  await openCardReturn(page);
  await expect(paymentResult(page, 'PENDING')).toBeVisible();
  await pauseBeforePaymentResult(page);
  await expect(page.getByRole('heading', { name: 'Pagamento confirmado!' })).toHaveCount(0);

  await page.clock.runFor(6_000);
  await expect(paymentResult(page, 'PENDING')).toBeVisible();
  await expect(page).toHaveURL(/cardCheckoutStatus=success/);

  // Mesmo um status PAID sem a evidência paid:true não pode anunciar sucesso.
  state.cardStatus = 'PAID';
  await page.getByRole('button', { name: 'Verificar pagamento' }).click();
  await expect(paymentResult(page, 'PENDING')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pagamento confirmado!' })).toHaveCount(0);

  state.cardPaid = true;
  await page.getByRole('button', { name: 'Verificar pagamento' }).click();
  const paid = paymentResult(page, 'PAID');
  await expect(
    paid.getByRole('heading', { name: 'Pagamento confirmado!', level: 1 }),
  ).toBeVisible();
  await expect(paid.getByRole('heading')).toBeFocused();
  await expectResultIcon(paid, 'success');
  await expect(paid).not.toContainText(/backend|canônica|gateway|cardCheckoutStatus/i);

  for (const width of [1280, 360, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoHorizontalOverflow(page);
    await expect(paid.getByRole('button', { name: 'Voltar ao cardápio' })).toBeInViewport();
    if (width !== 320) {
      await page.screenshot({
        path: testInfo.outputPath(
          `payment-success-${width === 1280 ? 'desktop1280' : 'mobile360'}.png`,
        ),
        fullPage: true,
        animations: 'disabled',
      });
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(paid.getByRole('status').locator('svg.lucide-check').locator('..')).toHaveCSS(
    'animation-name',
    'none',
  );
  await testInfo.attach('pagamento-confirmado-320px', {
    body: await page.screenshot({
      path: testInfo.outputPath('payment-success.png'),
      fullPage: true,
      animations: 'disabled',
    }),
    contentType: 'image/png',
  });

  await expectAutomaticReturnAfterFiveSeconds(page, paid);
});

test('retorno cancel do provedor respeita o pagamento aprovado pelo pedido', async ({ page }) => {
  await mockPaymentApi(page, { cardStatus: 'PAID', cardPaid: true });
  await openCardReturn(page, 'cancel');
  await expect(paymentResult(page, 'PAID')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pagamento confirmado!' })).toBeVisible();
  await expect(paymentResult(page, 'CANCELED')).toHaveCount(0);
  await page.getByRole('button', { name: 'Voltar ao cardápio' }).click();
  await expect(page).toHaveURL(new RegExp(`/${RESTAURANT_SLUG}$`));
});

test('cartão cancelado mostra X vermelho sem atribuir uma recusa ao banco', async ({
  page,
}, testInfo) => {
  const state = await mockPaymentApi(page);
  await openCardReturn(page);
  await expect(paymentResult(page, 'PENDING')).toBeVisible();
  await pauseBeforePaymentResult(page);
  state.cardStatus = 'CANCELED';
  await page.getByRole('button', { name: 'Verificar pagamento' }).click();
  const canceled = paymentResult(page, 'CANCELED');
  await expect(canceled.getByRole('heading', { name: 'Pagamento não concluído' })).toBeVisible();
  await expectResultIcon(canceled, 'failure');
  await expect(canceled).not.toContainText(/recusado pelo banco|saldo insuficiente|backend/i);
  await expect(page.getByRole('heading', { name: 'Pagamento confirmado!' })).toHaveCount(0);

  for (const width of [1280, 360, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoHorizontalOverflow(page);
    await expect(canceled.getByRole('button', { name: 'Voltar ao cardápio' })).toBeInViewport();
    if (width !== 320) {
      await page.screenshot({
        path: testInfo.outputPath(
          `payment-failure-${width === 1280 ? 'desktop1280' : 'mobile360'}.png`,
        ),
        fullPage: true,
        animations: 'disabled',
      });
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(canceled.getByRole('status').locator('svg.lucide-x').locator('..')).toHaveCSS(
    'animation-name',
    'none',
  );
  await testInfo.attach('pagamento-nao-concluido-320px', {
    body: await page.screenshot({
      path: testInfo.outputPath('payment-failure.png'),
      fullPage: true,
      animations: 'disabled',
    }),
    contentType: 'image/png',
  });
  await expectAutomaticReturnAfterFiveSeconds(page, canceled);
});

test('falha de consulta do cartão permite verificar de novo sem anunciar recusa', async ({
  page,
}) => {
  const state = await mockPaymentApi(page, { cardUnavailable: true });
  await openCardReturn(page);
  const unavailable = paymentResult(page, 'ERROR');
  await expect(
    unavailable.getByRole('heading', { name: 'Não foi possível verificar' }),
  ).toBeVisible();
  await expect(unavailable).toContainText('Isso não significa que ele foi recusado');
  await expect(unavailable.getByRole('status').locator('svg.lucide-x')).toHaveCount(0);
  await expect(unavailable).not.toContainText('Internal provider trace');

  await pauseBeforePaymentResult(page);
  await page.clock.runFor(6_000);
  await expect(unavailable).toBeVisible();
  await expect(page).toHaveURL(/cardCheckoutStatus=success/);

  state.cardUnavailable = false;
  state.cardStatus = 'PAID';
  state.cardPaid = true;
  await unavailable.getByRole('button', { name: 'Verificar pagamento' }).click();
  await expect(paymentResult(page, 'PAID')).toBeVisible();
});

test('Pix aguarda aprovação e pedido pago antes do sucesso, que remove QR Code e copia e cola', async ({
  page,
}, testInfo) => {
  const state = await mockPaymentApi(page);
  await page.setViewportSize({ width: 360, height: 844 });
  await startPixCheckout(page);
  await expect.poll(() => state.pixReads).toBeGreaterThan(0);
  await pauseBeforePaymentResult(page);
  await expect(page.getByRole('button', { name: 'Copiar código Pix' })).toBeVisible();
  await expect(page.getByText(PIX_CODE, { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pix confirmado!' })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  state.pixStatus = 'approved';
  await page.getByRole('button', { name: 'Verificar pagamento' }).click();
  await expect.poll(() => state.pixConfirmationReads).toBeGreaterThan(0);
  await expect(page.getByRole('heading', { name: 'Pix confirmado!' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Verificar pagamento' })).toBeEnabled();

  state.pixConfirmed = true;
  await page.getByRole('button', { name: 'Verificar pagamento' }).click();
  const paid = paymentResult(page, 'PAID');
  await expect(paid.getByRole('heading', { name: 'Pix confirmado!' })).toBeVisible();
  await expectResultIcon(paid, 'success');
  await expect(paid).toContainText('R$ 36,00');
  await expect(paid).toContainText('Pedido #501');
  await expect(page.getByRole('button', { name: 'Copiar código Pix' })).toHaveCount(0);
  await expect(page.getByText(PIX_CODE, { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('QR Code Pix')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await testInfo.attach('pix-confirmado-mobile', {
    body: await page.screenshot({
      path: testInfo.outputPath('pix-success.png'),
      fullPage: true,
      animations: 'disabled',
    }),
    contentType: 'image/png',
  });
  await expectAutomaticReturnAfterFiveSeconds(page, paid);
});

test('Pix recusado pelo provedor encerra a cobrança com X vermelho e remove o código', async ({
  page,
}) => {
  const state = await mockPaymentApi(page);
  await startPixCheckout(page);
  await expect(page.getByRole('button', { name: 'Copiar código Pix' })).toBeVisible();
  await pauseBeforePaymentResult(page);
  state.pixStatus = 'rejected';
  await page.getByRole('button', { name: 'Verificar pagamento' }).click();
  const failed = paymentResult(page, 'FAILED');
  await expect(failed.getByRole('heading', { name: 'Pagamento não concluído' })).toBeVisible();
  await expectResultIcon(failed, 'failure');
  await expect(page.getByRole('button', { name: 'Copiar código Pix' })).toHaveCount(0);
  await expect(page.getByText(PIX_CODE, { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('QR Code Pix')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Pix confirmado!' })).toHaveCount(0);
  expect(state.pixConfirmationReads).toBe(0);
  await expectAutomaticReturnAfterFiveSeconds(page, failed);
});
