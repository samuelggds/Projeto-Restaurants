import { describe, expect, it } from 'vitest';
import type { OrderQuote } from '../hooks/useOrderQuote';
import { resolveCheckoutCouponStatus } from './checkoutCouponStatus';

const quote: OrderQuote = {
  itemsSubtotal: 50,
  productDiscountTotal: 0,
  couponDiscount: 10,
  deliveryFeeAmount: 5,
  deliveryDistanceMeters: null,
  deliveryFeeFallbackApplied: false,
  total: 45,
  couponCode: 'PROMO20',
  couponDiscountType: 'PERCENTAGE',
  couponDiscountValue: 20,
};

describe('checkout coupon status', () => {
  it('não marca o cupom antes da validação da cotação', () => {
    const status = resolveCheckoutCouponStatus({
      requestedCode: 'FRETEZERO', redemptionId: null, quote: null, loading: true, error: null,
    });
    expect(status).toMatchObject({ requested: true, confirmed: false, pending: true, blocked: true });
  });

  it('exige o mesmo código e usa somente a resposta do backend', () => {
    const waiting = resolveCheckoutCouponStatus({
      requestedCode: 'FRETEZERO', redemptionId: null, quote, loading: false, error: null,
    });
    expect(waiting).toMatchObject({ confirmed: false, blocked: true, confirmedCode: 'PROMO20' });
    const accepted = resolveCheckoutCouponStatus({
      requestedCode: 'promo20', redemptionId: null, quote, loading: false, error: null,
    });
    expect(accepted).toMatchObject({ confirmed: true, blocked: false, confirmedCode: 'PROMO20' });
  });

  it('recusa pedido abaixo do mínimo sem esconder a resposta da API', () => {
    const error = 'Este cupom exige subtotal mínimo de R$ 50.00.';
    const status = resolveCheckoutCouponStatus({
      requestedCode: 'FRETEZERO', redemptionId: null, quote: null, loading: false, error,
    });
    expect(status).toMatchObject({ confirmed: false, pending: false, blocked: true, error });
  });

  it('sem cupom não bloqueia o carrinho nem inventa desconto', () => {
    const status = resolveCheckoutCouponStatus({
      requestedCode: '', redemptionId: null, quote: null, loading: false, error: null,
    });
    expect(status).toMatchObject({ requested: false, confirmed: false, blocked: false, confirmedCode: '' });
  });

  it('fidelidade também aguarda confirmação real da cotação', () => {
    const status = resolveCheckoutCouponStatus({
      requestedCode: '', redemptionId: 77, quote: null, loading: true, error: null,
    });
    expect(status).toMatchObject({ requested: true, confirmed: false, pending: true, blocked: true });
  });
});
