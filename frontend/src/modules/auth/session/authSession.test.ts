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
  });

  it('mantém o token somente em memória e persiste apenas o usuário', () => {
    persistAuthSession({ id: 7, role: 'ADMIN' }, 'access-token');
    expect(getAccessToken()).toBe('access-token');
    expect(getAuthSessionUserId()).toBe(7);
    expect(localStorage.getItem('token')).toBeNull();
    expect(JSON.parse(localStorage.getItem('user') || 'null')).toEqual({ id: 7, role: 'ADMIN' });
  });

  it('invalida apenas a credencial em memória quando outra aba muda a conta', () => {
    persistAuthSession({ id: 7, role: 'ADMIN' }, 'access-token');

    invalidateAuthSessionMemory();

    expect(getAccessToken()).toBeNull();
    expect(getAuthSessionUserId()).toBeNull();
    expect(JSON.parse(localStorage.getItem('user') || 'null')).toEqual({
      id: 7,
      role: 'ADMIN',
    });
  });

  it('remove toda a sessão sem apagar o e-mail lembrado', () => {
    localStorage.setItem('token', 'access-token');
    localStorage.setItem('user', '{}');
    localStorage.setItem('refreshToken', 'refresh-token');
    localStorage.setItem('rememberedEmail', 'cliente@email.com');

    clearAuthSession();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('rememberedEmail')).toBe('cliente@email.com');
  });

  it('apaga tokens legados do Web Storage mesmo quando consulta a memória', () => {
    localStorage.setItem('token', 'legacy-access-token');
    localStorage.setItem('refreshToken', 'legacy-refresh-token');

    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
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
