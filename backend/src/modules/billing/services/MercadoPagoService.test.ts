import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BILLING_PIX_EXPIRATION_DAYS,
  getBillingPixExpiresAt,
} from './MercadoPagoService.js';

test('Pix da mensalidade expira exatamente sete dias depois da geracao', () => {
  const now = Date.parse('2026-10-01T12:00:00.000Z');
  const expiresAt = Date.parse(getBillingPixExpiresAt(now));

  assert.equal(BILLING_PIX_EXPIRATION_DAYS, 7);
  assert.equal(expiresAt - now, 7 * 24 * 60 * 60 * 1000);
});
