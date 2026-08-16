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
};

type RefreshPayload = AuthPayload & {
  type: 'refresh';
  jti: string;
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
  };
}

class AuthTokenService {
  createAccessToken(payload: AuthPayload) {
    const normalized = normalizePayload(payload);
    return jwt.sign(normalized, getJwtSecret(), {
      expiresIn: getJwtExpiresIn(),
    });
  }

  async createRefreshToken(payload: AuthPayload) {
    const normalized = normalizePayload(payload);
    const jti = crypto.randomUUID();
    const refreshPayload: RefreshPayload = {
      ...normalized,
      type: 'refresh',
      jti,
    };

    const refreshToken = jwt.sign(refreshPayload, getSafeRefreshSecret(), {
      expiresIn: getJwtRefreshExpiresIn(),
    });

    const decoded = jwt.decode(refreshToken);
    const exp =
      decoded && typeof decoded !== 'string' ? Number((decoded as jwt.JwtPayload).exp || 0) : 0;
    if (!exp) {
      throw new Error('Falha ao gerar refresh token');
    }

    await prisma.authRefreshSession.upsert({
      where: {
        userId: normalized.id,
      },
      update: {
        jti,
        expiresAt: new Date(exp * 1000),
      },
      create: {
        userId: normalized.id,
        jti,
        expiresAt: new Date(exp * 1000),
      },
    });

    return refreshToken;
  }

  async rotateRefreshToken(refreshToken: string) {
    const decoded = jwt.verify(refreshToken, getSafeRefreshSecret());
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Refresh token invalido');
    }

    const userId = Number(decoded.id || 0);
    const role = String(decoded.role || '');
    const restaurantId =
      decoded.restaurantId === null || decoded.restaurantId === undefined
        ? null
        : Number(decoded.restaurantId);
    const jti = String(decoded.jti || '').trim();
    const tokenType = String(decoded.type || '').trim();

    if (!Number.isInteger(userId) || userId <= 0 || !role || !jti) {
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

    const payload = {
      id: userId,
      role,
      restaurantId,
    };

    const accessToken = this.createAccessToken(payload);
    const nextRefreshToken = await this.createRefreshToken(payload);

    return {
      accessToken,
      refreshToken: nextRefreshToken,
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
