import { beforeEach, describe, expect, it } from 'vitest';
import {
  persistTenantSlug,
  restoreTenantRouteContext,
  tenantRouteStorageKeys,
} from './tenantRouteContext';

describe('tenantRouteContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('persiste somente o slug público quando abre um link administrativo', () => {
    const secret = 'nao-deve-ser-persistido';
    const slug = restoreTenantRouteContext(`/north-pizza/admin/${secret}`);

    expect(slug).toBe('north-pizza');
    expect(window.sessionStorage.getItem(tenantRouteStorageKeys.session)).toBe('north-pizza');
    expect(window.localStorage.getItem(tenantRouteStorageKeys.persistent)).toBe('north-pizza');
    expect(JSON.stringify(window.localStorage)).not.toContain(secret);
  });

  it('recupera o tenant persistido ao abrir uma rota operacional em outra aba', () => {
    persistTenantSlug('north-pizza');
    window.sessionStorage.clear();

    expect(restoreTenantRouteContext('/kitchen')).toBe('north-pizza');
    expect(window.sessionStorage.getItem(tenantRouteStorageKeys.session)).toBe('north-pizza');
  });

  it('não trata rotas reservadas como slug de restaurante', () => {
    expect(restoreTenantRouteContext('/kitchen')).toBe('');
    expect(window.localStorage.getItem(tenantRouteStorageKeys.persistent)).toBeNull();
  });

  it('troca o tenant persistido quando uma URL explícita aponta para outro restaurante', () => {
    persistTenantSlug('north-pizza');

    expect(restoreTenantRouteContext('/sushi-house/login')).toBe('sushi-house');
    expect(window.localStorage.getItem(tenantRouteStorageKeys.persistent)).toBe('sushi-house');
  });
});
