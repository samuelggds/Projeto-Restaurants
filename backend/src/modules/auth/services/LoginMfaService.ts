import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../../../config/prisma.js';
import { getJwtMfaExpiresIn, getJwtMfaSecret, getJwtSecret } from '../../../config/auth.js';
import authTokenService from './AuthTokenService.js';
import userRepository from '../repositories/UserRepository.js';
import successfulLoginRecorderService from './SuccessfulLoginRecorderService.js';
import { platformMaintenanceAccessService } from '../../platform/services/PlatformMaintenanceService.js';
import { isMfaRequiredForRole } from '../security/mfaPolicy.js';
import { decryptCredential } from '../../restaurantSettings/security/credentialEncryption.js';
import { verifyTotpCode } from '../security/totp.js';
import {
  listAvailableMfaChannels,
  parseMfaDeliveryChannel,
  sendMfaCode,
  type MfaDeliveryChannel,
} from './MfaDeliveryService.js';

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
  mfaTotpEnabled?: boolean;
  authVersion?: number;
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

function getMfaSecret() {
  return getJwtMfaSecret() || getJwtSecret();
}

function requiresMfa(user: Pick<LoginUser, 'role' | 'mfaEnabled'>) {
  return user.mfaEnabled === true || isMfaRequiredForRole(user.role);
}

