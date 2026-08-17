import { describe, expect, it } from 'vitest';
import { getActiveOrderNotice } from './activeOrderNotice';

describe('getActiveOrderNotice', () => {
  it('retorna o pedido ativo mais recente com um resumo', () => {
    expect(
      getActiveOrderNotice([
        { id: 3, status: 'ENTREGUE' },
        {
          id: 9,
          status: 'PREPARANDO',
          createdAt: '2026-08-16T12:00:00.000Z',
          items: [{ product: { name: 'Pizza' } }, { product: { name: 'Suco' } }],
        },
      ]),
    ).toEqual({
      id: '9',
      status: 'PREPARANDO',
      summary: 'Pizza + 1 item',
      statusLabel: 'Em preparo',
    });
  });

  it('mantém o aviso quando a entrega aguarda confirmação do cliente', () => {
    expect(getActiveOrderNotice([{ id: 1, status: 'ENTREGUE' }])).toEqual({
      id: '1',
      status: 'ENTREGUE',
      summary: 'Seu pedido está em andamento',
      statusLabel: 'Entrega realizada',
    });
  });

  it('considera somente o último pedido criado', () => {
    expect(
      getActiveOrderNotice([
        { id: 4, status: 'PREPARANDO', createdAt: '2026-08-16T12:00:00.000Z' },
        {
          id: 5,
          status: 'ENTREGUE',
          deliveryConfirmedAt: '2026-08-16T13:05:00.000Z',
          createdAt: '2026-08-16T13:00:00.000Z',
        },
      ]),
    ).toBeNull();
  });
});
