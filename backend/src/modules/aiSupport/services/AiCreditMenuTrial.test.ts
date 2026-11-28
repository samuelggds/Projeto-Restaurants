import assert from 'node:assert/strict';
import test from 'node:test';
import { aiCreditAccess, AiCreditService, MENU_PHOTO_PREVIEW_FEATURE, PremiumAiPlanRequiredError } from './AiCreditService.js';

const now = new Date('2026-11-27T18:00:00Z');
const trial = {
  plan: 'BASICO', status: 'TESTE', trialEndsAt: new Date('2026-12-01T18:00:00Z'),
  restaurant: { active: true, accessBlockReason: 'NONE', billingTemporaryAccessUntil: null },
};

test('teste do Básico libera somente a análise por foto e somente até o término', () => {
  assert.equal(aiCreditAccess(trial, MENU_PHOTO_PREVIEW_FEATURE, now), 'trialPhoto');
  for (const feature of [undefined, 'MENU_IMPORT_IMAGE', 'PRODUCT_IMAGE_GENERATION', 'ADMIN_ASSISTANT']) {
    assert.throws(() => aiCreditAccess(trial, feature, now), PremiumAiPlanRequiredError);
  }
  for (const subscription of [
    null, { ...trial, status: 'ATIVA' }, { ...trial, trialEndsAt: now }, { ...trial, trialEndsAt: null },
    { ...trial, restaurant: { ...trial.restaurant, active: false } },
    { ...trial, restaurant: { ...trial.restaurant, accessBlockReason: 'FINANCIAL' } },
  ]) {
    assert.throws(() => aiCreditAccess(subscription, MENU_PHOTO_PREVIEW_FEATURE, now), PremiumAiPlanRequiredError);
  }
  assert.equal(aiCreditAccess({ ...trial, plan: 'PREMIUM' }, 'ADMIN_ASSISTANT', now), 'premium');
});

test('créditos de análise esgotados permitem seguir pelo cadastro manual', async (t) => {
  const service = new AiCreditService();
  t.mock.method(service, 'getBalance', async () => ({ exhausted: true }));
  await assert.rejects(service.assertAvailable({ userId: 3, restaurantId: 7 }, MENU_PHOTO_PREVIEW_FEATURE),
    /cadastrar os produtos manualmente/);
});
