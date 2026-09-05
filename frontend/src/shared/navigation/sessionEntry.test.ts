import { beforeEach, describe, expect, it } from 'vitest';
import { rememberTenantSlug } from './authNavigation';
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

  it('consome o papel apenas uma vez para não transformar /login em entrypoint global permanente', () => {
    rememberSignedOutRole('FUNCIONARIO');
    expect(consumeSignedOutEntryUrl({ pathname: '/login' })).toBe('/restaurante-x/team');
    expect(consumeSignedOutEntryUrl({ pathname: '/login' })).toBe('/restaurante-x/login');
  });

  it('ignora papel vazio e usa o fluxo contextual padrão', () => {
    rememberSignedOutRole('');
    expect(consumeSignedOutEntryUrl({ pathname: '/login' })).toBe('/restaurante-x/login');
  });
});
