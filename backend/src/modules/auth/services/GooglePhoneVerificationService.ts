import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../../../config/prisma.js';
import {
  decryptCredential,
  encryptCredential,
} from '../../restaurantSettings/security/credentialEncryption.js';
import userRepository from '../repositories/UserRepository.js';
import { validatePassword, validateStrongPassword } from '../security/passwordPolicy.js';

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const SAFE_SMS_MESSAGE =
  'Se o número estiver habilitado para recuperação, enviaremos um código por SMS.';

type PhonePurpose = 'ENROLLMENT' | 'PASSWORD_RESET';

function enabled() {
  return String(process.env.GOOGLE_PHONE_AUTH_ENABLED || 'false').trim().toLowerCase() === 'true';
}

function apiKey() {
  return String(process.env.GOOGLE_IDENTITY_PLATFORM_API_KEY || '').trim();
}

export function isGooglePhoneAuthConfigured() {
  return enabled() && Boolean(apiKey());
}

function extractRecaptchaSiteKey(value: unknown) {
  const resourceName = String(value || '').trim();
  const match = resourceName.match(/\/keys\/([A-Za-z0-9_-]{20,200})$/u);
  return match?.[1] || '';
}

async function fetchIdentityPlatformRecaptchaSiteKey() {
  if (!isGooglePhoneAuthConfigured()) return '';

  const endpoint = new URL('https://identitytoolkit.googleapis.com/v2/recaptchaConfig');
  endpoint.searchParams.set('key', apiKey());
  endpoint.searchParams.set('clientType', 'CLIENT_TYPE_WEB');
  endpoint.searchParams.set('version', 'RECAPTCHA_ENTERPRISE');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) return '';

    return extractRecaptchaSiteKey(payload.recaptchaKey);
  } catch {
    return '';
  } finally {
    clearTimeout(timeout);
  }
}

export async function googlePhonePublicConfig() {
  if (!isGooglePhoneAuthConfigured()) {
    return { enabled: false, siteKey: null };
  }

  const siteKey = await fetchIdentityPlatformRecaptchaSiteKey();
  if (!siteKey) {
    console.error('[phone-auth-config] Chave WEB do reCAPTCHA do Identity Platform indisponível.');
    return { enabled: false, siteKey: null };
  }

  return { enabled: true, siteKey };
}

export function normalizePhoneE164Br(value: unknown) {
  const digits = String(value || '').replace(/\D/gu, '');
  if (/^55\d{10,11}$/u.test(digits)) return `+${digits}`;
  if (/^\d{10,11}$/u.test(digits)) return `+55${digits}`;
  return '';
}

function maskPhone(e164: string) {
  const digits = e164.replace(/\D/gu, '');
  return digits ? `+55 ** *****${digits.slice(-4)}` : 'seu telefone cadastrado';
}

function challengeContext(id: string) {
  return `phone-verification:${id}`;
}

function googleEndpoint(method: 'sendVerificationCode' | 'signInWithPhoneNumber') {
  return `https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${encodeURIComponent(
    apiKey(),
  )}`;
}

