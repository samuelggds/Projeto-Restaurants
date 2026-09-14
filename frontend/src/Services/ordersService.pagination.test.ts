import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import ordersService from './ordersService';

vi.mock('./api', () => ({ default: { get: vi.fn() } }));

describe('ordersService paginação', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([
    {},
    [],
    { todayOrders: 1, sales: undefined },
    {
      todayOrders: 1,
      sales: NaN,
      averageTicket: 1,
      preparingOrders: 0,
      customers: 1,
      timezone: 'America/Sao_Paulo',
    },
  ])('recusa agregados inválidos sem entregar valores que derrubam a tela', async (data) => {
    vi.mocked(api.get).mockResolvedValue({ data });
    await expect(ordersService.getOverview()).rejects.toThrow('indicadores');
  });

  it('preserva cursor, total e resumo e busca somente a página solicitada', async () => {
    const summary = { total: 150, active: 40, awaitingPayment: 5, inProgress: 12, delivered: 100 };
    vi.mocked(api.get).mockResolvedValue({
      data: {
        orders: [{ id: 80, orderItems: [{ quantity: '2', productName: 'Pizza' }] }],
        nextCursor: 80,
        hasMore: true,
        total: 14,
        summary,
      },
    });
    const query = { limit: 10, cursor: 90, status: 'PRONTO', search: 'Ana', queue: 'ALL' as const };

    const result = await ordersService.listRestaurantOrdersPage(query);

    expect(api.get).toHaveBeenCalledExactlyOnceWith('/orders', { params: query });
    expect(result).toMatchObject({ nextCursor: 80, hasMore: true, total: 14, summary });
    expect(result.orders[0]).toMatchObject({
      items: [{ quantity: 2, product: { name: 'Pizza' } }],
    });
  });

  it('não transforma resposta sem metadados em histórico completo ou contagem parcial', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{ id: 80 }] });
    await expect(ordersService.listRestaurantOrdersPage()).rejects.toThrow('página de pedidos');
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('inclui os 125 pedidos ativos atravessando páginas sem consultar o histórico', async () => {
    const orders = Array.from({ length: 125 }, (_, index) => ({
      id: 200 - index,
      status: 'PREPARANDO',
    }));
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: {
          orders: orders.slice(0, 100),
          total: 125,
          hasMore: true,
          nextCursor: 101,
        },
      })
      .mockResolvedValueOnce({
        data: {
          orders: orders.slice(100),
          total: 125,
          hasMore: false,
          nextCursor: null,
        },
      });
    const result = await ordersService.listRestaurantOrders();
    expect(result).toHaveLength(125);
    expect((result.at(-1) as { id: number }).id).toBe(76);
    expect(api.get).toHaveBeenNthCalledWith(1, '/orders', {
      params: { queue: 'ACTIVE', limit: 100 },
    });
    expect(api.get).toHaveBeenNthCalledWith(2, '/orders', {
      params: { queue: 'ACTIVE', limit: 100, cursor: 101 },
    });
  });

  it('recusa cursor repetido em vez de retornar uma fila incompleta ou repetir indefinidamente', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { orders: [{ id: 90 }], total: 150, hasMore: true, nextCursor: 90 },
    });
    await expect(ordersService.listRestaurantOrders()).rejects.toThrow('fila mudou');
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('preserva a navegação do histórico pessoal e consulta somente a página pedida', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { orders: [{ id: 71 }], total: 160, hasMore: true, nextCursor: 71 },
    });
    const result = await ordersService.listMyOrders({ queue: 'HISTORY', limit: 20, cursor: 91 });
    expect(result).toMatchObject({ total: 160, hasMore: true, nextCursor: 71 });
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/orders/my-orders', {
      params: { queue: 'HISTORY', limit: 20, cursor: 91 },
    });
  });
});
