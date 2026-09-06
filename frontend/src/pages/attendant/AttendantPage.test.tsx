import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getWorkspace: vi.fn(),
  getPublicSettings: vi.fn(),
  navigate: vi.fn(),
  logout: vi.fn(),
  release: vi.fn(),
  listeners: new Map<string, () => void>(),
  latestProps: null as Record<string, unknown> | null,
  socket: {
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('../../contexts/authContext', () => ({
  useAuth: () => ({
    user: {
      id: 12,
      name: 'Ana Atendente',
      role: 'FUNCIONARIO',
      subRole: 'ATENDENTE',
      restaurantId: 7,
    },
    logout: mocks.logout,
  }),
}));
vi.mock('../../modules/auth/session/authSession', () => ({
  getAccessToken: () => 'attendant-token',
}));
vi.mock('../../Services/socketService', () => ({
  acquireSocket: () => ({ socket: mocks.socket, release: mocks.release }),
}));
vi.mock('../../Services/restaurantSettingsService', () => ({
  default: { getPublicSettings: mocks.getPublicSettings },
}));
vi.mock('./attendantApi', () => ({
  default: { getWorkspace: mocks.getWorkspace },
}));
vi.mock('./AttendantOperationCenter', () => ({
  AttendantOperationCenter: (props: Record<string, unknown>) => {
    mocks.latestProps = props;
    return <div data-testid="attendant-operation-center" />;
  },
}));

import AttendantPage from './AttendantPage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot = {
  generatedAt: '2026-09-02T18:10:00.000Z',
  orders: [],
  calls: [],
  tables: [],
};

describe('AttendantPage data integration', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mocks.listeners.clear();
    mocks.latestProps = null;
    mocks.getWorkspace.mockResolvedValue(snapshot);
    mocks.getPublicSettings.mockResolvedValue({
      restaurant: { name: 'Pizzaria Teste', slug: 'pizzaria-teste' },
      primaryColor: '#e16a3d',
    });
    mocks.socket.on.mockImplementation((event: string, listener: () => void) => {
      mocks.listeners.set(event, listener);
      return mocks.socket;
    });
    mocks.socket.off.mockImplementation(() => mocks.socket);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  async function renderPage() {
    await act(async () => {
      root.render(<AttendantPage />);
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('carrega o snapshot dedicado, identifica o atendente e assina invalidações operacionais', async () => {
    await renderPage();

    expect(mocks.getWorkspace).toHaveBeenCalledTimes(1);
    expect(mocks.listeners.has('attendant:workspace-invalidated')).toBe(true);
    expect(mocks.listeners.has('order:issue-message')).toBe(true);
    expect(mocks.listeners.has('order:issue-resolved')).toBe(true);
    expect(mocks.latestProps?.snapshot).toEqual(snapshot);
    expect(mocks.latestProps?.attendantName).toBe('Ana Atendente');
    expect(mocks.latestProps?.attendantId).toBe(12);
    expect(mocks.latestProps?.restaurantId).toBe(7);

    await act(async () => {
      mocks.listeners.get('attendant:workspace-invalidated')?.();
      vi.advanceTimersByTime(181);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.getWorkspace).toHaveBeenCalledTimes(2);
  });

  it('encerra a sessão e retorna ao portal tenant-scoped da equipe', async () => {
    await renderPage();

    act(() => {
      const onLogout = mocks.latestProps?.onLogout as (() => void) | undefined;
      onLogout?.();
    });

    expect(mocks.logout).toHaveBeenCalledOnce();
    expect(mocks.navigate).toHaveBeenCalledWith('/pizzaria-teste/team', { replace: true });
  });
});
