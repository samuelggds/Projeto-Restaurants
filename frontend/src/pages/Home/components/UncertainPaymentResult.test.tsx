import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { UncertainCheckoutPaymentResult } from '../hooks/useCheckoutPayments';
import { UncertainPaymentResult } from './UncertainPaymentResult';

const result: UncertainCheckoutPaymentResult = {
  restaurantId: 7,
  orderId: 99,
  status: 'PENDING',
  method: 'Pix',
  total: 49.9,
  reconciliationRequired: true,
};

function render(orderId: unknown = 99) {
  return renderToStaticMarkup(
    <UncertainPaymentResult
      result={{ ...result, orderId } as UncertainCheckoutPaymentResult}
      restaurantName="Restaurante Teste"
      restaurantCategory="RESTAURANTE"
      visitor
      onBack={vi.fn()}
    />,
  );
}

describe('UncertainPaymentResult', () => {
  it('identifica o pedido preservado e oferece consulta sem anunciar pagamento ou retornar automaticamente', () => {
    const markup = render();
    expect(markup).toContain('Pedido #99');
    expect(markup).toContain('Consultar pedido com o restaurante');
    expect(markup).toContain('Voltar ao cardápio');
    expect(markup).not.toContain('Pagamento confirmado');
    expect(markup).not.toContain('Retorno automático');
  });

  it.each([null, 0, -1, 1.5])(
    'não exibe referência ou ação de consulta inválida se receber %s em runtime',
    (orderId) => {
      const markup = render(orderId);
      expect(markup).not.toContain('Pedido #');
      expect(markup).not.toContain('Consultar pedido com o restaurante');
      expect(markup).toContain('Voltar ao cardápio');
    },
  );
});
