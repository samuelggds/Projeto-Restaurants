import bcrypt from 'bcrypt';
import prisma from '../../../config/prisma.js';
import userRepository from '../repositories/UserRepository.js';
import { encryptCredential, decryptCredential } from '../../restaurantSettings/security/credentialEncryption.js';
import { generateTotpSecret, totpProvisioningUri, verifyTotpCode } from '../security/totp.js';

const PENDING_TTL_MS = 10 * 60_000;
const MAX_PENDING_ATTEMPTS = 5;
const context = (userId: number) => `authenticator:totp:user:${userId}`;

function requireAdministrator(user: { role: string; active: boolean } | null) {
  if (!user?.active || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    throw new Error('Esta opção é exclusiva da conta administrativa autenticada.');
  }
}

async function verifyPassword(userId: number, password: string) {
  if (!password || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Confirme sua senha atual para configurar o autenticador.');
  }
  const user = await userRepository.findByIdWithPassword(userId);
  requireAdministrator(user);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error('Senha atual inválida.');
  }
  return user;
}

export async function getTotpStatus(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, active: true, mfaTotpEnabled: true },
  });
  requireAdministrator(user);
  return { enabled: user?.mfaTotpEnabled === true };
}

export async function startTotpEnrollment(userId: number, password: string) {
  const user = await verifyPassword(userId, password);
  if (user.mfaTotpEnabled) throw new Error('O aplicativo autenticador já está ativo.');
  const secret = generateTotpSecret();
  // Separate per-user AAD prevents another account's encrypted secret from
  // being swapped in and accepted during enrollment or verification.
  const encrypted = encryptCredential(secret, context(userId));
  if (!encrypted || !encrypted.startsWith('enc:v1:')) {
    throw new Error('A chave de proteção do autenticador não está disponível.');
  }
  await prisma.authTotpCredential.upsert({
    where: { userId },
    create: {
      userId,
      pendingSecretCiphertext: encrypted,
      pendingExpiresAt: new Date(Date.now() + PENDING_TTL_MS),
      pendingFailedAttempts: 0,
    },
    update: {
      pendingSecretCiphertext: encrypted,
      pendingExpiresAt: new Date(Date.now() + PENDING_TTL_MS),
      pendingFailedAttempts: 0,
    },
  });
  return {
    secret,
    provisioningUri: totpProvisioningUri(secret, user.email),
    expiresAfterSeconds: 600,
    message: 'Insira o segredo no aplicativo e confirme o código de seis dígitos.',
  };
}

export async function confirmTotpEnrollment(userId: number, code: string) {
  if (!/^\d{6}$/u.test(String(code || ''))) throw new Error('Código inválido.');
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { active: true, role: true, mfaTotpEnabled: true, authVersion: true },
    });
    requireAdministrator(user);
    if (user?.mfaTotpEnabled) throw new Error('O autenticador já está ativo.');

    const pending = await tx.authTotpCredential.findUnique({ where: { userId } });
    if (
      !pending?.pendingSecretCiphertext ||
      !pending.pendingExpiresAt ||
      pending.pendingExpiresAt.getTime() <= Date.now() ||
      pending.pendingFailedAttempts >= MAX_PENDING_ATTEMPTS
    ) throw new Error('Configuração expirada. Inicie novamente com sua senha.');

    const secret = decryptCredential(pending.pendingSecretCiphertext, context(userId));
    const step = secret ? verifyTotpCode(secret, code) : null;
    if (step === null) {
      const next = await tx.authTotpCredential.update({
        where: { userId },
        data: { pendingFailedAttempts: { increment: 1 } },
        select: { pendingFailedAttempts: true },
      });
      if (next.pendingFailedAttempts >= MAX_PENDING_ATTEMPTS) {
        // Prevent online guessing of the pending secret; a new attempt requires
        // the account password via the start route.
        await tx.authTotpCredential.update({
          where: { userId },
          data: { pendingSecretCiphertext: null, pendingExpiresAt: null },
        });
      }
      return { enabled: false, error: 'Código inválido ou expirado.' };
    }

    const claimed = await tx.authTotpCredential.updateMany({
      where: {
        userId,
        pendingSecretCiphertext: pending.pendingSecretCiphertext,
        pendingExpiresAt: { gt: new Date() },
        pendingFailedAttempts: { lt: MAX_PENDING_ATTEMPTS },
        secretCiphertext: null,
      },
      data: {
        secretCiphertext: pending.pendingSecretCiphertext,
        pendingSecretCiphertext: null,
        pendingExpiresAt: null,
        pendingFailedAttempts: 0,
        lastUsedStep: step,
      },
    });
    if (claimed.count !== 1) throw new Error('Configuração alterada. Tente novamente.');
    const updated = await tx.user.updateMany({
      where: { id: userId, authVersion: user!.authVersion, active: true, mfaTotpEnabled: false },
      data: { mfaTotpEnabled: true, mfaEnabled: true, authVersion: { increment: 1 } },
    });
    if (updated.count !== 1) throw new Error('Conta alterada. Tente novamente.');
    await tx.authRefreshSession.deleteMany({ where: { userId } });
    await tx.authMfaChallenge.deleteMany({ where: { userId } });
    return { enabled: true, reauthenticationRequired: true };
  }).then((result) => {
    if ('error' in result) throw new Error(result.error);
    return result;
  });
}
