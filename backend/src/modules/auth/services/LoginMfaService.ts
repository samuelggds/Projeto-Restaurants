import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import prisma from '../../../config/prisma.js';
import { getJwtMfaExpiresIn, getJwtMfaSecret, getJwtSecret } from '../../../config/auth.js';
import authTokenService from './AuthTokenService.js';
import userRepository from '../repositories/UserRepository.js';
import { canLogLocalAuthCode } from '../security/localAuthCodeLogging.js';
import { isMfaRequiredForRole } from '../security/mfaPolicy.js';
import successfulLoginRecorderService from './SuccessfulLoginRecorderService.js';
import { platformMaintenanceAccessService } from '../../platform/services/PlatformMaintenanceService.js';

type PlatformAccess = Pick<typeof platformMaintenanceAccessService, 'assertRoleAllowed'>;

type LoginUser = {
  id: number;
  role: string;
  subRole?: string | null;
  restaurantId: number | null;
  email: string;
  name: string;
  active: boolean;
  mustChangePassword: boolean;
  mfaEnabled?: boolean;
  phone?: string | null;
  address?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  complement?: string | null;
  avatar?: string | null;
};

const MFA_RESEND_COOLDOWN_SECONDS = 60;

export class MfaResendCooldownError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(`Aguarde ${retryAfterSeconds} segundos antes de solicitar outro código.`);
    this.name = 'MfaResendCooldownError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

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

function getMfaSecret() {
  return getJwtMfaSecret() || getJwtSecret();
}

function requiresMfa(user: Pick<LoginUser, 'role' | 'mfaEnabled'>) {
  return Boolean(user.mfaEnabled) || isMfaRequiredForRole(user.role);
}

function maskEmail(emailInput: unknown) {
  const email = String(emailInput || '').trim();
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return 'seu e-mail cadastrado';

  const visibleLength = Math.min(3, Math.max(1, Math.floor(localPart.length / 3)));
  const visible = localPart.slice(0, visibleLength);
  return `${visible}${'*'.repeat(Math.max(4, localPart.length - visibleLength))}@${domain}`;
}

function createMfaToken(userId: number) {
  return jwt.sign(
    {
      type: 'login_mfa',
      userId,
    },
    getMfaSecret(),
    {
      expiresIn: getJwtMfaExpiresIn(),
    },
  );
}

function decodeMfaToken(mfaToken: unknown) {
  const rawToken = String(mfaToken || '').trim();
  if (!rawToken) throw new Error('Token de verificacao obrigatorio');

  const decoded = jwt.verify(rawToken, getMfaSecret());
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Token de verificacao invalido');
  }

  const tokenType = String((decoded as any).type || '').trim();
  const userId = Number((decoded as any).userId || 0);
  if (tokenType !== 'login_mfa' || !Number.isInteger(userId) || userId <= 0) {
    throw new Error('Token de verificacao invalido');
  }

  return { userId };
}

function mapUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    subRole: user.subRole ?? null,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    phone: user.phone,
    address: user.address,
    number: user.number,
    district: user.district,
    city: user.city,
    state: user.state,
    zipCode: user.zipCode,
    complement: user.complement,
    avatar: user.avatar,
    restaurantId: user.restaurantId,
    mfaEnabled: Boolean(user.mfaEnabled),
  };
}

export class LoginMfaService {
  constructor(private readonly platformAccess: PlatformAccess = platformMaintenanceAccessService) {}

