import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  refreshAccessToken: vi.fn(),
  disconnectSocket: vi.fn(),
}));

vi.mock('../Services/api', () => ({
  default: { get: mocks.get, post: mocks.post },
  refreshAccessToken: mocks.refreshAccessToken,
  AuthSessionIdentityChangedError: class AuthSessionIdentityChangedError extends Error {},
}));
vi.mock('../Services/systemBlock', () => ({ clearSystemBlockState: vi.fn() }));
vi.mock('../Services/socketService', () => ({ disconnectSocket: mocks.disconnectSocket }));

import { AuthProvider, useAuth } from './authContext';
import { AuthSessionIdentityChangedError } from '../Services/api';
import {
  applyRefreshedAccessToken,
  clearAuthSession,
  getAccessToken,
  getAuthSessionRevision,
} from '../modules/auth/session/authSession';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function AuthProbe() {
  const { user, isLoading } = useAuth();
  return (
    <div data-loading={String(isLoading)} data-user-id={user?.id || ''}>
      {user?.name || 'anonymous'}:{user?.role || 'none'}
    </div>
  );
}

async function flushUntil(condition: () => boolean) {
  for (let attempt = 0; attempt < 30 && !condition(); attempt += 1) {
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 1));
    });
  }
}

describe('AuthProvider bootstrap', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    clearAuthSession();
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('restaura a sessão pelo refresh HttpOnly antes de consultar o usuário', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 7, name: 'Cached', role: 'admin' }));
    mocks.refreshAccessToken.mockImplementation(async () => {
      const revision = getAuthSessionRevision();
      if (!applyRefreshedAccessToken('restored-token', revision, 7)) throw new Error('stale');
      return 'restored-token';
    });
    mocks.get.mockResolvedValue({
      data: { user: { id: 7, name: 'Remote', role: 'admin', phone: '85999990000' } },
    });

    await act(async () =>
      root.render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>,
      ),
    );
    await flushUntil(() => container.textContent?.includes('Remote:ADMIN') === true);

    expect(mocks.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(mocks.get).toHaveBeenCalledWith('/auth/me');
    expect(container.firstElementChild?.getAttribute('data-loading')).toBe('false');
    expect(getAccessToken()).toBe('restored-token');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('remove o usuário em cache quando o cookie de refresh não é aceito', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 7, name: 'Cached', role: 'ADMIN' }));
    mocks.refreshAccessToken.mockRejectedValue(new Error('unauthorized'));

    await act(async () =>
      root.render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>,
      ),
    );
    await flushUntil(() => container.firstElementChild?.getAttribute('data-loading') === 'false');

    expect(container.textContent).toBe('anonymous:none');
    expect(mocks.get).not.toHaveBeenCalled();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('não apaga o usuário compartilhado quando outra aba troca a conta do cookie', async () => {
    const cachedUser = { id: 7, name: 'Cached', role: 'ADMIN' };
    localStorage.setItem('user', JSON.stringify(cachedUser));
    mocks.refreshAccessToken.mockRejectedValue(new AuthSessionIdentityChangedError());

    await act(async () =>
      root.render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>,
      ),
    );
    await flushUntil(() => container.firstElementChild?.getAttribute('data-loading') === 'false');

    expect(container.textContent).toBe('anonymous:none');
    expect(localStorage.getItem('user')).toBe(JSON.stringify(cachedUser));
    expect(getAccessToken()).toBeNull();
  });
});
