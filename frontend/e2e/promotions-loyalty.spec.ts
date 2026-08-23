import { expect, test } from '@playwright/test';

test('cliente vê promoção, aplica benefício de fidelidade e envia o resgate no pedido', async ({
  page,
}) => {
  const quotePayloads: Array<Record<string, unknown>> = [];
  let paymentPayload: Record<string, unknown> | null = null;
  let redeemPayload: Record<string, unknown> | null = null;
  let redeemed = false;

  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 22,
            name: 'Cliente Teste',
            phone: '85999999999',
            role: 'CLIENTE',
          },
        }),
      });
      return;
    }
    if (
      pathname === '/settings/public/slug/restaurante-teste' ||
      pathname === '/settings/public/9'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          restaurantId: 9,
          restaurantName: 'Restaurante Teste',
          primaryColor: '#d05632',
          isOpenForOrders: true,
          pixProvider: 'MERCADO_PAGO',
          restaurant: { id: 9, name: 'Restaurante Teste' },
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
              price: 50,
              active: true,
              stock: null,
              category: { name: 'Principais' },
              pricing: {
                active: true,
                originalBasePrice: 50,
                effectiveBasePrice: 40,
                discountAmount: 10,
                discountPercentage: 20,
                badgeLabel: 'Oferta especial',
              },
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
        }),
      });
      return;
    }
    if (pathname === '/coupons/loyalty') {
      const redemption = {
        id: 71,
        cycle: 1,
        status: 'CLAIMED',
        expiresAt: '2099-09-22T12:00:00.000Z',
        expired: false,
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          restaurantId: 9,
          purchasesCompleted: redeemed ? 0 : 5,
          rewards: [
            {
              coupon: {
                id: 7,
                code: 'FIEL10',
                title: 'Cliente fiel',
                description: 'Seu presente por voltar.',
                discountType: 'PERCENTAGE',
                discount: 10,
                minimumSubtotal: 0,
                redemptionValidityDays: 30,
              },
              purchasesCompleted: redeemed ? 0 : 5,
              purchasesRequired: 5,
              remaining: redeemed ? 5 : 0,
              progressPercent: redeemed ? 0 : 100,
              canRedeem: !redeemed,
              limitReached: redeemed,
              activeRedemptions: redeemed ? 1 : 0,
              walletLimit: 1,
              nextCycle: redeemed ? 2 : 1,
              redemptions: redeemed ? [redemption] : [],
            },
          ],
          redemptions: redeemed
            ? [
                {
                  ...redemption,
                  coupon: {
                    id: 7,
                    code: 'FIEL10',
                    title: 'Cliente fiel',
                    description: 'Seu presente por voltar.',
                    discountType: 'PERCENTAGE',
                    discount: 10,
                    minimumSubtotal: 0,
                    redemptionValidityDays: 30,
                    loyaltyPurchasesRequired: 5,
                    perCustomerLimit: 1,
                  },
                },
              ]
            : [],
        }),
      });
      return;
    }
    if (pathname === '/coupons/7/redeem' && request.method() === 'POST') {
      redeemPayload = request.postDataJSON() as Record<string, unknown>;
      redeemed = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          redemption: {
            id: 71,
            cycle: 1,
            status: 'CLAIMED',
            expiresAt: '2099-09-22T12:00:00.000Z',
          },
        }),
      });
      return;
    }
    if (pathname === '/orders/quote') {
      const payload = request.postDataJSON() as Record<string, unknown>;
      quotePayloads.push(payload);
      const couponApplied = payload.couponRedemptionId === 71;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          itemsSubtotal: 40,
          productDiscountTotal: 10,
          couponDiscount: couponApplied ? 4 : 0,
          deliveryFeeAmount: 0,
          total: couponApplied ? 36 : 40,
          couponCode: couponApplied ? 'FIEL10' : null,
        }),
      });
      return;
    }
    if (pathname === '/orders/pix/payment') {
      paymentPayload = request.postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orderId: 501,
          totalAmount: 36,
          paymentId: 'pix-e2e',
          provider: 'PIX',
          qrCode: '000201-fidelidade',
          qrCodeBase64: null,
          requiresStatusCheck: false,
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('token', 'e2e-customer-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 22, name: 'Cliente Teste', role: 'CLIENTE', phone: '85999999999' }),
    );
  });
  await page.goto('/restaurante-teste');

  const featuredOffers = page.getByRole('region', { name: 'Ofertas em destaque' });
  await expect(featuredOffers).toBeVisible();
  await expect(featuredOffers.getByText('1 oferta disponível')).toBeVisible();
  await expect(
    featuredOffers.getByRole('button', { name: 'Ver detalhes de Prato artesanal' }),
  ).toBeVisible();

  const promotionBadge = featuredOffers.getByText('Oferta especial', { exact: true });
  await expect(promotionBadge).toBeVisible();
  await expect(promotionBadge).toHaveAttribute('data-offer-label', 'inline');
  await expect(featuredOffers.getByText('R$ 50,00')).toBeVisible();
  await expect(featuredOffers.locator('del').filter({ hasText: 'R$ 50,00' })).toHaveCSS(
    'text-decoration-line',
    'line-through',
  );
  await expect(featuredOffers.getByText('R$ 40,00')).toBeVisible();
  const loyaltyNotice = page.getByRole('button', {
    name: /Você ganhou um cupom.*10% de desconto/i,
  });
  await expect(loyaltyNotice).toBeVisible();
  await loyaltyNotice.click();

  const loyaltyDialog = page.getByRole('dialog', { name: 'Seus pedidos viram descontos' });
  await expect(loyaltyDialog).toBeVisible();
  await expect(loyaltyDialog.getByText('5/5')).toBeVisible();
  await loyaltyDialog.getByRole('button', { name: 'Resgatar cupom' }).click();
  await expect(loyaltyDialog.getByText('Cupom disponível')).toBeVisible();
  await expect(loyaltyDialog.getByText('Código FIEL10')).toBeVisible();
  await expect(loyaltyDialog.getByText('Válido até 22/09/2099')).toBeVisible();
  await expect(loyaltyDialog.getByText('0/5')).toBeVisible();
  await expect(loyaltyDialog.getByText('Faltam 0 compras')).toHaveCount(0);
  expect(redeemPayload).toMatchObject({ restaurantId: 9 });
  await loyaltyDialog.getByRole('button', { name: 'Fechar fidelidade' }).click();
  const availableLoyaltyNotice = page.getByRole('button', {
    name: /Cupom disponível.*10% de desconto/i,
  });
  await expect(availableLoyaltyNotice).toBeVisible();

  for (const width of [430, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(featuredOffers).toBeVisible();
    await expect(availableLoyaltyNotice).toBeVisible();

    const loyaltyMetrics = await availableLoyaltyNotice.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });
    expect(loyaltyMetrics.left).toBeGreaterThanOrEqual(-1);
    expect(loyaltyMetrics.right).toBeLessThanOrEqual(loyaltyMetrics.viewportWidth + 1);
    expect(loyaltyMetrics.bottom).toBeLessThanOrEqual(loyaltyMetrics.viewportHeight + 1);

    const badgeMetrics = await promotionBadge.evaluate((element) => {
      const badge = element.getBoundingClientRect();
      const card = element.closest('article')?.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        text: element.textContent?.trim(),
        isInsideCard: Boolean(
          card &&
          badge.left >= card.left - 1 &&
          badge.right <= card.right + 1 &&
          badge.top >= card.top - 1 &&
          badge.bottom <= card.bottom + 1,
        ),
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        whiteSpace: style.whiteSpace,
      };
    });

    expect(badgeMetrics.text).toBe('Oferta especial');
    expect(badgeMetrics.isInsideCard).toBe(true);
    expect(badgeMetrics.whiteSpace).not.toBe('nowrap');
    expect(badgeMetrics.scrollWidth).toBeLessThanOrEqual(badgeMetrics.clientWidth + 1);
    expect(badgeMetrics.scrollHeight).toBeLessThanOrEqual(badgeMetrics.clientHeight + 1);
    const sectionMetrics = await featuredOffers.evaluate((section) => {
      const rect = section.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        overflowingElements: [...document.querySelectorAll<HTMLElement>('body *')]
          .map((element) => {
            const elementRect = element.getBoundingClientRect();
            return {
              tag: element.tagName.toLowerCase(),
              className: element.className?.toString().slice(0, 80),
              label: element.getAttribute('aria-label'),
              left: Math.round(elementRect.left),
              right: Math.round(elementRect.right),
              width: Math.round(elementRect.width),
            };
          })
          .filter((element) => element.left < -1 || element.right > window.innerWidth + 1)
          .slice(0, 10),
      };
    });
    expect(sectionMetrics.left).toBeGreaterThanOrEqual(-1);
    expect(sectionMetrics.right).toBeLessThanOrEqual(sectionMetrics.viewportWidth + 1);
    expect(
      sectionMetrics.documentWidth,
      JSON.stringify(sectionMetrics.overflowingElements),
    ).toBeLessThanOrEqual(sectionMetrics.viewportWidth + 1);
  }

  await page.setViewportSize({ width: 390, height: 844 });

  await featuredOffers.getByRole('button', { name: 'Ver detalhes de Prato artesanal' }).click();
  await page.getByText('Base tradicional').click();
  await page.getByRole('button', { name: 'Adicionar à sacola' }).click();
  await page.getByRole('button', { name: 'Retirada' }).click();
  await page.getByRole('button', { name: /Cliente fiel.*Aplicar/ }).click();

  await expect(page.getByText('Cupom • FIEL10')).toBeVisible();
  await expect(page.getByText('R$ 36,00')).toBeVisible();
  await expect
    .poll(() => quotePayloads.some((payload) => payload.couponRedemptionId === 71))
    .toBe(true);

  await page.getByRole('button', { name: /Gerar código Pix/ }).click();
  await expect(page.getByRole('heading', { name: 'Pagamento via Pix' })).toBeVisible();
  await expect(page.getByText('R$ 36,00')).toBeVisible();
  expect(paymentPayload).toMatchObject({ restaurantId: 9, couponRedemptionId: 71 });
});