async function googleRequest<T>(method: 'sendVerificationCode' | 'signInWithPhoneNumber', body: object) {
  if (!isGooglePhoneAuthConfigured()) {
    throw new Error('Recuperação por SMS ainda não está configurada.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(googleEndpoint(method), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Firebase-Locale': 'pt-BR',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, any>;
    if (!response.ok) {
      const providerCode = String(payload?.error?.message || '').trim();
      throw new Error(providerCode ? `Google recusou a verificação (${providerCode}).` : 'Google recusou a verificação.');
    }
    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Tempo limite ao solicitar a verificação por SMS.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendVerificationCode(phoneE164: string, captchaResponse: unknown) {
  const captcha = String(captchaResponse || '').trim();
  if (captcha.length < 20 || captcha.length > 8192) {
    throw new Error('Validação antiabuso ausente ou inválida.');
  }

  const result = await googleRequest<{ sessionInfo?: string }>('sendVerificationCode', {
    phoneNumber: phoneE164,
    captchaResponse: captcha,
    clientType: 'CLIENT_TYPE_WEB',
    recaptchaVersion: 'RECAPTCHA_ENTERPRISE',
  });
  const sessionInfo = String(result.sessionInfo || '').trim();
  if (!sessionInfo) throw new Error('O provedor não retornou uma sessão de verificação.');
  return sessionInfo;
}

async function verifyCode(sessionInfo: string, code: unknown) {
  const normalizedCode = String(code || '').replace(/\D/gu, '');
  if (!/^\d{6}$/u.test(normalizedCode)) throw new Error('Código inválido ou expirado.');

  const result = await googleRequest<{ phoneNumber?: string }>('signInWithPhoneNumber', {
    sessionInfo,
    code: normalizedCode,
  });
  const phoneE164 = normalizePhoneE164Br(result.phoneNumber);
  if (!phoneE164) throw new Error('Código inválido ou expirado.');
  return phoneE164;
}

async function createChallenge(userId: number, purpose: PhonePurpose, phoneE164: string, sessionInfo: string) {
  const id = crypto.randomUUID();
  await prisma.phoneVerificationChallenge.deleteMany({
    where: { userId, purpose },
  });
  await prisma.phoneVerificationChallenge.create({
    data: {
      id,
      userId,
      purpose,
      phoneE164,
      sessionInfoCiphertext:
        encryptCredential(sessionInfo, challengeContext(id)) ||
        (() => {
          throw new Error('Não foi possível proteger a sessão de verificação.');
        })(),
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });
  return id;
}

async function readChallenge(id: unknown, purpose: PhonePurpose, userId?: number) {
  const challengeId = String(id || '').trim();
  if (!/^[0-9a-f-]{36}$/iu.test(challengeId)) return null;
  const record = await prisma.phoneVerificationChallenge.findFirst({
    where: {
      id: challengeId,
      purpose,
      ...(userId ? { userId } : {}),
      consumedAt: null,
      expiresAt: { gt: new Date() },
      failedAttempts: { lt: MAX_ATTEMPTS },
    },
    include: { user: true },
  });
  return record;
}

async function recordFailure(id: string) {
  await prisma.phoneVerificationChallenge.updateMany({
    where: { id, consumedAt: null, failedAttempts: { lt: MAX_ATTEMPTS } },
    data: { failedAttempts: { increment: 1 } },
  });
  const current = await prisma.phoneVerificationChallenge.findUnique({
    where: { id },
    select: { failedAttempts: true },
  });
  if (Number(current?.failedAttempts || 0) >= MAX_ATTEMPTS) {
    await prisma.phoneVerificationChallenge.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }
}

async function verifyChallenge(record: NonNullable<Awaited<ReturnType<typeof readChallenge>>>, code: unknown) {
  const sessionInfo = decryptCredential(
    record.sessionInfoCiphertext,
    challengeContext(record.id),
  );
  if (!sessionInfo) throw new Error('Código inválido ou expirado.');

  try {
    const verifiedPhone = await verifyCode(sessionInfo, code);
    if (verifiedPhone !== record.phoneE164) throw new Error('Código inválido ou expirado.');
    return verifiedPhone;
  } catch {
    await recordFailure(record.id);
    throw new Error('Código inválido ou expirado.');
  }
}

export class GooglePhoneVerificationService {
  async config() {
    return googlePhonePublicConfig();
  }

  async requestEnrollment(userId: number, currentPassword: unknown, captchaResponse: unknown) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user || !user.active || String(user.role || '').toUpperCase() !== 'CLIENTE') {
      throw new Error('Conta indisponível para ativar recuperação por SMS.');
    }

    const passwordOk = await bcrypt.compare(String(currentPassword || ''), user.password);
    if (!passwordOk) throw new Error('Senha atual incorreta.');

    const phoneE164 = normalizePhoneE164Br(user.phone);
    if (!phoneE164) throw new Error('Cadastre um telefone válido antes de ativar a recuperação por SMS.');

    const sessionInfo = await sendVerificationCode(phoneE164, captchaResponse);
    const challengeId = await createChallenge(user.id, 'ENROLLMENT', phoneE164, sessionInfo);

    return {
      challengeId,
      destination: maskPhone(phoneE164),
      expiresInSeconds: Math.floor(CHALLENGE_TTL_MS / 1000),
    };
  }

  async confirmEnrollment(userId: number, challengeId: unknown, code: unknown) {
    const record = await readChallenge(challengeId, 'ENROLLMENT', userId);
    if (!record) throw new Error('Código inválido ou expirado.');

    const currentPhone = normalizePhoneE164Br(record.user.phone);
    if (!currentPhone || currentPhone !== record.phoneE164) {
      throw new Error('O telefone da conta mudou. Solicite um novo código.');
    }

    await verifyChallenge(record, code);
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { phoneVerifiedAt: now },
      });
      await tx.phoneVerificationChallenge.update({
        where: { id: record.id },
        data: { consumedAt: now },
      });
    });

    return { phoneVerifiedAt: now, destination: maskPhone(record.phoneE164) };
  }

  async requestPasswordReset(phone: unknown, captchaResponse: unknown) {
    if (!isGooglePhoneAuthConfigured()) {
      throw new Error('Recuperação por SMS ainda não está configurada.');
    }

    const phoneE164 = normalizePhoneE164Br(phone);
    const fakeChallengeId = crypto.randomUUID();
    if (!phoneE164) return { message: SAFE_SMS_MESSAGE, challengeId: fakeChallengeId };

    const user = await userRepository.findByPhone(phoneE164);
    if (
      !user ||
      String(user.role || '').toUpperCase() !== 'CLIENTE' ||
      !user.phoneVerifiedAt ||
      normalizePhoneE164Br(user.phone) !== phoneE164
    ) {
      return { message: SAFE_SMS_MESSAGE, challengeId: fakeChallengeId };
    }

    try {
      const sessionInfo = await sendVerificationCode(phoneE164, captchaResponse);
      const challengeId = await createChallenge(user.id, 'PASSWORD_RESET', phoneE164, sessionInfo);
      return { message: SAFE_SMS_MESSAGE, challengeId };
    } catch {
      // A resposta pública não pode revelar se o telefone existe, está verificado
      // ou se o provedor recusou o desafio antiabuso.
      console.error('[password-reset-sms] Nao foi possivel concluir o envio solicitado.');
      return { message: SAFE_SMS_MESSAGE, challengeId: fakeChallengeId };
    }
  }

  async resetPassword({
    challengeId,
    code,
    newPassword,
    confirmPassword,
  }: {
    challengeId: unknown;
    code: unknown;
    newPassword: string;
    confirmPassword: string;
  }) {
    if (newPassword !== confirmPassword) throw new Error('As senhas não coincidem.');

    const record = await readChallenge(challengeId, 'PASSWORD_RESET');
    if (
      !record ||
      String(record.user.role || '').toUpperCase() !== 'CLIENTE' ||
      !record.user.phoneVerifiedAt ||
      normalizePhoneE164Br(record.user.phone) !== record.phoneE164
    ) {
      throw new Error('Código inválido ou expirado.');
    }

    await verifyChallenge(record, code);

    const requiresStrongPassword =
      record.user.mustChangePassword || String(record.user.role || '').toUpperCase() === 'SUPER_ADMIN';
    if (requiresStrongPassword) validateStrongPassword(newPassword);
    else validatePassword(newPassword, 'A nova senha');

    const passwordHash = await bcrypt.hash(newPassword, requiresStrongPassword ? 12 : 10);
    const now = new Date();
    const changed = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: record.userId,
          authVersion: record.user.authVersion,
          phoneVerifiedAt: { not: null },
        },
        data: {
          password: passwordHash,
          resetPasswordCodeHash: null,
          resetPasswordCodeExpiresAt: null,
          resetPasswordFailedAttempts: 0,
          resetPasswordLockedUntil: null,
          mustChangePassword: false,
          active: true,
          authVersion: { increment: 1 },
        },
      });
      if (updated.count !== 1) return false;
      await tx.authRefreshSession.deleteMany({ where: { userId: record.userId } });
      await tx.phoneVerificationChallenge.update({
        where: { id: record.id },
        data: { consumedAt: now },
      });
      return true;
    });

    if (!changed) throw new Error('Código inválido ou expirado.');
    return { message: 'Senha redefinida com sucesso.' };
  }
}

export default new GooglePhoneVerificationService();
