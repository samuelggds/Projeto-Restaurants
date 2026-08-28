import assert from 'node:assert/strict';
import test from 'node:test';
import type { SuperAdminRepository } from '../repositories/SuperAdminRepository.js';
import { GetSuperAdminDashboardService } from './GetSuperAdminDashboardService.js';

const date = (value: string) => new Date(value);

test('dashboard separa faturamento gerado, recebimentos mensais e MRR sem mascarar status', async () => {
  const repository = {
    loadDashboardSnapshot: async () => ({
      settings: {
        id: 1,
        platformName: 'S&C Platform',
        platformDomain: 'app.example.test',
        supportEmail: 'suporte@example.test',
        primaryColor: '#E9530B',
        locale: 'pt-BR',
        currency: 'BRL',
        timezone: 'America/Sao_Paulo',
        dateFormat: 'dd/MM/yyyy',
        allowRestaurantSignup: false,
        requireManualApproval: true,
        defaultTrialDays: 30,
        auditRetentionDays: 180,
        maintenanceMode: false,
        maintenanceMessage: 'Atualização programada.',
        version: 1,
        updatedByUserId: null,
        createdAt: date('2026-01-01T00:00:00.000Z'),
        updatedAt: date('2026-08-28T00:00:00.000Z'),
      },
      plans: [
        {
          code: 'BASICO',
          name: 'Básico',
          description: 'Plano básico para operações de delivery.',
          monthlyFee: 149.9,
          trialDays: 30,
          features: ['Delivery'],
          featured: false,
          active: true,
          version: 1,
          updatedByUserId: null,
          createdAt: date('2026-01-01T00:00:00.000Z'),
          updatedAt: date('2026-01-01T00:00:00.000Z'),
        },
      ],
      restaurants: [
        {
          id: 1,
          name: 'Ativo',
          slug: 'ativo',
          email: 'ativo@example.test',
          phone: null,
          active: true,
          createdAt: date('2026-03-01T00:00:00.000Z'),
          subscription: {
            id: 1,
            restaurantId: 1,
            plan: 'BASICO',
            status: 'ATIVA',
            trialEndsAt: null,
            currentPeriodStart: date('2026-08-01T00:00:00.000Z'),
            currentPeriodEnd: date('2026-09-01T00:00:00.000Z'),
            balanceDebt: 0,
            scheduledPlan: null,
            scheduledPlanEffectiveMonth: null,
            scheduledPlanEffectiveYear: null,
            createdAt: date('2026-03-01T00:00:00.000Z'),
            updatedAt: date('2026-08-01T00:00:00.000Z'),
          },
          users: [],
          invoices: [],
        },
        {
          id: 2,
          name: 'Inadimplente',
          slug: 'inadimplente',
          email: 'atraso@example.test',
          phone: null,
          active: false,
          createdAt: date('2026-04-01T00:00:00.000Z'),
          subscription: {
            id: 2,
            restaurantId: 2,
            plan: 'BASICO',
            status: 'ATIVA',
            trialEndsAt: null,
            currentPeriodStart: date('2026-07-01T00:00:00.000Z'),
            currentPeriodEnd: date('2026-08-01T00:00:00.000Z'),
            balanceDebt: 149.9,
            scheduledPlan: null,
            scheduledPlanEffectiveMonth: null,
            scheduledPlanEffectiveYear: null,
            createdAt: date('2026-04-01T00:00:00.000Z'),
            updatedAt: date('2026-08-01T00:00:00.000Z'),
          },
          users: [],
          invoices: [{ id: 20 }],
        },
        {
          id: 3,
          name: 'Cancelado',
          slug: 'cancelado',
          email: 'cancelado@example.test',
          phone: null,
          active: false,
          createdAt: date('2026-05-01T00:00:00.000Z'),
          subscription: {
            id: 3,
            restaurantId: 3,
            plan: 'BASICO',
            status: 'CANCELADA',
            trialEndsAt: null,
            currentPeriodStart: null,
            currentPeriodEnd: null,
            balanceDebt: 149.9,
            scheduledPlan: null,
            scheduledPlanEffectiveMonth: null,
            scheduledPlanEffectiveYear: null,
            createdAt: date('2026-05-01T00:00:00.000Z'),
            updatedAt: date('2026-08-01T00:00:00.000Z'),
          },
          users: [],
          invoices: [{ id: 30 }],
        },
      ],
      invoices: [],
      administrators: [],
      supportTickets: [
        {
          id: 55,
          restaurantId: 1,
          restaurantName: 'Ativo',
          message: 'Resposta mais recente',
          subject: 'Falha ao emitir pedido',
          senderRole: 'SUPER_ADMIN',
          sentAt: date('2026-08-28T10:00:00.000Z'),
          messageCount: 3,
        },
      ],
      auditLogs: [
        {
          id: 99,
          createdAt: date('2026-08-28T11:00:00.000Z'),
          userName: 'Desenvolvedor',
          userRole: 'SUPER_ADMIN',
          restaurantName: 'Ativo',
          action: 'UPDATE_PLATFORM_SETTINGS',
          resource: 'PlatformSettings:1',
          ipAddress: '127.0.0.1',
          requestId: 'req-dashboard',
          userAgent: 'unit-test',
          metadata: { reason: null },
          result: 'SUCCESS',
        },
      ],
      monthlyOrdersByRestaurant: [{ restaurantId: 1, _sum: { total: 500 } }],
      generatedInvoicesAggregate: { _sum: { total: 1_200 } },
      openInvoicesAggregate: { _sum: { total: 299.8 } },
      openInvoicesCount: 2,
      monthlyPaidInvoices: [
        { total: 100, paidAt: date('2026-07-10T10:00:00.000Z') },
        { total: 829.9, paidAt: date('2026-08-15T10:00:00.000Z') },
      ],
    }),
  } as unknown as SuperAdminRepository;

  const result = await new GetSuperAdminDashboardService(repository).execute(
    date('2026-08-28T12:00:00.000Z'),
  );

  assert.equal(result.metrics.totalGenerated, 1_200);
  assert.equal(result.metrics.totalReceivable, 299.8);
  assert.equal(result.metrics.monthlyRevenue.at(-1)?.value, 829.9);
  assert.equal(result.metrics.mrr, 299.8);
  assert.equal(result.metrics.restaurantsActive, 1);
  assert.equal(result.metrics.restaurantsOverdue, 1);
  assert.equal(result.metrics.restaurantsCanceled, 1);
  assert.equal(result.restaurants.find((item) => item.id === 2)?.status, 'OVERDUE');
  assert.equal(result.restaurants.find((item) => item.id === 3)?.status, 'CANCELED');
  assert.deepEqual(result.tickets[0], {
    restaurantId: 1,
    id: 55,
    restaurant: 'Ativo',
    subject: 'Falha ao emitir pedido',
    status: 'WAITING_CUSTOMER',
    messageCount: 3,
    lastMessageAt: '2026-08-28T10:00:00.000Z',
    lastSenderRole: 'SUPER_ADMIN',
  });
  assert.equal(result.auditLogs[0]?.requestId, 'req-dashboard');
  assert.deepEqual(Object.keys(result.systemPolicies), [
    'deployment',
    'email',
    'integrations',
    'security',
    'maintenance',
  ]);
});
