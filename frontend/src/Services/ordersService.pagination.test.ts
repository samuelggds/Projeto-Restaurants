import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import ordersService from './ordersService';

vi.mock('./api', () => ({ default: { get: vi.fn() } }));

describe('ordersService paginação', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserva cursor, total e resumo e busca somente a página solicitada', async () => {
    const summary = { total: 150, active: 40, awaitingPayment: 5, inProgress: 12, delivered: 100 };
    vi.mocked(api.get).mockResolvedValue({
      data: {
        orders: [{ id: 80, orderItems: [{ quantity: '2', productName: 'Pizza' }] }],
        nextCursor: 80, hasMore: true, total: 14, summary,
      },
    });
    const query = { limit: 10, cursor: 90, status: 'PRONTO', search: 'Ana', queue: 'ALL' as const };

    const result = await ordersService.listRestaurantOrdersPage(query);

    expect(api.get).toHaveBeenCalledExactlyOnceWith('/orders', { params: query });
    expect(result).toMatchObject({ nextCursor: 80, hasMore: true, total: 14, summary });
    expect(result.orders[0]).toMatchObject({ items: [{ quantity: 2, product: { name: 'Pizza' } }] });
  });

  it('não transforma resposta sem metadados em histórico completo ou contagem parcial', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{ id: 80 }] });
    await expect(ordersService.listRestaurantOrdersPage()).rejects.toThrow('página de pedidos');
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
