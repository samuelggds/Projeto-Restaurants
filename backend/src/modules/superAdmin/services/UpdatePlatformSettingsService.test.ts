import assert from 'node:assert/strict';
import test from 'node:test';
import type { PlatformSettings } from '@prisma/client';
import type { SuperAdminRepository } from '../repositories/SuperAdminRepository.js';
import { UpdatePlatformSettingsService } from './UpdatePlatformSettingsService.js';

const settings = {
  id: 1,
  platformName: 'S&C Platform',
  platformDomain: 'app.scplatform.com.br',
  supportEmail: 'suporte@scplatform.com.br',
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
  maintenanceMessage: 'Plataforma em manutenção programada.',
  version: 2,
  updatedByUserId: 1,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
} satisfies PlatformSettings;

test('concorrência otimista rejeita versão antiga sem gravar auditoria', async () => {
  let auditCalled = false;
  const fakeRepository = {
    transaction: async (operation: (transaction: object) => Promise<unknown>) => operation({}),
    findActor: async () => ({ id: 1, name: 'Desenvolvedor', role: 'SUPER_ADMIN' }),
    findSettings: async () => settings,
    updateSettingsIfVersion: async () => ({ count: 0 }),
    createAuditLog: async () => {
      auditCalled = true;
    },
  } as unknown as SuperAdminRepository;
  const service = new UpdatePlatformSettingsService(fakeRepository);

  await assert.rejects(
    () =>
      service.execute(
        {
          version: 1,
          platformName: settings.platformName,
          platformDomain: settings.platformDomain,
          supportEmail: settings.supportEmail,
          primaryColor: settings.primaryColor,
          locale: settings.locale,
          currency: settings.currency,
          timezone: settings.timezone,
          dateFormat: settings.dateFormat,
          allowRestaurantSignup: settings.allowRestaurantSignup,
          requireManualApproval: settings.requireManualApproval,
          defaultTrialDays: settings.defaultTrialDays,
          auditRetentionDays: settings.auditRetentionDays,
          maintenanceMode: settings.maintenanceMode,
          maintenanceMessage: settings.maintenanceMessage,
        },
        { actorUserId: 1, ipAddress: null, requestId: 'req-1', userAgent: null },
      ),
    (error: any) => error?.statusCode === 409 && error?.code === 'VERSION_CONFLICT',
  );
  assert.equal(auditCalled, false);
});

test('alteração confirmada grava auditoria na transação e invalida o cache após o commit', async () => {
  let auditCalled = false;
  let invalidations = 0;
  let committed = false;
  const updatedSettings = {
    ...settings,
    version: 3,
    maintenanceMode: true,
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };
  let settingsReads = 0;
  const fakeRepository = {
    transaction: async (operation: (transaction: object) => Promise<unknown>) => {
      const result = await operation({});
      committed = true;
      return result;
    },
    findActor: async () => ({ id: 1, name: 'Desenvolvedor', role: 'SUPER_ADMIN' }),
    findSettings: async () => (settingsReads++ === 0 ? settings : updatedSettings),
    updateSettingsIfVersion: async () => ({ count: 1 }),
    createAuditLog: async () => {
      assert.equal(committed, false);
      auditCalled = true;
    },
  } as unknown as SuperAdminRepository;
  const service = new UpdatePlatformSettingsService(fakeRepository, {
    invalidate() {
      assert.equal(committed, true);
      invalidations += 1;
    },
  });

  const result = await service.execute(
    {
      version: settings.version,
      platformName: settings.platformName,
      platformDomain: settings.platformDomain,
      supportEmail: settings.supportEmail,
      primaryColor: settings.primaryColor,
      locale: settings.locale,
      currency: settings.currency,
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
      allowRestaurantSignup: settings.allowRestaurantSignup,
      requireManualApproval: settings.requireManualApproval,
      defaultTrialDays: settings.defaultTrialDays,
      auditRetentionDays: settings.auditRetentionDays,
      maintenanceMode: true,
      maintenanceMessage: settings.maintenanceMessage,
    },
    { actorUserId: 1, ipAddress: null, requestId: 'req-2', userAgent: 'unit-test' },
  );

  assert.equal(auditCalled, true);
  assert.equal(invalidations, 1);
  assert.equal(result.version, 3);
  assert.equal(result.maintenanceMode, true);
});
