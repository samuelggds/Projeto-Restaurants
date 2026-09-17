import type { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import {
  decryptCredential,
  encryptCredential,
} from '../../restaurantSettings/security/credentialEncryption.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

type StoredSessionRow = {
  orderId: number;
  restaurantId: number;
  courierId: number;
  tripId: string;
  authTokenEncrypted: string;
  authTokenExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type DeliveryNavigationSession = Omit<StoredSessionRow, 'authTokenEncrypted'> & {
  authToken: string;
};

function tokenContext(restaurantId: number, orderId: number) {
  return `navigation-connect:${restaurantId}:${orderId}:auth-token`;
}

function client(db?: DbClient) {
  return db || prisma;
}

function decode(row: StoredSessionRow): DeliveryNavigationSession {
  const authToken = decryptCredential(
    row.authTokenEncrypted,
    tokenContext(row.restaurantId, row.orderId),
  );
  if (!authToken) throw new Error('Token do Navigation Connect não está disponível.');
  return {
    orderId: row.orderId,
    restaurantId: row.restaurantId,
    courierId: row.courierId,
    tripId: row.tripId,
    authToken,
    authTokenExpiresAt: row.authTokenExpiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

class DeliveryNavigationSessionRepository {
  async findByOrder(orderId: number, restaurantId: number, db?: DbClient) {
    const rows = await client(db).$queryRaw<StoredSessionRow[]>`
      SELECT
        "orderId",
        "restaurantId",
        "courierId",
        "tripId"::text AS "tripId",
        "authTokenEncrypted",
        "authTokenExpiresAt",
        "createdAt",
        "updatedAt"
      FROM "DeliveryNavigationSession"
      WHERE "orderId" = ${orderId}
        AND "restaurantId" = ${restaurantId}
      LIMIT 1
    `;
    return rows[0] ? decode(rows[0]) : null;
  }

  async findTripIdByOrder(orderId: number, restaurantId: number, db?: DbClient) {
    const rows = await client(db).$queryRaw<Array<{ tripId: string }>>`
      SELECT "tripId"::text AS "tripId"
      FROM "DeliveryNavigationSession"
      WHERE "orderId" = ${orderId}
        AND "restaurantId" = ${restaurantId}
      LIMIT 1
    `;
    return rows[0]?.tripId || null;
  }

  async upsert(
    input: {
      orderId: number;
      restaurantId: number;
      courierId: number;
      tripId: string;
      authToken: string;
      authTokenExpiresAt: Date;
    },
    db?: DbClient,
  ) {
    const encrypted = encryptCredential(
      input.authToken,
      tokenContext(input.restaurantId, input.orderId),
    );
    if (!encrypted) throw new Error('Não foi possível proteger o token do Navigation Connect.');

    const rows = await client(db).$queryRaw<StoredSessionRow[]>`
      INSERT INTO "DeliveryNavigationSession" (
        "orderId",
        "restaurantId",
        "courierId",
        "tripId",
        "authTokenEncrypted",
        "authTokenExpiresAt",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${input.orderId},
        ${input.restaurantId},
        ${input.courierId},
        CAST(${input.tripId} AS uuid),
        ${encrypted},
        ${input.authTokenExpiresAt},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("orderId") DO UPDATE SET
        "restaurantId" = EXCLUDED."restaurantId",
        "courierId" = EXCLUDED."courierId",
        "tripId" = EXCLUDED."tripId",
        "authTokenEncrypted" = EXCLUDED."authTokenEncrypted",
        "authTokenExpiresAt" = EXCLUDED."authTokenExpiresAt",
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING
        "orderId",
        "restaurantId",
        "courierId",
        "tripId"::text AS "tripId",
        "authTokenEncrypted",
        "authTokenExpiresAt",
        "createdAt",
        "updatedAt"
    `;
    if (!rows[0]) throw new Error('Não foi possível salvar a sessão do Navigation Connect.');
    return decode(rows[0]);
  }
}

export default new DeliveryNavigationSessionRepository();