function createMfaToken(user: LoginUser, channel?: MfaDeliveryChannel | 'TOTP') {
  return jwt.sign(
    {
      type: 'login_mfa',
      userId: Number(user.id),
      authVersion: Number(user.authVersion || 0),
      ...(channel ? { channel } : {}),
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
  const authVersion = (decoded as jwt.JwtPayload).authVersion;
  const channel = (decoded as jwt.JwtPayload).channel;
  if (
    tokenType !== 'login_mfa' ||
    !Number.isInteger(userId) ||
    userId <= 0 ||
    !Number.isSafeInteger(authVersion) ||
    authVersion < 0
  ) {
    throw new Error('Token de verificacao invalido');
  }

  if (channel !== undefined && !['TOTP','EMAIL','SMS','WHATSAPP'].includes(String(channel))) {
    throw new Error('Token de verificacao invalido');
  }
  return { userId, authVersion: authVersion as number, channel: channel as string | undefined };
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
    mfaEnabled: requiresMfa(user),
  };
}

function isAdministrativeRole(role: unknown) {
  const normalized = String(role || '')
    .trim()
    .toUpperCase();
  return normalized === 'ADMIN' || normalized === 'SUPER_ADMIN';
}

export class LoginMfaService {
  constructor(private readonly platformAccess: PlatformAccess = platformMaintenanceAccessService) {}

  private async loadEligibleUser(mfaToken: string) {
    const { userId, authVersion } = decodeMfaToken(mfaToken);
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user || !user.active) {
      throw new Error('Conta desativada. Reative sua conta para continuar.');
    }
    if (Number(user.authVersion || 0) !== authVersion) {
      throw new Error('Verificacao expirada. Inicie o login novamente.');
    }
    if (!requiresMfa(user)) {
      throw new Error('Verificacao em duas etapas nao esta habilitada para esta conta.');
    }
    await this.platformAccess.assertRoleAllowed(user.role);
    return user as LoginUser;
  }

  private getOptions(user: LoginUser) {
    return [
      ...(user.mfaTotpEnabled ? [{ channel: 'TOTP' as const, label: 'Aplicativo autenticador', destination: 'Seu aplicativo autenticador' }] : []),
      ...listAvailableMfaChannels(user),
    ];
  }

  private async issueChallenge(
    user: LoginUser,
    enforceCooldown: boolean,
    requestedChannel: MfaDeliveryChannel,
  ) {
    const userId = Number(user.id);
    const now = new Date();
    const options = this.getOptions(user);
    const selectedOption = options.find((option) => option.channel === requestedChannel);
    if (!selectedOption) {
      throw new Error('Canal de verificacao indisponivel para esta conta.');
    }

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

    try {
      await sendMfaCode({
        channel: requestedChannel,
        recipient: user,
        code,
        ttlMinutes,
      });
    } catch (error) {
      await prisma.authMfaChallenge.deleteMany({ where: { userId, codeHash } });
      throw error;
    }

    return {
      mfaRequired: true,
      mfaToken: createMfaToken(user, requestedChannel),
      destination: selectedOption.destination,
      selectedChannel: requestedChannel,
      channelSelectionRequired: false,
      deliveryOptions: options,
      resendAfterSeconds: MFA_RESEND_COOLDOWN_SECONDS,
      message: `Envio do codigo solicitado por ${selectedOption.label}. A entrega depende do provedor e pode sofrer atrasos.`,
    };
  }

  private async issueTotpChallenge(user: LoginUser) {
    if (!user.mfaTotpEnabled) throw new Error('Aplicativo autenticador indisponivel.');
    const credential = await prisma.authTotpCredential.findUnique({ where: { userId: user.id } });
    if (!credential?.secretCiphertext) throw new Error('Autenticador nao configurado.');
    if (credential.loginLockedUntil && credential.loginLockedUntil.getTime() > Date.now()) {
      throw new Error('Muitas tentativas. Tente novamente mais tarde.');
    }
    // The challenge is not the authenticator code. It is only a server-side
    // login attempt gate, bound to the signed short-lived MFA token.
    await prisma.authMfaChallenge.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        codeHash: 'TOTP:' + crypto.randomBytes(32).toString('hex'),
        expiresAt: new Date(Date.now() + 10 * 60_000),
        failedAttempts: 0,
      },
      update: {
        codeHash: 'TOTP:' + crypto.randomBytes(32).toString('hex'),
        expiresAt: new Date(Date.now() + 10 * 60_000),
        failedAttempts: 0,
      },
    });
    return {
      mfaRequired: true,
      mfaToken: createMfaToken(user, 'TOTP'),
      destination: 'seu aplicativo autenticador',
      selectedChannel: 'TOTP' as const,
      channelSelectionRequired: false,
      deliveryOptions: this.getOptions(user),
      resendAfterSeconds: 0,
      message: 'Digite o codigo do aplicativo autenticador. Nenhum codigo sera enviado.',
    };
  }

  async beginIfRequired(user: LoginUser) {
    if (!requiresMfa(user)) {
      return null;
    }

    const options = this.getOptions(user);
    if (!options.length) {
      if (isAdministrativeRole(user.role)) {
        throw new Error(
          'MFA administrativo indisponivel: configure e-mail, SMS ou WhatsApp para esta conta.',
        );
      }
      throw new Error('Nenhum canal MFA esta configurado para esta conta.');
    }

    if (isAdministrativeRole(user.role) && options.length > 1) {
      return {
        mfaRequired: true,
        mfaToken: createMfaToken(user),
        destination: 'seu contato cadastrado',
        channelSelectionRequired: true,
        deliveryOptions: options,
        resendAfterSeconds: 0,
        message: 'Escolha como deseja receber o codigo de verificacao.',
      };
    }

    const preferredChannel = user.mfaTotpEnabled
      ? 'TOTP'
      : options.some((option) => option.channel === 'EMAIL')
        ? 'EMAIL'
        : options[0].channel;
    return preferredChannel === 'TOTP'
      ? this.issueTotpChallenge(user)
      : this.issueChallenge(user, false, preferredChannel);
  }

  async selectChannel(mfaToken: string, channelInput: string) {
    const user = await this.loadEligibleUser(mfaToken);
    const channel = channelInput.toUpperCase() === 'TOTP' && user.mfaTotpEnabled
      ? 'TOTP'
      : parseMfaDeliveryChannel(channelInput);
    if (!channel) throw new Error('Canal de verificacao invalido.');
    return channel === 'TOTP' ? this.issueTotpChallenge(user) : this.issueChallenge(user, false, channel);
  }

  async resend(mfaToken: string, channelInput?: string) {
    const user = await this.loadEligibleUser(mfaToken);
    const options = this.getOptions(user);
    if (channelInput?.trim().toUpperCase() === 'TOTP') {
      throw new Error('O aplicativo autenticador gera codigos localmente.');
    }
    const requested = parseMfaDeliveryChannel(channelInput);
    const defaultChannel = options.some((option) => option.channel === 'EMAIL') ? 'EMAIL' : null;
    const channel = requested || defaultChannel;
    if (!channel || !options.some((option) => option.channel === channel)) {
      throw new Error('Escolha novamente como deseja receber o codigo de verificacao.');
    }
    return this.issueChallenge(user, true, channel);
  }

  async verifyAndIssueTokens({ mfaToken, code }: { mfaToken: string; code: string }) {
    const rawCode = String(code || '').trim();
    if (!rawCode) {
      throw new Error('Token e codigo de verificacao sao obrigatorios');
    }

    const { userId, authVersion, channel } = decodeMfaToken(mfaToken);
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

    if (Number(user.authVersion || 0) !== authVersion) {
      throw new Error('Verificacao expirada. Inicie o login novamente.');
    }

    await this.platformAccess.assertRoleAllowed(user.role);

    if (channel === 'TOTP') {
      if (!user.mfaTotpEnabled || !challenge.codeHash.startsWith('TOTP:')) {
        throw new Error('Verificacao invalida. Inicie o login novamente.');
      }
      const credential = await prisma.authTotpCredential.findUnique({ where: { userId } });
      if (!credential?.secretCiphertext) throw new Error('Autenticador indisponivel.');
      if (credential.loginLockedUntil && credential.loginLockedUntil.getTime() > Date.now()) {
        throw new Error('Muitas tentativas. Tente novamente mais tarde.');
      }
      const secret = decryptCredential(credential.secretCiphertext, `authenticator:totp:user:${userId}`);
      const step = secret ? verifyTotpCode(secret, rawCode, Date.now(), credential.lastUsedStep) : null;
      if (step === null) {
        const nextCount = credential.failedLoginAttempts + 1;
        await prisma.authTotpCredential.updateMany({
          where: { userId, failedLoginAttempts: credential.failedLoginAttempts },
          data: {
            failedLoginAttempts: { increment: 1 },
            ...(nextCount >= 5 ? { loginLockedUntil: new Date(Date.now() + 10 * 60_000) } : {}),
          },
        });
        throw new Error('Codigo de verificacao invalido');
      }
      const tokenPayload = {
        id: user.id,
        role: user.role,
        subRole: user.subRole ?? null,
        restaurantId: user.restaurantId,
        authVersion,
      };
      const result = await prisma.$transaction(async (tx) => {
        const fresh = await tx.user.updateMany({
          where: { id: userId, active: true, authVersion, mfaTotpEnabled: true },
          data: { authVersion },
        });
        if (fresh.count !== 1) throw new Error('Verificacao expirada.');
        const claimed = await tx.authTotpCredential.updateMany({
          where: {
            userId,
            secretCiphertext: credential.secretCiphertext,
            lastUsedStep: { lt: step },
            OR: [{ loginLockedUntil: null }, { loginLockedUntil: { lte: new Date() } }],
          },
          data: { lastUsedStep: step, failedLoginAttempts: 0, loginLockedUntil: null },
        });
        if (claimed.count !== 1) throw new Error('Codigo ja utilizado ou verificacao bloqueada.');
        const consumed = await tx.authMfaChallenge.deleteMany({
          where: {
            id: challenge.id, userId, codeHash: challenge.codeHash,
            expiresAt: { gt: new Date() }, failedAttempts: { lt: 5 },
          },
        });
        if (consumed.count !== 1) throw new Error('Verificacao expirada ou ja utilizada.');
        const token = authTokenService.createAccessToken(tokenPayload);
        const refreshToken = await authTokenService.createRefreshToken(tokenPayload, tx);
        return { token, refreshToken };
      });
      await successfulLoginRecorderService.execute(user.id);
      return { user: mapUser(user), ...result };
    }
    // Legacy tokens issued before channel binding may still verify their
    // pre-existing delivery challenge, but never an authenticator challenge.
    if (challenge.codeHash.startsWith('TOTP:')) {
      throw new Error('Selecione novamente o metodo de verificacao.');
    }

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

    const tokenPayload = {
      id: user.id,
      role: user.role,
      subRole: user.subRole ?? null,
      restaurantId: user.restaurantId,
      authVersion,
    };

    const { token, refreshToken } = await prisma.$transaction(async (transaction) => {
      // Lock the same account row updated by password reset before consuming
      // the challenge. A concurrent reset either wins this CAS or subsequently
      // revokes the exact version and refresh session issued in this transaction.
      const current = await transaction.user.updateMany({
        where: { id: userId, authVersion, active: true },
        data: { authVersion },
      });
      if (current.count !== 1) throw new Error('Verificacao expirada. Inicie o login novamente.');
      const consumed = await transaction.authMfaChallenge.deleteMany({
        where: {
          id: challenge.id,
          userId,
          codeHash: challenge.codeHash,
          expiresAt: { gt: new Date() },
          failedAttempts: { lt: 5 },
        },
      });
      if (consumed.count !== 1) throw new Error('Codigo de verificacao expirado ou ja utilizado');
      const token = authTokenService.createAccessToken(tokenPayload);
      const refreshToken = await authTokenService.createRefreshToken(tokenPayload, transaction);
      return { token, refreshToken };
    });
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
