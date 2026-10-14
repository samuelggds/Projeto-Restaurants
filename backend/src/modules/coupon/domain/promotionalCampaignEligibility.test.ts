import assert from 'node:assert/strict';
import test from 'node:test';
import { isPromotionalAudienceEligible, promotionalCampaignAvailability } from './promotionalCampaignEligibility.js';

const campaign = {
  active: true, expiration: null, usageLimit: 10, usageCount: 0,
  perCustomerLimit: 1, audience: 'ALL' as const,
};
const now = new Date('2026-10-14T12:00:00Z');

test('todos pode aparecer para visitante e cliente, mas primeira compra só para quem não comprou', () => {
  assert.equal(isPromotionalAudienceEligible('ALL', 0), true);
  assert.equal(isPromotionalAudienceEligible('ALL', 3), true);
  assert.equal(isPromotionalAudienceEligible('NEW_CUSTOMERS', 0), true);
  assert.equal(isPromotionalAudienceEligible('NEW_CUSTOMERS', 1), false);
  assert.equal(isPromotionalAudienceEligible('RETURNING_CUSTOMERS', 0), false);
  assert.equal(isPromotionalAudienceEligible('RETURNING_CUSTOMERS', 2), true);
});

test('campanhas ativas deixam de ser aplicáveis ao expirar ou atingir limites', () => {
  assert.equal(promotionalCampaignAvailability(campaign, 0, 0, now).status, 'ACTIVE');
  assert.match(promotionalCampaignAvailability({ ...campaign, active: false }, 0, 0, now).inactiveReason || '', /Desativado/);
  assert.match(promotionalCampaignAvailability({ ...campaign, expiration: new Date('2026-10-13T00:00:00Z') }, 0, 0, now).inactiveReason || '', /Prazo/);
  assert.match(promotionalCampaignAvailability({ ...campaign, usageCount: 10 }, 0, 0, now).inactiveReason || '', /Limite total/);
  assert.match(promotionalCampaignAvailability(campaign, 0, 1, now).inactiveReason || '', /por cliente/);
  assert.equal(promotionalCampaignAvailability({ ...campaign, audience: 'NEW_CUSTOMERS' }, 1, 0, now).status, 'INACTIVE');
});
