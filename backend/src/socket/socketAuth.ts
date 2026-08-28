import type { JwtPayload } from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import tableSessionRepository from '../modules/tableSession/repositories/TableSessionRepository.js';
import resolvePublicTableService from '../modules/table/services/ResolvePublicTableService.js';
import { TableSessionStatus, UserRole } from '@prisma/client';
import prisma from '../config/prisma.js';
import { resolveAccessToken } from '../modules/auth/security/accessToken.js';

type SocketAuthNext = (err?: Error) => void;

type SocketUser = JwtPayload & {
  id?: number | null;
  role?: string;
  subRole?: string | null;
  restaurantId?: number | null;
  authVersion?: number | null;
  mustChangePassword?: boolean;
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
  authType?: 'user' | 'table-session' | 'table-waiting';
  tableSession?: SocketTableSession;
  waitingTable?: SocketWaitingTable;
};

export async function socketAuth(socket: AppSocket, next: SocketAuthNext) {
  try {
    const token = socket.handshake.auth?.token;
    const sessionToken = socket.handshake.auth?.sessionToken;
    const tableToken = socket.handshake.auth?.tableToken;

    if (token) {
      const resolved = await resolveAccessToken(String(token));
      const decoded = { ...resolved.user } as SocketUser;

      if (decoded.mustChangePassword) {
        return next(new Error('Troca de senha obrigatória'));
      }

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
          return next(new Error(`Conta de ${isCourier ? 'motoqueiro' : 'administrador'} inválida`));
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

      return next();
    }

    return next(new Error('Token não enviado'));
  } catch (_error: unknown) {
    return next(new Error('Token inválido'));
  }
}
