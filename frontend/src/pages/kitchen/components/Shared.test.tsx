import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Order } from '../types';
import { hasOrderPreparationDetails, OrderItems } from './Shared';

const baseOrder: Order = {
  id: '#42',
  channel: 'DELIVERY',
  reference: 'Delivery',
  items: ['1× Pizza da casa'],
  createdAt: '20:30',
  elapsed: '02:00',
  status: 'PENDENTE',
  total: 39.9,
};

describe('itens operacionais da cozinha', () => {
  it('mostra escolhas por grupo e diferencia as duas observações sem exibir preços', () => {
    const order: Order = {
      ...baseOrder,
      observation: 'Observação geral do cliente',
      itemDetails: [
        {
          name: 'Pizza da casa',
          quantity: 1,
          observation: 'Assar bem a massa',
          customizations: [
            { groupName: 'Massa', options: ['Massa fina'] },
            { groupName: 'Adicionais', options: ['Bacon', 'Queijo'] },
          ],
        },
      ],
    };

    const markup = renderToStaticMarkup(createElement(OrderItems, { order }));

    expect(markup).toContain('1×');
    expect(markup).toContain('Pizza da casa');
    expect(markup).toContain('Massa fina');
    expect(markup).toContain('Bacon, Queijo');
    expect(markup).toContain('Observação deste item');
    expect(markup).toContain('Assar bem a massa');
    expect(markup).toContain('Observação do pedido');
    expect(markup).toContain('Observação geral do cliente');
    expect(markup).not.toContain('R$');
    expect(hasOrderPreparationDetails(order)).toBe(true);
  });

  it('continua exibindo pedidos antigos que possuem somente o resumo dos itens', () => {
    const markup = renderToStaticMarkup(createElement(OrderItems, { order: baseOrder }));

    expect(markup).toContain('1× Pizza da casa');
    expect(hasOrderPreparationDetails(baseOrder)).toBe(false);
  });
});
