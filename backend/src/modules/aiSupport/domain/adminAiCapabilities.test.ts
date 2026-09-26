import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_AI_AREAS,
  ADMIN_AI_CAPABILITIES,
  ADMIN_AI_STRUCTURAL_DENYLIST,
  adminAiCapabilitiesForAdmin,
  adminAiCapabilitiesForArea,
  assertAdminAiCapabilityAllowed,
  normalizeAdminAiArea,
} from './adminAiCapabilities.js';

test('catálogo de capacidades contém apenas áreas ADMIN conhecidas', () => {
  assert.ok(ADMIN_AI_CAPABILITIES.length > 0);
  assert.equal(new Set(ADMIN_AI_CAPABILITIES.map((item) => item.id)).size, ADMIN_AI_CAPABILITIES.length);
  for (const capability of ADMIN_AI_CAPABILITIES) {
    assert.ok(ADMIN_AI_AREAS.includes(capability.area));
    assert.ok(['READ', 'WRITE', 'SENSITIVE_WRITE'].includes(capability.risk));
    if (capability.risk !== 'READ') assert.equal(capability.approvalRequired, true);
  }
});

test('catálogo não cria capacidades de SUPER_ADMIN, segredo, SQL ou troca de tenant', () => {
  const ids = new Set(ADMIN_AI_CAPABILITIES.map((item) => item.id));
  for (const forbidden of ADMIN_AI_STRUCTURAL_DENYLIST) {
    assert.equal(ids.has(forbidden), false, forbidden);
  }
  const serialized = JSON.stringify(ADMIN_AI_CAPABILITIES).toLowerCase();
  assert.equal(serialized.includes('execute_sql'), false);
  assert.equal(serialized.includes('switch_tenant'), false);
  assert.equal(serialized.includes('read_secrets'), false);
});

test('área é contexto visual, enquanto o ADMIN pode delegar capacidades válidas de qualquer área', () => {
  const catalog = adminAiCapabilitiesForArea('catalog');
  assert.ok(catalog.some((item) => item.id === 'CREATE_PRODUCT'));
  assert.ok(catalog.some((item) => item.id === 'ADJUST_PRODUCT_PRICES'));
  assert.equal(catalog.some((item) => item.id === 'UPDATE_BUSINESS_HOURS'), false);

  const allAdminCapabilities = adminAiCapabilitiesForAdmin();
  assert.ok(allAdminCapabilities.some((item) => item.id === 'CREATE_PRODUCT'));
  assert.ok(allAdminCapabilities.some((item) => item.id === 'UPDATE_BUSINESS_HOURS'));

  assert.deepEqual(adminAiCapabilitiesForArea(null), []);
  assert.deepEqual(adminAiCapabilitiesForArea('super_admin'), []);
  assert.equal(normalizeAdminAiArea('settings:hours'), 'settings:hours');
  assert.equal(normalizeAdminAiArea('super_admin'), null);

  assert.equal(assertAdminAiCapabilityAllowed('CREATE_PRODUCT').id, 'CREATE_PRODUCT');
  assert.equal(assertAdminAiCapabilityAllowed('UPDATE_BUSINESS_HOURS').id, 'UPDATE_BUSINESS_HOURS');
  assert.throws(() => assertAdminAiCapabilityAllowed('SUPER_ADMIN'), /não disponível/u);
  assert.throws(() => assertAdminAiCapabilityAllowed('EXECUTE_SQL'), /não disponível/u);
});
