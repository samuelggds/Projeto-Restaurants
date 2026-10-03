import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMenuHostname,
  customDomainPlanEligible,
  customDomainPublicHosts,
  normalizeCustomHostname,
  verificationRecordName,
  verificationRecordValue,
} from './customDomainPolicy.js';

const original = {
  APP_DOMAIN: process.env.APP_DOMAIN,
  API_DOMAIN: process.env.API_DOMAIN,
  FRONTEND_URL: process.env.FRONTEND_URL,
  BACKEND_URL: process.env.BACKEND_URL,
  PUBLIC_APP_URL: process.env.PUBLIC_APP_URL,
};

test.afterEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('normaliza domínio público e rejeita URL com caminho ou infraestrutura da plataforma', () => {
  process.env.APP_DOMAIN = 'www.gastronexa.com.br';
  process.env.API_DOMAIN = 'api.gastronexa.com.br';

  assert.equal(normalizeCustomHostname('NorthPizza.com.br'), 'northpizza.com.br');
  assert.throws(() => normalizeCustomHostname('https://northpizza.com.br/cardapio'), /somente o domínio/u);
  assert.throws(() => normalizeCustomHostname('localhost'), /público inválido/u);
  assert.throws(() => normalizeCustomHostname('api.gastronexa.com.br'), /própria plataforma/u);
  assert.throws(() => normalizeCustomHostname('gastronexa.com.br'), /própria plataforma/u);
});

test('separa landing principal do hostname do cardápio', () => {
  assert.equal(
    buildMenuHostname('northpizza.com.br', 'SITE_WITH_MENU_SUBDOMAIN', 'cardapio'),
    'cardapio.northpizza.com.br',
  );
  assert.equal(buildMenuHostname('northpizza.com.br', 'MENU_ONLY'), null);
  assert.deepEqual(
    customDomainPublicHosts({
      hostname: 'northpizza.com.br',
      menuHostname: 'cardapio.northpizza.com.br',
      mode: 'SITE_WITH_MENU_SUBDOMAIN',
      includeWww: true,
    }),
    ['cardapio.northpizza.com.br'],
  );
  assert.deepEqual(
    customDomainPublicHosts({
      hostname: 'northpizza.com.br',
      menuHostname: null,
      mode: 'MENU_ONLY',
      includeWww: true,
    }),
    ['northpizza.com.br', 'www.northpizza.com.br'],
  );
});

test('domínio próprio exige Premium ou Gestão Total em assinatura operacional', () => {
  assert.equal(customDomainPlanEligible('PREMIUM', 'ATIVA'), true);
  assert.equal(customDomainPlanEligible('GESTAO_TOTAL', 'TESTE'), true);
  assert.equal(customDomainPlanEligible('BASICO', 'ATIVA'), false);
  assert.equal(customDomainPlanEligible('PREMIUM', 'CANCELADA'), false);
});

test('gera desafio TXT específico do domínio sem tratar o token como credencial privada', () => {
  assert.equal(verificationRecordName('northpizza.com.br'), '_gastronexa.northpizza.com.br');
  assert.equal(
    verificationRecordValue('public-challenge'),
    'gastronexa-domain-verification=public-challenge',
  );
});
