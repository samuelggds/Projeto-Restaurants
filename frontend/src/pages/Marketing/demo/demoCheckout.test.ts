import { describe, expect, it } from 'vitest';
import { demoCheckoutError } from './demoCheckout';
import { demoHomeData } from './demoCatalog';
import { addDemoCartItem, createInitialDemoState } from './demoDomain';

describe('checkout demonstrativo e configurações', () => {
  const state = addDemoCartItem(createInitialDemoState(), demoHomeData.products[0]);
  it('aplica disponibilidade, canais e pagamentos da loja', () => {
    expect(demoCheckoutError(state, demoHomeData, 'DELIVERY', 'PIX')).toBe('');
    expect(
      demoCheckoutError(state, { ...demoHomeData, isOpenForOrders: false }, 'DELIVERY', 'PIX'),
    ).toContain('fechado');
    expect(
      demoCheckoutError(state, { ...demoHomeData, acceptsDelivery: false }, 'DELIVERY', 'PIX'),
    ).toContain('tipo de pedido');
    expect(
      demoCheckoutError(state, { ...demoHomeData, acceptsPickup: false }, 'PICKUP', 'PIX'),
    ).toContain('tipo de pedido');
    expect(
      demoCheckoutError(state, { ...demoHomeData, tableOrderingEnabled: false }, 'TABLE', 'PIX'),
    ).toContain('tipo de pedido');
    expect(
      demoCheckoutError(state, { ...demoHomeData, acceptsPix: false }, 'DELIVERY', 'PIX'),
    ).toContain('pagamento');
    expect(
      demoCheckoutError(state, { ...demoHomeData, acceptsCard: false }, 'DELIVERY', 'CARD'),
    ).toContain('pagamento');
    expect(
      demoCheckoutError(state, { ...demoHomeData, minimumOrder: 50 }, 'DELIVERY', 'PIX'),
    ).toContain('mínimo');
    expect(demoCheckoutError(state, { ...demoHomeData, minimumOrder: 50 }, 'TABLE', 'PIX')).toBe(
      '',
    );
  });
  it('impede concluir com produto removido, estoque esgotado ou preço antigo', () => {
    expect(
      demoCheckoutError(state, { ...demoHomeData, products: [] }, 'DELIVERY', 'PIX'),
    ).toContain('indisponível');
    expect(
      demoCheckoutError(
        state,
        { ...demoHomeData, products: [{ ...demoHomeData.products[0], stock: 0 }] },
        'DELIVERY',
        'PIX',
      ),
    ).toContain('indisponível');
    expect(
      demoCheckoutError(
        state,
        { ...demoHomeData, products: [{ ...demoHomeData.products[0], price: 40 }] },
        'DELIVERY',
        'PIX',
      ),
    ).toContain('preço');
  });
});
