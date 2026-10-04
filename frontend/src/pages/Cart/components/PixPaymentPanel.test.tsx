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

function render(
  status: PixPaymentStatus,
  options: { statusDetail?: string | null; paymentError?: string | null } = {},
) {
  return renderToStaticMarkup(
    <PixPaymentPanel
      pixPaymentData={{ ...payment, paid: status === 'PAID', statusDetail: options.statusDetail }}
      paymentStatus={status}
      paymentError={
        options.paymentError !== undefined
          ? options.paymentError
          : status === 'ERROR'
            ? 'Consulta indisponível.'
            : null
      }
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

  it('mostra rejeição high risk do Mercado Pago com orientação segura', () => {
    const markup = render('FAILED', { statusDetail: 'rejected_high_risk' });

    expect(markup).toContain('Pagamento recusado pelo Mercado Pago');
    expect(markup).toContain('não autorizou esta tentativa por análise de segurança');
    expect(markup).toContain('Nenhum pagamento foi confirmado');
    expect(markup).not.toContain('timeout');
    expect(markup).not.toContain('rejected_high_risk');
  });

  it.each(['FAILED', 'CANCELED', 'EXPIRED'] as const)(
    'mostra falha final em vermelho no estado %s',
    (status) => {
      const markup = render(status);

      expect(markup).toContain('Pagamento PIX não efetuado');
      expect(markup).toMatch(/class="[^"]*\bfailure\b[^"]*"/u);
      expect(markup).toContain('role="status"');
      expect(markup).toContain('lucide-circle-x');
      expect(markup).toContain(`data-status="${status}"`);
      expect(markup).not.toContain('Pagamento PIX Confirmado!');
    },
  );
});
