import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import openTableSessionService from '../../tableSession/services/OpenTableSessionService.js';

const dateSchema = z.coerce.date();
const reservationInput = z.object({
  tableId: z.number().int().positive(),
  guestName: z.string().trim().min(2).max(100),
  guestPhone: z.string().transform((v) => v.replace(/\D/gu, '')).pipe(z.string().min(10).max(13)),
  guestCount: z.number().int().min(1).max(100),
  startsAt: dateSchema,
  endsAt: dateSchema,
  note: z.string().trim().max(500).optional().nullable(),
}).strict().refine((value) => value.endsAt > value.startsAt, {
  message: 'O encerramento previsto deve ser posterior ao início.',
});
const statusInput = z.enum(['CANCELED', 'NO_SHOW', 'COMPLETED']);
type CreateReservation = z.input<typeof reservationInput>;

export class ReservationError extends Error {
  constructor(message: string, readonly statusCode = 409) {
    super(message);
    this.name = 'ReservationError';
  }
}

function positive(value: unknown) {
  const num = Number(value);
  if (!Number.isSafeInteger(num) || num <= 0) throw new ReservationError('Identificador inválido.', 422);
  return num;
}

function sanitize(row: {
  publicId: string; tableId: number; guestName: string; guestPhone: string; guestCount: number;
  startsAt: Date; endsAt: Date; status: string; note: string | null;
  checkedInAt: Date | null; createdAt: Date; table?: { number: number } | null;
}) {
  return {
    publicId: row.publicId, tableId: row.tableId, tableNumber: row.table?.number ?? null,
    guestName: row.guestName, guestPhone: row.guestPhone, guestCount: row.guestCount,
    startsAt: row.startsAt, endsAt: row.endsAt, status: row.status,
    note: row.note, checkedInAt: row.checkedInAt, createdAt: row.createdAt,
  };
}

async function ensureEnabled(tx: Prisma.TransactionClient, restaurantId: number) {
  const settings = await tx.restaurantSettings.findUnique({
    where: { restaurantId }, select: { tableReservationsEnabled: true, tableReservationToleranceMinutes: true },
  });
  if (!settings?.tableReservationsEnabled) {
    throw new ReservationError('Reservas estão desativadas para este restaurante.', 403);
  }
  return settings;
}

