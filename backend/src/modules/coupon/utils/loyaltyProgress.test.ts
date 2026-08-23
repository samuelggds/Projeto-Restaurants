import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateLoyaltyProgress } from './loyaltyProgress.js';

test('libera o primeiro ciclo ao completar a quantidade exigida de compras', () => {
  const progress = calculateLoyaltyProgress({
    purchasesCompleted: 5,
    purchasesRequired: 5,
    perCustomerLimit: 3,
    redemptions: [],
  });

  assert.equal(progress.canRedeem, true);
  assert.equal(progress.redeemableCycle, 1);
  assert.equal(progress.remaining, 0);
  assert.equal(progress.progressPercent, 100);
});

test('avança para o próximo ciclo usando somente as compras feitas após o resgate', () => {
  const progress = calculateLoyaltyProgress({
    purchasesCompleted: 2,
    purchasesRequired: 5,
    perCustomerLimit: 3,
    redemptions: [{ cycle: 1, status: 'CLAIMED' }],
  });

  assert.equal(progress.canRedeem, false);
  assert.equal(progress.nextCycle, 2);
  assert.equal(progress.remaining, 3);
  assert.equal(progress.progressPercent, 40);
});

test('não transforma compras excedentes do ciclo anterior em um segundo resgate', () => {
  const beforeClaim = calculateLoyaltyProgress({
    purchasesCompleted: 12,
    purchasesRequired: 5,
    perCustomerLimit: 3,
    redemptions: [],
  });
  const afterClaim = calculateLoyaltyProgress({
    purchasesCompleted: 0,
    purchasesRequired: 5,
    perCustomerLimit: 3,
    redemptions: [{ cycle: 1, status: 'CLAIMED' }],
  });

  assert.equal(beforeClaim.redeemableCycle, 1);
  assert.equal(afterClaim.canRedeem, false);
  assert.equal(afterClaim.nextCycle, 2);
  assert.equal(afterClaim.remaining, 5);
  assert.equal(afterClaim.progressPercent, 0);
});

test('usar o cupom não reinicia o ciclo uma segunda vez', () => {
  const progress = calculateLoyaltyProgress({
    purchasesCompleted: 2,
    purchasesRequired: 5,
    perCustomerLimit: 3,
    redemptions: [{ cycle: 1, status: 'USED' }],
  });

  assert.equal(progress.nextCycle, 2);
  assert.equal(progress.remaining, 3);
  assert.equal(progress.progressPercent, 40);
});

test('limita apenas recompensas simultaneamente guardadas pelo cliente', () => {
  const progress = calculateLoyaltyProgress({
    purchasesCompleted: 30,
    purchasesRequired: 5,
    perCustomerLimit: 2,
    redemptions: [
      { cycle: 1, status: 'CLAIMED' },
      { cycle: 2, status: 'RESERVED' },
    ],
  });

  assert.equal(progress.canRedeem, false);
  assert.equal(progress.limitReached, true);
  assert.equal(progress.activeRedemptions, 2);
  assert.equal(progress.nextCycle, 3);
  assert.equal(progress.remaining, 0);
});

test('USED e EXPIRED liberam espaço para novo resgate recorrente', () => {
  const progress = calculateLoyaltyProgress({
    purchasesCompleted: 5,
    purchasesRequired: 5,
    perCustomerLimit: 1,
    redemptions: [
      { cycle: 1, status: 'USED' },
      { cycle: 2, status: 'EXPIRED' },
    ],
  });

  assert.equal(progress.limitReached, false);
  assert.equal(progress.canRedeem, true);
  assert.equal(progress.redeemableCycle, 3);
});
