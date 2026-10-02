import { describe, expect, it } from 'vitest';
import {
  authorizeRoute,
  shouldEndSuperAdminSession,
  TENANT_LOGIN_REDIRECT,
} from './routeAuthorization';
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
      '/recover-password',
      '/pizzaria/team',
      '/pizzaria/admin',
      '/orders/42/tracking',
      '/orders/42/chat',
      '/pizzaria/pedidos',
      '/pizzaria/termos',
      '/pizzaria/privacidade',
      '/pizzaria/cookies',
      TENANT_REQUIRED_PATH,
    ])
      expect(allowed(path, null), path).toBe(true);

    for (const path of [
      '/',
      '/mesa/12',
      '/login',
      '/register',
      '/pizzaria/equipe',
      '/__TENANT_LOGIN__',
    ]) {
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

  it('não trata raízes legais reservadas como slug de restaurante', () => {
    for (const path of ['/termos', '/privacidade', '/cookies']) {
      expect(allowed(path, null), path).toBe(false);
    }
    expect(allowed('/north-pizza/termos', null)).toBe(true);
    expect(allowed('/north-pizza/pedidos', null)).toBe(true);
  });

  it('mantém páginas legais do restaurante acessíveis para contas autenticadas', () => {
    const users = [
      { role: 'ADMIN' },
      { role: 'CLIENTE' },
      { role: 'FUNCIONARIO', subRole: 'GARCOM' },
      { role: 'FUNCIONARIO', subRole: 'ATENDENTE' },
    ];

    for (const user of users) {
      for (const path of [
        '/north-pizza/termos',
        '/north-pizza/privacidade',
        '/north-pizza/cookies',
      ]) {
        expect(authorizeRoute(path, user), `${user.role} ${path}`).toEqual({ allowed: true });
      }
    }
  });

  it('mantém visitante e CLIENTE na experiência pública do restaurante', () => {
    for (const path of ['/north-pizza', '/north-pizza/mesa/12', '/north-pizza/pedidos']) {
      expect(authorizeRoute(path, null)).toEqual({ allowed: true });
      expect(authorizeRoute(path, { role: 'CLIENTE' })).toEqual({ allowed: true });
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

  it('permite todos os módulos operacionais ao ADMIN, usando o perfil dedicado do painel', () => {
    const user = { role: 'ADMIN' };
    for (const path of [
      '/admin',
      '/admin/profile',
      '/billing',
      '/orders/1/tracking',
      '/courier',
      '/kitchen',
      '/waiter',
    ])
      expect(allowed(path, user), path).toBe(true);
    expect(authorizeRoute('/profile', user)).toEqual({
      allowed: false,
      redirectTo: '/admin/profile',
    });
    expect(authorizeRoute('/super_admin', user)).toEqual({ allowed: false, redirectTo: '/admin' });
  });

  it('não usa conta ADMIN como cliente do delivery e nunca acessa super_admin', () => {
    expect(authorizeRoute('/north-pizza', { role: 'ADMIN' })).toEqual({
      allowed: false,
      redirectTo: '/admin',
    });
    expect(authorizeRoute('/north-pizza/mesa/12', { role: 'ADMIN' })).toEqual({
      allowed: false,
      redirectTo: '/admin',
    });
    expect(authorizeRoute('/super_admin', { role: 'ADMIN' })).toEqual({
      allowed: false,
      redirectTo: '/admin',
    });
  });

  it('mantém SUPER_ADMIN exclusivamente em super_admin', () => {
    const user = { role: 'SUPER_ADMIN' };
    expect(allowed('/super_admin/restaurantes', user)).toBe(true);
    expect(authorizeRoute('/pizzaria', user)).toEqual({ allowed: false, redirectTo: '/super_admin' });
    expect(allowed('/admin', user)).toBe(false);
  });

  it('encerra a sessão SUPER_ADMIN ao sair do namespace técnico', () => {
    const user = { role: 'SUPER_ADMIN' };

    expect(shouldEndSuperAdminSession('/super_admin', user)).toBe(false);
    expect(shouldEndSuperAdminSession('/super_admin/restaurantes?tab=ativos', user)).toBe(false);
    expect(shouldEndSuperAdminSession('/pizzaria/admin/chave', user)).toBe(true);
    expect(shouldEndSuperAdminSession('/admin', user)).toBe(true);
    expect(shouldEndSuperAdminSession('/admin', { role: 'ADMIN' })).toBe(false);
    expect(shouldEndSuperAdminSession('/admin', null)).toBe(false);
  });

  it('preserva a sessão SUPER_ADMIN somente para a troca obrigatória de senha', () => {
    const user = { role: 'SUPER_ADMIN', mustChangePassword: true };

    expect(shouldEndSuperAdminSession('/change-password', user)).toBe(false);
    expect(shouldEndSuperAdminSession('/change-password/', user)).toBe(false);
    expect(shouldEndSuperAdminSession('/admin', user)).toBe(true);
    expect(authorizeRoute('/change-password', user)).toEqual({ allowed: true });
    expect(authorizeRoute('/super_admin', user)).toEqual({
      allowed: false,
      redirectTo: '/change-password',
    });
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

  it('mantém cada funcionário restrito ao próprio portal e fora do delivery/admin', () => {
    const cases = [
      [{ role: 'MOTOQUEIRO' }, '/courier', '/courier'],
      [{ role: 'FUNCIONARIO', subRole: 'COZINHA' }, '/kitchen', '/kitchen'],
      [{ role: 'FUNCIONARIO', subRole: 'GARCOM' }, '/waiter', '/waiter'],
      [{ role: 'FUNCIONARIO', subRole: 'ATENDENTE' }, '/attendant', '/attendant'],
    ] as const;

    for (const [user, own, home] of cases) {
      expect(allowed(own, user)).toBe(true);
      expect(authorizeRoute('/admin', user)).toEqual({ allowed: false, redirectTo: home });
      expect(authorizeRoute('/north-pizza', user)).toEqual({ allowed: false, redirectTo: home });
      expect(authorizeRoute('/north-pizza/mesa/12', user)).toEqual({
        allowed: false,
        redirectTo: home,
      });
      expect(authorizeRoute('/north-pizza/pedidos', user)).toEqual({
        allowed: false,
        redirectTo: home,
      });
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

  it('mantém perfil desconhecido fora dos painéis e do delivery autenticado', () => {
    expect(authorizeRoute('/admin', { role: 'OUTRO' })).toEqual({
      allowed: false,
      redirectTo: TENANT_REQUIRED_PATH,
    });
    expect(authorizeRoute('/north-pizza', { role: 'OUTRO' })).toEqual({
      allowed: false,
      redirectTo: TENANT_REQUIRED_PATH,
    });
  });

  it('não cria login global nem acesso ao delivery para funcionário sem subcargo', () => {
    const legacyEmployee = { role: 'FUNCIONARIO', subRole: null };

    expect(authorizeRoute('/pizzaria/team', legacyEmployee)).toEqual({
      allowed: false,
      redirectTo: TENANT_REQUIRED_PATH,
    });
    expect(authorizeRoute('/attendant', legacyEmployee)).toEqual({
      allowed: false,
      redirectTo: TENANT_REQUIRED_PATH,
    });
    expect(authorizeRoute('/pizzaria', legacyEmployee)).toEqual({
      allowed: false,
      redirectTo: TENANT_REQUIRED_PATH,
    });
  });
});
