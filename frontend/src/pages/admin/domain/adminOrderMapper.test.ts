import { describe, expect, it } from 'vitest';
import { mapAdminOrder } from './adminOrderMapper';

describe('mapeamento administrativo de pedidos', () => {
  it('preserva o detalhamento financeiro sem fabricar valores ausentes', () => {
    const order = mapAdminOrder({
      id: 19, status: 'PRONTO', type: 'RETIRADA', total: '57.80',
      user: { name: 'Cliente', phone: '41999999999' },
      items: [{ id: 5, quantity: 2, price: '30.00', product: { name: 'Hambúrguer' },
        observation: 'Sem molho', customizations: [{ groupName: 'Ponto', options: ['Bem passado'] }] }],
      itemsSubtotal: '60.00', couponDiscount: '2.20', couponCode: 'PROMO',
    });
    expect(order.items).toEqual([{
      id: 5, name: 'Hambúrguer', quantity: 2, unitPrice: 30, observation: 'Sem molho',
      options: ['Ponto: Bem passado'],
    }]);
    expect(order.itemsSubtotal).toBe(60);
    expect(order.couponDiscount).toBe(2.2);
    expect(order.deliveryFeeAmount).toBeUndefined();
    expect(order.customerPhone).toBe('41999999999');
  });

  it('não mistura campos de pedidos sem itens e mantém faltas explicitamente indisponíveis', () => {
    const order = mapAdminOrder({ id: 20, status: 'PENDENTE', total: 20 });
    expect(order.items).toEqual([]);
    expect(order.itemsSubtotal).toBeUndefined();
    expect(order.observation).toBeUndefined();
  });
});
