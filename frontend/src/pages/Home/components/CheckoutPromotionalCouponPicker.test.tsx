import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPromotionalCoupon } from '../types';
import { CheckoutPromotionalCouponPicker } from './CheckoutPromotionalCouponPicker';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const coupons: PublicPromotionalCoupon[] = [
  {
    id: 1, code: 'PROMO20', title: 'Promoção geral', discountType: 'PERCENTAGE',
    discount: 20, description: '', minimumSubtotal: 0,
    allowDelivery: true, allowPickup: true, allowTable: false,
  },
  {
    id: 2, code: 'FRETEZERO', title: 'Frete grátis', discountType: 'FREE_SHIPPING',
    discount: 0, description: '', minimumSubtotal: 50,
    allowDelivery: true, allowPickup: false, allowTable: false,
  },
];

describe('seleção de cupons no resumo do carrinho', () => {
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

  it('estiliza os benefícios, marca o aplicado e encaminha os códigos sem alterar a validação do backend', async () => {
    const onApply = vi.fn();
    await act(async () => root.render(
      <CheckoutPromotionalCouponPicker coupons={coupons} appliedCode="PROMO20" onApply={onApply} />,
    ));
    expect(container.querySelectorAll('.picker-option')).toHaveLength(2);
    expect(container.querySelector('.picker-option--shipping')?.textContent).toContain('Frete grátis');
    expect((container.querySelector('[aria-label="Aplicar cupom PROMO20"]') as HTMLButtonElement).getAttribute('aria-pressed')).toBe('true');
    await act(async () => {
      (container.querySelector('[aria-label="Aplicar cupom FRETEZERO"]') as HTMLButtonElement).click();
    });
    expect(onApply).toHaveBeenCalledWith('FRETEZERO');
  });
  it('não marca cupom inválido como aplicado enquanto o backend valida', async () => {
    const onApply = vi.fn();
    await act(async () => root.render(
      <CheckoutPromotionalCouponPicker coupons={coupons} appliedCode="" pendingCode="FRETEZERO" onApply={onApply} />,
    ));
    const pending = container.querySelector('[aria-label="Aplicar cupom FRETEZERO"]') as HTMLButtonElement;
    expect(pending.getAttribute('aria-pressed')).toBe('false');
    expect(pending.getAttribute('aria-busy')).toBe('true');
    expect(pending.textContent).toContain('Validando...');
    await act(async () => root.render(
      <CheckoutPromotionalCouponPicker coupons={coupons} appliedCode="" onApply={onApply} />,
    ));
    expect(pending.getAttribute('aria-pressed')).toBe('false');
    expect(container.textContent).not.toContain('Aplicado');
  });

});
