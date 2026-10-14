// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDialogProvider } from '../../../components/AppDialog/AppDialogProvider';
import type { CouponPayload } from '../types';
import { PromotionsSettings } from './PromotionsSettings';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function enterValue(element: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('primeiro acesso ao formulário de cupons promocionais', () => {
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

  it('aceita frete grátis no primeiro envio sem alternar para a aba de fidelidade', async () => {
    const onCreateCoupon = vi.fn<(payload: CouponPayload) => Promise<void>>().mockResolvedValue(undefined);

    await act(async () => {
      root.render(
        <AppDialogProvider>
          <PromotionsSettings
            mode="coupons"
            products={[]}
            coupons={[]}
            onCreateCoupon={onCreateCoupon}
          />
        </AppDialogProvider>,
      );
    });

    const activeTab = container.querySelector('[role="tab"][aria-selected="true"]');
    expect(activeTab?.textContent).toContain('Cupons Promocionais');

    const codeInput = container.querySelector(
      '#coupon-editor input[placeholder="Ex.: PROMO20"]',
    ) as HTMLInputElement;
    const titleInput = container.querySelector(
      '#coupon-editor input[placeholder="Ex.: Recompensa cliente fiel"]',
    ) as HTMLInputElement;
    const rewardTypeSelect = Array.from(
      container.querySelectorAll<HTMLSelectElement>('#coupon-editor select'),
    ).find((select) => Array.from(select.options).some((option) => option.value === 'FREE_SHIPPING'));

    expect(codeInput).toBeTruthy();
    expect(titleInput).toBeTruthy();
    expect(rewardTypeSelect).toBeTruthy();

    await act(async () => {
      enterValue(codeInput, 'FRETEZERO');
      enterValue(titleInput, 'Frete Grátis');
      rewardTypeSelect!.value = 'FREE_SHIPPING';
      rewardTypeSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      const form = container.querySelector('#coupon-editor form') as HTMLFormElement;
      expect(form).toBeTruthy();
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(onCreateCoupon).toHaveBeenCalledOnce();
    expect(onCreateCoupon).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'PROMOTIONAL',
        discountType: 'FREE_SHIPPING',
        audience: 'ALL',
        discount: 0,
        allowDelivery: true,
        allowPickup: false,
        allowTable: false,
      }),
    );
    expect(container.textContent).not.toContain('Frete grátis só pode ser aplicado no Delivery promocional.');
  });
});
