import bcrypt from 'bcrypt';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import userRepository from '../repositories/UserRepository.js';
import { forgotPasswordSchema } from '../../../validators/ForgotPasswordValidator.js';

function createTransporter() {
  const smtpHost = String(process.env.SMTP_HOST || '').trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const smtpAuthType = String(process.env.SMTP_AUTH_TYPE || 'basic')
    .trim()
    .toLowerCase();
  const smtpUser = String(process.env.SMTP_USER || '').trim();
  const smtpPass = String(process.env.SMTP_PASS || '').trim();
  const smtpClientId = String(process.env.SMTP_CLIENT_ID || '').trim();
  const smtpClientSecret = String(process.env.SMTP_CLIENT_SECRET || '').trim();
  const smtpRefreshToken = String(process.env.SMTP_REFRESH_TOKEN || '').trim();
  const smtpAccessToken = String(process.env.SMTP_ACCESS_TOKEN || '').trim();

  if (!smtpHost || !smtpPort || !smtpUser) {
    return null;
  }

  if (smtpAuthType === 'oauth2') {
    if (!smtpClientId || !smtpClientSecret || !smtpRefreshToken) {
      return null;
    }

    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      requireTLS: true,
      auth: {
        type: 'OAuth2',
        user: smtpUser,
        clientId: smtpClientId,
        clientSecret: smtpClientSecret,
        refreshToken: smtpRefreshToken,
        accessToken: smtpAccessToken || undefined,
      },
    });
  }

  if (!smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    requireTLS: true,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

function isBasicAuthDisabledError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();

  return normalized.includes('535') && normalized.includes('basic authentication is disabled');
}

export function canLogPasswordResetCode(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv !== 'production';
}

class RequestPasswordResetService {
  async execute({ email, phone }: { email?: string; phone?: string }) {
    forgotPasswordSchema.parse({ email, phone });

    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();
    const normalizedPhone = String(phone || '').trim();

    const user = normalizedEmail
      ? await userRepository.findByEmail(normalizedEmail)
      : await userRepository.findByPhone(normalizedPhone);

    // Always return the same response to avoid exposing registered emails.
    const safeMessage =
      'Se os dados informados existirem, enviamos um codigo para redefinir a senha.';

    if (!user) {
      return { message: safeMessage };
    }

    const now = new Date();
    if (
      user.resetPasswordLockedUntil &&
      new Date(user.resetPasswordLockedUntil).getTime() > now.getTime()
    ) {
      return { message: safeMessage };
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const resetAttempts =
      !user.resetPasswordCodeExpiresAt ||
      new Date(user.resetPasswordCodeExpiresAt).getTime() <= now.getTime();
    await userRepository.savePasswordResetCode(user.id, codeHash, expiresAt, resetAttempts);

    const frontendUrl = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(
      /\/$/,
      '',
    );
    const transporter = createTransporter();

    if (transporter) {
      const from =
        String(process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER || '').trim() ||
        'no-reply@pizzaia.local';

      try {
        await transporter.sendMail({
          from,
          to: user.email,
          subject: 'Recuperacao de senha - Peca ja food',
          text: `Seu codigo para redefinir a senha e: ${code}. Ele expira em 15 minutos.\n\nSe preferir, abra: ${frontendUrl}/recover-password`,
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'production') {
          // Keep the public response indistinguishable from a successful request
          // and never expose the recovery code or the account e-mail in logs.
          console.error('[password-reset] Nao foi possivel enviar o e-mail de recuperacao.');
          return { message: safeMessage };
        }

        if (isBasicAuthDisabledError(error)) {
          throw new Error(
            'Falha no SMTP: o provedor bloqueou login por usuario/senha (basic auth). Configure SMTP_AUTH_TYPE=oauth2 com credenciais OAuth2 ou use um provedor com app password.',
          );
        }

        throw error;
      }
    } else if (canLogPasswordResetCode()) {
      console.warn(`[password-reset] SMTP nao configurado. Codigo para ${user.email}: ${code}`);
    } else {
      // Do not disclose whether the account exists and never print its reset code.
      return { message: safeMessage };
    }

    return { message: safeMessage };
  }
}

export default new RequestPasswordResetService();
