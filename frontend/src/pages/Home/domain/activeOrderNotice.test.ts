import { describe, expect, it } from 'vitest';
import { getActiveOrderNotice } from './activeOrderNotice';

describe('getActiveOrderNotice', () => {
  it('retorna o pedido DELIVERY ativo mais recente com um resumo', () => {
    expect(
      getActiveOrderNotice([
        {
          id: 3,
          type: 'DELIVERY',
          status: 'ENTREGUE',
          createdAt: '2026-08-16T10:00:00.000Z',
        },
        {
          id: 9,
          type: 'DELIVERY',
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
      deliveryConfirmationCode: null,
      deliveryStartedAt: null,
    });
  });

  it('mantém o aviso quando uma entrega aguarda confirmação do cliente', () => {
    expect(
      getActiveOrderNotice([
        {
          id: 1,
          type: 'DELIVERY',
          status: 'ENTREGUE',
        },
      ]),
    ).toEqual({
      id: '1',
      status: 'ENTREGUE',
      summary: 'Seu pedido está em andamento',
      statusLabel: 'Entrega realizada',
      deliveryConfirmationCode: null,
      deliveryStartedAt: null,
    });
  });

  it('ignora pedidos de MESA mesmo quando são mais recentes', () => {
    expect(
      getActiveOrderNotice([
        {
          id: 20,
          type: 'DELIVERY',
          status: 'PREPARANDO',
          createdAt: '2026-08-16T12:00:00.000Z',
          items: [{ product: { name: 'Pizza Calabresa' } }],
        },
        {
          id: 21,
          type: 'MESA',
          status: 'ENTREGUE',
          createdAt: '2026-08-16T13:00:00.000Z',
          items: [{ product: { name: 'Hambúrguer' } }],
        },
      ]),
    ).toEqual({
      id: '20',
      status: 'PREPARANDO',
      summary: 'Pizza Calabresa',
      statusLabel: 'Em preparo',
      deliveryConfirmationCode: null,
      deliveryStartedAt: null,
    });
  });

  it('expõe o código somente quando ele é válido e preserva o início da entrega', () => {
    expect(
      getActiveOrderNotice([
        {
          id: 22,
          type: 'DELIVERY',
          status: 'SAIU_PARA_ENTREGA',
          deliveryConfirmationCode: '4821',
          deliveryStartedAt: '2026-08-16T13:00:00.000Z',
        },
      ]),
    ).toEqual({
      id: '22',
      status: 'SAIU_PARA_ENTREGA',
      summary: 'Seu pedido está em andamento',
      statusLabel: 'Saiu para entrega',
      deliveryConfirmationCode: '4821',
      deliveryStartedAt: '2026-08-16T13:00:00.000Z',
    });
  });

  it('não mostra aviso quando o último DELIVERY já foi entregue e confirmado', () => {
    expect(
      getActiveOrderNotice([
        {
          id: 4,
          type: 'DELIVERY',
          status: 'PREPARANDO',
          createdAt: '2026-08-16T12:00:00.000Z',
        },
        {
          id: 5,
          type: 'DELIVERY',
          status: 'ENTREGUE',
          deliveryConfirmedAt: '2026-08-16T13:05:00.000Z',
          createdAt: '2026-08-16T13:00:00.000Z',
        },
      ]),
    ).toBeNull();
  });
});
