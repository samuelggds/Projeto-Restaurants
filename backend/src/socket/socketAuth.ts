import type { JwtPayload } from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import tableSessionRepository from '../modules/tableSession/repositories/TableSessionRepository.js';
import resolvePublicTableService from '../modules/table/services/ResolvePublicTableService.js';
import { TableSessionStatus, UserRole } from '@prisma/client';
import prisma from '../config/prisma.js';
import { resolveAccessToken } from '../modules/auth/security/accessToken.js';
import { assertSocketAccess, SocketAccessDeniedError } from './socketAccessPolicy.js';
import { verifyGuestOrderOwnershipToken } from '../modules/orders/utils/guestOrderOwnershipToken.js';
import jwt from 'jsonwebtoken';

type SocketAuthNext = (err?: Error) => void;
type SocketAccessCheck = (
  role: string | null | undefined,
  restaurantId: number | string | null | undefined,
) => Promise<void>;

type SocketUser = JwtPayload & {
  id?: number | null;
  role?: string;
  subRole?: string | null;
  restaurantId?: number | null;
  authVersion?: number | null;
  mustChangePassword?: boolean;
  expiresAt?: number | null;
};

type SocketTableSession = {
  id: number;
  tableId: number;
  tableNumber: number | null;
  restaurantId: number | null;
};

type SocketWaitingTable = {
  id: number;
  number: number;
  restaurantId: number;
};

type AppSocket = Socket & {
  user?: SocketUser;
  authType?: 'user' | 'table-session' | 'table-waiting' | 'guest-orders';
  tableSession?: SocketTableSession;
  waitingTable?: SocketWaitingTable;
  guestOrderIds?: number[];
};

export function createSocketAuth(checkAccess: SocketAccessCheck = assertSocketAccess) {
  return async (socket: AppSocket, next: SocketAuthNext) => {
    try {
      const token = socket.handshake.auth?.token;
      const sessionToken = socket.handshake.auth?.sessionToken;
      const tableToken = socket.handshake.auth?.tableToken;
      const guestOrderProofs = Array.isArray(socket.handshake.auth?.guestOrderProofs)
        ? socket.handshake.auth.guestOrderProofs.slice(0, 20)
        : [];

      if (token) {
        const resolved = await resolveAccessToken(String(token), {
          checkAccountBeforeExpiry: true,
        });
        if (!resolved.expiresAt) return next(new Error('Token de acesso sem validade'));
        const decoded = { ...resolved.user, expiresAt: resolved.expiresAt } as SocketUser;

        if (decoded.mustChangePassword) {
          return next(new Error('Troca de senha obrigatória'));
        }

        await checkAccess(decoded.role, decoded.restaurantId);

        const normalizedRole = String(decoded.role || '').toUpperCase();
        if (
          resolved.legacy &&
          (normalizedRole === UserRole.MOTOQUEIRO || normalizedRole === UserRole.ADMIN)
        ) {
          const accountId = Number(decoded.id || 0);
          const restaurantId = Number(decoded.restaurantId || 0);
          const isCourier = normalizedRole === UserRole.MOTOQUEIRO;
          if (
            !Number.isInteger(accountId) ||
            accountId <= 0 ||
            !Number.isInteger(restaurantId) ||
            restaurantId <= 0
          ) {
            return next(
              new Error(`Conta de ${isCourier ? 'motoqueiro' : 'administrador'} inválida`),
            );
          }

          const activeAccount = await prisma.user.findFirst({
            where: {
              id: accountId,
              restaurantId,
              role: isCourier ? UserRole.MOTOQUEIRO : UserRole.ADMIN,
              active: true,
            },
            select: {
              id: true,
              role: true,
              restaurantId: true,
            },
          });

          if (!activeAccount) {
            return next(
              new Error(
                `Conta de ${isCourier ? 'motoqueiro' : 'administrador'} inativa ou fora do restaurante`,
              ),
            );
          }

          decoded.id = activeAccount.id;
          decoded.role = activeAccount.role;
          decoded.restaurantId = activeAccount.restaurantId;
        }

        socket.user = decoded;
        socket.authType = 'user';

        return next();
      }

      if (guestOrderProofs.length) {
        const verifiedOrderIds = guestOrderProofs.flatMap((proof: unknown) => {
          if (!proof || typeof proof !== 'object') return [];
          const record = proof as { orderId?: unknown; token?: unknown };
          const orderId = Number(record.orderId || 0);
          const guestToken = String(record.token || '').trim();
          if (!Number.isInteger(orderId) || orderId <= 0 || !guestToken) return [];

          try {
            verifyGuestOrderOwnershipToken(guestToken, orderId);
            return [orderId];
          } catch {
            return [];
          }
        });

        const uniqueOrderIds = [...new Set(verifiedOrderIds)];
        if (!uniqueOrderIds.length) {
          return next(new Error('Pedidos de visitante inválidos'));
        }

        socket.authType = 'guest-orders';
        socket.guestOrderIds = uniqueOrderIds;
        return next();
      }

      if (sessionToken) {
        const session = await tableSessionRepository.findBySessionToken(sessionToken);

        if (
          !session ||
          (session.status !== TableSessionStatus.OPEN &&
            session.status !== TableSessionStatus.CLOSING_REQUESTED) ||
          (session.expiresAt && session.expiresAt.getTime() <= Date.now())
        ) {
          return next(new Error('Sessão da mesa inválida'));
        }

        socket.authType = 'table-session';
        socket.tableSession = {
          id: session.id,
          tableId: session.tableId,
          tableNumber: session?.table?.number ?? null,
          restaurantId: session?.table?.restaurantId ?? null,
        };

        await checkAccess(null, socket.tableSession.restaurantId);

        return next();
      }

      if (tableToken) {
        const table = await resolvePublicTableService.execute({
          tableNumber: socket.handshake.auth?.tableNumber,
          tableToken,
          restaurantId: socket.handshake.auth?.restaurantId,
          restaurantSlug: socket.handshake.auth?.restaurantSlug,
        });

        socket.authType = 'table-waiting';
        socket.waitingTable = {
          id: table.id,
          number: table.number,
          restaurantId: table.restaurantId,
        };

        await checkAccess(null, socket.waitingTable.restaurantId);

        return next();
      }

      return next(new Error('Token não enviado'));
    } catch (error: unknown) {
      if (error instanceof jwt.TokenExpiredError) {
        return next(
          Object.assign(new Error('Token de acesso expirado'), {
            data: { code: 'ACCESS_TOKEN_EXPIRED' },
          }),
        );
      }
      if (error instanceof SocketAccessDeniedError) {
        return next(new Error(error.code));
      }
      return next(new Error('Token inválido'));
    }
  };
}

export const socketAuth = createSocketAuth();
