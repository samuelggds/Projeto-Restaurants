import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  socketOn: vi.fn(),
  socketOff: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('../../../Services/tableSessionService', () => ({
  default: { getCurrentSession: mocks.getCurrentSession },
}));
vi.mock('../../../Services/socketService', () => ({
  connectTableSessionSocket: mocks.connect,
  disconnectTableSessionSocket: mocks.disconnect,
}));

import { useTableSession } from './useTableSession';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const storedSession = {
  sessionToken: 'session-token-mesa-5',
  sessionId: 31,
  sessionPublicId: '323e4567-e89b-42d3-a456-426614174031',
  tableId: 91,
  tableNumber: 5,
  restaurantId: 1,
  expiresAt: '2099-01-01T00:00:00.000Z',
  sessionStatus: 'OPEN' as const,
  tableOrderingEnabled: true,
};

function TableSessionProbe() {
  const session = useTableSession({
    tableNumber: '5',
    restaurantId: '1',
    tableToken: 'abc123',
    tableId: null,
    notify: mocks.notify,
  });

  return (
    <output
      data-mesa-mode={String(session.mesaMode)}
      data-session-active={String(session.mesaSessionIsActive)}
    >
      {session.sessionEndedMessage || `Mesa ${session.mesaLabel}`}
    </output>
  );
}

async function flushUntil(condition: () => boolean) {
  for (let attempt = 0; attempt < 30 && !condition(); attempt += 1) {
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 1));
    });
  }
}

describe('useTableSession após autenticação', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('tableSession', JSON.stringify(storedSession));
    localStorage.setItem('tableSessionToken', storedSession.sessionToken);
    mocks.connect.mockReturnValue({ on: mocks.socketOn, off: mocks.socketOff });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('mantém mesaMode pela rota e revalida a sessão restaurada no backend', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      id: 31,
      sessionId: 31,
      sessionPublicId: storedSession.sessionPublicId,
      tableId: 91,
      tableNumber: 5,
      restaurantId: 1,
      sessionStatus: 'OPEN',
    });

    await act(async () => root.render(<TableSessionProbe />));
    await flushUntil(() => mocks.getCurrentSession.mock.calls.length === 1);

    const output = container.querySelector('output');
    expect(output?.dataset.mesaMode).toBe('true');
    expect(output?.dataset.sessionActive).toBe('true');
    expect(container.textContent).toBe('Mesa 5');
    expect(localStorage.getItem('tableSessionToken')).toBe(storedSession.sessionToken);
  });

  it('invalida a sessão encerrada sem redirecionar a rota para a Home', async () => {
    mocks.getCurrentSession.mockRejectedValue({ response: { status: 404 } });

    await act(async () => root.render(<TableSessionProbe />));
    await flushUntil(() => localStorage.getItem('tableSession') === null);

    const output = container.querySelector('output');
    expect(output?.dataset.mesaMode).toBe('true');
    expect(output?.dataset.sessionActive).toBe('false');
    expect(container.textContent).toContain('mesa já foi fechada ou a sessão expirou');
    expect(localStorage.getItem('tableSessionToken')).toBeNull();
  });
});
