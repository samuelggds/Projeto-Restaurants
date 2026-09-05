import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPlatformMaintenanceState,
  getPlatformMaintenanceState,
  isAlwaysAvailableLoginPath,
  isMaintenanceBypassPath,
  isSuperAdminAccessPath,
  isTechnicalMaintenancePath,
  setPlatformMaintenanceState,
  subscribePlatformMaintenanceState,
} from './platformMaintenance';
import {
  clearSystemBlockState,
  findBlockingInvoice,
  getSystemBlockState,
  setSystemBlockState,
} from './systemBlock';

describe('estados locais de disponibilidade', () => {
  beforeEach(() => localStorage.clear());

  it('persiste, publica e limpa manutenção global sem expor outros dados', () => {
    const listener = vi.fn();
    const unsubscribe = subscribePlatformMaintenanceState(listener);
    setPlatformMaintenanceState({ message: 'Atualização dos servidores.', returnTo: '/admin' });

    expect(getPlatformMaintenanceState()).toMatchObject({
      active: true,
      message: 'Atualização dos servidores.',
      returnTo: '/admin',
    });
    clearPlatformMaintenanceState();
    expect(getPlatformMaintenanceState()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('mantém os portais tenant-scoped e o painel técnico fora da manutenção visual', () => {
    expect(isTechnicalMaintenancePath('/super_admin/login')).toBe(true);
    expect(isTechnicalMaintenancePath('/super_admin/login/extra')).toBe(false);
    expect(isTechnicalMaintenancePath('/super-admin/login')).toBe(false);

    for (const path of [
      '/pizzaria/login',
      '/pizzaria/login/',
      '/pizzaria/team',
      '/pizzaria/admin',
      '/super_admin/login',
    ]) {
      expect(isAlwaysAvailableLoginPath(path), path).toBe(true);
      expect(isMaintenanceBypassPath(path), path).toBe(true);
    }

    expect(isAlwaysAvailableLoginPath('/login')).toBe(false);
    expect(isMaintenanceBypassPath('/login')).toBe(false);
    expect(isAlwaysAvailableLoginPath('/admin')).toBe(false);
    expect(isSuperAdminAccessPath('/super_admin')).toBe(true);
    expect(isSuperAdminAccessPath('/super_admin/restaurantes')).toBe(true);
    expect(isSuperAdminAccessPath('/super-admin')).toBe(false);
    expect(isMaintenanceBypassPath('/super_admin/support')).toBe(true);
  });

  it('distingue suspensão manual de bloqueio financeiro', () => {
    setSystemBlockState({ reason: 'MANUAL', message: 'Acesso pausado.' });
    expect(getSystemBlockState()?.reason).toBe('MANUAL');
    clearSystemBlockState();
    setSystemBlockState({ reason: 'BILLING', invoiceId: 12 });
    expect(getSystemBlockState()).toMatchObject({ reason: 'BILLING', invoiceId: 12 });
  });

  it('considera os cinco dias úteis de tolerância ao localizar a fatura bloqueante', () => {
    const now = new Date('2026-08-17T12:00:00.000Z');
    const invoices = [
      { id: 1, status: 'PENDENTE', dueDate: '2026-08-10T12:00:00.000Z' },
      { id: 2, status: 'ATRASADO', dueDate: '2026-08-01T12:00:00.000Z', paymentLink: 'pix' },
    ];
    expect(findBlockingInvoice(invoices, now)?.id).toBe(2);
  });
});
