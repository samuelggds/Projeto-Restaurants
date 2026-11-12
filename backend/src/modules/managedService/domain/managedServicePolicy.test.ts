import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasContinuousManagementAccess,
  hasImplementationAccess,
  hasManagedWorkspaceAccess,
  managedImplementationProductLimit,
} from './managedServicePolicy.js';

test('Básico, Premium e Gestão Total recebem implantação quando a assinatura está ativa', () => {
  assert.equal(hasImplementationAccess('BASICO', 'ATIVA'), true);
  assert.equal(hasImplementationAccess('PREMIUM', 'ATIVA'), true);
  assert.equal(hasImplementationAccess('GESTAO_TOTAL', 'TESTE'), true);
  assert.equal(hasImplementationAccess('PREMIUM', 'CANCELADA'), false);
});

test('Avançado e Gestão Total legado recebem gestão contínua', () => {
  assert.equal(hasContinuousManagementAccess('GESTAO_TOTAL', 'ATIVA'), true);
  assert.equal(hasContinuousManagementAccess('GESTAO_TOTAL', 'TESTE'), true);
  assert.equal(hasContinuousManagementAccess('PREMIUM', 'ATIVA'), true);
  assert.equal(hasContinuousManagementAccess('GESTAO_TOTAL', 'EXPIRADA'), false);
});

test('workspace Entrada encerra com implantação, Avançado permanece', () => {
  assert.equal(hasManagedWorkspaceAccess('BASICO', 'ATIVA', 'EM_IMPLANTACAO'), true);
  assert.equal(hasManagedWorkspaceAccess('BASICO', 'ATIVA', 'CONCLUIDA'), false);
  assert.equal(hasManagedWorkspaceAccess('PREMIUM', 'ATIVA', 'EM_IMPLANTACAO'), true);
  assert.equal(hasManagedWorkspaceAccess('PREMIUM', 'ATIVA', 'CONCLUIDA'), true);
  assert.equal(hasManagedWorkspaceAccess('PREMIUM', 'CANCELADA', 'CONCLUIDA'), false);
  assert.equal(hasManagedWorkspaceAccess('GESTAO_TOTAL', 'ATIVA', 'CONCLUIDA'), true);
});

test('limite de implantação é derivado do plano atual', () => {
  assert.equal(managedImplementationProductLimit('BASICO'), 50);
  assert.equal(managedImplementationProductLimit('PREMIUM'), null);
  assert.equal(managedImplementationProductLimit('GESTAO_TOTAL'), null);
});

