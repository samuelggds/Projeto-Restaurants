import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { FigmaAccountExperience } from './FigmaAccountExperience';
import { AppDialogProvider } from '../../components/AppDialog/AppDialogProvider';
import { profileMockData } from './data';

describe('detalhes de cartão salvo', () => {
  it('abre os dados reais do cartão e permite definir principal ou remover', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onSelectPaymentMethod = vi.fn(async () => undefined);
    const onRemovePaymentMethod = vi.fn(async () => undefined);

    await act(async () => {
      root.render(
        <AppDialogProvider>
          <FigmaAccountExperience
          data={profileMockData}
          initialView="paymentMethods"
          paymentMethods={[
            {
              publicId: 'card-4532',
              provider: 'MERCADO_PAGO',
              brand: 'visa',
              last4: '4532',
              expMonth: 12,
              expYear: 2028,
              holderName: 'João Silva',
              isDefault: false,
              createdAt: '2026-09-15T12:00:00.000Z',
            },
          ]}
          onSelectPaymentMethod={onSelectPaymentMethod}
          onRemovePaymentMethod={onRemovePaymentMethod}
        />
        </AppDialogProvider>,
      );
    });

    const savedCard = container.querySelector(
      '[aria-label="Ver detalhes do cartão final 4532"]',
    ) as HTMLElement;
    expect(savedCard).not.toBeNull();

    await act(async () => savedCard.click());

    expect(container.textContent).toContain('Detalhes do Cartão');
    expect(container.textContent).toContain('Últimos dígitos');
    expect(container.textContent).toContain('4532');
    expect(container.textContent).toContain('João Silva');
    expect(container.textContent).toContain('12/28');
    expect(container.textContent).toContain('15 set 2026');
    expect(container.querySelector('.card-waves')).not.toBeNull();
    expect(container.querySelector('.contactless-icon')).not.toBeNull();

    const primaryButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Definir como principal'),
    ) as HTMLButtonElement;
    await act(async () => primaryButton.click());
    expect(onSelectPaymentMethod).toHaveBeenCalledWith('card-4532');

    const removeButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Remover cartão'),
    ) as HTMLButtonElement;
    await act(async () => removeButton.click());
    expect(onRemovePaymentMethod).toHaveBeenCalledWith('card-4532');

    act(() => root.unmount());
    container.remove();
  });

  it('identifica visualmente o cartão principal', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <AppDialogProvider>
          <FigmaAccountExperience
          data={profileMockData}
          initialView="paymentMethods"
          paymentMethods={[
            {
              publicId: 'main-card',
              provider: 'MERCADO_PAGO',
              brand: 'mastercard',
              last4: '4444',
              expMonth: 11,
              expYear: 2030,
              holderName: 'Cliente Teste',
              isDefault: true,
              createdAt: '2026-09-15T12:00:00.000Z',
            },
          ]}
        />
        </AppDialogProvider>,
      );
    });

    await act(async () => {
      (
        container.querySelector('[aria-label="Ver detalhes do cartão final 4444"]') as HTMLElement
      ).click();
    });

    expect(container.textContent).toContain('Método de pagamento principal');
    const primaryButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Definir como principal'),
    ) as HTMLButtonElement;
    expect(primaryButton.disabled).toBe(true);

    act(() => root.unmount());
    container.remove();
  });
});
