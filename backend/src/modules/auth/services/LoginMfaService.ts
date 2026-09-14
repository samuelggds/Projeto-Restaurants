import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../../../config/prisma.js';
import { getJwtMfaExpiresIn, getJwtMfaSecret, getJwtSecret } from '../../../config/auth.js';
import authTokenService from './AuthTokenService.js';
import userRepository from '../repositories/UserRepository.js';
import { isMfaRequiredForRole } from '../security/mfaPolicy.js';
import successfulLoginRecorderService from './SuccessfulLoginRecorderService.js';
import { platformMaintenanceAccessService } from '../../platform/services/PlatformMaintenanceService.js';
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
  return Boolean(user.mfaEnabled) || isMfaRequiredForRole(user.role);
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

function isAdministrativeRole(role: unknown) {
  const normalized = String(role || '').trim().toUpperCase();
  return normalized === 'ADMIN' || normalized === 'SUPER_ADMIN';
}

function isMobileChannel(channel: MfaDeliveryChannel) {
  return channel === 'SMS' || channel === 'WHATSAPP';
}

export class LoginMfaService {
  constructor(private readonly platformAccess: PlatformAccess = platformMaintenanceAccessService) {}

  private async loadEligibleUser(mfaToken: string) {
    const { userId } = decodeMfaToken(mfaToken);
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user || !user.active) {
      throw new Error('Conta desativada. Reative sua conta para continuar.');
    }
    if (!requiresMfa(user)) {
      throw new Error('Verificacao em duas etapas nao esta habilitada para esta conta.');
    }
    await this.platformAccess.assertRoleAllowed(user.role);
    return user as LoginUser;
  }

  private getOptions(user: LoginUser) {
    const options = listAvailableMfaChannels(user);
    if (!isAdministrativeRole(user.role)) return options;

    const mobileOptions = options.filter((option) => isMobileChannel(option.channel));
    if (mobileOptions.length || process.env.NODE_ENV === 'production') return mobileOptions;

    // Em desenvolvimento/testes preservamos o canal local de e-mail para nao exigir
    // credenciais externas. Em producao ADMIN/SUPER_ADMIN nunca recebem esse fallback.
    return options.filter((option) => option.channel === 'EMAIL');
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
        failedAttempts: 0,
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
      mfaToken: createMfaToken(userId),
      destination: selectedOption.destination,
      selectedChannel: requestedChannel,
      channelSelectionRequired: false,
      deliveryOptions: options,
      resendAfterSeconds: MFA_RESEND_COOLDOWN_SECONDS,
      message: `Codigo de verificacao enviado por ${selectedOption.label}.`,
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
          'MFA administrativo indisponivel: cadastre um telefone valido e configure SMS ou WhatsApp.',
        );
      }
      throw new Error('Nenhum canal MFA esta configurado para esta conta.');
    }

    const hasMobileOptions = options.some((option) => isMobileChannel(option.channel));
    if (isAdministrativeRole(user.role) && hasMobileOptions) {
      return {
        mfaRequired: true,
        mfaToken: createMfaToken(Number(user.id)),
        destination: 'seu telefone cadastrado',
        channelSelectionRequired: true,
        deliveryOptions: options,
        resendAfterSeconds: 0,
        message: 'Escolha como deseja receber o codigo de verificacao.',
      };
    }

    const preferredChannel = options.some((option) => option.channel === 'EMAIL')
      ? 'EMAIL'
      : options[0].channel;
    return this.issueChallenge(user, false, preferredChannel);
  }

  async selectChannel(mfaToken: string, channelInput: string) {
    const user = await this.loadEligibleUser(mfaToken);
    const channel = parseMfaDeliveryChannel(channelInput);
    if (!channel) throw new Error('Canal de verificacao invalido.');
    return this.issueChallenge(user, false, channel);
  }

  async resend(mfaToken: string, channelInput?: string) {
    const user = await this.loadEligibleUser(mfaToken);
    const options = this.getOptions(user);
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
