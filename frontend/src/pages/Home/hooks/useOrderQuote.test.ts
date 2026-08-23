import { describe, expect, it } from 'vitest';
import { normalizeOrderQuote } from './useOrderQuote';

describe('useOrderQuote', () => {
  it('normaliza a composição de valores devolvida pelo servidor', () => {
    expect(
      normalizeOrderQuote({
        itemsSubtotal: '80.00',
        productDiscountTotal: '10',
        couponDiscount: 7,
        deliveryFeeAmount: 5,
        total: '68',
        couponCode: 'FIEL7',
      }),
    ).toEqual({
      itemsSubtotal: 80,
      productDiscountTotal: 10,
      couponDiscount: 7,
      deliveryFeeAmount: 5,
      total: 68,
      couponCode: 'FIEL7',
    });
  });
});
