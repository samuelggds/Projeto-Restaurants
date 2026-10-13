import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppDialogProvider } from '../../../components/AppDialog/AppDialogProvider';
import type { AdminCoupon, AdminProduct } from '../types';
import { PromotionsSettings } from './PromotionsSettings';

const product: AdminProduct = {
  id: '42',
  categoryId: 1,
  name: 'Produto da casa',
  category: 'Pratos',
  price: 40,
  image: '',
  active: true,
  discount: {
    type: 'PERCENTAGE',
    value: 20,
    badgeLabel: '20% OFF',
    active: true,
  },
  pricing: {
    basePrice: 40,
    finalPrice: 32,
    discountAmount: 8,
    discountPercentage: 20,
    hasDiscount: true,
  },
};

const coupon: AdminCoupon = {
  id: '7',
  code: 'CLIENTE-FIEL',
  title: 'Recompensa cliente fiel',
  description: 'Benefício após compras concluídas.',
  discountType: 'PERCENTAGE',
  discount: 15,
  minimumSubtotal: 0,
  maxDiscount: 20,
  loyaltyPurchasesRequired: 5,
  perCustomerLimit: 1,
  redemptionValidityDays: 30,
  active: true,
};

describe('gestão de descontos e cupons', () => {
  it('explica as duas áreas e renderiza a oferta atual com preço final', () => {
    const markup = renderToStaticMarkup(
      createElement(
        AppDialogProvider,
        null,
        createElement(PromotionsSettings, { products: [product], coupons: [coupon] }),
      ),
    );

    expect(markup).toContain('Descontos nos produtos');
    expect(markup).toContain('Descontos nos produtos');
    expect(markup).not.toContain('Cupons de Fidelidade');
    expect(markup).toContain('Produto da casa');
    expect(markup).toContain('20% OFF');
    expect(markup).toContain('32,00');
    expect(markup).toContain('Ativo na Home');
  });

  it('mostra estados de carregamento e erro com ação de nova tentativa', () => {
    const markup = renderToStaticMarkup(
      createElement(
        AppDialogProvider,
        null,
        createElement(PromotionsSettings, {
          products: [],
          coupons: [],
          loading: true,
          error: 'Falha ao carregar campanhas.',
          onReload: () => undefined,
        }),
      ),
    );

    expect(markup).toContain('Carregando campanhas deste restaurante');
    expect(markup).toContain('Falha ao carregar campanhas.');
    expect(markup).toContain('Tentar novamente');
  });
  it('separa cupons promocionais de fidelidade e não mistura descontos de produtos', () => {
    const promotional: AdminCoupon = {
      ...coupon, id: '8', code: 'PROMO15', kind: 'PROMOTIONAL',
      title: 'Campanha para visitantes', usageLimit: 20, usageCount: 1,
    };
    const markup = renderToStaticMarkup(
      createElement(AppDialogProvider, null,
        createElement(PromotionsSettings, {
          mode: 'coupons', products: [product], coupons: [coupon, promotional],
        }),
      ),
    );
    expect(markup).toContain('Cupons Promocionais');
    expect(markup).toContain('Cupons de Fidelidade');
    expect(markup).toContain('Campanha para visitantes');
    expect(markup).toContain('PROMO15');
    expect(markup).not.toContain('Criar ou editar uma oferta');
    expect(markup).not.toContain('CLIENTE-FIEL');
  });

});
