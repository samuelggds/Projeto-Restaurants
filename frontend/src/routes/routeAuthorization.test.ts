import { describe, expect, it } from 'vitest';
import { authorizeRoute, TENANT_LOGIN_REDIRECT } from './routeAuthorization';
import { TENANT_REQUIRED_PATH } from '../shared/navigation/authNavigation';

const allowed = (path: string, user: Parameters<typeof authorizeRoute>[1]) =>
  authorizeRoute(path, user).allowed;

describe('política de autorização de rotas', () => {
  it('mantém apenas entradas públicas com slug e acesso seguro por pedido', () => {
    for (const path of [
      '/pizzaria',
      '/pizzaria/mesa/12',
      '/pizzaria/login',
      '/pizzaria/register',
      '/pizzaria/recover-password',
      '/pizzaria/team',
      '/pizzaria/admin',
      '/orders/42/tracking',
      '/orders/42/chat',
      TENANT_REQUIRED_PATH,
    ])
      expect(allowed(path, null), path).toBe(true);

    for (const path of ['/', '/mesa/12', '/login', '/register', '/recover-password', '/pizzaria/equipe']) {
      expect(authorizeRoute(path, null), path).toEqual({
        allowed: false,
        redirectTo: TENANT_LOGIN_REDIRECT,
      });
    }

    for (const path of ['/orders/qualquer/tracking', '/orders/qualquer/chat']) {
      expect(authorizeRoute(path, null)).toEqual({
        allowed: false,
        redirectTo: TENANT_LOGIN_REDIRECT,
      });
    }
  });

  it('limita CLIENTE ao tenant público, perfil, tracking e chat do pedido', () => {
    const user = { role: 'CLIENTE' };
    for (const path of ['/loja', '/loja/mesa/3', '/profile', '/orders/a/tracking', '/orders/42/chat'])
      expect(allowed(path, user), path).toBe(true);
    expect(authorizeRoute('/admin', user)).toEqual({
      allowed: false,
      redirectTo: TENANT_REQUIRED_PATH,
    });
  });

  it('permite todos os módulos operacionais ao ADMIN, menos super_admin', () => {
    const user = { role: 'ADMIN' };
    for (const path of [
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
    expect(authorizeRoute('/pizzaria', user)).toEqual({ allowed: false, redirectTo: '/super_admin' });
    expect(allowed('/admin', user)).toBe(false);
  });

  it('encaminha visitante do painel diretamente ao login técnico', () => {
    expect(authorizeRoute('/super_admin', null)).toEqual({
      allowed: false,
      redirectTo: '/super_admin/login',
    });
    expect(authorizeRoute('/super_admin/restaurantes', null)).toEqual({
      allowed: false,
      redirectTo: '/super_admin/login',
    });
    expect(authorizeRoute('/super_admin/login', null)).toEqual({ allowed: true });
  });

  it('redireciona usuário já autenticado para a própria área ao tentar outro portal', () => {
    expect(authorizeRoute('/pizzaria/admin', { role: 'ADMIN' })).toEqual({
      allowed: false,
      redirectTo: '/admin',
    });
    expect(authorizeRoute('/pizzaria/team', { role: 'FUNCIONARIO', subRole: 'GARCOM' })).toEqual({
      allowed: false,
      redirectTo: '/waiter',
    });
    expect(authorizeRoute('/pizzaria/login', { role: 'CLIENTE' })).toEqual({
      allowed: false,
      redirectTo: TENANT_REQUIRED_PATH,
    });
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
      redirectTo: TENANT_LOGIN_REDIRECT,
    });
  });

  it('isola motoqueiro, cozinha, garçom e atendente', () => {
    const cases = [
      [{ role: 'MOTOQUEIRO' }, '/courier', '/admin'],
      [{ role: 'FUNCIONARIO', subRole: 'COZINHA' }, '/kitchen', '/waiter'],
      [{ role: 'FUNCIONARIO', subRole: 'GARCOM' }, '/waiter', '/kitchen'],
      [{ role: 'FUNCIONARIO', subRole: 'ATENDENTE' }, '/attendant', '/waiter'],
    ] as const;
    for (const [user, own, other] of cases) {
      expect(allowed(own, user)).toBe(true);
      expect(allowed(other, user)).toBe(false);
      expect(allowed('/pizzaria', user)).toBe(false);
    }
    expect(allowed('/orders/42/chat', { role: 'MOTOQUEIRO' })).toBe(true);
  });

  it('reserva a rota de atendimento exclusivamente ao atendente', () => {
    expect(allowed('/attendant', { role: 'FUNCIONARIO', subRole: 'ATENDENTE' })).toBe(true);
    for (const user of [
      { role: 'ADMIN' },
      { role: 'SUPER_ADMIN' },
      { role: 'MOTOQUEIRO' },
      { role: 'CLIENTE' },
      { role: 'FUNCIONARIO', subRole: 'COZINHA' },
      { role: 'FUNCIONARIO', subRole: 'GARCOM' },
    ]) {
      expect(allowed('/attendant', user), JSON.stringify(user)).toBe(false);
    }
  });

  it('manda perfil desconhecido para resolução explícita de tenant', () => {
    expect(authorizeRoute('/admin', { role: 'OUTRO' })).toEqual({
      allowed: false,
      redirectTo: TENANT_LOGIN_REDIRECT,
    });
  });

  it('não cria login global para funcionário sem subcargo', () => {
    const legacyEmployee = { role: 'FUNCIONARIO', subRole: null };

    expect(authorizeRoute('/pizzaria/team', legacyEmployee)).toEqual({
      allowed: false,
      redirectTo: TENANT_REQUIRED_PATH,
    });
    expect(authorizeRoute('/attendant', legacyEmployee)).toEqual({
      allowed: false,
      redirectTo: TENANT_REQUIRED_PATH,
    });
  });
});
