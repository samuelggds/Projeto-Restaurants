import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import PixPaymentPanel from './PixPaymentPanel';

const payment = {
  orderId: 91,
  total: 49.9,
  paymentId: 'pix-91',
  provider: 'Mercado Pago',
  pixCode: '000201-pix-code',
  qrCodeBase64: null,
  paid: false,
};

function render(status: 'WAITING' | 'VERIFYING' | 'PENDING' | 'PAID' | 'ERROR') {
  return renderToStaticMarkup(
    <PixPaymentPanel
      pixPaymentData={{ ...payment, paid: status === 'PAID' }}
      paymentStatus={status}
      paymentError={status === 'ERROR' ? 'Consulta indisponível.' : null}
      formatCurrency={(value) => `R$ ${value.toFixed(2)}`}
      onCopyPixKey={vi.fn()}
      onVerify={vi.fn()}
    />,
  );
}

describe('PixPaymentPanel', () => {
  it.each([
    ['WAITING', 'Aguardando pagamento'],
    ['VERIFYING', 'Verificando pagamento'],
    ['PENDING', 'Pagamento ainda pendente'],
    ['ERROR', 'Não foi possível verificar'],
  ] as const)('não anuncia confirmação no estado %s', (status, label) => {
    const markup = render(status);

    expect(markup).toContain(label);
    expect(markup).not.toContain('Pix confirmado');
  });

  it('mostra confirmação somente no estado canônico PAID', () => {
    const markup = render('PAID');

    expect(markup).toContain('Pix confirmado');
    expect(markup).not.toContain('000201-pix-code');
  });
});
