import test from 'node:test';
import assert from 'node:assert/strict';
import { hasInitialSetupAccess } from './managedServicePolicy.js';

const now = new Date('2026-10-21T12:00:00.000Z');
const fresh = { status: 'EM_IMPLANTACAO', initialSetupExpiresAt: new Date('2026-10-22T12:00:00.000Z'), initialSetupClosedAt: null };

test('only active provisioned onboarding has automatic platform access', () => {
  assert.equal(hasInitialSetupAccess('GESTAO_TOTAL', 'TESTE', fresh, now), true);
  assert.equal(hasInitialSetupAccess('PREMIUM', 'ATIVA', fresh, now), true);
  assert.equal(hasInitialSetupAccess('GESTAO_TOTAL', 'TESTE', null, now), false);
  assert.equal(hasInitialSetupAccess('GESTAO_TOTAL', 'TESTE', { ...fresh, initialSetupExpiresAt: null }, now), false);
  assert.equal(hasInitialSetupAccess('GESTAO_TOTAL', 'CANCELADA', fresh, now), false);
  assert.equal(hasInitialSetupAccess('GESTAO_TOTAL', 'TESTE', { ...fresh, status: 'CONCLUIDA' }, now), false);
  assert.equal(hasInitialSetupAccess('GESTAO_TOTAL', 'TESTE', { ...fresh, initialSetupClosedAt: now }, now), false);
  assert.equal(hasInitialSetupAccess('GESTAO_TOTAL', 'TESTE', { ...fresh, initialSetupExpiresAt: now }, now), false);
  assert.equal(hasInitialSetupAccess('GESTAO_TOTAL', 'TESTE', { ...fresh, initialSetupExpiresAt: new Date('2026-10-20T12:00:00Z') }, now), false);
  assert.equal(hasInitialSetupAccess('GESTAO_TOTAL', 'TESTE', { ...fresh, status: 'CANCELADA' }, now), false);
});
