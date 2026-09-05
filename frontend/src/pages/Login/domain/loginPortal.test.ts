import { describe, expect, it } from 'vitest';
import {
  canUseLoginPortal,
  getRestaurantSlugFromAuthPath,
  resolveLoginPortal,
} from './loginPortal';

describe('loginPortal', () => {
  it.each([
    ['/pizzaria/login', 'CUSTOMER'],
    ['/pizzaria/team', 'STAFF'],
    ['/pizzaria/admin', 'ADMIN'],
    ['/super_admin/login', 'SUPER_ADMIN'],
    ['/login', 'GENERIC'],
    ['/pizzaria/equipe', 'GENERIC'],
    ['/admin/login', 'GENERIC'],
  ] as const)('resolve %s como %s', (path, expected) => {
    expect(resolveLoginPortal(path)).toBe(expected);
  });

  it('extrai slug somente de entradas contextuais de restaurante', () => {
    expect(getRestaurantSlugFromAuthPath('/Bella-Pizza/login')).toBe('bella-pizza');
    expect(getRestaurantSlugFromAuthPath('/bella-pizza/register')).toBe('bella-pizza');
    expect(getRestaurantSlugFromAuthPath('/bella-pizza/recover-password')).toBe('bella-pizza');
    expect(getRestaurantSlugFromAuthPath('/bella-pizza/team')).toBe('bella-pizza');
    expect(getRestaurantSlugFromAuthPath('/bella-pizza/admin')).toBe('bella-pizza');
    expect(getRestaurantSlugFromAuthPath('/bella-pizza/equipe')).toBe('');
    expect(getRestaurantSlugFromAuthPath('/admin/login')).toBe('');
  });

  it('restringe cada portal ao papel esperado', () => {
    expect(canUseLoginPortal('CUSTOMER', { role: 'CLIENTE' })).toBe(true);
    expect(canUseLoginPortal('CUSTOMER', { role: 'ADMIN' })).toBe(false);

    expect(canUseLoginPortal('ADMIN', { role: 'ADMIN' })).toBe(true);
    expect(canUseLoginPortal('ADMIN', { role: 'CLIENTE' })).toBe(false);

    expect(canUseLoginPortal('STAFF', { role: 'MOTOQUEIRO' })).toBe(true);
    expect(canUseLoginPortal('STAFF', { role: 'FUNCIONARIO', subRole: 'COZINHA' })).toBe(true);
    expect(canUseLoginPortal('STAFF', { role: 'FUNCIONARIO', subRole: 'GARCOM' })).toBe(true);
    expect(canUseLoginPortal('STAFF', { role: 'FUNCIONARIO', subRole: 'ATENDENTE' })).toBe(true);
    expect(canUseLoginPortal('STAFF', { role: 'ADMIN' })).toBe(false);

    expect(canUseLoginPortal('SUPER_ADMIN', { role: 'SUPER_ADMIN' })).toBe(true);
    expect(canUseLoginPortal('GENERIC', { role: 'SUPER_ADMIN' })).toBe(false);
    expect(canUseLoginPortal('GENERIC', { role: 'ADMIN' })).toBe(false);
    expect(canUseLoginPortal('GENERIC', { role: 'CLIENTE' })).toBe(false);
  });
});
