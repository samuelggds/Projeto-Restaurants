import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CardPaymentReturnPanel } from './CardPaymentReturnPanel';

function render(
  status:
    | 'VERIFYING'
    | 'PENDING'
    | 'PAID'
    | 'FAILED'
    | 'CANCELED'
    | 'EXPIRED'
    | 'REFUNDED'
    | 'ERROR',
) {
  return renderToStaticMarkup(
    <CardPaymentReturnPanel
      status={status}
      error={status === 'ERROR' ? 'Consulta indisponível.' : null}
      providerReturnStatus="success"
      onVerify={vi.fn()}
      onClose={vi.fn()}
    />,
  );
}

describe('CardPaymentReturnPanel', () => {
  it.each([
    ['VERIFYING', 'Processando pagamento'],
    ['PENDING', 'Aguardando confirmação'],
    ['CANCELED', 'Pagamento cancelado'],
    ['ERROR', 'Aguardando confirmação'],
  ] as const)('não anuncia aprovação no estado %s', (status, label) => {
    const markup = render(status);

    expect(markup).toContain(label);
    expect(markup).not.toContain('Pagamento Aprovado!');
  });

  it('mostra aprovação somente quando a leitura canônica retorna PAID', () => {
    const markup = render('PAID');

    expect(markup).toContain('Pagamento Aprovado!');
    expect(markup).toContain('data-status="PAID"');
  });

  it.each([
    ['FAILED', 'Pagamento recusado'],
    ['CANCELED', 'Pagamento cancelado'],
    ['EXPIRED', 'Pagamento expirado'],
    ['REFUNDED', 'Pagamento estornado'],
  ] as const)('distingue corretamente o estado terminal %s', (status, label) => {
    expect(render(status)).toContain(label);
  });

  it('não transforma falha temporária de consulta em recusa ou cancelamento', () => {
    const markup = render('ERROR');
    expect(markup).not.toContain('Pagamento recusado');
    expect(markup).not.toContain('Pagamento cancelado');
  });

  it('usa o cartão preto compartilhado com ondas, contactless e bandeira dinâmica', () => {
    const markup = renderToStaticMarkup(
      <CardPaymentReturnPanel
        status="PENDING"
        error={null}
        providerReturnStatus=""
        details={{
          cardPaymentType: 'credit',
          cardBrand: 'visa',
          cardLast4: '4242',
        }}
        onVerify={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(markup).toContain('class="card-waves"');
    expect(markup).toContain('class="contactless-icon"');
    expect(markup).toContain('alt="Visa"');
    expect(markup).toContain('•••• •••• •••• 4242');
    expect(markup).toContain('Cartão de Crédito');
    expect(markup).not.toContain('mini-card');
  });

  it('preserva débito como débito em toda a tela de retorno', () => {
    const markup = renderToStaticMarkup(
      <CardPaymentReturnPanel
        status="PAID"
        error={null}
        providerReturnStatus=""
        details={{
          cardPaymentType: 'debit',
          cardBrand: 'mastercard',
          cardLast4: '4444',
        }}
        onVerify={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(markup).toContain('data-card-payment-type="debit"');
    expect(markup).toContain('Cartão de Débito');
    expect(markup).toContain('alt="Mastercard"');
    expect(markup).not.toContain('Cartão de Crédito');
  });
});
