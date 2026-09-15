import assert from 'node:assert/strict';
import test from 'node:test';
import { adminAiActionProposalSchema } from './adminAiActionProposal.js';

test('aceita ações operacionais conhecidas com dados mínimos válidos', () => {
  assert.equal(
    adminAiActionProposalSchema.parse({
      actionType: 'TOGGLE_PRODUCT_AVAILABILITY',
      active: false,
      productIds: [10],
    }).actionType,
    'TOGGLE_PRODUCT_AVAILABILITY',
  );

  assert.equal(
    adminAiActionProposalSchema.parse({
      actionType: 'UPDATE_ORDER_STATUS',
      orderId: 25,
      status: 'PREPARANDO',
    }).actionType,
    'UPDATE_ORDER_STATUS',
  );

  assert.equal(
    adminAiActionProposalSchema.parse({
      actionType: 'UPDATE_WHATSAPP_SETTINGS',
      whatsappEnabled: true,
      whatsapp: '5585999999999',
    }).actionType,
    'UPDATE_WHATSAPP_SETTINGS',
  );
});

test('rejeita ações arbitrárias, SUPER_ADMIN e execução genérica', () => {
  for (const actionType of ['EXECUTE_SQL', 'EXECUTE_SHELL', 'SWITCH_TENANT', 'SUPER_ADMIN']) {
    assert.equal(
      adminAiActionProposalSchema.safeParse({ actionType, command: 'anything' }).success,
      false,
      actionType,
    );
  }
});

test('schema de WhatsApp não aceita token, chave ou segredo do provedor', () => {
  const parsed = adminAiActionProposalSchema.safeParse({
    actionType: 'UPDATE_WHATSAPP_SETTINGS',
    whatsappEnabled: true,
    whatsapp: '5585999999999',
    whatsappAccessToken: 'segredo',
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal('whatsappAccessToken' in parsed.data, false);
  assert.equal('token' in parsed.data, false);
  assert.equal('secret' in parsed.data, false);
});

test('alterações exigem alvo/campo explícito em vez de atualização vazia', () => {
  assert.equal(
    adminAiActionProposalSchema.safeParse({ actionType: 'UPDATE_PRODUCT', productId: 1 }).success,
    false,
  );
  assert.equal(
    adminAiActionProposalSchema.safeParse({ actionType: 'UPDATE_DELIVERY_SETTINGS' }).success,
    false,
  );
  assert.equal(
    adminAiActionProposalSchema.safeParse({
      actionType: 'TOGGLE_PRODUCT_AVAILABILITY',
      active: false,
    }).success,
    false,
  );
});
