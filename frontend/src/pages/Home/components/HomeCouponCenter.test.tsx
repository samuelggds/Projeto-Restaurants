import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PublicPromotionalCoupon } from '../types';
import { HomeCouponsCenter } from './HomeCouponCenter';

const benefits: PublicPromotionalCoupon['discountType'][] = [
  'PERCENTAGE',
  'FIXED',
  'FREE_SHIPPING',
];
const coupons: PublicPromotionalCoupon[] = benefits.map((discountType, index) => ({
  id: index + 1,
  code: `CUPOM${index + 1}`,
  title: 'Oferta',
  description: 'Desconto no pedido',
  discountType,
  discount: 10,
  minimumSubtotal: 0,
  allowDelivery: true,
  allowPickup: false,
  allowTable: false,
}));

describe('ícones dos cupons do estabelecimento', () => {
  it.each([
    ['PIZZARIA', 'pizza'],
    ['Açaiteria', 'ice-cream-bowl'],
    ['HAMBURGUERIA', 'sandwich'],
    ['RESTAURANTE', 'utensils'],
    ['Categoria personalizada', 'utensils'],
    [undefined, 'utensils'],
  ])(
    'usa a categoria %s no desconto percentual e mantém os ícones de valor fixo e frete',
    (category, symbol) => {
      const container = document.createElement('div');
      container.innerHTML = renderToStaticMarkup(
        <HomeCouponsCenter
          coupons={coupons}
          restaurantCategory={category}
          brandName="Pizza da Casa"
          loggedIn={false}
          onClose={() => {}}
        />,
      );
      const icons = container.querySelectorAll('.cp-ticket .cp-icon svg');
      expect(icons).toHaveLength(3);
      expect(icons[0].classList.contains(`lucide-${symbol}`)).toBe(true);
      expect(icons[1].classList.contains('lucide-gift')).toBe(true);
      expect(icons[2].classList.contains('lucide-truck')).toBe(true);
    },
  );
});
