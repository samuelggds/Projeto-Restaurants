import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import type { Prisma } from '@prisma/client';
import { PasswordResetCodeRepository } from './PasswordResetCodeRepository.js';

const requestedAt = new Date('2026-09-07T12:00:00.000Z');
const input = {
  userId: 12,
  authVersion: 4,
  previousCodeHash: 'previous-hash',
  codeHash: 'new-hash',
  requestedAt,
  resetAttempts: false,
};

function setup(t: TestContext, count = 1) {
  const calls: Prisma.UserUpdateManyArgs[] = [];
  const updateMany = t.mock.fn(async (args: Prisma.UserUpdateManyArgs) => {
    calls.push(args);
    return { count };
  });
  // Inject a real function instead of monkey-patching Prisma's dynamic proxy.
  const repository = new PasswordResetCodeRepository({ user: { updateMany } });
  return { repository, calls, updateMany };
}

test('one conditional write guards time, prior code, auth version and recovery lock', async (t) => {
  const { repository, calls, updateMany } = setup(t);
  assert.equal(await repository.claim(input), true);
  assert.equal(updateMany.mock.callCount(), 1);
  const { where, data } = calls[0];
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
  const { repository } = setup(t, 0);
  assert.equal(await repository.claim(input), false);
});

test('attempts are reset only when the caller has established code expiry', async (t) => {
  const { repository, calls } = setup(t);
  await repository.claim({ ...input, previousCodeHash: null, resetAttempts: true });
  const { data } = calls[0];
  assert.equal(data.resetPasswordFailedAttempts, 0);
  assert.equal(data.resetPasswordLockedUntil, null);
});
