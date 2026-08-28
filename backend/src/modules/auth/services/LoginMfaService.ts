import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { UserRole } from '@prisma/client';
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

  async beginIfRequired(user: LoginUser) {
    if (!requiresMfa(user)) {
      return null;
    }

    await prisma.authMfaChallenge.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);
    const ttlMinutes = Number(process.env.MFA_CODE_TTL_MIN || 10);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await prisma.authMfaChallenge.upsert({
      where: {
        userId: Number(user.id),
      },
      update: {
        codeHash,
        expiresAt,
      },
      create: {
        userId: Number(user.id),
        codeHash,
        expiresAt,
      },
    });

    const token = jwt.sign(
      {
        type: 'login_mfa',
        userId: Number(user.id),
      },
      getMfaSecret(),
      {
        expiresIn: getJwtMfaExpiresIn(),
      },
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
          subject: 'Codigo de verificacao de login - Pizza IA',
          text: `Seu codigo de verificacao e: ${code}. Ele expira em ${ttlMinutes} minutos.`,
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
      message: 'Codigo de verificacao enviado para o e-mail cadastrado.',
    };
  }

  async verifyAndIssueTokens({ mfaToken, code }: { mfaToken: string; code: string }) {
    const rawToken = String(mfaToken || '').trim();
    const rawCode = String(code || '').trim();

    if (!rawToken || !rawCode) {
      throw new Error('Token e codigo de verificacao sao obrigatorios');
    }

    const decoded = jwt.verify(rawToken, getMfaSecret());
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Token de verificacao invalido');
    }

    const tokenType = String((decoded as any).type || '').trim();
    const userId = Number((decoded as any).userId || 0);

    if (tokenType !== 'login_mfa' || !Number.isInteger(userId) || userId <= 0) {
      throw new Error('Token de verificacao invalido');
    }

    const challenge = await prisma.authMfaChallenge.findUnique({
      where: {
        userId,
      },
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

    // Verifica antes de consumir o desafio: um usuário bloqueado pela
    // manutenção não perde um código válido só por tentar entrar.
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

export default new LoginMfaService();
