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

  it.each([401, 403, 404])(
    'invalida sessão e identidade quando o backend nega acesso com %s',
    async (status) => {
      mocks.getCurrentSession.mockRejectedValue({ response: { status } });
      const identityInvalidated = vi.fn();
      window.addEventListener('gastronexa:table-guest-session-ended', identityInvalidated);

      await act(async () => root.render(<TableSessionProbe />));
      await flushUntil(() => localStorage.getItem('tableSession') === null);

      const output = container.querySelector('output');
      expect(output?.dataset.mesaMode).toBe('true');
      expect(output?.dataset.sessionActive).toBe('false');
      expect(container.textContent).toContain('mesa já foi fechada ou a sessão expirou');
      expect(localStorage.getItem('tableSessionToken')).toBeNull();
      expect(identityInvalidated).toHaveBeenCalledTimes(1);

      window.removeEventListener('gastronexa:table-guest-session-ended', identityInvalidated);
    },
  );

  it('não restaura sessão com resposta atrasada após o garçom fechar a mesa', async () => {
    let resolveSession!: (value: unknown) => void;
    mocks.getCurrentSession.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    await act(async () => root.render(<TableSessionProbe />));
    const onClosed = mocks.socketOn.mock.calls.find(
      ([event]) => event === 'table:session-closed',
    )?.[1];
    expect(onClosed).toBeTypeOf('function');
    await act(async () => {
      onClosed({ sessionId: 31, tableId: 91 });
      resolveSession({
        id: 31,
        tableId: 91,
        sessionStatus: 'OPEN',
        participant: { orderingBlocked: true },
      });
    });
    expect(container.querySelector('output')?.dataset.sessionActive).toBe('false');
    expect(localStorage.getItem('tableSession')).toBeNull();
    expect(localStorage.getItem('tableSessionToken')).toBeNull();
    expect(mocks.notify).toHaveBeenCalledTimes(1);
  });

  it('fechamento de outra sessão ou mesa não encerra o acesso atual', async () => {
    mocks.getCurrentSession.mockResolvedValue({ id: 31, tableId: 91, sessionStatus: 'OPEN' });
    await act(async () => root.render(<TableSessionProbe />));
    const onClosed = mocks.socketOn.mock.calls.find(
      ([event]) => event === 'table:session-closed',
    )?.[1];
    await act(async () => {
      onClosed({ sessionId: 32, tableId: 91 });
      onClosed({ sessionId: 31, tableId: 92 });
    });
    expect(container.querySelector('output')?.dataset.sessionActive).toBe('true');
    expect(localStorage.getItem('tableSessionToken')).toBe(storedSession.sessionToken);
    expect(mocks.notify).not.toHaveBeenCalled();
  });
});
