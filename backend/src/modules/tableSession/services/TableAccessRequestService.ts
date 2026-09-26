import {
  TableAccessRequestStatus,
  TableSessionStatus,
} from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import {
  createParticipantToken,
  getParticipantCookieName,
  hashParticipantToken,
  resolveParticipantTokenExpiration,
} from '../security/participantToken.js';
import joinTableParticipantService from './JoinTableParticipantService.js';
import tableSessionRepository from '../repositories/TableSessionRepository.js';
import { tableAccessRequestEvents } from '../realtime/tableAccessRequestEvents.js';
import { tableParticipantIdentityInputSchema } from '../../tableAccount/domain/tableAccountSchemas.js';

const REQUEST_TTL_MS = 10 * 60 * 1000;

type SessionForRequest = {
  id: number;
  publicId: string;
  restaurantId: number;
  tableId: number;
  expiresAt: Date | null;
  table?: { number?: number | null } | null;
};

function publicRequest(request: {
  publicId: string;
  restaurantId: number;
  tableId: number;
  tableSessionId: number;
  displayName: string;
  phone: string;
  status: TableAccessRequestStatus;
  expiresAt: Date;
  createdAt: Date;
  tableNumber?: number | null;
}) {
  return {
    publicId: request.publicId,
    restaurantId: request.restaurantId,
    tableId: request.tableId,
    tableSessionId: request.tableSessionId,
    tableNumber: Number(request.tableNumber || 0),
    displayName: request.displayName,
    phone: request.phone,
    status: request.status,
    expiresAt: request.expiresAt,
    createdAt: request.createdAt,
  };
}

class TableAccessRequestService {
  async create({
    session,
    displayName,
    phone,
  }: {
    session: SessionForRequest;
    displayName: unknown;
    phone: unknown;
  }) {
    const identity = tableParticipantIdentityInputSchema.parse({ displayName, phone });
    if (!identity.displayName || !identity.phone) {
      throw new Error('Informe seu nome e telefone para solicitar acesso à mesa.');
    }

    const now = new Date();
    const sessionExpiry = session.expiresAt?.getTime() || Number.POSITIVE_INFINITY;
    const expiresAt = new Date(Math.min(now.getTime() + REQUEST_TTL_MS, sessionExpiry));
    const requestToken = createParticipantToken();

    const request = await prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, session.restaurantId);

      await tx.tableAccessRequest.updateMany({
        where: {
          restaurantId: session.restaurantId,
          tableSessionId: session.id,
          phone: identity.phone,
          status: TableAccessRequestStatus.WAITING,
        },
        data: {
          status: TableAccessRequestStatus.EXPIRED,
          decidedAt: now,
        },
      });

