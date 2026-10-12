import { beforeEach, expect, it, vi } from 'vitest';
import tableSessionService from '../../Services/tableSessionService';
import { matchesStoredTableSession, resumeExistingTableSession } from './resumeExistingTableSession';

vi.mock('../../Services/tableSessionService', () => ({
  default: { getCurrentSession: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

it('bloqueia outra mesa e outro tenant antes de consultar a sessão', () => {
  const existing = { sessionToken: 'valid-token', sessionId: 55, tableNumber: 1, restaurantId: 7 };
  expect(matchesStoredTableSession(existing, 1, 8)).toBe(false);
  expect(matchesStoredTableSession(existing, 2, 7)).toBe(false);
  expect(matchesStoredTableSession(existing, 1, 7)).toBe(true);
});

it('retoma a mesa destino preservando a sessão após validação remota do participante', async () => {
  localStorage.setItem('tableSession', JSON.stringify({
    sessionToken: 'valid-token', sessionId: 55,
    tableId: 91, tableNumber: 1, restaurantId: 7, tableOrderingEnabled: true,
  }));
  vi.mocked(tableSessionService.getCurrentSession).mockResolvedValue({
    sessionId: 55, restaurantId: 7, tableId: 92, tableNumber: 2,
    sessionStatus: 'OPEN', participant: { publicId: 'participant', orderingBlocked: false },
  });
  const resumed = await resumeExistingTableSession({
    routeTableNumber: 1, restaurantId: 7, restaurantSlug: 'restaurant',
  });
  expect(resumed?.session).toMatchObject({
    sessionId: 55, tableId: 92, tableNumber: 2, originalTableNumber: 1,
  });
});
