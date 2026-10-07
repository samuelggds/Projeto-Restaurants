import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAuthSession,
  getAccessToken,
  persistAuthSession,
} from '../modules/auth/session/authSession';
import api, { refreshAccessToken } from './api';

function successfulResponse(config: AxiosRequestConfig): AxiosResponse {
  return {
    data: { ok: true },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: config as AxiosResponse['config'],
  };
}

describe('api auth session', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearAuthSession();
    localStorage.clear();
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'locks');
    vi.unstubAllGlobals();
  });

  it.each([
    ['ADMIN', 'BILLING_BLOCKED', false, true],
    [' admin ', 'BILLING_BLOCKED', false, true],
    ['SUPER_ADMIN', 'BILLING_BLOCKED', false, false],
    ['SUPER_ADMIN', 'RESTAURANT_ACCESS_BLOCKED', false, false],
    ['ADMIN', 'RESTAURANT_ACCESS_BLOCKED', true, true],
    ['GARCOM', 'BILLING_BLOCKED', true, true],
    ['CLIENTE', 'BILLING_BLOCKED', true, true],
  ])('preserva a navegação de %s ao receber %s', async (role, code, redirects, storesBlock) => {
    const assign = vi.fn();
    vi.stubGlobal('window', {
      location: {
        hostname: 'localhost',
        protocol: 'http:',
        pathname: '/admin',
        assign,
      },
      localStorage,
      dispatchEvent: vi.fn(),
    });
    persistAuthSession({ id: 7, role, restaurantId: 11 }, 'memory-token');
    localStorage.setItem('user', JSON.stringify({ id: 8, role: 'CLIENTE', restaurantId: 22 }));

    await expect(
      api.get('/orders', {
        adapter: async (config) => {
          throw new AxiosError('Forbidden', 'ERR_BAD_REQUEST', config, undefined, {
            data: { code },
            status: 403,
            statusText: 'Forbidden',
            headers: {},
            config,
          });
        },
      }),
    ).rejects.toMatchObject({ response: { status: 403 } });

    expect(assign.mock.calls).toEqual(redirects ? [['/system-maintenance']] : []);
    const block = JSON.parse(localStorage.getItem('system_block_state') || 'null');
    expect(Boolean(block)).toBe(storesBlock);
    if (storesBlock) expect(block.restaurantId).toBe(11);
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('prioriza o proxy same-origin do Vite em desenvolvimento', () => {
    expect(api.defaults.baseURL).toBe(`${window.location.origin}/api`);
  });

  it('serializa a rotação do cookie de refresh entre abas quando Web Locks está disponível', async () => {
    persistAuthSession({ id: 7 }, 'expired-token');
    const request = vi.fn(async (_name, options, callback) => {
      expect(options).toEqual({ mode: 'exclusive' });
      return callback();
    });
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request },
    });
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { accessToken: 'rotated-token', userId: 7 },
    });

    await expect(refreshAccessToken()).resolves.toBe('rotated-token');

    expect(request).toHaveBeenCalledWith(
      'pizza-ia-auth-refresh',
      { mode: 'exclusive' },
      expect.any(Function),
    );
  });

  it('envia o token mantido em memória e elimina uma cópia legada', async () => {
    persistAuthSession({ id: 7 }, 'memory-token');
    localStorage.setItem('token', 'legacy-token');
    let authorization: unknown;

    await api.get('/test-memory-token', {
      adapter: async (config) => {
        authorization = config.headers?.Authorization;
        return successfulResponse(config);
      },
    });

    expect(authorization).toBe('Bearer memory-token');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('não repete em outro endereço uma operação marcada como não repetível', async () => {
    const originalBaseURL = api.defaults.baseURL;
    let attempts = 0;

    try {
      await expect(
        api.post(
          '/image-enhancement/banner',
          { imageDataUrl: 'data:image/webp;base64,original' },
          {
            skipBaseUrlFallback: true,
            adapter: async (config) => {
              attempts += 1;
              throw new AxiosError('timeout', 'ECONNABORTED', config);
            },
          },
        ),
      ).rejects.toMatchObject({ code: 'ECONNABORTED' });

      expect(attempts).toBe(1);
      expect(api.defaults.baseURL).toBe(originalBaseURL);
    } finally {
      api.defaults.baseURL = originalBaseURL;
    }
  });

  it('compartilha uma única renovação concorrente e mantém o novo token fora do storage', async () => {
    persistAuthSession({ id: 7 }, 'expired-token');
    let resolveRefresh:
      ((value: { data: { accessToken: string; userId: number } }) => void) | undefined;
    const refreshResponse = new Promise<{ data: { accessToken: string; userId: number } }>(
      (resolve) => {
        resolveRefresh = resolve;
      },
    );
    const post = vi.spyOn(axios, 'post').mockReturnValue(refreshResponse);

    const firstRefresh = refreshAccessToken();
    const secondRefresh = refreshAccessToken();
    resolveRefresh?.({ data: { accessToken: 'rotated-token', userId: 7 } });

    await expect(firstRefresh).resolves.toBe('rotated-token');
    await expect(secondRefresh).resolves.toBe('rotated-token');
    expect(post).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe('rotated-token');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('descarta o resultado de um refresh iniciado antes de uma nova sessão', async () => {
    persistAuthSession({ id: 7 }, 'old-token');
    let resolveRefresh:
      ((value: { data: { accessToken: string; userId: number } }) => void) | undefined;
    vi.spyOn(axios, 'post').mockReturnValue(
      new Promise<{ data: { accessToken: string; userId: number } }>((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    const staleRefresh = refreshAccessToken();
    persistAuthSession({ id: 8 }, 'new-login-token');
    resolveRefresh?.({ data: { accessToken: 'stale-rotated-token', userId: 7 } });

    await expect(staleRefresh).rejects.toThrow('Sua sessão foi atualizada em outra aba');
    expect(getAccessToken()).toBe('new-login-token');
  });

  it('não aplica token renovado para outra conta que assumiu o cookie em outra aba', async () => {
    persistAuthSession({ id: 7 }, 'account-seven-token');
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { accessToken: 'account-eight-token', userId: 8 },
    });

    await expect(refreshAccessToken()).rejects.toThrow('A conta conectada mudou em outra aba');

    expect(getAccessToken()).toBe('account-seven-token');
  });

  it('não envia sessão de mesa antiga em delivery ou retirada', async () => {
    localStorage.setItem(
      'tableSession',
      JSON.stringify({ sessionToken: 'table-session-token', restaurantId: 99 }),
    );
    localStorage.setItem('tableSessionToken', 'table-session-token');

    const captured: Array<{ url?: string; tableSession?: unknown }> = [];
    const adapter = async (config: AxiosRequestConfig) => {
      captured.push({
        url: config.url,
        tableSession: config.headers?.['x-session-token'],
      });
      return successfulResponse(config);
    };

    await api.post('/orders/address-location', { restaurantId: 7, type: 'DELIVERY' }, { adapter });
    await api.post(
      '/orders/quote',
      { restaurantId: 7, type: 'DELIVERY', items: [{ productId: 1, quantity: 1 }] },
      { adapter },
    );
    await api.post(
      '/orders/quote',
      { restaurantId: 7, type: 'RETIRADA', items: [{ productId: 1, quantity: 1 }] },
      { adapter },
    );

    expect(captured).toEqual([
      { url: '/orders/address-location', tableSession: undefined },
      { url: '/orders/quote', tableSession: undefined },
      { url: '/orders/quote', tableSession: undefined },
    ]);
  });

  it('envia sessão de mesa somente em fluxos de mesa', async () => {
    localStorage.setItem(
      'tableSession',
      JSON.stringify({ sessionToken: 'table-session-token', restaurantId: 7 }),
    );
    localStorage.setItem('tableSessionToken', 'table-session-token');

    const captured: Array<{ url?: string; tableSession?: unknown }> = [];
    const adapter = async (config: AxiosRequestConfig) => {
      captured.push({
        url: config.url,
        tableSession: config.headers?.['x-session-token'],
      });
      return successfulResponse(config);
    };

    await api.post(
      '/orders/quote',
      { restaurantId: 7, type: 'MESA', tableId: 3, items: [{ productId: 1, quantity: 1 }] },
      { adapter },
    );
    await api.get('/table-sessions/current', { adapter });

    expect(captured).toEqual([
      { url: '/orders/quote', tableSession: 'table-session-token' },
      { url: '/table-sessions/current', tableSession: 'table-session-token' },
    ]);
  });
});
