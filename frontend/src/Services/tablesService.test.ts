import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import tablesService from './tablesService';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('tablesService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolve a mesa pública mantendo número e id como campos diferentes', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { id: 91, number: 12 } });

    await tablesService.resolvePublicTable({
      tableNumber: 12,
      tableId: 91,
      restaurantId: 7,
      slug: 'restaurante-teste',
    });

    expect(api.get).toHaveBeenCalledWith('/tables/public/resolve', {
      params: {
        tableNumber: 12,
        tableId: 91,
        restaurantId: 7,
        slug: 'restaurante-teste',
      },
    });
  });

  it('abre sessão na rota registrada pelo backend', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { pin: '4827' } });

    await tablesService.openTableSession(91);

    expect(api.post).toHaveBeenCalledWith('/table-sessions/open', { tableId: 91 });
  });
});
