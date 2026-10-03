import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasContinuousManagementAccess,
  hasImplementationAccess,
  hasManagedWorkspaceAccess,
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

test('workspace Premium encerra com a implantação e Gestão Total continua', () => {
  assert.equal(hasManagedWorkspaceAccess('PREMIUM', 'ATIVA', 'EM_IMPLANTACAO'), true);
  assert.equal(hasManagedWorkspaceAccess('PREMIUM', 'ATIVA', 'CONCLUIDA'), false);
  assert.equal(hasManagedWorkspaceAccess('PREMIUM', 'ATIVA', 'CANCELADA'), false);
  assert.equal(hasManagedWorkspaceAccess('GESTAO_TOTAL', 'ATIVA', 'CONCLUIDA'), true);
});
