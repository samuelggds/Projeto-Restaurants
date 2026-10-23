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
      '/pizzaria/admin/' + 'a'.repeat(43),
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

  it('deixa o link privado chegar ao verificador mesmo com estado local de bloqueio', () => {
    const entry = '/north-pizza/admin/' + 'a'.repeat(43);
    for (const reason of ['BILLING', 'MANUAL'] as const) {
      expect(resolveAvailabilityView({
        ...base, pathname: entry, role: 'ADMIN', userPresent: true,
        systemBlock: { reason },
      })).toBe('APP');
    }
    // A entrada pública continua sujeita à verificação da chave e ao login.
    // O financeiro não fica disponível para o bloqueio manual.
    expect(resolveAvailabilityView({
      ...base, pathname: '/admin', systemBlock: { reason: 'MANUAL' },
    })).toBe('TENANT_MAINTENANCE');
    expect(resolveAvailabilityView({
      ...base, pathname: '/admin', systemBlock: { reason: 'BILLING' },
    })).toBe('BILLING_ADMIN');
    // A rota operacional derivada do link NÃO pode usar o bypass da chave.
    // ADMIN inadimplente vê exclusivamente a recuperação de cobrança; os
    // demais perfis e uma suspensão manual continuam no bloqueio receptivo.
    expect(resolveAvailabilityView({
      ...base, pathname: entry + '/orders', systemBlock: { reason: 'BILLING' },
    })).toBe('BILLING_ADMIN');
    expect(resolveAvailabilityView({
      ...base, pathname: entry + '/orders', role: 'FUNCIONARIO',
      systemBlock: { reason: 'BILLING' },
    })).toBe('TENANT_MAINTENANCE');
    expect(resolveAvailabilityView({
      ...base, pathname: entry + '/orders', systemBlock: { reason: 'MANUAL' },
    })).toBe('TENANT_MAINTENANCE');
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
