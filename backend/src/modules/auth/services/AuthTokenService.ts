import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../../../config/prisma.js';
import {
  getJwtExpiresIn,
  getJwtRefreshExpiresIn,
  getJwtRefreshSecret,
  getJwtSecret,
} from '../../../config/auth.js';
import { platformMaintenanceAccessService } from '../../platform/services/PlatformMaintenanceService.js';

type PlatformAccess = Pick<typeof platformMaintenanceAccessService, 'assertRoleAllowed'>;

type AuthPayload = {
  id: number;
  role: string;
  subRole?: string | null;
  restaurantId: number | null;
  authVersion?: number;
  rememberMe?: boolean;
};

type RefreshPayload = AuthPayload & {
  type: 'refresh';
  jti: string;
  familyId: string;
};

type SignedRefreshToken = {
  token: string;
  jti: string;
  familyId: string;
  persistedJti: string;
  expiresAt: Date;
};

const REFRESH_TOKEN_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

function getSafeRefreshSecret() {
  const refreshSecret = getJwtRefreshSecret();
  return refreshSecret || getJwtSecret();
}

function normalizePayload(payload: AuthPayload) {
  return {
    id: Number(payload.id || 0),
    role: String(payload.role || ''),
    subRole: payload.subRole ?? null,
    restaurantId:
      payload.restaurantId === null || payload.restaurantId === undefined
        ? null
        : Number(payload.restaurantId),
    authVersion: Number.isInteger(Number(payload.authVersion)) ? Number(payload.authVersion) : 0,
    rememberMe: payload.rememberMe !== false,
  };
}

function isValidRefreshIdentifier(value: string) {
  return REFRESH_TOKEN_IDENTIFIER_PATTERN.test(value);
}

function getLegacyFamilyId(userId: number, jti: string) {
  return crypto
    .createHmac('sha256', getSafeRefreshSecret())
    .update(`legacy-refresh-family:${userId}:${jti}`)
    .digest('base64url')
    .slice(0, 32);
}

function getRefreshTokenIdentifiers(decoded: jwt.JwtPayload) {
  const userId = Number(decoded.id || 0);
  const tokenJti = String(decoded.jti || '').trim();
  const claimedFamilyId = String(decoded.familyId || '').trim();

  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    !tokenJti ||
    !isValidRefreshIdentifier(tokenJti)
  ) {
    throw new Error('Refresh token invalido');
  }

  if (claimedFamilyId && !isValidRefreshIdentifier(claimedFamilyId)) {
    throw new Error('Refresh token invalido');
  }

  const isLegacy = !claimedFamilyId;
  const familyId = claimedFamilyId || getLegacyFamilyId(userId, tokenJti);

  return {
    userId,
    tokenJti,
    familyId,
    persistedJti: isLegacy ? tokenJti : `${familyId}.${tokenJti}`,
  };
}

function belongsToFamily(persistedJti: string, familyId: string) {
  return persistedJti.startsWith(`${familyId}.`);
}

export class AuthTokenService {
  constructor(private readonly platformAccess: PlatformAccess = platformMaintenanceAccessService) {}

  createAccessToken(payload: AuthPayload) {
    const normalized = normalizePayload(payload);
    const { rememberMe: _rememberMe, ...accessPayload } = normalized;
    return jwt.sign({ ...accessPayload, type: 'access' }, getJwtSecret(), {
      expiresIn: getJwtExpiresIn(),
    });
  }

  private signRefreshToken(
    payload: AuthPayload,
    familyId: string = crypto.randomUUID(),
  ): SignedRefreshToken {
    const normalized = normalizePayload(payload);
    const jti = crypto.randomUUID();
    const refreshPayload: RefreshPayload = {
      ...normalized,
      type: 'refresh',
      jti,
      familyId,
    };

    const token = jwt.sign(refreshPayload, getSafeRefreshSecret(), {
      expiresIn: getJwtRefreshExpiresIn(),
    });

    const decoded = jwt.decode(token);
    const exp =
      decoded && typeof decoded !== 'string' ? Number((decoded as jwt.JwtPayload).exp || 0) : 0;
    if (!exp) {
      throw new Error('Falha ao gerar refresh token');
    }

    return {
      token,
      jti,
      familyId,
      persistedJti: `${familyId}.${jti}`,
      expiresAt: new Date(exp * 1000),
    };
  }

