import { describe, expect, it } from 'vitest';
import { resolveAvailabilityView } from './availabilityPolicy';

const base = {
  pathname: '/admin',
  role: 'ADMIN',
  userPresent: true,
  platformMaintenance: false,
  initialStatusPending: false,
  systemBlock: null,
};

describe('política de disponibilidade do sistema', () => {
  it('prioriza a manutenção global e preserva o acesso do SUPER_ADMIN', () => {
    expect(resolveAvailabilityView({ ...base, platformMaintenance: true })).toBe(
      'PLATFORM_MAINTENANCE',
    );
    expect(
      resolveAvailabilityView({ ...base, role: 'SUPER_ADMIN', platformMaintenance: true }),
    ).toBe('APP');
    expect(
      resolveAvailabilityView({
        ...base,
        pathname: '/super_admin/support',
        role: 'SUPER_ADMIN',
        platformMaintenance: true,
        systemBlock: { reason: 'BILLING' },
      }),
    ).toBe('APP');
    expect(
      resolveAvailabilityView({
        ...base,
        pathname: '/super_admin/login',
        role: '',
        userPresent: false,
        platformMaintenance: true,
      }),
    ).toBe('APP');
  });

  it('mantém somente os portais de autenticação válidos disponíveis durante manutenção ou bloqueio local', () => {
    for (const pathname of [
      '/pizzaria/login',
      '/pizzaria/team',
      '/pizzaria/admin',
      '/super_admin/login',
    ]) {
      expect(
        resolveAvailabilityView({
          ...base,
          pathname,
          role: '',
          userPresent: false,
          platformMaintenance: true,
          initialStatusPending: true,
          systemBlock: { reason: 'BILLING' },
        }),
        pathname,
      ).toBe('APP');
    }

    expect(
      resolveAvailabilityView({
        ...base,
        pathname: '/login',
        role: '',
        userPresent: false,
        platformMaintenance: true,
        initialStatusPending: true,
        systemBlock: { reason: 'BILLING' },
      }),
    ).toBe('PLATFORM_MAINTENANCE');
  });

  it('deixa a rota SUPER_ADMIN chegar ao guard de autenticação e RBAC', () => {
    expect(
      resolveAvailabilityView({
        ...base,
        pathname: '/super_admin',
        role: '',
        userPresent: false,
        platformMaintenance: true,
        initialStatusPending: true,
        systemBlock: { reason: 'MANUAL' },
      }),
    ).toBe('APP');
    expect(
      resolveAvailabilityView({
        ...base,
        pathname: '/super_admin/restaurantes',
        role: 'ADMIN',
        platformMaintenance: true,
      }),
    ).toBe('APP');
  });

  it('mantém somente o financeiro para ADMIN inadimplente', () => {
    expect(resolveAvailabilityView({ ...base, systemBlock: { reason: 'BILLING' } })).toBe(
      'BILLING_ADMIN',
    );
    expect(
      resolveAvailabilityView({
        ...base,
        role: 'FUNCIONARIO',
        systemBlock: { reason: 'BILLING' },
      }),
    ).toBe('TENANT_MAINTENANCE');
  });

  it('não oferece o financeiro para suspensão manual', () => {
    expect(resolveAvailabilityView({ ...base, systemBlock: { reason: 'MANUAL' } })).toBe(
      'TENANT_MAINTENANCE',
    );
  });

  it('permite o portal ADMIN tenant-scoped sem sessão para regularizar a conta', () => {
    expect(
      resolveAvailabilityView({
        ...base,
        pathname: '/pizzaria/admin',
        role: '',
        userPresent: false,
        systemBlock: { reason: 'BILLING' },
      }),
    ).toBe('APP');
  });
});
