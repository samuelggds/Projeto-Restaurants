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
  allowCard: false,
  paymentMethod: 'pix' as const,
  restaurantId: null,
  busy: false,
  onPaymentMethodChange: () => undefined,
  onChooseAccount: () => undefined,
  onChoosePayNow: () => undefined,
  onClose: () => undefined,
};

describe('TableOrderContinuationModal', () => {
  it('mostra somente pagar agora com Pix ou pagar depois', () => {
    const markup = renderToStaticMarkup(<TableOrderContinuationModal {...baseProps} />);

    expect(markup).toContain('Como deseja finalizar?');
    expect(markup).toContain('Pagar agora');
    expect(markup).toContain('Pagar agora com Pix');
    expect(markup).toContain('Pagar depois');
    expect(markup).toContain('Adicionar à minha comanda');
    expect(markup).toContain('pagar no cartão');
    expect(markup).toContain('maquininha');
    expect(markup).not.toContain('Escolher forma de pagamento');
    expect(markup).not.toContain('Conclua no ambiente seguro');
  });

  it('bloqueia pagar depois quando a comanda não está habilitada', () => {
    const markup = renderToStaticMarkup(
      <TableOrderContinuationModal {...baseProps} accountEnabled={false} />,
    );

    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Adicionar à minha comanda');
  });

  it('inicia Pix diretamente sem segunda etapa de métodos', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onChoosePayNow = vi.fn();

    await act(async () => {
      root.render(<TableOrderContinuationModal {...baseProps} onChoosePayNow={onChoosePayNow} />);
    });

    await act(async () => {
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent?.includes('Pagar agora com Pix'))
        ?.click();
    });

    expect(onChoosePayNow).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain('Como deseja pagar este pedido?');

    await act(async () => root.unmount());
    container.remove();
  });
});
