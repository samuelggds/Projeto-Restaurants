import { describe, expect, it } from 'vitest';
import {
  calculateDiscountedPrice,
  couponPayload,
  normalizeCouponCode,
  productDiscountPayload,
  validateCouponDraft,
  validateProductDiscountDraft,
} from './promotionValidation';

describe('validação de descontos de produtos', () => {
  it('calcula porcentagem e valor fixo sem permitir preço negativo', () => {
    expect(calculateDiscountedPrice(100, 'PERCENTAGE', 15)).toBe(85);
    expect(calculateDiscountedPrice(29.9, 'FIXED', 5)).toBe(24.9);
    expect(calculateDiscountedPrice(10, 'FIXED', 20)).toBe(0);
  });

  it('rejeita percentual acima de 100, valor fixo maior que o produto e período invertido', () => {
    const errors = validateProductDiscountDraft(
      {
        productId: '12',
        type: 'FIXED',
        value: '35',
        badgeLabel: 'Oferta',
        active: true,
        startsAt: '2026-08-24T18:00',
        endsAt: '2026-08-24T17:00',
      },
      { price: 29.9 },
    );

    expect(errors).toContain('O desconto em reais não pode ultrapassar o preço base do produto.');
    expect(errors).toContain('O término da oferta deve acontecer depois do início.');
  });

  it('serializa datas opcionais e nunca envia preço calculado pelo navegador', () => {
    const payload = productDiscountPayload({
      productId: '12',
      type: 'PERCENTAGE',
      value: '20',
      badgeLabel: '  Oferta da semana  ',
      active: true,
      startsAt: '',
      endsAt: '',
    });

    expect(payload).toEqual({
      type: 'PERCENTAGE',
      value: 20,
      badgeLabel: 'Oferta da semana',
      active: true,
    });
    expect(payload).not.toHaveProperty('finalPrice');
  });
});

describe('validação de cupons de fidelidade', () => {
  it('normaliza o código para o contrato aceito', () => {
    expect(normalizeCouponCode(' cliente fiel 20%! ')).toBe('CLIENTE-FIEL-20');
  });

  it('exige meta, limite e desconto válidos', () => {
    const errors = validateCouponDraft({
      code: 'AB',
      title: 'X',
      description: '',
      discountType: 'PERCENTAGE',
      discount: '120',
      minimumSubtotal: '-1',
      maxDiscount: '0',
      loyaltyPurchasesRequired: '0',
      perCustomerLimit: '0',
      redemptionValidityDays: '0',
      active: true,
      expiration: '2020-01-01T00:00',
    });

    expect(errors.length).toBeGreaterThanOrEqual(6);
    expect(errors).toContain('O desconto percentual deve ser menor que 100%.');
    expect(errors).toContain(
      'A data de encerramento de uma campanha ativa precisa estar no futuro.',
    );
  });

  it('monta o payload da regra de fidelidade com números e validade opcional', () => {
    const payload = couponPayload({
      code: ' cliente fiel ',
      title: '  Cliente fiel  ',
      description: '  Complete cinco compras.  ',
      discountType: 'FIXED',
      discount: '12.5',
      minimumSubtotal: '40',
      maxDiscount: '',
      loyaltyPurchasesRequired: '5',
      perCustomerLimit: '1',
      redemptionValidityDays: '30',
      active: true,
      expiration: '',
    });

    expect(payload).toEqual({
      code: 'CLIENTE-FIEL',
      kind: 'LOYALTY',
      usageLimit: null,
      allowDelivery: true,
      allowPickup: true,
      allowTable: true,
      title: 'Cliente fiel',
      description: 'Complete cinco compras.',
      discountType: 'FIXED',
      discount: 12.5,
      minimumSubtotal: 40,
      maxDiscount: null,
      loyaltyPurchasesRequired: 5,
      perCustomerLimit: 1,
      redemptionValidityDays: 30,
      active: true,
      expiration: null,
    });
  });
  it('valida limite global e modalidades dos cupons promocionais', () => {
    const draft = {
      code: 'PROMO20',
      kind: 'PROMOTIONAL' as const,
      title: 'Campanha pública',
      description: 'Promoção disponível para visitantes.',
      discountType: 'PERCENTAGE' as const,
      discount: '20',
      minimumSubtotal: '30',
      maxDiscount: '15',
      loyaltyPurchasesRequired: '1',
      perCustomerLimit: '1',
      redemptionValidityDays: '30',
      usageLimit: '200',
      allowDelivery: true,
      allowPickup: false,
      allowTable: false,
      active: true,
      expiration: '',
    };
    expect(validateCouponDraft(draft)).toEqual([]);
    expect(couponPayload(draft)).toMatchObject({
      kind: 'PROMOTIONAL', audience: 'ALL', usageLimit: 200, allowDelivery: true,
      allowPickup: false, allowTable: false, minimumSubtotal: 30,
    });
    expect(validateCouponDraft({ ...draft, usageLimit: '0' })).toContain(
      'O limite total de usos deve ficar entre 1 e 1.000.000.',
    );
    expect(validateCouponDraft({ ...draft, allowDelivery: false })).toContain(
      'Escolha pelo menos uma modalidade.',
    );
  });

  it('envia público-alvo somente para campanhas promocionais', () => {
    const draft = {
      code: 'PRIMEIRA10',
      kind: 'PROMOTIONAL' as const,
      audience: 'NEW_CUSTOMERS' as const,
      title: 'Primeira compra',
      description: 'Benefício para clientes autenticados',
      discountType: 'FIXED' as const,
      discount: '10',
      minimumSubtotal: '30',
      maxDiscount: '',
      loyaltyPurchasesRequired: '1',
      perCustomerLimit: '1',
      redemptionValidityDays: '30',
      active: true,
      expiration: '',
    };
    expect(couponPayload(draft)).toHaveProperty('audience', 'NEW_CUSTOMERS');
    expect(couponPayload({ ...draft, kind: 'LOYALTY' })).not.toHaveProperty('audience');
  });

});
