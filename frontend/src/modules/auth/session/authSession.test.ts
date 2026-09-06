import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyRefreshedAccessToken,
  clearAuthSession,
  getAccessToken,
  getAuthSessionRevision,
  getAuthSessionUserId,
  invalidateAuthSessionMemory,
  isAuthSnapshotCurrent,
  persistAuthSession,
} from './authSession';

describe('authSession', () => {
  beforeEach(() => {
    clearAuthSession();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('mantém o token somente em memória e o usuário apenas na sessão do navegador', () => {
    persistAuthSession({ id: 7, role: 'ADMIN' }, 'access-token');
    expect(getAccessToken()).toBe('access-token');
    expect(getAuthSessionUserId()).toBe(7);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(JSON.parse(sessionStorage.getItem('user') || 'null')).toEqual({ id: 7, role: 'ADMIN' });
  });

  it('invalida a credencial em memória sem criar identidade persistente em localStorage', () => {
    persistAuthSession({ id: 7, role: 'ADMIN' }, 'access-token');

    invalidateAuthSessionMemory();

    expect(getAccessToken()).toBeNull();
    expect(getAuthSessionUserId()).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(JSON.parse(sessionStorage.getItem('user') || 'null')).toEqual({
      id: 7,
      role: 'ADMIN',
    });
  });

  it('remove toda a sessão e também dados legados do antigo lembrar de mim', () => {
    localStorage.setItem('token', 'access-token');
    localStorage.setItem('user', '{}');
    localStorage.setItem('refreshToken', 'refresh-token');
    localStorage.setItem('rememberedEmail', 'cliente@email.com');
    sessionStorage.setItem('user', JSON.stringify({ id: 7, role: 'ADMIN' }));

    clearAuthSession();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('rememberedEmail')).toBeNull();
    expect(sessionStorage.getItem('user')).toBeNull();
  });

  it('apaga tokens legados do Web Storage mesmo quando consulta a memória', () => {
    localStorage.setItem('token', 'legacy-access-token');
    localStorage.setItem('refreshToken', 'legacy-refresh-token');
    localStorage.setItem('rememberedEmail', 'legacy@email.com');

    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('rememberedEmail')).toBeNull();
  });

  it('não deixa um refresh antigo ressuscitar a sessão depois do logout', () => {
    const revisionBeforeRefresh = getAuthSessionRevision();
    clearAuthSession();

    expect(applyRefreshedAccessToken('stale-token', revisionBeforeRefresh)).toBe(false);
    expect(getAccessToken()).toBeNull();
  });

  it('vincula à memória a identidade devolvida no bootstrap por refresh', () => {
    const revision = getAuthSessionRevision();

    expect(applyRefreshedAccessToken('restored-token', revision, 12)).toBe(true);
    expect(getAccessToken()).toBe('restored-token');
    expect(getAuthSessionUserId()).toBe(12);
  });

  it('rejeita resposta de autenticação criada antes do logout', () => {
    expect(
      isAuthSnapshotCurrent({
        snapshotToken: 'token-antigo',
        currentToken: null,
        snapshotRevision: 0,
        currentRevision: 1,
      }),
    ).toBe(false);
  });
});
