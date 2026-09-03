import { describe, expect, it } from 'vitest';
import {
  buildAuthEntryUrl,
  buildLoginUrl,
  getCurrentReturnPath,
  getSafeAuthSearchParams,
  getSafeNextPath,
  resolveAuthExperience,
} from './authNavigation';

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

  it.each([
    '/admin',
    '/attendant',
    '/attendant/orders',
    '/billing',
    '/courier',
    '/kitchen',
    '/super_admin',
    '/waiter',
  ])('não preserva área operacional %s como retorno de login', (value) => {
    expect(getSafeNextPath(value)).toBe('');
    expect(buildLoginUrl({ pathname: value })).toBe('/login');
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

  it('resolve contexto TABLE sem remover query ou hash do next', () => {
    const next = '/restaurante-x/mesa/12?rid=42&tk=abc#conta';
    const result = resolveAuthExperience(new URLSearchParams({ next }));

    expect(result).toEqual({
      context: 'TABLE',
      nextPath: next,
      restaurantSlug: 'restaurante-x',
      tableNumber: '12',
    });
  });

  it('resolve rota pública normal como ONLINE', () => {
    const next = '/restaurante-x?delivery=1#cardapio';
    expect(resolveAuthExperience(new URLSearchParams({ next }))).toEqual({
      context: 'ONLINE',
      nextPath: next,
      restaurantSlug: null,
      tableNumber: null,
    });
  });

  it('propaga entre telas de auth somente contexto seguro e necessário', () => {
    const params = new URLSearchParams({
      next: '/restaurante-x/mesa/5?rid=1&tk=abc#bebidas',
      rid: '1',
      slug: 'Restaurante-X',
      arbitrary: 'não-propagar',
      callbackUrl: 'https://evil.com',
    });

    const safe = getSafeAuthSearchParams(params);
    expect(safe.get('next')).toBe('/restaurante-x/mesa/5?rid=1&tk=abc#bebidas');
    expect(safe.get('rid')).toBe('1');
    expect(safe.get('slug')).toBe('restaurante-x');
    expect(safe.has('arbitrary')).toBe(false);
    expect(safe.has('callbackUrl')).toBe(false);

    const registerUrl = buildAuthEntryUrl('/register', params);
    const registerParams = new URLSearchParams(registerUrl.split('?')[1]);
    expect(registerParams.get('next')).toBe('/restaurante-x/mesa/5?rid=1&tk=abc#bebidas');
  });

  it('remove next inseguro e referências de restaurante malformadas', () => {
    const params = new URLSearchParams({
      next: '//evil.com',
      rid: '-7',
      slug: '../admin',
    });

    expect(buildAuthEntryUrl('/recover-password', params)).toBe('/recover-password');
  });
});
