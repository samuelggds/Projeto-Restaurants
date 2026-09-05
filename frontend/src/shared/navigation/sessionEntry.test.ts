import { beforeEach, describe, expect, it } from 'vitest';
import { rememberTenantSlug, TENANT_REQUIRED_PATH } from './authNavigation';
import { consumeSignedOutEntryUrl, rememberSignedOutRole } from './sessionEntry';

describe('sessionEntry', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    rememberTenantSlug('restaurante-x');
  });

  it.each([
    ['FUNCIONARIO', '/restaurante-x/team'],
    ['MOTOQUEIRO', '/restaurante-x/team'],
    ['ADMIN', '/restaurante-x/admin'],
    ['CLIENTE', '/restaurante-x/login'],
    ['SUPER_ADMIN', '/super_admin/login'],
  ])('recupera o portal correto após logout de %s', (role, expected) => {
    rememberSignedOutRole(role);
    expect(consumeSignedOutEntryUrl({ pathname: '/login' })).toBe(expected);
  });

  it('consome o papel apenas uma vez e volta a neutralizar /login', () => {
    rememberSignedOutRole('FUNCIONARIO');
    expect(consumeSignedOutEntryUrl({ pathname: '/login' })).toBe('/restaurante-x/team');
    expect(consumeSignedOutEntryUrl({ pathname: '/login' })).toBe(TENANT_REQUIRED_PATH);
  });

  it('não usa o tenant lembrado quando não existe marcador de logout válido', () => {
    rememberSignedOutRole('');
    expect(consumeSignedOutEntryUrl({ pathname: '/login' })).toBe(TENANT_REQUIRED_PATH);
  });
});
