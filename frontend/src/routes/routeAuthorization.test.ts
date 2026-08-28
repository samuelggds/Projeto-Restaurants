import { describe, expect, it } from 'vitest';
import { authorizeRoute } from './routeAuthorization';

const allowed = (path: string, user: Parameters<typeof authorizeRoute>[1]) =>
  authorizeRoute(path, user).allowed;

describe('política de autorização de rotas', () => {
  it('mantém Home e QR públicos, mas protege tracking', () => {
    for (const path of ['/', '/mesa/12', '/pizzaria', '/pizzaria/mesa/12'])
      expect(allowed(path, null), path).toBe(true);
    expect(authorizeRoute('/orders/42/tracking', null)).toEqual({
      allowed: false,
      redirectTo: '/login',
    });
  });
  it('limita CLIENTE a Home, cardápio, perfil e tracking', () => {
    const user = { role: 'CLIENTE' };
    for (const path of ['/', '/loja/mesa/3', '/profile', '/orders/a/tracking'])
      expect(allowed(path, user), path).toBe(true);
    expect(authorizeRoute('/admin', user)).toEqual({ allowed: false, redirectTo: '/' });
  });
  it('permite todos os módulos operacionais ao ADMIN, menos super_admin', () => {
    const user = { role: 'ADMIN' };
    for (const path of [
      '/',
      '/admin',
      '/billing',
      '/profile',
      '/orders/1/tracking',
      '/courier',
      '/kitchen',
      '/waiter',
    ])
      expect(allowed(path, user), path).toBe(true);
    expect(authorizeRoute('/super_admin', user)).toEqual({ allowed: false, redirectTo: '/admin' });
  });
  it('mantém SUPER_ADMIN exclusivamente em super_admin', () => {
    const user = { role: 'SUPER_ADMIN' };
    expect(allowed('/super_admin/restaurantes', user)).toBe(true);
    expect(authorizeRoute('/', user)).toEqual({ allowed: false, redirectTo: '/super_admin' });
    expect(allowed('/admin', user)).toBe(false);
  });
  it('isola qualquer conta com troca de senha obrigatória na página dedicada', () => {
    for (const role of ['SUPER_ADMIN', 'ADMIN']) {
      const user = { role, mustChangePassword: true };
      expect(authorizeRoute('/change-password', user)).toEqual({ allowed: true });
      expect(authorizeRoute(role === 'SUPER_ADMIN' ? '/super_admin' : '/admin', user)).toEqual({
        allowed: false,
        redirectTo: '/change-password',
      });
    }
    expect(authorizeRoute('/change-password', null)).toEqual({
      allowed: false,
      redirectTo: '/login',
    });
  });
  it('isola motoqueiro, cozinha e garçom', () => {
    const cases = [
      [{ role: 'MOTOQUEIRO' }, '/courier', '/admin'],
      [{ role: 'FUNCIONARIO', subRole: 'COZINHA' }, '/kitchen', '/waiter'],
      [{ role: 'FUNCIONARIO', subRole: 'GARCOM' }, '/waiter', '/kitchen'],
    ] as const;
    for (const [user, own, other] of cases) {
      expect(allowed(own, user)).toBe(true);
      expect(allowed(other, user)).toBe(false);
      expect(allowed('/', user)).toBe(false);
    }
  });
  it('manda perfil desconhecido para login', () => {
    expect(authorizeRoute('/admin', { role: 'OUTRO' })).toEqual({
      allowed: false,
      redirectTo: '/login',
    });
  });
});
