import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { ServerStyleSheet } from 'styled-components';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPromotionalCoupon } from '../types';
import { HomePromotionalCoupons } from './HomePromotionalCoupons';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const coupon = (overrides: Partial<PublicPromotionalCoupon>): PublicPromotionalCoupon => ({
  id: 1,
  code: 'PROMO10',
  title: 'Promoção especial',
  description: 'Desconto especial para pedidos no restaurante',
  discountType: 'PERCENTAGE',
  discount: 10,
  minimumSubtotal: 0,
  allowDelivery: true,
  allowPickup: true,
  allowTable: false,
  ...overrides,
});

const coupons = [
  coupon({ id: 1, code: 'PRIMEIRA10', title: 'Primeira compra', audience: 'NEW_CUSTOMERS' }),
  coupon({ id: 2, code: 'PROMO20', title: 'Desconto de 20%', discount: 20 }),
  coupon({
    id: 3, code: 'FRETEZERO', title: 'Frete grátis',
    description: 'Desconto para entregas', discountType: 'FREE_SHIPPING',
    discount: 0, minimumSubtotal: 50, allowPickup: false,
  }),
];

describe('mini tickets promocionais da Home', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('mostra todos os cupons na faixa acessível, mantendo os benefícios e ações reais', async () => {
    const onApply = vi.fn();
    await act(async () => root.render(
      <HomePromotionalCoupons coupons={coupons} onApply={onApply} />,
    ));

    const strip = container.querySelector('.homepage-coupon-list') as HTMLDivElement;
    expect(strip.getAttribute('aria-roledescription')).toBe('carrossel');
    expect(strip.tabIndex).toBe(0);
    expect(strip.querySelectorAll('.coupon-card')).toHaveLength(3);
    expect(strip.querySelector('.coupon-card--welcome')?.textContent).toContain('1ª compra');
    expect(strip.querySelector('.coupon-card--shipping')?.textContent).toContain('FRETE GRÁTIS');
    expect(strip.querySelector('.coupon-card--shipping')?.textContent).toContain('R$ 50,00');

    await act(async () => {
      (container.querySelector('[aria-label="Usar cupom FRETEZERO"]') as HTMLButtonElement).click();
    });
    expect(onApply).toHaveBeenCalledWith('FRETEZERO');
  });

  it('mantém acesso a todos os cupons pelo diálogo e permite fechá-lo', async () => {
    await act(async () => root.render(<HomePromotionalCoupons coupons={coupons} />));
    await act(async () => {
      (container.querySelector('header button') as HTMLButtonElement).click();
    });
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.querySelectorAll('.coupon-card')).toHaveLength(3);
    await act(async () => {
      (container.querySelector('[aria-label="Fechar cupons"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('inclui os estilos do carrossel responsivo, sem depender de estilos globais', () => {
    const sheet = new ServerStyleSheet();
    try {
      renderToStaticMarkup(sheet.collectStyles(<HomePromotionalCoupons coupons={coupons} />));
      const styles = sheet.getStyleTags();
      expect(styles).toContain('homepage-coupon-list');
      expect(styles).toMatch(/scroll-snap-type:\s*x mandatory/);
      expect(styles).toContain('coupon-card--shipping');
      expect(styles).toContain('coupon-card--welcome');
    } finally {
      sheet.seal();
    }
  });
});
