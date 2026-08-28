import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createRestaurantAdministratorSchema,
  platformPlanUpdateSchema,
  platformSettingsUpdateSchema,
  restaurantAccessUpdateSchema,
  supportMessageSchema,
} from './superAdminSchemas.js';

const validSettings = {
  version: 3,
  platformName: 'S&C Platform',
  platformDomain: 'app.scplatform.com.br',
  supportEmail: 'suporte@scplatform.com.br',
  primaryColor: '#e9530b',
  locale: 'pt-BR',
  currency: 'brl',
  timezone: 'America/Sao_Paulo',
  dateFormat: 'dd/MM/yyyy' as const,
  allowRestaurantSignup: false,
  requireManualApproval: true,
  defaultTrialDays: 30,
  auditRetentionDays: 180,
  maintenanceMode: false,
  maintenanceMessage: 'Plataforma em manutenção programada.',
};

test('validação de configurações é estrita, normaliza valores e exige version', () => {
  const parsed = platformSettingsUpdateSchema.parse(validSettings);
  assert.equal(parsed.primaryColor, '#E9530B');
  assert.equal(parsed.currency, 'BRL');

  assert.equal(
    platformSettingsUpdateSchema.safeParse({ ...validSettings, version: undefined }).success,
    false,
  );
  assert.equal(
    platformSettingsUpdateSchema.safeParse({ ...validSettings, secret: 'não deve entrar' }).success,
    false,
  );
  assert.equal(
    platformSettingsUpdateSchema.safeParse({ ...validSettings, auditRetentionDays: 30 }).success,
    false,
  );
});

test('alteração de plano exige version, ao menos uma mudança e rejeita campos extras', () => {
  assert.equal(platformPlanUpdateSchema.safeParse({ version: 1, monthlyFee: 199.9 }).success, true);
  assert.equal(platformPlanUpdateSchema.safeParse({ version: 1 }).success, false);
  assert.equal(
    platformPlanUpdateSchema.safeParse({ version: 1, monthlyFee: 10, apiKey: 'segredo' }).success,
    false,
  );
});

test('operações de bloqueio exigem justificativa auditável', () => {
  assert.equal(
    restaurantAccessUpdateSchema.safeParse({ active: false, reason: 'Inadimplência confirmada' })
      .success,
    true,
  );
  assert.equal(
    restaurantAccessUpdateSchema.safeParse({ active: false, reason: 'curto' }).success,
    false,
  );
});

test('novo administrador aceita senha forte com oito caracteres e exige confirmação idêntica', () => {
  const valid = {
    name: 'Administrador Local',
    email: 'admin@restaurante.com',
    password: 'Segura1!',
    passwordConfirmation: 'Segura1!',
  };
  assert.equal(createRestaurantAdministratorSchema.safeParse(valid).success, true);
  assert.equal(
    createRestaurantAdministratorSchema.safeParse({
      ...valid,
      passwordConfirmation: 'Outra-Senha-Segura-2026!',
    }).success,
    false,
  );
  assert.equal(
    createRestaurantAdministratorSchema.safeParse({
      ...valid,
      password: 'senha123',
      passwordConfirmation: 'senha123',
    }).success,
    false,
  );
});

test('resposta do suporte pode encerrar a conversa sem aceitar campos arbitrários', () => {
  assert.deepEqual(
    supportMessageSchema.parse({
      message: 'Configuração corrigida e validada.',
      closeConversation: true,
    }),
    {
      message: 'Configuração corrigida e validada.',
      closeConversation: true,
    },
  );
  assert.equal(
    supportMessageSchema.safeParse({ message: 'Resolvido.', secret: 'não permitido' }).success,
    false,
  );
});
