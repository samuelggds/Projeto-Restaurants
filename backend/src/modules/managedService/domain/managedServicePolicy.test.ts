import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasContinuousManagementAccess,
  hasImplementationAccess,
} from './managedServicePolicy.js';

test('Premium e Gestão Total recebem implantação quando a assinatura está ativa', () => {
  assert.equal(hasImplementationAccess('PREMIUM', 'ATIVA'), true);
  assert.equal(hasImplementationAccess('GESTAO_TOTAL', 'TESTE'), true);
  assert.equal(hasImplementationAccess('BASICO', 'ATIVA'), false);
  assert.equal(hasImplementationAccess('PREMIUM', 'CANCELADA'), false);
});

test('somente Gestão Total ativa recebe gestão contínua', () => {
  assert.equal(hasContinuousManagementAccess('GESTAO_TOTAL', 'ATIVA'), true);
  assert.equal(hasContinuousManagementAccess('GESTAO_TOTAL', 'TESTE'), true);
  assert.equal(hasContinuousManagementAccess('PREMIUM', 'ATIVA'), false);
  assert.equal(hasContinuousManagementAccess('GESTAO_TOTAL', 'EXPIRADA'), false);
});
