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

test('schema rejeita token, segredo e tentativa de escolher restaurantId', () => {
  for (const extra of [
    { whatsappAccessToken: 'segredo' },
    { apiKey: 'segredo' },
    { restaurantId: 999 },
  ]) {
    assert.equal(
      adminAiActionProposalSchema.safeParse({
        actionType: 'UPDATE_WHATSAPP_SETTINGS',
        whatsappEnabled: true,
        whatsapp: '5585999999999',
        ...extra,
      }).success,
      false,
    );
  }
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
