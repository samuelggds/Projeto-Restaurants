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
  it.each(['FAILED', 'PAID', 'PENDING', 'ERROR'] as const)(
    'mostra motivo e referência de suporte somente na recusa, estado %s', (status) => {
      const publicId = '123e4567-e89b-42d3-a456-426614174002';
      const markup = renderToStaticMarkup(
        <CardPaymentReturnPanel
          status={status}
          error={null}
          providerReturnStatus=""
          details={{ paymentAttempt: { publicId, providerStatusDetail: 'high_risk' } }}
          onVerify={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      if (status === 'FAILED') {
        expect(markup).toContain('análise de segurança');
        expect(markup).toContain('O motivo específico não foi informado');
        expect(markup).toContain('Referência para suporte:');
        expect(markup).toContain(publicId);
      } else {
        expect(markup).not.toContain('análise de segurança');
        expect(markup).not.toContain('Referência para suporte:');
        expect(markup).not.toContain(publicId);
      }
    },
  );

  it('não renderiza mensagem ou identificadores brutos do provedor em uma recusa', () => {
    const markup = renderToStaticMarkup(
      <CardPaymentReturnPanel
        status="FAILED"
        error="provider raw error buyer@example.test"
        providerReturnStatus=""
        details={{ paymentAttempt: {
          publicId: 'provider-request-private',
          providerStatusDetail: 'buyer@example.test',
          failureCode: 'unmapped-provider-error',
        } }}
        onVerify={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(markup).toContain('O provedor não informou um motivo específico');
    expect(markup).not.toContain('buyer@example.test');
    expect(markup).not.toContain('provider-request-private');
    expect(markup).not.toContain('unmapped-provider-error');
  });

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

  it('distingue falha de atualização anterior à cobrança de uma recusa bancária', () => {
    const markup = renderToStaticMarkup(
      <CardPaymentReturnPanel status="FAILED" error={null} providerReturnStatus=""
        details={{ paymentAttempt: { failureCode: 'saved_card_refresh_failed' } }}
        onVerify={vi.fn()} onClose={vi.fn()} />,
    );
    expect(markup).toContain('Pagamento não concluído');
    expect(markup).toContain('Nenhuma cobrança foi enviada nesta tentativa');
    expect(markup).not.toContain('Pagamento recusado');
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

  it('renderiza o challenge 3DS somente quando o backend retorna URL segura e pagamento pendente', () => {
    const markup = renderToStaticMarkup(
      <CardPaymentReturnPanel
        status="PENDING"
        error={null}
        providerReturnStatus="pending"
        details={{
          cardPaymentType: 'credit',
          cardBrand: 'mastercard',
          cardLast4: '0829',
          challengeUrl: 'https://auth.mercadopago.com/card/validation?token=challenge',
        }}
        onVerify={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(markup).toContain('Confirme sua compra com o banco');
    expect(markup).toContain('title="Autenticação de segurança do cartão"');
    expect(markup).toContain(
      'src="https://auth.mercadopago.com/card/validation?token=challenge"',
    );
    expect(markup).not.toContain('Pagamento Aprovado!');
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
