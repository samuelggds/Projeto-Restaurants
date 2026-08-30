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

    await expect(staleRefresh).rejects.toThrow('sessão mudou');
    expect(getAccessToken()).toBe('new-login-token');
  });

  it('não aplica token renovado para outra conta que assumiu o cookie em outra aba', async () => {
    persistAuthSession({ id: 7 }, 'account-seven-token');
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { accessToken: 'account-eight-token', userId: 8 },
    });

    await expect(refreshAccessToken()).rejects.toThrow('conta autenticada mudou');

    expect(getAccessToken()).toBe('account-seven-token');
  });
});
