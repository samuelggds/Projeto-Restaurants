import { expect, test } from '@playwright/test';

test('visitante encontra cupons públicos, abre lista e aplica promoção na cotação', async ({ page }) => {
  const quotes: Array<Record<string, unknown>> = [];
  let loyaltyRequests = 0;
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/settings/public/slug/restaurante-teste' || pathname === '/settings/public/9') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        restaurantId: 9, restaurantName: 'Restaurante Teste', isOpenForOrders: true,
        restaurant: { id: 9, name: 'Restaurante Teste' },
      }) }); return;
    }
    if (pathname === '/products') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        products: [{
          id: 101, name: 'Prato promocional', price: 50, active: true, featured: true,
          stock: null, category: { name: 'Principais' }, optionGroups: [],
        }],
      }) }); return;
    }
    if (pathname === '/coupons/public') {
      expect(new URL(route.request().url()).searchParams.get('restaurantId')).toBe('9');
      const coupons = [
        { code: 'PROMO15', title: 'Campanha especial', discountType: 'PERCENTAGE', discount: 15 },
        { code: 'RETIRA10', title: 'Desconto na retirada', discountType: 'FIXED', discount: 10 },
        { code: 'MESA5', title: 'Desconto na mesa', discountType: 'FIXED', discount: 5 },
      ].map((coupon, index) => ({ ...coupon, id: 80 + index, kind: 'PROMOTIONAL',
        description: '', active: true, minimumSubtotal: 20, allowDelivery: true,
        allowPickup: true, allowTable: true }));
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(coupons) }); return;
    }
    if (pathname === '/coupons/loyalty') loyaltyRequests += 1;
    if (pathname === '/orders/quote') {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      quotes.push(payload);
      const applied = payload.couponCode === 'PROMO15';
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        itemsSubtotal: 50, productDiscountTotal: 0, couponDiscount: applied ? 7.5 : 0,
        deliveryFeeAmount: 0, total: applied ? 42.5 : 50,
        couponCode: applied ? 'PROMO15' : null,
        couponDiscountType: applied ? 'PERCENTAGE' : null,
        couponDiscountValue: applied ? 15 : null,
      }) }); return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/restaurante-teste');

  const promos = page.getByRole('region', { name: 'Cupons promocionais disponíveis' });
  await expect(promos).toBeVisible();
  await expect(promos.getByText('Campanha especial')).toBeVisible();
  await promos.getByRole('button', { name: 'Ver todos' }).click();
  const all = page.getByRole('dialog', { name: 'Todos os cupons promocionais' });
  await expect(all.getByText('Desconto na retirada')).toBeVisible();
  await expect(all.getByText('Desconto na mesa')).toBeVisible();
  await all.getByRole('button', { name: 'Fechar cupons' }).click();

  const featured = page.getByRole('region', { name: 'Produtos em destaque' });
  await expect(featured.getByText('Destaque', { exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(featured.locator('.featured-flame').first()).toHaveCSS('animation-name', 'none');
  await featured.getByRole('button', { name: 'Ver detalhes de Prato promocional' }).click();
  await page.getByRole('button', { name: 'Adicionar à sacola' }).click();
  await promos.getByRole('button', { name: 'Usar cupom' }).first().click();
  await expect.poll(() => quotes.some((quote) =>
    quote.restaurantId === 9 && quote.couponCode === 'PROMO15' && quote.couponRedemptionId == null,
  )).toBe(true);
  expect(loyaltyRequests).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(391);
});
