import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasActiveRestaurantPlan,
  hasCustomDomainAccess,
  hasHostedLandingAccess,
  hasNfcCardAccess,
  hasPremiumFeatureAccess,
  hasTemporaryFullFeatureAccess,
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

test('cartões NFC apenas Premium e Gestão Total com assinatura em teste ou ativa', () => {
  for (const plan of ['PREMIUM', 'GESTAO_TOTAL']) {
    assert.equal(hasNfcCardAccess(plan, 'TESTE'), true);
    assert.equal(hasNfcCardAccess(plan, 'ATIVA'), true);
    assert.equal(hasNfcCardAccess(plan, 'EXPIRADA'), false);
    assert.equal(hasNfcCardAccess(plan, 'CANCELADA'), false);
  }
  assert.equal(hasNfcCardAccess('BASICO', 'ATIVA'), false);
  assert.equal(hasNfcCardAccess('BASICO', 'TESTE'), false);
  assert.equal(hasNfcCardAccess(undefined, undefined), false);
});

test('liberação SUPER_ADMIN cobre recursos e expira no instante definido sem quitar fatura', () => {
  const expires = new Date('2026-11-01T12:00:00.000Z');
  const restaurant = { active: true, accessBlockReason: 'NONE', billingTemporaryAccessUntil: expires };
  const before = new Date(expires.getTime()-1);
  for(const plan of ['BASICO','PREMIUM','GESTAO_TOTAL']){
    assert.equal(hasTemporaryFullFeatureAccess('EXPIRADA',restaurant,before),true);
    assert.equal(hasPremiumFeatureAccess(plan,'EXPIRADA',restaurant,before),true);
    assert.equal(hasNfcCardAccess(plan,'EXPIRADA',restaurant,before),true);
    assert.equal(hasCustomDomainAccess(plan,'EXPIRADA',restaurant,before),true);
    assert.equal(hasHostedLandingAccess(plan,'EXPIRADA',restaurant,before),true);
    assert.equal(hasPremiumFeatureAccess(plan,'EXPIRADA',restaurant,expires),false);
    assert.equal(hasNfcCardAccess(plan,'EXPIRADA',restaurant,expires),false);
    assert.equal(hasHostedLandingAccess(plan,'EXPIRADA',restaurant,expires),false);
  }
  assert.equal(hasTemporaryFullFeatureAccess('CANCELADA',restaurant,before),false);
  assert.equal(hasPremiumFeatureAccess('BASICO','CANCELADA',restaurant,before),false);
  assert.equal(hasTemporaryFullFeatureAccess('EXPIRADA',{...restaurant,active:false},before),false);
  assert.equal(hasTemporaryFullFeatureAccess('EXPIRADA',{...restaurant,accessBlockReason:'MANUAL'},before),false);
  assert.equal(hasTemporaryFullFeatureAccess('EXPIRADA',{...restaurant,billingTemporaryAccessUntil:null},before),false);
});
