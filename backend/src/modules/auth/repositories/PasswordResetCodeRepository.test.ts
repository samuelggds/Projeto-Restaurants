import assert from 'node:assert/strict';
import test from 'node:test';
import prisma from '../../../config/prisma.js';
import repository from './PasswordResetCodeRepository.js';

const requestedAt = new Date('2026-09-07T12:00:00.000Z');
const input = {
  userId: 12,
  authVersion: 4,
  previousCodeHash: 'previous-hash',
  codeHash: 'new-hash',
  requestedAt,
  resetAttempts: false,
};

test('one conditional write guards time, prior code, auth version and recovery lock', async (t) => {
  const update = t.mock.method(prisma.user, 'updateMany', async () => ({ count: 1 }));
  assert.equal(await repository.claim(input), true);
  assert.equal(update.mock.callCount(), 1);
  const { where, data } = update.mock.calls[0].arguments[0];
  assert.deepEqual(where, {
    id: 12,
    authVersion: 4,
    resetPasswordCodeHash: 'previous-hash',
    AND: [
      {
        OR: [
          { resetPasswordCodeExpiresAt: null },
          { resetPasswordCodeExpiresAt: { lte: new Date('2026-09-07T12:14:30.000Z') } },
        ],
      },
      {
        OR: [
          { resetPasswordLockedUntil: null },
          { resetPasswordLockedUntil: { lte: requestedAt } },
        ],
      },
    ],
  });
  assert.deepEqual(data, {
    resetPasswordCodeHash: 'new-hash',
    resetPasswordCodeExpiresAt: new Date('2026-09-07T12:15:00.000Z'),
  });
});

test('no changed row means a lost claim, not permission to send', async (t) => {
  t.mock.method(prisma.user, 'updateMany', async () => ({ count: 0 }));
  assert.equal(await repository.claim(input), false);
});

test('attempts are reset only when the caller has established code expiry', async (t) => {
  const update = t.mock.method(prisma.user, 'updateMany', async () => ({ count: 1 }));
  await repository.claim({ ...input, previousCodeHash: null, resetAttempts: true });
  const { data } = update.mock.calls[0].arguments[0];
  assert.equal(data.resetPasswordFailedAttempts, 0);
  assert.equal(data.resetPasswordLockedUntil, null);
});
