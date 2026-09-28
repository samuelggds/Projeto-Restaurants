import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import PixPaymentPanel from './PixPaymentPanel';
import type { PixPaymentStatus } from '../../Home/hooks/useCheckoutPayments';

const payment = {
  orderId: 91,
  total: 49.9,
  paymentId: 'pix-91',
  provider: 'Mercado Pago',
  pixCode: '000201-pix-code',
  qrCodeBase64: null,
  paid: false,
};

function render(status: PixPaymentStatus) {
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
  it.each(['WAITING', 'VERIFYING', 'PENDING', 'ERROR'] as const)(
    'não anuncia confirmação no estado %s',
    (status) => {
      const markup = render(status);
      expect(markup).toContain('Pagamento PIX');
      expect(markup).not.toContain('Pagamento PIX Confirmado!');
    },
  );

  it('mostra confirmação somente no estado canônico PAID', () => {
    const markup = render('PAID');

    expect(markup).toContain('Pagamento PIX Confirmado!');
    expect(markup).not.toContain('000201-pix-code');
  });

  it.each(['FAILED', 'CANCELED', 'EXPIRED'] as const)(
    'mostra falha final em vermelho no estado %s',
    (status) => {
      const markup = render(status);

      expect(markup).toContain('Pagamento PIX não efetuado');
      expect(markup).toContain('class="failure"');
      expect(markup).not.toContain('Pagamento PIX Confirmado!');
    },
  );
});
