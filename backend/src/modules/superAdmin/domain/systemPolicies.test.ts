import assert from 'node:assert/strict';
import test from 'node:test';
import { getPublicSystemPolicies } from './systemPolicies.js';

test('políticas retornam o contrato agrupado e reconhecem integrações sem expor segredos', () => {
  const secrets = {
    PLATFORM_MP_ACCESS_TOKEN: 'platform-mp-token-sensitive',
    WHATSAPP_WEBHOOK_URL: 'https://notifications.example.test/whatsapp',
    WHATSAPP_WEBHOOK_TOKEN: 'whatsapp-token-sensitive',
    SMTP_HOST: 'smtp.example.test',
    SMTP_USER: 'mailer@example.test',
    SMTP_PASS: 'smtp-password-sensitive',
  };
  const policies = getPublicSystemPolicies(
    {
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://app.example.test',
      BACKEND_URL: 'https://api.example.test',
      ...secrets,
    },
    {
      maintenanceMode: true,
      maintenanceMessage: 'Atualização programada.',
    },
  );

  assert.deepEqual(Object.keys(policies), [
    'deployment',
    'email',
    'integrations',
    'security',
    'maintenance',
  ]);
  assert.equal(policies.integrations.find((item) => item.key === 'mercadoPago')?.configured, true);
  assert.equal(policies.integrations.find((item) => item.key === 'whatsapp')?.configured, true);
  assert.equal(policies.email.find((item) => item.key === 'smtp')?.configured, true);
  assert.equal(policies.maintenance.find((item) => item.key === 'maintenanceMode')?.value, true);
  assert.equal(
    policies.security.find((item) => item.key === 'passwordPolicy')?.value,
    '8–128 caracteres',
  );

  const serialized = JSON.stringify(policies);
  for (const secret of Object.values(secrets)) {
    assert.equal(serialized.includes(secret), false);
  }
});

test('placeholders de deploy não são apresentados como integração configurada', () => {
  const policies = getPublicSystemPolicies({
    PLATFORM_MP_ACCESS_TOKEN: 'SUBSTITUA_POR_TOKEN',
    SMTP_HOST: 'smtp.example.test',
    SMTP_USER: 'mailer@example.test',
    SMTP_PASS: 'change_me',
  });

  assert.equal(policies.integrations.find((item) => item.key === 'mercadoPago')?.configured, false);
  assert.equal(policies.email.find((item) => item.key === 'smtp')?.configured, false);
});