export class TableReservationService {
  async settings(restaurantId: number) {
    const id = positive(restaurantId);
    return prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, id);
      const settings = await tx.restaurantSettings.findUnique({
        where: { restaurantId: id },
        select: { tableReservationsEnabled: true, tableReservationToleranceMinutes: true },
      });
      return {
        enabled: settings?.tableReservationsEnabled === true,
        toleranceMinutes: settings?.tableReservationToleranceMinutes ?? 15,
      };
    });
  }

  async updateSettings(restaurantId: number, enabled: unknown, toleranceMinutes: unknown) {
    const id = positive(restaurantId);
    const parsed = z.object({
      enabled: z.boolean(),
      toleranceMinutes: z.number().int().min(0).max(60),
    }).strict().parse({ enabled, toleranceMinutes });
    return prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, id);
      await tx.restaurantSettings.update({
        where: { restaurantId: id },
        data: {
          tableReservationsEnabled: parsed.enabled,
          tableReservationToleranceMinutes: parsed.toleranceMinutes,
        },
      });
      return { enabled: parsed.enabled, toleranceMinutes: parsed.toleranceMinutes };
    });
  }

  async list(restaurantId: number, start?: string, end?: string) {
    const id = positive(restaurantId);
    const from = start ? dateSchema.parse(start) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const to = end ? dateSchema.parse(end) : new Date(from.getTime() + 32 * 24 * 60 * 60 * 1000);
    if (to <= from || to.getTime() - from.getTime() > 93 * 24 * 60 * 60 * 1000) {
      throw new ReservationError('Intervalo inválido (máximo de 93 dias).', 422);
    }
    return prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, id);
      await ensureEnabled(tx, id);
      const rows = await tx.tableReservation.findMany({
        where: { restaurantId: id, startsAt: { lt: to }, endsAt: { gt: from } },
        include: { table: { select: { number: true } } },
        orderBy: { startsAt: 'asc' }, take: 500,
      });
      return rows.map(sanitize);
    });
  }

  async create(restaurantId: number, userId: number, input: CreateReservation) {
    const id = positive(restaurantId);
    const actor = positive(userId);
    const parsed = reservationInput.parse(input);
    if (parsed.startsAt.getTime() < Date.now() - 5 * 60_000 ||
        parsed.startsAt.getTime() > Date.now() + 366 * 24 * 60 * 60_000) {
      throw new ReservationError('Escolha um horário futuro dentro de um ano.', 422);
    }
    if (parsed.endsAt.getTime() - parsed.startsAt.getTime() > 8 * 60 * 60_000) {
      throw new ReservationError('A duração não pode superar oito horas.', 422);
    }
    try {
      return await prisma.$transaction(async (tx) => {
        await setTenantDbContext(tx, id);
        await ensureEnabled(tx, id);
        // Table lock serializes reservations and table opening/booking attempts.
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Table"
          WHERE "id" = ${parsed.tableId} AND "restaurantId" = ${id} AND "active" = true FOR UPDATE`);
        const table = await tx.table.findFirst({
          where: { id: parsed.tableId, restaurantId: id, active: true }, select: { id: true, number: true },
        });
        if (!table) throw new ReservationError('Mesa inativa ou pertencente a outro restaurante.', 404);
        const session = await tx.tableSession.findFirst({
          where: {
            restaurantId: id, tableId: table.id, status: { in: ['OPEN', 'CLOSING_REQUESTED'] },
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          }, select: { id: true },
        });
        if (session) throw new ReservationError('Esta mesa está ocupada; aguarde a liberação.');
        const clash = await tx.tableReservation.findFirst({
          where: {
            restaurantId: id, tableId: table.id, status: 'CONFIRMED',
            startsAt: { lt: parsed.endsAt }, endsAt: { gt: parsed.startsAt },
          }, select: { id: true },
        });
        if (clash) throw new ReservationError('Já existe uma reserva confirmada nesse período.');
        const row = await tx.tableReservation.create({
          data: { ...parsed, restaurantId: id, createdById: actor, status: 'CONFIRMED' },
          include: { table: { select: { number: true } } },
        });
        return sanitize(row);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error: unknown) {
      if (error instanceof ReservationError || error instanceof z.ZodError) throw error;
      const code = (error as { code?: string }).code;
      if (code === '23P01' || code === 'P2034') {
        throw new ReservationError('Conflito de reserva: atualize a agenda e tente novamente.');
      }
      throw error;
    }
  }

  async changeStatus(restaurantId: number, publicId: string, status: unknown) {
    const id = positive(restaurantId);
    const next = statusInput.parse(status);
    return prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, id);
      await ensureEnabled(tx, id);
      const row = await tx.tableReservation.findFirst({
        where: { restaurantId: id, publicId },
        include: { table: { select: { number: true } } },
      });
      if (!row) throw new ReservationError('Reserva não encontrada.', 404);
      if (row.status !== 'CONFIRMED' && !(row.status === 'SEATED' && next === 'COMPLETED')) {
        throw new ReservationError('Esta reserva não pode mais ser alterada.');
      }
      if (row.status === 'SEATED' && next !== 'COMPLETED') {
        throw new ReservationError('Finalize a mesa antes de concluir a reserva.');
      }
      const updated = await tx.tableReservation.update({
        where: { id: row.id }, data: {
          status: next, ...(next === 'CANCELED' ? { canceledAt: new Date() } : {}),
        }, include: { table: { select: { number: true } } },
      });
      return sanitize(updated);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async checkIn(restaurantId: number, publicId: string, userId: number) {
    const id = positive(restaurantId);
    const actor = positive(userId);
    // Same-tenant validation before invoking the established session-opening workflow.
    const record = await prisma.$transaction(async tx => {
      await setTenantDbContext(tx, id);
      await ensureEnabled(tx, id);
      const row = await tx.tableReservation.findFirst({
        where: { restaurantId: id, publicId, status: 'CONFIRMED' }, select: {
          id: true, tableId: true, startsAt: true, endsAt: true,
        },
      });
      if (!row) throw new ReservationError('Reserva confirmada não encontrada.', 404);
      const now = new Date();
      if (now < new Date(row.startsAt.getTime() - 30 * 60_000) || now > row.endsAt) {
        throw new ReservationError('Check-in fora da janela de atendimento.');
      }
      const conflictingSession = await tx.tableSession.findFirst({
        where: {
          restaurantId: id, tableId: row.tableId,
          status: { in: ['OPEN','CLOSING_REQUESTED'] },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      });
      if (conflictingSession) throw new ReservationError('Mesa ocupada. Não é possível fazer check-in.');
      return row;
    });
    // Opening is transactional and concurrency protected by the existing unique index.
    return openTableSessionService.execute({
      restaurantId: id, tableId: record.tableId, openedById: actor,
      reservationId: record.id,
    });
  }
}
export default new TableReservationService();
