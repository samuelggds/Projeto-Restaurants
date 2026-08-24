import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import tableSessionService from './tableSessionService';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('tableSessionService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('entra na sessão aberta usando todos os identificadores do QR seguro', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { sessionId: 31, sessionToken: 'sessao-segura' },
    });

    await expect(
      tableSessionService.joinOpenSession({
        tableId: 91,
        tableNumber: 12,
        tableToken: '0123456789abcdef0123456789abcdef',
        restaurantId: 7,
        restaurantSlug: 'restaurante-teste',
      }),
    ).resolves.toEqual({ sessionId: 31, sessionToken: 'sessao-segura' });

    expect(api.post).toHaveBeenCalledWith('/table-sessions/join', {
      tableId: 91,
      tableNumber: 12,
      tableToken: '0123456789abcdef0123456789abcdef',
      restaurantId: 7,
      restaurantSlug: 'restaurante-teste',
    });
  });

  it('consulta a sessão atual e fecha apenas pelo identificador da sessão', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { sessionId: 31, tableId: 91 } });
    vi.mocked(api.patch).mockResolvedValue({ data: { id: 31, status: 'CLOSED' } });

    await expect(tableSessionService.getCurrentSession()).resolves.toEqual({
      sessionId: 31,
      tableId: 91,
    });
    await tableSessionService.closeSession(31);

    expect(api.get).toHaveBeenCalledWith('/table-sessions/current');
    expect(api.patch).toHaveBeenCalledWith('/table-sessions/31/close');
  });
});