  private async issueChallenge(user: LoginUser, enforceCooldown: boolean) {
    const userId = Number(user.id);
    const now = new Date();

    await prisma.authMfaChallenge.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    if (enforceCooldown) {
      const current = await prisma.authMfaChallenge.findUnique({ where: { userId } });
      if (current) {
        const lastIssuedAt = new Date(current.updatedAt || current.createdAt).getTime();
        const retryAt = lastIssuedAt + MFA_RESEND_COOLDOWN_SECONDS * 1000;
        const remainingMs = retryAt - Date.now();
        if (remainingMs > 0) {
          throw new MfaResendCooldownError(Math.max(1, Math.ceil(remainingMs / 1000)));
        }
      }
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);
    const ttlMinutes = Number(process.env.MFA_CODE_TTL_MIN || 10);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await prisma.authMfaChallenge.upsert({
      where: { userId },
      update: {
        codeHash,
        expiresAt,
      },
      create: {
        userId,
        codeHash,
        expiresAt,
        failedAttempts: 0,
      },
    });

    const token = createMfaToken(userId);
    const transporter = createTransporter();
    if (transporter) {
      const from =
        String(process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER || '').trim() ||
        'no-reply@pizzaia.local';

      try {
        await transporter.sendMail({
          from,
          to: user.email,
          subject: 'Código de verificação de login - GastroNexa',
          text: `Seu código de verificação é: ${code}. Ele expira em ${ttlMinutes} minutos.`,
        });
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          if (canLogLocalAuthCode()) {
            console.warn(`[login-2fa] Falha no SMTP local. Codigo para ${user.email}: ${code}`);
          } else {
            console.warn(
              '[login-2fa] Falha no SMTP local; o codigo nao foi exibido. Configure o SMTP ou habilite explicitamente o fallback local.',
            );
          }
          return {
            mfaRequired: true,
            mfaToken: token,
            destination: maskEmail(user.email),
            resendAfterSeconds: MFA_RESEND_COOLDOWN_SECONDS,
            message: 'Codigo de verificacao gerado (SMTP indisponivel em desenvolvimento).',
          };
        }

        if (isBasicAuthDisabledError(error)) {
          throw new Error(
            'Falha no SMTP: o provedor bloqueou login por usuario/senha (basic auth). Configure SMTP_AUTH_TYPE=oauth2 com credenciais OAuth2 ou use app password.',
          );
        }

        throw error;
      }
    } else {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'Falha no SMTP: configure SMTP_HOST, SMTP_PORT, SMTP_USER e credenciais validas para enviar o codigo 2FA por e-mail.',
        );
      }

      if (canLogLocalAuthCode()) {
        console.warn(`[login-2fa] SMTP nao configurado. Codigo para ${user.email}: ${code}`);
      } else {
        console.warn(
          '[login-2fa] SMTP nao configurado; o codigo nao foi exibido. Configure o SMTP ou habilite explicitamente o fallback local.',
        );
      }
    }

    return {
      mfaRequired: true,
      mfaToken: token,
      destination: maskEmail(user.email),
      resendAfterSeconds: MFA_RESEND_COOLDOWN_SECONDS,
      message: 'Codigo de verificacao enviado para o e-mail cadastrado.',
    };
  }

  async beginIfRequired(user: LoginUser) {
    if (!requiresMfa(user)) {
      return null;
    }

    return this.issueChallenge(user, false);
  }

  async resend(mfaToken: string) {
    const { userId } = decodeMfaToken(mfaToken);
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user || !user.active) {
      throw new Error('Conta desativada. Reative sua conta para continuar.');
    }
    if (!requiresMfa(user)) {
      throw new Error('Verificacao em duas etapas nao esta habilitada para esta conta.');
    }

    await this.platformAccess.assertRoleAllowed(user.role);
    return this.issueChallenge(user as LoginUser, true);
  }

  async verifyAndIssueTokens({ mfaToken, code }: { mfaToken: string; code: string }) {
    const rawCode = String(code || '').trim();
    if (!rawCode) {
      throw new Error('Token e codigo de verificacao sao obrigatorios');
    }

    const { userId } = decodeMfaToken(mfaToken);
    const challenge = await prisma.authMfaChallenge.findUnique({
      where: { userId },
    });

    if (!challenge || new Date(challenge.expiresAt).getTime() <= Date.now()) {
      throw new Error('Codigo de verificacao expirado');
    }

    if (Number(challenge.failedAttempts || 0) >= 5) {
      await prisma.authMfaChallenge.deleteMany({ where: { userId } });
      throw new Error('Muitas tentativas de verificacao. Inicie o login novamente.');
    }

    const user = await userRepository.findByIdWithPassword(userId);
    if (!user || !user.active) {
      throw new Error('Conta desativada. Reative sua conta para continuar.');
    }

    await this.platformAccess.assertRoleAllowed(user.role);

    const validCode = await bcrypt.compare(rawCode, challenge.codeHash);
    if (!validCode) {
      const updated = await prisma.authMfaChallenge.update({
        where: { userId },
        data: { failedAttempts: { increment: 1 } },
        select: { failedAttempts: true },
      });
      if (updated.failedAttempts >= 5) {
        await prisma.authMfaChallenge.deleteMany({ where: { userId } });
        throw new Error('Muitas tentativas de verificacao. Inicie o login novamente.');
      }
      throw new Error('Codigo de verificacao invalido');
    }

    const consumed = await prisma.authMfaChallenge.deleteMany({
      where: {
        id: challenge.id,
        userId,
        codeHash: challenge.codeHash,
        expiresAt: { gt: new Date() },
      },
    });
    if (consumed.count !== 1) {
      throw new Error('Codigo de verificacao expirado ou ja utilizado');
    }

    const tokenPayload = {
      id: user.id,
      role: user.role,
      subRole: user.subRole ?? null,
      restaurantId: user.restaurantId,
      authVersion: user.authVersion,
    };

    const token = authTokenService.createAccessToken(tokenPayload);
    const refreshToken = await authTokenService.createRefreshToken(tokenPayload);
    await successfulLoginRecorderService.execute(user.id);

    return {
      user: mapUser(user),
      token,
      refreshToken,
    };
  }
}

export { MFA_RESEND_COOLDOWN_SECONDS };
export default new LoginMfaService();