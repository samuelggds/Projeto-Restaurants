// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import onboardRestaurantAsaasService from './OnboardRestaurantAsaasService.js';

const originalMethods = {
  findByRestaurantId: restaurantSettingsRepository.findByRestaurantId,
  findRestaurantById: restaurantSettingsRepository.findRestaurantById,
  create: restaurantSettingsRepository.create,
  update: restaurantSettingsRepository.update,
};
const originalFetch = globalThis.fetch;
const originalAsaasApiKey = process.env.ASAAS_API_KEY;
const originalAsaasBaseUrl = process.env.ASAAS_API_BASE_URL;

function restoreEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

afterEach(() => {
  restaurantSettingsRepository.findByRestaurantId = originalMethods.findByRestaurantId;
  restaurantSettingsRepository.findRestaurantById = originalMethods.findRestaurantById;
  restaurantSettingsRepository.create = originalMethods.create;
  restaurantSettingsRepository.update = originalMethods.update;
  globalThis.fetch = originalFetch;
  restoreEnv('ASAAS_API_KEY', originalAsaasApiKey);
  restoreEnv('ASAAS_API_BASE_URL', originalAsaasBaseUrl);
});

function makeSettings(overrides = {}) {
  return {
    restaurantId: 7,
    companyDocument: '11222333000181',
    companyTradeName: 'Pizzaria do Bairro',
    companyLegalName: 'Pizzaria do Bairro LTDA',
    ownerEmail: 'cadastro@pizzaria.test',
    ownerPhone: '5511999998888',
    monthlyRevenue: null,
    restaurant: {
      name: 'Pizzaria do Bairro',
      email: 'contato@pizzaria.test',
      phone: '11988887777',
      whatsapp: '11988887777',
      cnpj: '11222333000181',
      address: 'Rua das Flores',
      addressNumber: '100',
      addressDistrict: 'Centro',
      zipCode: '01001000',
    },
    ...overrides,
  };
}

test('envia ao Asaas todos os campos obrigatórios usando AdminSettings e renda informada', async () => {
  process.env.ASAAS_API_KEY = 'token-plataforma';
  process.env.ASAAS_API_BASE_URL = 'https://sandbox.asaas.test/';
  restaurantSettingsRepository.findByRestaurantId = async () => makeSettings();
  restaurantSettingsRepository.findRestaurantById = async () => null;

  let providerBody = null;
  let persistedSettings = null;
  globalThis.fetch = async (input, init = {}) => {
    assert.equal(String(input), 'https://sandbox.asaas.test/v3/accounts');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.access_token, 'token-plataforma');
    providerBody = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ id: 'wallet_asaas_7', apiKey: 'token-subconta-7' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  restaurantSettingsRepository.update = async (restaurantId, data) => {
    assert.equal(restaurantId, 7);
    persistedSettings = data;
    return data;
  };

  const result = await onboardRestaurantAsaasService.execute({
    restaurantId: 7,
    cnpj: '11.222.333/0001-81',
    restaurantName: 'Pizzaria do Bairro',
    pixKey: 'financeiro@pizzaria.test',
    email: 'ADMIN@PIZZARIA.TEST',
    mobilePhone: '(11) 97777-6666',
    incomeValue: 45_000.55,
    address: 'Avenida Atualizada',
    addressNumber: '250',
    province: 'Bela Vista',
    postalCode: '01310-100',
  });

  assert.deepEqual(providerBody, {
    cpfCnpj: '11222333000181',
    name: 'Pizzaria do Bairro',
    email: 'admin@pizzaria.test',
    mobilePhone: '11977776666',
    incomeValue: 45_000.55,
    address: 'Avenida Atualizada',
    addressNumber: '250',
    province: 'Bela Vista',
    postalCode: '01310100',
  });
  assert.equal(persistedSettings.monthlyRevenue, 45_000.55);
  assert.equal(persistedSettings.gatewayMerchantId, 'wallet_asaas_7');
  assert.equal(persistedSettings.asaasAccessToken, 'token-subconta-7');
  assert.equal(result.asaasSubaccountTokenConfigured, true);
});

test('rejeita onboarding antes de chamar o Asaas quando a renda mensal não foi informada', async () => {
  process.env.ASAAS_API_KEY = 'token-plataforma';
  restaurantSettingsRepository.findByRestaurantId = async () => makeSettings();
  restaurantSettingsRepository.findRestaurantById = async () => null;

  let providerCalled = false;
  globalThis.fetch = async () => {
    providerCalled = true;
    throw new Error('não deveria chamar o provedor');
  };

  await assert.rejects(
    () =>
      onboardRestaurantAsaasService.execute({
        restaurantId: 7,
        cnpj: '11222333000181',
        restaurantName: 'Pizzaria do Bairro',
        pixKey: 'financeiro@pizzaria.test',
      }),
    /renda\/faturamento mensal valido/i,
  );
  assert.equal(providerCalled, false);
});