      return tx.tableAccessRequest.create({
        data: {
          restaurantId: session.restaurantId,
          tableId: session.tableId,
          tableSessionId: session.id,
          displayName: identity.displayName,
          phone: identity.phone,
          requestTokenHash: hashParticipantToken(requestToken),
          expiresAt,
        },
      });
    });

    const event = {
      ...publicRequest({ ...request, tableNumber: session.table?.number }),
      tableNumber: Number(session.table?.number || 0),
    };
    tableAccessRequestEvents.requested(event);

    return {
      approvalRequired: true as const,
      accessRequestId: request.publicId,
      accessRequestToken: requestToken,
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      tableNumber: Number(session.table?.number || 0),
      expiresAt,
    };
  }

  async listPending(restaurantId: number) {
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      await tx.tableAccessRequest.updateMany({
        where: {
          restaurantId,
          status: TableAccessRequestStatus.WAITING,
          expiresAt: { lte: now },
        },
        data: {
          status: TableAccessRequestStatus.EXPIRED,
          decidedAt: now,
        },
      });

      const requests = await tx.tableAccessRequest.findMany({
        where: {
          restaurantId,
          status: TableAccessRequestStatus.WAITING,
          expiresAt: { gt: now },
          tableSession: { status: TableSessionStatus.OPEN },
        },
        include: {
          table: { select: { number: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      return requests.map((request) =>
        publicRequest({ ...request, tableNumber: request.table.number }),
      );
    });
  }

  async decide({
    publicId,
    restaurantId,
    decidedById,
    decision,
  }: {
    publicId: string;
    restaurantId: number;
    decidedById: number;
    decision: 'APPROVE' | 'REJECT';
  }) {
    const now = new Date();
    const request = await prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      const current = await tx.tableAccessRequest.findFirst({
        where: { publicId, restaurantId },
        include: {
          table: { select: { number: true } },
          tableSession: { select: { status: true } },
        },
      });
      if (!current) throw new Error('Solicitação de acesso não encontrada.');
      if (current.status !== TableAccessRequestStatus.WAITING) {
        throw new Error('Esta solicitação já foi processada.');
      }
      if (
        current.expiresAt <= now ||
        current.tableSession.status !== TableSessionStatus.OPEN
      ) {
        await tx.tableAccessRequest.update({
          where: { id: current.id },
          data: {
            status: TableAccessRequestStatus.EXPIRED,
            decidedAt: now,
            decidedById,
          },
        });
        throw new Error('Esta solicitação expirou ou a mesa não está mais aberta.');
      }

      return tx.tableAccessRequest.update({
        where: { id: current.id },
        data: {
          status:
            decision === 'APPROVE'
              ? TableAccessRequestStatus.APPROVED
              : TableAccessRequestStatus.REJECTED,
          decidedAt: now,
          decidedById,
        },
        include: { table: { select: { number: true } } },
      });
    });

    const result = publicRequest({ ...request, tableNumber: request.table.number });
    tableAccessRequestEvents.updated(result);
    return result;
  }

  async resolve({
    publicId,
    requestToken,
    restaurantId,
  }: {
    publicId: string;
    requestToken: string;
    restaurantId: number;
  }) {
    if (!publicId || !requestToken || !restaurantId) {
      throw new Error('Solicitação de acesso inválida.');
    }

    const requestTokenHash = hashParticipantToken(requestToken);
    const now = new Date();

    const request = await prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      const found = await tx.tableAccessRequest.findFirst({
        where: {
          publicId,
          restaurantId,
          requestTokenHash,
        },
        include: {
          table: { select: { number: true } },
          tableSession: {
            include: { table: { select: { number: true, restaurantId: true, id: true, active: true } } },
          },
        },
      });
      if (!found) throw new Error('Solicitação de acesso inválida ou expirada.');

      if (
        found.status === TableAccessRequestStatus.WAITING &&
        (found.expiresAt <= now || found.tableSession.status !== TableSessionStatus.OPEN)
      ) {
        return tx.tableAccessRequest.update({
          where: { id: found.id },
          data: {
            status: TableAccessRequestStatus.EXPIRED,
            decidedAt: now,
          },
          include: {
            table: { select: { number: true } },
            tableSession: {
              include: { table: { select: { number: true, restaurantId: true, id: true, active: true } } },
            },
          },
        });
      }

      return found;
    });

    if (
      request.status === TableAccessRequestStatus.WAITING ||
      request.status === TableAccessRequestStatus.REJECTED ||
      request.status === TableAccessRequestStatus.EXPIRED
    ) {
      return {
        status: request.status,
        request: publicRequest({ ...request, tableNumber: request.table.number }),
      };
    }

    const session = await tableSessionRepository.findById(
      request.tableSessionId,
      request.restaurantId,
    );
    if (!session || session.status !== TableSessionStatus.OPEN) {
      return {
        status: TableAccessRequestStatus.EXPIRED,
        request: publicRequest({ ...request, tableNumber: request.table.number }),
      };
    }

    const cookieName = getParticipantCookieName(session.publicId);
    const participantResult = await joinTableParticipantService.execute({
      session: {
        id: session.id,
        publicId: session.publicId,
        restaurantId: session.restaurantId,
        expiresAt: session.expiresAt,
      },
      cookies:
        request.status === TableAccessRequestStatus.CONSUMED
          ? { [cookieName]: requestToken }
          : {},
      displayName: request.displayName,
      phone: request.phone,
      issuedGuestToken: requestToken,
    });

    if (request.status === TableAccessRequestStatus.APPROVED) {
      await prisma.$transaction(async (tx) => {
        await setTenantDbContext(tx, restaurantId);
        await tx.tableAccessRequest.updateMany({
          where: {
            id: request.id,
            restaurantId,
            status: TableAccessRequestStatus.APPROVED,
          },
          data: {
            status: TableAccessRequestStatus.CONSUMED,
            consumedAt: new Date(),
          },
        });
      });
    }

    return {
      status: TableAccessRequestStatus.CONSUMED,
      sessionToken: session.sessionToken,
      sessionId: session.id,
      sessionPublicId: session.publicId,
      tableId: session.tableId,
      tableNumber: session.table?.number ?? request.table.number,
      restaurantId: session.restaurantId,
      expiresAt: session.expiresAt,
      sessionStatus: session.status,
      tableOrderingEnabled: true,
      waiterCallEnabled: true,
      billRequestEnabled: true,
      ...participantResult,
    };
  }

  async expireForSession({
    tableSessionId,
    restaurantId,
  }: {
    tableSessionId: number;
    restaurantId: number;
  }) {
    await prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      await tx.tableAccessRequest.updateMany({
        where: {
          tableSessionId,
          restaurantId,
          status: {
            in: [TableAccessRequestStatus.WAITING, TableAccessRequestStatus.APPROVED],
          },
        },
        data: {
          status: TableAccessRequestStatus.EXPIRED,
          decidedAt: new Date(),
        },
      });
    });
  }
}

export default new TableAccessRequestService();
