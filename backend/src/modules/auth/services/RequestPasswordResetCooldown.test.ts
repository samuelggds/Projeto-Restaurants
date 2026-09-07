import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import userRepository from '../repositories/UserRepository.js';
import passwordResetCodeRepository from '../repositories/PasswordResetCodeRepository.js';
import requestPasswordResetService from './RequestPasswordResetService.js';
import { PASSWORD_RESET_CODE_TTL_MS } from '../security/passwordResetCooldown.js';

const now = new Date('2026-09-07T12:00:00.000Z');
const safeResponse = {
  message: 'Se os dados informados existirem, enviamos um codigo para redefinir a senha.',
};
type ResetUser = NonNullable<Awaited<ReturnType<typeof userRepository.findByEmail>>>;

function setup(t: TestContext, changes: Partial<ResetUser> = {}) {
  t.mock.timers.enable({ apis: ['Date'], now });
  const environment = {
    NODE_ENV: 'test',
    SMTP_HOST: 'smtp.example.test',
    SMTP_PORT: '587',
    SMTP_AUTH_TYPE: 'basic',
    SMTP_USER: 'mailer@example.test',
    SMTP_PASS: 'test-only-password',
    ALERT_EMAIL_FROM: 'GastroNexa <mailer@example.test>',
  };
  for (const [name, value] of Object.entries(environment)) {
    const previous = process.env[name];
    process.env[name] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[name];
      else process.env[name] = previous;
    });
  }
  const user = {
    id: 12,
    authVersion: 2,
    email: 'cliente@example.test',
    resetPasswordCodeHash: null,
    resetPasswordCodeExpiresAt: null,
    resetPasswordLockedUntil: null,
    ...changes,
  } as ResetUser;
  const emailLookup = t.mock.method(userRepository, 'findByEmail', async () => user);
  const phoneLookup = t.mock.method(userRepository, 'findByPhone', async () => user);
  const claim = t.mock.method(passwordResetCodeRepository, 'claim', async () => true);
  t.mock.method(bcrypt, 'hash', (async () => 'new-test-code-hash') as typeof bcrypt.hash);
  const messages: nodemailer.SendMailOptions[] = [];
  t.mock.method(
    nodemailer,
    'createTransport',
    (() => ({
      sendMail: async (options: nodemailer.SendMailOptions) => {
        messages.push(options);
        return {};
      },
    })) as typeof nodemailer.createTransport,
  );
  return { user, emailLookup, phoneLookup, claim, messages };
}

test('first request claims the code before sending the GastroNexa email', async (t) => {
  const state = setup(t);
  const result = await requestPasswordResetService.execute({ email: 'CLIENTE@example.test' });
  assert.deepEqual(result, safeResponse);
  assert.equal(state.claim.mock.callCount(), 1);
  assert.equal(state.messages.length, 1);
  assert.equal(state.messages[0].subject, 'Recuperação de senha - GastroNexa');
  assert.match(String(state.messages[0].text), /GastroNexa/);
  assert.doesNotMatch(String(state.messages[0].subject), /Peca ja food/);
  assert.equal(state.messages[0].to, state.user.email);
  assert.equal(state.messages[0].from, 'GastroNexa <mailer@example.test>');
  const input = state.claim.mock.calls[0].arguments[0];
  assert.equal(input.userId, state.user.id);
  assert.equal(input.authVersion, state.user.authVersion);
  assert.equal(input.previousCodeHash, null);
  assert.equal(input.resetAttempts, true);
});

test('unknown accounts keep the same public response and send nothing', async (t) => {
  const state = setup(t);
  state.emailLookup.mock.mockImplementation(async () => null);
  assert.deepEqual(
    await requestPasswordResetService.execute({ email: 'unknown@example.test' }),
    safeResponse,
  );
  assert.equal(state.claim.mock.callCount(), 0);
  assert.equal(state.messages.length, 0);
});

test('a request at 29.999 seconds does not replace the code or send another email', async (t) => {
  const state = setup(t, {
    resetPasswordCodeHash: 'existing-code',
    resetPasswordCodeExpiresAt: new Date(now.getTime() + PASSWORD_RESET_CODE_TTL_MS - 29_999),
  });
  assert.deepEqual(
    await requestPasswordResetService.execute({ email: state.user.email }),
    safeResponse,
  );
  assert.equal(state.claim.mock.callCount(), 0);
  assert.equal(state.messages.length, 0);
  assert.equal(state.user.resetPasswordCodeHash, 'existing-code');
});

test('a request at 30 seconds may send again without resetting failed attempts', async (t) => {
  const state = setup(t, {
    resetPasswordCodeHash: 'existing-code',
    resetPasswordCodeExpiresAt: new Date(now.getTime() + PASSWORD_RESET_CODE_TTL_MS - 30_000),
    resetPasswordFailedAttempts: 3,
  });
  await requestPasswordResetService.execute({ email: state.user.email });
  assert.equal(state.messages.length, 1);
  assert.equal(state.claim.mock.calls[0].arguments[0].resetAttempts, false);
});

test('a rejected atomic claim cannot send or expose account state', async (t) => {
  const state = setup(t);
  state.claim.mock.mockImplementation(async () => false);
  assert.deepEqual(
    await requestPasswordResetService.execute({ email: state.user.email }),
    safeResponse,
  );
  assert.equal(state.messages.length, 0);
});

test('parallel requests send only the code whose atomic claim wins', async (t) => {
  const state = setup(t);
  let claimed = false;
  state.claim.mock.mockImplementation(async () => {
    if (claimed) return false;
    claimed = true;
    return true;
  });
  const results = await Promise.all([
    requestPasswordResetService.execute({ email: state.user.email }),
    requestPasswordResetService.execute({ email: state.user.email }),
  ]);
  assert.deepEqual(results, [safeResponse, safeResponse]);
  assert.equal(state.messages.length, 1);
});

test('changing to phone lookup does not bypass the same account cooldown', async (t) => {
  const state = setup(t, {
    resetPasswordCodeExpiresAt: new Date(now.getTime() + PASSWORD_RESET_CODE_TTL_MS),
  });
  assert.deepEqual(
    await requestPasswordResetService.execute({ phone: '85999999999' }),
    safeResponse,
  );
  assert.equal(state.phoneLookup.mock.callCount(), 1);
  assert.equal(state.claim.mock.callCount(), 0);
  assert.equal(state.messages.length, 0);
});

test('an existing recovery lock is still respected', async (t) => {
  const state = setup(t, { resetPasswordLockedUntil: new Date(now.getTime() + 60_000) });
  assert.deepEqual(
    await requestPasswordResetService.execute({ email: state.user.email }),
    safeResponse,
  );
  assert.equal(state.claim.mock.callCount(), 0);
  assert.equal(state.messages.length, 0);
});
