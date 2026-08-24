import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import waiterCallsService from './waiterCallsService';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('waiterCallsService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista somente pela rota autenticada do restaurante do funcionário', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{ id: 1 }] });

    await expect(waiterCallsService.listCalls()).resolves.toEqual([{ id: 1 }]);
    expect(api.get).toHaveBeenCalledWith('/waiter-calls', { params: undefined });
  });

  it('envia o chamado público com o token da sessão no cabeçalho', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 4, duplicate: false } });

    await waiterCallsService.createCall('BILL', ' session-token ');

    expect(api.post).toHaveBeenCalledWith(
      '/waiter-calls',
      { type: 'BILL' },
      { headers: { 'x-session-token': 'session-token' } },
    );
  });

  it('recusa chamado sem sessão e atualiza apenas os estados permitidos pelo contrato', async () => {
    await expect(waiterCallsService.createCall('WAITER', '  ')).rejects.toThrow(
      'Sessão da mesa não identificada.',
    );
    expect(api.post).not.toHaveBeenCalled();

    vi.mocked(api.patch).mockResolvedValue({ data: { id: 8, status: 'IN_PROGRESS' } });
    await waiterCallsService.updateStatus(8, 'IN_PROGRESS');
    expect(api.patch).toHaveBeenCalledWith('/waiter-calls/8/status', {
      status: 'IN_PROGRESS',
    });
  });
});
