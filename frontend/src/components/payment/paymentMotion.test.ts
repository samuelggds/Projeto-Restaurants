import { describe, expect, it } from 'vitest';
import { PAYMENT_CARD_OPEN_DURATION_MS } from './paymentMotion';

describe('payment motion', () => {
  it('mantém a abertura do formulário de cartão suave sem ficar lenta demais', () => {
    expect(PAYMENT_CARD_OPEN_DURATION_MS).toBeGreaterThanOrEqual(400);
    expect(PAYMENT_CARD_OPEN_DURATION_MS).toBeLessThanOrEqual(520);
  });
});
