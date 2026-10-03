import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasActiveRestaurantPlan,
  hasCustomDomainAccess,
  hasHostedLandingAccess,
} from './planFeaturePolicy.js';

test('endereço GastroNexa por slug independe dos benefícios opcionais do plano', () => {
  assert.equal(hasActiveRestaurantPlan('ATIVA'), true);
  assert.equal(hasActiveRestaurantPlan('TESTE'), true);
  assert.equal(hasActiveRestaurantPlan('CANCELADA'), false);
});

test('domínio próprio é exclusivo de Premium e Gestão Total ativos', () => {
  assert.equal(hasCustomDomainAccess('BASICO', 'ATIVA'), false);
  assert.equal(hasCustomDomainAccess('PREMIUM', 'ATIVA'), true);
  assert.equal(hasCustomDomainAccess('GESTAO_TOTAL', 'TESTE'), true);
  assert.equal(hasCustomDomainAccess('PREMIUM', 'CANCELADA'), false);
});

test('landing hospedada pela GastroNexa é exclusiva do Gestão Total ativo', () => {
  assert.equal(hasHostedLandingAccess('BASICO', 'ATIVA'), false);
  assert.equal(hasHostedLandingAccess('PREMIUM', 'ATIVA'), false);
  assert.equal(hasHostedLandingAccess('GESTAO_TOTAL', 'ATIVA'), true);
  assert.equal(hasHostedLandingAccess('GESTAO_TOTAL', 'EXPIRADA'), false);
});
