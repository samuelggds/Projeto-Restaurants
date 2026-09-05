import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildAuthEntryUrl,
  buildAuthEntryUrlForLocation,
  buildLoginUrl,
  buildSessionEntryUrl,
  getCurrentReturnPath,
  getSafeAuthSearchParams,
  getSafeNextPath,
  isAuthenticationEntryPath,
  rememberTenantSlug,
  resolveAuthExperience,
  TENANT_REQUIRED_PATH,
} from './authNavigation';

describe('authNavigation', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

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
    '/%252f%252fevil.com',
    '/%255cevil.com',
    '/seguro?valor=%0aexterno',
    '/seguro?valor=%250dexterno',
    '/seguro#%00externo',
    ' /seguro',
    '/seguro ',
  ])('rejeita destino externo ou ambíguo %s', (value) => {
    expect(getSafeNextPath(value)).toBe('');
  });

  it.each(['/seguro\n', '/seguro?valor=linha\rquebrada', '/seguro#\u007f'])(
    'rejeita caracteres de controle literais em qualquer parte de %j',
    (value) => {
      expect(getSafeNextPath(value)).toBe('');
    },
  );

  it.each([
    '/',
    '/mesa/5',
    '/login',
    '/login?next=/restaurante-x',
    '/LOGIN/',
    '/register',
    '/recover-password',
    '/change-password',
    '/admin/login',
    '/super_admin/login',
    '/restaurante-x/login',
    '/restaurante-x/register',
    '/restaurante-x/recover-password',
    '/restaurante-x/team',
    '/restaurante-x/admin/chave',
  ])('rejeita rota sem tenant ou de autenticação %s como retorno', (value) => {
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
    expect(buildLoginUrl({ pathname: value })).toBe(TENANT_REQUIRED_PATH);
  });

  it('mantém o slug e o retorno seguro na URL do login quando o cliente entra pelo restaurante', () => {
    const loginUrl = buildLoginUrl({ pathname: '/restaurante-x' });
    expect(loginUrl.startsWith('/restaurante-x/login?next=')).toBe(true);
    expect(new URLSearchParams(loginUrl.split('?')[1]).get('next')).toBe('/restaurante-x');
  });

  it('não inventa tenant quando a origem não possui slug', () => {
    expect(buildLoginUrl({ pathname: '/' })).toBe(TENANT_REQUIRED_PATH);
    expect(buildAuthEntryUrl('/login', new URLSearchParams())).toBe(TENANT_REQUIRED_PATH);
  });

  it('mantém o slug e o retorno completo quando o login começa em uma mesa', () => {
    const location = {
      pathname: '/restaurante-x/mesa/5',
      search: '?rid=1&tk=ABC123',
      hash: '#bebidas',
    };

    expect(getCurrentReturnPath(location)).toBe('/restaurante-x/mesa/5?rid=1&tk=ABC123#bebidas');
    const loginUrl = buildLoginUrl(location);
    expect(loginUrl.startsWith('/restaurante-x/login?next=')).toBe(true);
    expect(new URLSearchParams(loginUrl.split('?')[1]).get('next')).toBe(
      '/restaurante-x/mesa/5?rid=1&tk=ABC123#bebidas',
    );
  });

  it('monta cadastro contextual sem dupla codificação', () => {
    const location = {
      pathname: '/restaurante-x/mesa/5',
      search: '?rid=1&tk=ABC%20123',
      hash: '#minha-conta',
    };
    const expected = '/restaurante-x/mesa/5?rid=1&tk=ABC%20123#minha-conta';
    const url = buildAuthEntryUrlForLocation('/register', location);
    const params = new URLSearchParams(url.split('?')[1]);

    expect(url.startsWith('/restaurante-x/register?next=')).toBe(true);
    expect(params.get('next')).toBe(expected);
  });

  it('resolve contexto TABLE apenas quando a mesa também possui slug', () => {
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

  it('propaga somente contexto seguro e cria URL de auth com slug', () => {
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
    expect(registerUrl.startsWith('/restaurante-x/register?')).toBe(true);
    const registerParams = new URLSearchParams(registerUrl.split('?')[1]);
    expect(registerParams.get('next')).toBe('/restaurante-x/mesa/5?rid=1&tk=abc#bebidas');
    expect(registerParams.has('slug')).toBe(false);
  });

  it('não cria recuperação global com referências inválidas', () => {
    const params = new URLSearchParams({
      next: '//evil.com',
      rid: '-7',
      slug: '../admin',
    });

    expect(buildAuthEntryUrl('/recover-password', params)).toBe(TENANT_REQUIRED_PATH);
  });

  it('manda áreas operacionais para o portal da equipe do tenant lembrado', () => {
    rememberTenantSlug('restaurante-x');

    for (const pathname of ['/attendant', '/courier', '/kitchen', '/waiter']) {
      expect(buildSessionEntryUrl({ pathname })).toBe('/restaurante-x/team');
    }
  });

  it('manda áreas administrativas para o gate privado do tenant lembrado', () => {
    rememberTenantSlug('restaurante-x');

    expect(buildSessionEntryUrl({ pathname: '/admin' })).toBe('/restaurante-x/admin');
    expect(buildSessionEntryUrl({ pathname: '/billing' }, 'ADMIN')).toBe('/restaurante-x/admin');
  });

  it('mantém super admin isolado mesmo quando existe tenant lembrado', () => {
    rememberTenantSlug('restaurante-x');
    expect(buildSessionEntryUrl({ pathname: '/super_admin' })).toBe('/super_admin/login');
    expect(buildSessionEntryUrl({ pathname: '/profile' }, 'SUPER_ADMIN')).toBe('/super_admin/login');
  });

  it('manda cliente para login contextual e nunca preserva rota operacional', () => {
    rememberTenantSlug('restaurante-x');
    expect(buildSessionEntryUrl({ pathname: '/profile' }, 'CLIENTE')).toBe('/restaurante-x/login');
  });

  it.each([
    '/restaurante-x/login',
    '/restaurante-x/register',
    '/restaurante-x/recover-password',
    '/restaurante-x/team',
    '/restaurante-x/admin',
    '/restaurante-x/admin/chave',
    '/super_admin/login',
  ])('reconhece %s como entrypoint de autenticação', (pathname) => {
    expect(isAuthenticationEntryPath(pathname)).toBe(true);
  });
});
