import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import tablesService from './tablesService';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('tablesService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolve a mesa pública mantendo número e id como campos diferentes', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { id: 91, number: 12 } });

    await tablesService.resolvePublicTable({
      tableNumber: 12,
      tableToken: '0123456789abcdef0123456789abcdef',
      tableId: 91,
      restaurantId: 7,
      slug: 'restaurante-teste',
    });

    expect(api.get).toHaveBeenCalledWith('/tables/public/resolve', {
      params: {
        tableNumber: 12,
        tableToken: '0123456789abcdef0123456789abcdef',
        tableId: 91,
        restaurantId: 7,
        slug: 'restaurante-teste',
      },
    });
  });

  it('cria a mesa e preserva o token seguro retornado para o admin', async () => {
    const created = {
      id: 91,
      number: 12,
      restaurantId: 7,
      active: true,
      token: '0123456789abcdef0123456789abcdef',
    };
    vi.mocked(api.post).mockResolvedValue({ data: created });

    await expect(tablesService.createTable({ number: 12 })).resolves.toEqual(created);
    expect(api.post).toHaveBeenCalledWith('/tables', { number: 12 });
  });

  it('abre sessão na rota registrada pelo backend', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { sessionId: 31 } });

    await tablesService.openTableSession(91);

    expect(api.post).toHaveBeenCalledWith('/table-sessions/open', { tableId: 91 });
  });

  it('fecha a sessão pela rota operacional da mesa', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { id: 31, status: 'CLOSED' } });

    await tablesService.closeTableSession(31);

    expect(api.patch).toHaveBeenCalledWith('/table-sessions/31/close');
  });
});
