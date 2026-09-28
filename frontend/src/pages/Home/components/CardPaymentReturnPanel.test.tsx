import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CardPaymentReturnPanel } from './CardPaymentReturnPanel';

function render(status: 'VERIFYING' | 'PENDING' | 'PAID' | 'CANCELED' | 'ERROR') {
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

  it('expõe cancelamento final sem transformar falha temporária em recusa', () => {
    expect(render('CANCELED')).toContain('Pagamento cancelado');
    expect(render('ERROR')).not.toContain('Pagamento cancelado');
  });
});
