import jwt, { type JwtPayload } from 'jsonwebtoken';
import prisma from '../../../config/prisma.js';
import { getJwtSecret } from '../../../config/auth.js';

export type ResolvedAccessUser = {
  id: number;
  role: string;
  subRole: string | null;
  restaurantId: number | null;
  email: string | null;
  authVersion: number | null;
  mustChangePassword: boolean;
};

export type ResolvedAccessToken = {
  user: ResolvedAccessUser;
  legacy: boolean;
};

function invalidToken(): never {
  throw new Error('Token de acesso inválido');
}

function allowsLegacyAccessTokens() {
  const isProduction =
    String(process.env.NODE_ENV || '')
      .trim()
      .toLowerCase() === 'production';

  return (
    !isProduction &&
    String(process.env.ALLOW_LEGACY_ACCESS_TOKENS || '')
      .trim()
      .toLowerCase() === 'true'
  );
}

/**
 * Valida assinatura, finalidade, versão revogável e estado atual da conta.
 * Tokens legados sem `type` ou `authVersion` são rejeitados por padrão. Durante
 * uma migração, eles podem ser habilitados explicitamente fora de produção com
 * `ALLOW_LEGACY_ACCESS_TOKENS=true`. A flag nunca tem efeito em produção.
 */
export async function resolveAccessToken(rawToken: string): Promise<ResolvedAccessToken> {
  const token = String(rawToken || '').trim();
  if (!token) invalidToken();

  const decoded = jwt.verify(token, getJwtSecret());
  if (!decoded || typeof decoded === 'string') invalidToken();

  const payload = decoded as JwtPayload;
  const tokenType = payload.type === undefined ? null : String(payload.type);
  if (tokenType !== null && tokenType !== 'access') invalidToken();

  const userId = Number(payload.id || 0);
  if (!Number.isInteger(userId) || userId <= 0) invalidToken();

  const hasAuthVersion = payload.authVersion !== undefined && payload.authVersion !== null;
  const authVersion = hasAuthVersion ? Number(payload.authVersion) : null;
  if (authVersion !== null && (!Number.isInteger(authVersion) || authVersion < 0)) invalidToken();

  const isLegacy = tokenType !== 'access' || authVersion === null;
  if (isLegacy && !allowsLegacyAccessTokens()) invalidToken();

  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      active: true,
      role: true,
      subRole: true,
      restaurantId: true,
      email: true,
      authVersion: true,
      mustChangePassword: true,
    },
  });

  if (!account?.active || (authVersion !== null && account.authVersion !== authVersion)) {
    throw new Error('Sessão expirada');
  }

  return {
    legacy: isLegacy,
    user: {
      id: account.id,
      role: account.role,
      subRole: account.subRole,
      restaurantId: account.restaurantId,
      email: account.email,
      authVersion: authVersion === null ? null : account.authVersion,
      mustChangePassword: account.mustChangePassword,
    },
  };
}
