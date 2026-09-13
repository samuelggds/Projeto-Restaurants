// @ts-nocheck
import assert from 'node:assert/strict';
import test, { beforeEach, afterEach } from 'node:test';
import repository from '../repositories/RestaurantSettingsRepository.js';
import service from './OnboardRestaurantAsaasService.js';
import statusService from './GetAsaasConnectionStatusService.js';
import { ASAAS_PAYMENT_EVENTS } from './asaasConnectionApi.js';

const methods = [
  'findByRestaurantId',
  'findRestaurantById',
  'create',
  'update',
  'claimAsaasOnboarding',
];
const original = Object.fromEntries(methods.map((name) => [name, repository[name]]));
const originalFetch = globalThis.fetch;
const envNames = [
  'ASAAS_API_KEY',
  'ASAAS_API_BASE_URL',
  'ASAAS_WEBHOOK_TOKEN',
  'ASAAS_WEBHOOK_URL',
  'BACKEND_URL',
];
const originalEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
let settings;
let calls;
let approval;
let expired;
let webhookReady;
let createResponse;
const request = {
  restaurantId: 7,
  cnpj: '11222333000181',
  restaurantName: 'Pizzaria',
  incomeValue: 45000,
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const webhook = () => ({
  id: 'webhook-7',
  url: 'https://api.gastronexa.test/api/webhooks/asaas',
  enabled: webhookReady,
  interrupted: false,
  events: [...ASAAS_PAYMENT_EVENTS],
});

beforeEach(() => {
  process.env.ASAAS_API_KEY = 'test-parent-token';
  process.env.ASAAS_API_BASE_URL = 'https://asaas.test';
  process.env.ASAAS_WEBHOOK_TOKEN = 'test-webhook-token-with-at-least-32-characters';
  process.env.BACKEND_URL = 'https://api.gastronexa.test';
  delete process.env.ASAAS_WEBHOOK_URL;
  calls = [];
  approval = 'PENDING';
  expired = false;
  webhookReady = true;
  settings = {
    restaurantId: 7,
    companyDocument: '11222333000181',
    ownerEmail: 'owner@restaurant.test',
    ownerPhone: '5511999998888',
    monthlyRevenue: null,
    pixProvider: 'MERCADO_PAGO',
    cardGateway: 'PAGBANK',
    asaasAccessToken: null,
    asaasAccountId: null,
    asaasOnboardingState: null,
    restaurant: {
      name: 'Pizzaria',
      email: 'owner@restaurant.test',
      cnpj: '11222333000181',
      address: 'Rua Flores',
      addressNumber: '100',
      addressDistrict: 'Centro',
      zipCode: '01001000',
    },
  };
  repository.findByRestaurantId = async () => settings;
  repository.findRestaurantById = async () => settings.restaurant;
  repository.update = async (_id, data) => Object.assign(settings, data);
  repository.create = async (data) => Object.assign(settings, data);
  repository.claimAsaasOnboarding = async () => {
    if (
      settings.asaasAccessToken ||
      settings.asaasAccountId ||
      ![null, 'FAILED'].includes(settings.asaasOnboardingState)
    )
      return false;
    settings.asaasOnboardingState = 'CREATING';
    return true;
  };
  createResponse = async () =>
    json({ id: 'account-7', walletId: 'wallet-7', apiKey: 'tenant-token-7' });
  globalThis.fetch = async (input, init = {}) => {
    const path = new URL(String(input)).pathname;
    calls.push({
      path,
      method: init.method || 'GET',
      body: init.body ? JSON.parse(String(init.body)) : null,
      token: init.headers.access_token,
    });
    if (path === '/v3/accounts') return createResponse();
    assert.equal(init.headers.access_token, 'tenant-token-7');
    if (path === '/v3/webhooks' && init.method !== 'POST') return json({ data: [webhook()] });
    if (path === '/v3/webhooks/webhook-7') {
      webhookReady = true;
      return json(webhook());
    }
    if (path === '/v3/myAccount/status') return json({ general: approval });
    if (path === '/v3/myAccount/commercialInfo')
      return json({ commercialInfoExpiration: { isExpired: expired } });
    if (path === '/v3/myAccount/documents')
      return json({ data: [{ onboardingUrl: 'https://www.asaas.com/onboarding/test' }] });
    throw new Error(`Unexpected mocked request: ${path}`);
  };
});
afterEach(() => {
  methods.forEach((name) => {
    repository[name] = original[name];
  });
  globalThis.fetch = originalFetch;
  envNames.forEach((name) => {
    if (originalEnv[name] === undefined) delete process.env[name];
    else process.env[name] = originalEnv[name];
  });
});

test('cria subconta com webhook, preserva meios e só declara vínculo enquanto aprovação está pendente', async () => {
  const result = await service.execute(request);
  const created = calls.find((call) => call.path === '/v3/accounts');
  assert.equal(created.token, 'test-parent-token');
  assert.equal(created.body.cpfCnpj, request.cnpj);
  assert.equal(created.body.mobilePhone, '11999998888');
  assert.equal(created.body.incomeValue, 45000);
  assert.equal(created.body.postalCode, '01001000');
  assert.equal(created.body.webhooks[0].url, webhook().url);
  assert.deepEqual(created.body.webhooks[0].events, [...ASAAS_PAYMENT_EVENTS]);
  assert.equal(settings.asaasAccessToken, 'tenant-token-7');
  assert.equal(settings.asaasAccountId, 'account-7');
  assert.equal(settings.gatewayMerchantId, 'wallet-7');
  assert.equal(settings.asaasOnboardingState, 'CREATED');
  assert.equal(settings.pixProvider, 'MERCADO_PAGO');
  assert.equal(settings.cardGateway, 'PAGBANK');
  assert.equal(result.credentialsConfigured, true);
  assert.equal(result.readyForPayments, false);
  assert.equal(result.approvalStatus, 'PENDING');
  assert.equal(result.onboardingUrl, 'https://www.asaas.com/onboarding/test');
  assert.equal('apiKey' in result, false);
});

test('CPF explícito prevalece sobre CNPJ antigo e envia data de nascimento', async () => {
  await service.execute({
    ...request,
    cnpj: undefined,
    cpf: '52998224725',
    birthDate: '1990-05-02',
  });
  const body = calls.find((call) => call.path === '/v3/accounts').body;
  assert.equal(body.cpfCnpj, '52998224725');
  assert.equal(body.birthDate, '1990-05-02');
});

test('renda mensal ausente é recusada antes de qualquer chamada ao Asaas', async () => {
  await assert.rejects(
    service.execute({ ...request, incomeValue: undefined }),
    /renda\/faturamento/i,
  );
  assert.equal(calls.length, 0);
});

test('reconexão reaproveita token existente e repara webhook sem criar conta', async () => {
  Object.assign(settings, {
    asaasAccessToken: 'tenant-token-7',
    asaasAccountId: 'account-7',
    asaasOnboardingState: 'CREATED',
  });
  webhookReady = false;
  approval = 'APPROVED';
  const result = await service.execute({ restaurantId: 7 });
  assert.equal(result.reused, true);
  assert.equal(result.readyForPayments, true);
  assert.equal(calls.filter((call) => call.path === '/v3/accounts').length, 0);
  assert.equal(calls.filter((call) => call.method === 'PUT').length, 1);
});

test('requisições simultâneas fazem apenas um POST de criação', async () => {
  const results = await Promise.allSettled([service.execute(request), service.execute(request)]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(calls.filter((call) => call.path === '/v3/accounts').length, 1);
});

test('timeout preserva estado para conferência e retry não cria outra conta', async () => {
  createResponse = async () => {
    throw new Error('mock timeout');
  };
  await assert.rejects(service.execute(request), /tentativa foi preservada/);
  assert.equal(settings.asaasOnboardingState, 'REQUIRES_RECOVERY');
  await assert.rejects(service.execute(request), /Nenhuma nova subconta/);
  assert.equal(calls.length, 1);
  assert.equal((await statusService.execute({ restaurantId: 7 })).recoveryRequired, true);
});

test('resposta sem token nunca é marcada pronta e bloqueia nova criação', async () => {
  createResponse = async () => json({ id: 'account-7', walletId: 'wallet-7' });
  const result = await service.execute(request);
  assert.equal(result.credentialsConfigured, false);
  assert.equal(result.readyForPayments, false);
  assert.equal(result.recoveryRequired, true);
  await assert.rejects(service.execute(request), /Nenhuma nova subconta/);
  assert.equal(calls.length, 1);
});

test('rejeição cadastral definitiva pode ser corrigida e reenviada', async () => {
  createResponse = async () => json({ errors: [{ description: 'CEP não encontrado.' }] }, 400);
  await assert.rejects(service.execute(request), /CEP/);
  assert.equal(settings.asaasOnboardingState, 'FAILED');
  createResponse = async () =>
    json({ id: 'account-7', walletId: 'wallet-7', apiKey: 'tenant-token-7' });
  await service.execute(request);
  assert.equal(settings.asaasOnboardingState, 'CREATED');
});

test('crash anterior em CREATING não é tratado como autorização para repetir POST', async () => {
  settings.asaasOnboardingState = 'CREATING';
  await assert.rejects(service.execute(request), /conferência/);
  assert.equal(calls.length, 0);
});

test('webhook sem configuração pública segura impede criação antes de consumir API', async () => {
  process.env.BACKEND_URL = 'http://localhost:3000';
  await assert.rejects(service.execute(request), /URL pública HTTPS/);
  assert.equal(settings.asaasOnboardingState, null);
  assert.equal(calls.length, 0);
});

test('cadastro aprovado com dados comerciais expirados não é declarado pronto', async () => {
  settings.asaasAccessToken = 'tenant-token-7';
  approval = 'APPROVED';
  expired = true;
  const result = await statusService.execute({ restaurantId: 7 });
  assert.equal(result.readyForPayments, false);
  assert.match(result.message, /dados comerciais/);
});

test('status desconhecido ou falha remota conserva readyForPayments false', async () => {
  settings.asaasAccessToken = 'tenant-token-7';
  globalThis.fetch = async () => {
    throw new Error('provider unavailable');
  };
  const result = await statusService.execute({ restaurantId: 7 });
  assert.equal(result.approvalStatus, 'UNKNOWN');
  assert.equal(result.readyForPayments, false);
});

test('rotação do token exige reconfigurar webhook antes de declarar pronto', async () => {
  approval = 'APPROVED';
  assert.equal((await service.execute(request)).readyForPayments, true);
  process.env.ASAAS_WEBHOOK_TOKEN = 'another-webhook-token-with-at-least-32-characters';
  const rotated = await statusService.execute({ restaurantId: 7 });
  assert.equal(rotated.webhookConfigured, false);
  assert.equal(rotated.readyForPayments, false);
  const reconnected = await service.execute({ restaurantId: 7 });
  assert.equal(reconnected.readyForPayments, true);
  assert.equal(calls.filter((call) => call.path === '/v3/accounts').length, 1);
  assert.equal('asaasWebhookTokenHash' in reconnected, false);
});
