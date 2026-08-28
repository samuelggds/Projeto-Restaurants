import { describe, expect, it } from 'vitest';
import {
  buildPlatformMetrics,
  mapRestaurantTenant,
  mapSuperAdminDashboard,
  mapSupportMessages,
  mapTenantStatus,
} from './superAdminDataAdapter';

describe('superAdminDataAdapter', () => {
  it('normaliza tenant, administrador e assinatura sem inventar dados', () => {
    expect(
      mapRestaurantTenant({
        id: 1,
        name: 'North Pizza',
        slug: 'north-pizza',
        status: 'Ativo',
        createdAt: '2026-08-28T10:00:00.000Z',
        primaryAdmin: {
          id: 7,
          name: 'Samuel',
          email: 'samuel@example.com',
          lastLoginAt: null,
        },
        subscription: {
          id: 3,
          plan: 'PREMIUM',
          status: 'ATIVA',
          monthlyFee: '829.90',
        },
      }),
    ).toMatchObject({
      id: 1,
      name: 'North Pizza',
      status: 'ACTIVE',
      monthlyFee: 829.9,
      primaryAdmin: { id: 7, name: 'Samuel', lastAccessAt: null },
      subscription: { id: 3, planCode: 'PREMIUM', status: 'ATIVA' },
    });
  });

  it('preserva status desconhecido para não apresentar acesso saudável indevidamente', () => {
    expect(mapTenantStatus('STATUS_NOVO')).toBe('UNKNOWN');
  });

  it('usa as métricas calculadas pelo backend e completa apenas contagens ausentes', () => {
    const restaurants = [
      mapRestaurantTenant({ id: 1, status: 'Bloqueado' }),
      mapRestaurantTenant({ id: 2, status: 'Ativo' }),
    ];

    expect(
      buildPlatformMetrics(restaurants, {
        mrr: '829.90',
        totalGenerated: 1200,
        pendingInvoicesCount: 2,
      }),
    ).toMatchObject({
      restaurantsTotal: 2,
      restaurantsActive: 1,
      restaurantsBlocked: 1,
      mrr: 829.9,
      totalGenerated: 1200,
      pendingInvoicesCount: 2,
    });
  });

  it('mapeia o contrato agregado do dashboard e suas políticas', () => {
    const dashboard = mapSuperAdminDashboard({
      restaurants: [],
      metrics: {},
      plans: [{ code: 'BASICO', name: 'Básico', active: true, version: 4 }],
      invoices: [],
      administrators: [],
      tickets: [],
      auditLogs: [
        {
          id: 9,
          action: 'PLATFORM_SETTINGS_UPDATED',
          result: 'SUCCESS',
          metadata: { changedFields: ['timezone'] },
        },
      ],
      settings: {
        platformName: 'S&C Platform',
        platformDomain: 'app.example.com',
        locale: 'pt-BR',
        currency: 'BRL',
        version: 2,
      },
      systemPolicies: {
        security: [
          {
            key: 'mfaRequired',
            label: 'MFA obrigatório',
            value: true,
            description: 'Protege acessos privilegiados.',
          },
        ],
      },
    });

    expect(dashboard.plans[0]).toMatchObject({ code: 'BASICO', version: 4 });
    expect(dashboard.settings).toMatchObject({
      platformName: 'S&C Platform',
      platformDomain: 'app.example.com',
      version: 2,
    });
    expect(dashboard.systemPolicies.security[0]).toMatchObject({
      key: 'mfaRequired',
      value: true,
    });
    expect(dashboard.auditLogs[0].metadata).toEqual({ changedFields: ['timezone'] });
  });

  it('normaliza histórico de suporte retornado como envelope', () => {
    expect(
      mapSupportMessages({
        messages: [
          {
            id: 10,
            restaurantId: 2,
            senderRole: 'SUPER_ADMIN',
            senderLabel: 'Suporte',
            message: 'Ajuste concluído.',
            createdAt: '2026-08-28T12:00:00.000Z',
          },
        ],
      }),
    ).toEqual([
      {
        id: 10,
        restaurantId: 2,
        senderRole: 'SUPER_ADMIN',
        senderLabel: 'Suporte',
        message: 'Ajuste concluído.',
        issueStatus: null,
        sentAt: '2026-08-28T12:00:00.000Z',
      },
    ]);
  });
});
