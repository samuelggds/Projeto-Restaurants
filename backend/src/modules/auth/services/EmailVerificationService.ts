import crypto from 'crypto';
import prisma from '../../../config/prisma.js';
import { createSmtpTransporter } from '../../../services/smtpTransport.js';

const DEFAULT_TTL_MINUTES = 24 * 60;
const SAFE_RESEND_MESSAGE =
  'Se a conta estiver aguardando confirmação, enviaremos um novo link para o e-mail cadastrado.';

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function normalizeSlug(value: unknown) {
  const slug = String(value || '').trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug) ? slug : null;
}

function tokenHash(token: string) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function verificationTtlMs() {
  const configured = Number(process.env.EMAIL_VERIFICATION_TTL_MINUTES || DEFAULT_TTL_MINUTES);
  const minutes = Number.isFinite(configured) && configured >= 10 && configured <= 7 * 24 * 60
    ? configured
    : DEFAULT_TTL_MINUTES;
  return minutes * 60 * 1000;
}

function frontendLoginUrl(slug: string | null, status: 'success' | 'invalid') {
  const base = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/u, '');
  const path = slug ? `/${encodeURIComponent(slug)}/login` : '/login';
  const url = new URL(`${base}${path}`);
  url.searchParams.set('emailVerified', status);
  return url.toString();
}

function verificationUrl(token: string) {
  const backend = String(process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/u, '');
  const url = new URL(`${backend}/auth/verify-email`);
  url.searchParams.set('token', token);
  return url.toString();
}

export class EmailVerificationService {
  async issueAndSend({
    userId,
    email,
    restaurantSlug,
  }: {
    userId: number;
    email: string;
    restaurantSlug?: string | null;
  }) {
    const normalizedEmail = normalizeEmail(email);
    const slug = normalizeSlug(restaurantSlug);
    if (!normalizedEmail) throw new Error('E-mail de confirmação inválido.');

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + verificationTtlMs());

    await prisma.emailVerificationToken.upsert({
      where: { userId },
      create: {
        userId,
        tokenHash: tokenHash(rawToken),
        emailNormalized: normalizedEmail,
        restaurantSlug: slug,
        expiresAt,
      },
      update: {
        tokenHash: tokenHash(rawToken),
        emailNormalized: normalizedEmail,
        restaurantSlug: slug,
        expiresAt,
        consumedAt: null,
      },
    });

    const transporter = createSmtpTransporter();
    if (!transporter) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Envio de confirmação de e-mail indisponível.');
      }
      return { sent: false, expiresAt };
    }

    const from =
      String(process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER || '').trim() ||
      'no-reply@gastronexa.local';
    const link = verificationUrl(rawToken);

    await transporter.sendMail({
      from,
      to: normalizedEmail,
      subject: 'Confirme seu e-mail - GastroNexa',
      text: [
        'Confirme seu e-mail para concluir seu cadastro na GastroNexa.',
        '',
        link,
        '',
        'Se você não criou esta conta, ignore esta mensagem.',
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;line-height:1.5;color:#1f1f1f">
          <h2>Confirme seu e-mail</h2>
          <p>Confirme este endereço para concluir seu cadastro na GastroNexa.</p>
          <p style="margin:28px 0">
            <a href="${link}" style="background:#111827;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">
              Confirmar meu e-mail
            </a>
          </p>
          <p>Se você não criou esta conta, ignore esta mensagem.</p>
        </div>
      `,
    });

    return { sent: true, expiresAt };
  }

  async resend(email: unknown, restaurantSlug?: unknown) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return { message: SAFE_RESEND_MESSAGE };

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (
      user &&
      user.emailVerificationRequired &&
      !user.emailVerifiedAt &&
      user.active
    ) {
      try {
        await this.issueAndSend({
          userId: user.id,
          email: user.email,
          restaurantSlug: normalizeSlug(restaurantSlug),
        });
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') throw error;
        console.error('[email-verification] Nao foi possivel reenviar a confirmacao.');
      }
    }

    return { message: SAFE_RESEND_MESSAGE };
  }

  async verify(rawToken: unknown) {
    const token = String(rawToken || '').trim();
    if (token.length < 20 || token.length > 512) {
      return { ok: false as const, redirectUrl: frontendLoginUrl(null, 'invalid') };
    }

    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: { user: true },
    });
    const now = new Date();

    if (
      !record ||
      record.consumedAt ||
      record.expiresAt.getTime() <= now.getTime() ||
      normalizeEmail(record.user.email) !== record.emailNormalized
    ) {
      return {
        ok: false as const,
        redirectUrl: frontendLoginUrl(record?.restaurantSlug || null, 'invalid'),
      };
    }

    const verified = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: record.userId,
          email: record.emailNormalized,
          emailVerificationRequired: true,
          emailVerifiedAt: null,
        },
        data: { emailVerifiedAt: now },
      });
      if (updated.count !== 1) return false;

      await tx.emailVerificationToken.update({
        where: { id: record.id },
        data: { consumedAt: now },
      });
      return true;
    });

    return {
      ok: verified as boolean,
      redirectUrl: frontendLoginUrl(record.restaurantSlug, verified ? 'success' : 'invalid'),
    };
  }
}

export default new EmailVerificationService();
