import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TableOrderContinuationModal } from './TableOrderContinuationModal';

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
  it('explica as duas decisões sem adicionar o pedido automaticamente', () => {
    const markup = renderToStaticMarkup(<TableOrderContinuationModal {...baseProps} />);

    expect(markup).toContain('Como deseja continuar?');
    expect(markup).toContain('Adicionar à conta da mesa');
    expect(markup).toContain('Pagar este pedido agora');
    expect(markup).toContain('Pix');
    expect(markup).toContain('Cartão');
  });

  it('bloqueia a conta quando o recurso não está habilitado', () => {
    const markup = renderToStaticMarkup(
      <TableOrderContinuationModal {...baseProps} accountEnabled={false} />,
    );

    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Adicionar à conta');
  });
});
