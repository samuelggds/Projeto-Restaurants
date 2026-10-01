import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { FigmaAccountExperience } from './FigmaAccountExperience';
import { AppDialogProvider } from '../../components/AppDialog/AppDialogProvider';
import { profileMockData } from './data';

describe('lista de cartões salvos', () => {
  it('renderiza cartões reais com bandeira, final, principal e abre os detalhes', async () => {
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
              publicId: 'visa-4532',
              provider: 'MERCADO_PAGO',
              brand: 'visa',
              last4: '4532',
              expMonth: 12,
              expYear: 2028,
              holderName: 'João Silva',
              isDefault: true,
              createdAt: '2026-09-15T12:00:00.000Z',
            },
            {
              publicId: 'master-7891',
              provider: 'MERCADO_PAGO',
              brand: 'mastercard',
              last4: '7891',
              expMonth: 11,
              expYear: 2029,
              holderName: 'João Silva',
              isDefault: false,
              createdAt: '2026-09-16T12:00:00.000Z',
            },
          ]}
          onAddPaymentMethod={vi.fn()}
        />
        </AppDialogProvider>,
      );
    });

    expect(container.textContent).toContain('Cartões Salvos');
    expect(container.textContent).toContain('Visa');
    expect(container.textContent).toContain('4532');
    expect(container.textContent).toContain('Principal');
    expect(container.textContent).toContain('Mastercard');
    expect(container.textContent).toContain('7891');
    expect(container.textContent).toContain('Adicionar novo cartão');

    const first = container.querySelector(
      '[aria-label="Ver detalhes do cartão final 4532"]',
    ) as HTMLButtonElement;
    await act(async () => first.click());

    expect(container.textContent).toContain('Detalhes do Cartão');
    expect(container.textContent).toContain('Método de pagamento principal');

    act(() => root.unmount());
    container.remove();
  });

  it('aciona a abertura do cadastro de novo cartão', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onAddPaymentMethod = vi.fn();

    await act(async () => {
      root.render(
        <AppDialogProvider>
          <FigmaAccountExperience
          data={profileMockData}
          initialView="paymentMethods"
          paymentMethods={[]}
          onAddPaymentMethod={onAddPaymentMethod}
        />
        </AppDialogProvider>,
      );
    });

    const add = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Adicionar novo cartão'),
    ) as HTMLButtonElement;

    await act(async () => add.click());
    expect(onAddPaymentMethod).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    container.remove();
  });
});
