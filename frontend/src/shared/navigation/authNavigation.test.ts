import { describe, expect, it } from 'vitest';
import { buildLoginUrl, getCurrentReturnPath, getSafeNextPath } from './authNavigation';

describe('authNavigation', () => {
  it.each([
    ['/restaurante-x', '/restaurante-x'],
    ['/restaurante-x?foo=bar', '/restaurante-x?foo=bar'],
    ['/restaurante-x/mesa/5?rid=1&tk=abc', '/restaurante-x/mesa/5?rid=1&tk=abc'],
    ['/restaurante-x/mesa/5?rid=1&tk=abc#menu', '/restaurante-x/mesa/5?rid=1&tk=abc#menu'],
    ['/profile', '/profile'],
  ])('aceita e preserva a rota interna %s', (value, expected) => {
    expect(getSafeNextPath(value)).toBe(expected);
  });

  it.each([
    'https://evil.com',
    'http://evil.com',
    '//evil.com',
    '\\evil.com',
    '/\\evil.com',
    '/%2f%2fevil.com',
    '/%5cevil.com',
    'javascript:alert(1)',
    'data:text/html,<h1>evil</h1>',
  ])('rejeita destino externo ou ambíguo %s', (value) => {
    expect(getSafeNextPath(value)).toBe('');
  });

  it.each([
    '/login',
    '/login?next=/restaurante-x',
    '/LOGIN/',
    '/register',
    '/recover-password',
    '/change-password',
    '/super_admin/login',
    '/restaurante-x/login',
  ])('rejeita rota de autenticação %s para evitar loop', (value) => {
    expect(getSafeNextPath(value)).toBe('');
  });

  it('compõe pathname, search e hash sem perder o contexto', () => {
    const location = {
      pathname: '/restaurante-x/mesa/5',
      search: '?rid=1&tk=ABC123',
      hash: '#bebidas',
    };

    expect(getCurrentReturnPath(location)).toBe('/restaurante-x/mesa/5?rid=1&tk=ABC123#bebidas');
    expect(new URLSearchParams(buildLoginUrl(location).split('?')[1]).get('next')).toBe(
      '/restaurante-x/mesa/5?rid=1&tk=ABC123#bebidas',
    );
  });
});
