import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import service, { getGuestOrderOwnershipToken, getGuestOrderTrackingToken } from './ordersService';
vi.mock('./api', () => ({ default: { post: vi.fn() } }));
describe('checkout incerto preserva acesso do visitante', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  it.each(['createPixPayment', 'createCardCheckout'] as const)(
    '%s mantém tokens antes de propagar erro',
    async (method) => {
      const error = {
        response: {
          data: {
            code: 'PAYMENT_CREATION_UNCERTAIN',
            reconciliationRequired: true,
            orderId: 99,
            guestOwnershipToken: 'synthetic-ownership',
            guestTrackingToken: 'synthetic-tracking',
          },
        },
      };
      vi.mocked(api.post).mockRejectedValue(error);
      await expect(service[method]({})).rejects.toBe(error);
      expect(getGuestOrderOwnershipToken(99)).toBe('synthetic-ownership');
      expect(getGuestOrderTrackingToken(99)).toBe('synthetic-tracking');
    },
  );
  it.each(['createPixPayment', 'createCardCheckout'] as const)(
    '%s reutiliza chave após perda de resposta e renova após pedido conhecido',
    async (method) => {
      const payload = { restaurantId: 12, items: [{ productId: 8, quantity: 1 }] };
      const network = new Error('connection lost');
      const accepted = {
        response: {
          data: { code: 'PAYMENT_CREATION_UNCERTAIN', reconciliationRequired: true, orderId: 100 },
        },
      };
      vi.mocked(api.post)
        .mockRejectedValueOnce(network)
        .mockRejectedValueOnce(accepted)
        .mockResolvedValueOnce({ data: { orderId: 101 } });
      await expect(service[method](payload)).rejects.toBe(network);
      await expect(service[method](payload)).rejects.toBe(accepted);
      await service[method](payload);
      const headers = vi.mocked(api.post).mock.calls.map((call) => call[2]?.headers);
      expect(headers[0]?.['Idempotency-Key']).toBeTruthy();
      expect(headers[1]).toEqual(headers[0]);
      expect(headers[2]?.['Idempotency-Key']).not.toBe(headers[0]?.['Idempotency-Key']);
    },
  );
});
