import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../../../config/prisma.js';
import {
  getJwtExpiresIn,
  getJwtRefreshExpiresIn,
  getJwtRefreshSecret,
  getJwtSecret,
} from '../../../config/auth.js';

type AuthPayload = {
  id: number;
  role: string;
  subRole?: string | null;
  restaurantId: number | null;
  authVersion?: number;
};

type RefreshPayload = AuthPayload & {
  type: 'refresh';
  jti: string;
};

type SignedRefreshToken = {
  token: string;
  jti: string;
  expiresAt: Date;
};

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
  };
}

class AuthTokenService {
  createAccessToken(payload: AuthPayload) {
    const normalized = normalizePayload(payload);
    return jwt.sign({ ...normalized, type: 'access' }, getJwtSecret(), {
      expiresIn: getJwtExpiresIn(),
    });
  }

  private signRefreshToken(payload: AuthPayload): SignedRefreshToken {
    const normalized = normalizePayload(payload);
    const jti = crypto.randomUUID();
    const refreshPayload: RefreshPayload = {
      ...normalized,
      type: 'refresh',
      jti,
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
      expiresAt: new Date(exp * 1000),
    };
  }

  async createRefreshToken(payload: AuthPayload) {
    const normalized = normalizePayload(payload);
    const signed = this.signRefreshToken(normalized);

    await prisma.authRefreshSession.upsert({
      where: {
        userId: normalized.id,
      },
      update: {
        jti: signed.jti,
        expiresAt: signed.expiresAt,
      },
      create: {
        userId: normalized.id,
        jti: signed.jti,
        expiresAt: signed.expiresAt,
      },
    });

    return signed.token;
  }

  async rotateRefreshToken(refreshToken: string) {
    const decoded = jwt.verify(refreshToken, getSafeRefreshSecret());
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Refresh token invalido');
    }

    const userId = Number(decoded.id || 0);
    const jti = String(decoded.jti || '').trim();
    const tokenType = String(decoded.type || '').trim();
    const tokenAuthVersion = Number(decoded.authVersion);

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !jti ||
      !Number.isInteger(tokenAuthVersion) ||
      tokenAuthVersion < 0
    ) {
      throw new Error('Refresh token invalido');
    }

    if (tokenType !== 'refresh') {
      throw new Error('Refresh token invalido');
    }

    const session = await prisma.authRefreshSession.findUnique({
      where: {
        userId,
      },
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
    if (!latestJti || latestJti !== jti) {
      throw new Error('Refresh token expirado');
    }

    const expiresAt = session?.expiresAt ? new Date(session.expiresAt) : null;
    if (!expiresAt || expiresAt.getTime() <= Date.now()) {
      throw new Error('Refresh token expirado');
    }

    if (!session.user.active || Number(session.user.authVersion) !== tokenAuthVersion) {
      throw new Error('Refresh token expirado');
    }

    const payload = {
      id: session.user.id,
      role: session.user.role,
      subRole: session.user.subRole,
      restaurantId: session.user.restaurantId,
      authVersion: session.user.authVersion,
    };

    const nextRefresh = this.signRefreshToken(payload);
    const claimedSession = await prisma.authRefreshSession.updateMany({
      where: {
        userId,
        jti,
        expiresAt: { gt: new Date() },
      },
      data: {
        jti: nextRefresh.jti,
        expiresAt: nextRefresh.expiresAt,
      },
    });

    if (claimedSession.count !== 1) {
      throw new Error('Refresh token expirado');
    }

    const accessToken = this.createAccessToken(payload);

    return {
      accessToken,
      refreshToken: nextRefresh.token,
    };
  }

  async revokeRefreshToken(refreshToken: string) {
    const decoded = jwt.verify(refreshToken, getSafeRefreshSecret());
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Refresh token invalido');
    }

    const userId = Number(decoded.id || 0);
    const jti = String(decoded.jti || '').trim();
    if (!Number.isInteger(userId) || userId <= 0 || !jti) {
      throw new Error('Refresh token invalido');
    }

    await prisma.authRefreshSession.deleteMany({
      where: {
        userId,
        jti,
      },
    });
  }
}

export default new AuthTokenService();
