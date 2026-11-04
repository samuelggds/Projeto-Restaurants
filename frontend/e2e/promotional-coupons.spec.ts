import { expect, test } from '@playwright/test';

test('visitante encontra cupons públicos, abre lista e aplica promoção na cotação', async ({ page }) => {
  const quotes: Array<Record<string, unknown>> = [];
  let loyaltyRequests = 0;
  await page.route(/\/(?:api\/)?(?:settings\/public|products|coupons|orders|auth)(?:\/|\?|$)/, async (route) => {
    const pathname = new URL(route.request().url()).pathname.replace(/^\/api(?=\/)/, '');
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

  // The former in-home coupon cards are replaced by a dismissible top alert
  // and a dedicated coupon screen, both available to unauthenticated guests.
  const notice = page.getByRole('complementary', { name: 'Aviso de cupons' });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('Você tem 3 cupons!');
  const promos = page.getByRole('region', { name: 'Cupons promocionais disponíveis' });
  await expect(promos).toHaveCount(0);
  await notice.getByRole('button', { name: 'Fechar aviso de cupons' }).click();
  await expect(notice).toHaveCount(0);
  await page.reload();
  await expect(notice).toBeVisible();
  await notice.getByRole('button', { name: /Abrir cupons/ }).click();
  const screen = page.getByRole('region', { name: 'Tela de cupons' });
  await expect(screen).toBeVisible();
  await expect(screen.getByText('Campanha especial')).toBeVisible();
  await expect(screen.getByText('Desconto na retirada')).toBeVisible();
  await expect(screen.getByText('Desconto na mesa')).toBeVisible();
  await expect(screen).toContainText('Cupons do restaurante');
  await expect(screen).toContainText('Você pode consultar e copiar cupons públicos');
  await screen.getByRole('button', { name: 'Voltar ao cardápio' }).click();
  await expect(screen).toHaveCount(0);

  const featured = page.getByRole('region', { name: 'Produtos em destaque' });
  await expect(featured.getByText('Destaque', { exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(featured.locator('.featured-flame').first()).toHaveCSS('animation-name', 'none');
  await featured.getByRole('button', { name: 'Ver detalhes de Prato promocional' }).click();
  await page.getByRole('button', { name: 'Adicionar à sacola' }).click();
  await page.getByRole('button', { name: 'Abrir cupons' }).click();
  await screen.getByRole('button', { name: 'Usar cupom PROMO15' }).click();
  await expect(screen).toHaveCount(0);
  await expect.poll(() => quotes.some((quote) =>
    quote.restaurantId === 9 && quote.couponCode === 'PROMO15' && quote.couponRedemptionId == null,
  )).toBe(true);
  expect(loyaltyRequests).toBe(0);

  // A real customer cannot tap the storefront navigation through the
  // "Finalizar pedido" modal. Close checkout using its own control first;
  // then test the coupon tab as a separate navigation journey.
  const checkout = page.getByRole('dialog', { name: 'Finalizar pedido' });
  await expect(checkout).toBeVisible();
  await checkout.locator('button.brand').click();
  await expect(checkout).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  const bottomNav = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(bottomNav.getByRole('button', { name: 'Abrir cupons' })).toBeVisible();
  await bottomNav.getByRole('button', { name: 'Abrir cupons' }).click();
  await expect(screen).toBeVisible();
  await expect(screen.getByText('Campanha especial')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await screen.getByRole('button', { name: 'Fechar tela de cupons' }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(391);
});
