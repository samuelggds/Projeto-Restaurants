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
    ['VERIFYING', 'Verificando pagamento'],
    ['PENDING', 'Pagamento ainda pendente'],
    ['CANCELED', 'Pedido cancelado'],
    ['ERROR', 'Não foi possível verificar'],
  ] as const)('não anuncia confirmação no estado %s', (status, label) => {
    const markup = render(status);

    expect(markup).toContain(label);
    expect(markup).not.toContain('Pagamento confirmado');
  });

  it('mostra confirmação somente quando a leitura canônica retorna PAID', () => {
    expect(render('PAID')).toContain('Pagamento confirmado');
  });
});
