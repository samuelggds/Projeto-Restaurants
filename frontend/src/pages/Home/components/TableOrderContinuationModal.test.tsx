import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TableOrderContinuationModal } from './TableOrderContinuationModal';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const baseProps = {
  open: true,
  accountEnabled: true,
  accountLoading: false,
  payNowAvailable: true,
  allowPix: true,
  allowCard: true,
  paymentMethod: 'pix' as const,
  busy: false,
  onPaymentMethodChange: () => undefined,
  onChooseAccount: () => undefined,
  onChoosePayNow: () => undefined,
  onClose: () => undefined,
};

describe('TableOrderContinuationModal', () => {
  it('mostra somente a decisão entre conta e pagamento imediato', () => {
    const markup = renderToStaticMarkup(<TableOrderContinuationModal {...baseProps} />);

    expect(markup).toContain('Como deseja continuar?');
    expect(markup).toContain('Adicionar à conta da mesa');
    expect(markup).toContain('Pagar este pedido agora');
    expect(markup).not.toContain('Pix');
    expect(markup).not.toContain('Cartão');
  });

  it('bloqueia a conta quando o recurso não está habilitado', () => {
    const markup = renderToStaticMarkup(
      <TableOrderContinuationModal {...baseProps} accountEnabled={false} />,
    );

    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Adicionar à conta');
  });

  it('abre os métodos em uma segunda etapa e volta sem iniciar pagamento', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onChoosePayNow = vi.fn();

    await act(async () => {
      root.render(<TableOrderContinuationModal {...baseProps} onChoosePayNow={onChoosePayNow} />);
    });
    await act(async () => {
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent?.includes('Escolher forma de pagamento'))
        ?.click();
    });

    expect(container.textContent).toContain('Como deseja pagar este pedido?');
    expect(container.textContent).toContain('Pix');
    expect(container.textContent).toContain('Cartão');
    expect(onChoosePayNow).not.toHaveBeenCalled();

    await act(async () => {
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Voltar')
        ?.click();
    });
    expect(container.textContent).toContain('Como deseja continuar?');
    expect(onChoosePayNow).not.toHaveBeenCalled();

    await act(async () => root.unmount());
    container.remove();
  });
});