  private async revokeCompromisedFamily({
    userId,
    familyId,
    expectedAuthVersion,
  }: {
    userId: number;
    familyId: string;
    expectedAuthVersion: number;
  }) {
    return prisma.$transaction(async (transaction) => {
      const activeSession = await transaction.authRefreshSession.findUnique({
        where: { userId },
        select: {
          jti: true,
          user: {
            select: { authVersion: true },
          },
        },
      });

      if (
        !activeSession ||
        !belongsToFamily(String(activeSession.jti || ''), familyId) ||
        Number(activeSession.user.authVersion) !== expectedAuthVersion
      ) {
        return false;
      }

      const revokedSession = await transaction.authRefreshSession.deleteMany({
        where: {
          userId,
          jti: activeSession.jti,
        },
      });

      if (revokedSession.count !== 1) return false;

      const revokedAccountTokens = await transaction.user.updateMany({
        where: {
          id: userId,
          authVersion: expectedAuthVersion,
        },
        data: { authVersion: { increment: 1 } },
      });

      if (revokedAccountTokens.count !== 1) {
        throw new Error('Falha ao revogar familia de refresh token');
      }

      return true;
    });
  }

  async createRefreshToken(payload: AuthPayload) {
    const normalized = normalizePayload(payload);
    const signed = this.signRefreshToken(normalized);

    await prisma.authRefreshSession.upsert({
      where: { userId: normalized.id },
      update: { jti: signed.persistedJti, expiresAt: signed.expiresAt },
      create: { userId: normalized.id, jti: signed.persistedJti, expiresAt: signed.expiresAt },
    });

    return signed.token;
  }

  async rotateRefreshToken(refreshToken: string) {
    const decoded = jwt.verify(refreshToken, getSafeRefreshSecret());
    if (!decoded || typeof decoded === 'string') throw new Error('Refresh token invalido');

    const { userId, familyId, persistedJti } = getRefreshTokenIdentifiers(decoded);
    const tokenType = String(decoded.type || '').trim();
    const tokenAuthVersion = Number(decoded.authVersion);
    const rememberMe = decoded.rememberMe !== false;

    if (!Number.isInteger(tokenAuthVersion) || tokenAuthVersion < 0) {
      throw new Error('Refresh token invalido');
    }
    if (tokenType !== 'refresh') throw new Error('Refresh token invalido');

    const session = await prisma.authRefreshSession.findUnique({
      where: { userId },
      select: {
        jti: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            active: true,
            role: true,
            subRole: true,
            restaurantId: true,
            authVersion: true,
          },
        },
      },
    });

    const latestJti = String(session?.jti || '');
    if (!latestJti) throw new Error('Refresh token expirado');

    if (latestJti !== persistedJti) {
      if (belongsToFamily(latestJti, familyId)) {
        await this.revokeCompromisedFamily({
          userId,
          familyId,
          expectedAuthVersion: tokenAuthVersion,
        });
      }
      throw new Error('Refresh token expirado');
    }

    const expiresAt = session?.expiresAt ? new Date(session.expiresAt) : null;
    if (!expiresAt || expiresAt.getTime() <= Date.now()) throw new Error('Refresh token expirado');

    if (!session.user.active || Number(session.user.authVersion) !== tokenAuthVersion) {
      throw new Error('Refresh token expirado');
    }

    await this.platformAccess.assertRoleAllowed(session.user.role);

    const payload = {
      id: session.user.id,
      role: session.user.role,
      subRole: session.user.subRole,
      restaurantId: session.user.restaurantId,
      authVersion: session.user.authVersion,
      rememberMe,
    };

    const nextRefresh = this.signRefreshToken(payload, familyId);
    const claimedSession = await prisma.authRefreshSession.updateMany({
      where: { userId, jti: persistedJti, expiresAt: { gt: new Date() } },
      data: { jti: nextRefresh.persistedJti, expiresAt: nextRefresh.expiresAt },
    });

    if (claimedSession.count !== 1) {
      await this.revokeCompromisedFamily({
        userId,
        familyId,
        expectedAuthVersion: tokenAuthVersion,
      });
      throw new Error('Refresh token expirado');
    }

    const accessToken = this.createAccessToken(payload);

    return {
      accessToken,
      refreshToken: nextRefresh.token,
      userId: session.user.id,
    };
  }

  async revokeRefreshToken(refreshToken: string) {
    const decoded = jwt.verify(refreshToken, getSafeRefreshSecret());
    if (!decoded || typeof decoded === 'string') throw new Error('Refresh token invalido');

    const { userId, persistedJti } = getRefreshTokenIdentifiers(decoded);
    await prisma.authRefreshSession.deleteMany({ where: { userId, jti: persistedJti } });
  }
}

export default new AuthTokenService();
