import { createHash } from 'node:crypto';
import { UserRole, type Prisma } from '@prisma/client';

export type CompensationActor = { userId: number; role: string };

export function normalizeId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`${label} inválido.`);
  return id;
}

export function requireAdmin(actor: CompensationActor) {
  if (!Number.isSafeInteger(actor.userId) || actor.userId <= 0 || actor.role !== UserRole.ADMIN) {
    throw new Error('Somente ADMIN pode executar esta operação.');
  }
}

export function requireReason(value: unknown, label = 'Motivo') {
  const reason = String(value || '').trim();
  if (!reason) throw new Error(`${label} é obrigatório.`);
  if (reason.length > 500) throw new Error(`${label} deve ter no máximo 500 caracteres.`);
  return reason;
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

export function serializeFinancial<T>(value: T): T {
  if (typeof value === 'bigint') {
    if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new RangeError('O valor financeiro ultrapassa o limite seguro da API.');
    }
    return Number(value) as T;
  }
  if (Array.isArray(value)) return value.map(serializeFinancial) as T;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeFinancial(entry)]),
    ) as T;
  }
  return value;
}

export async function auditEmployeeCompensation(
  db: Prisma.TransactionClient,
  input: CompensationActor & {
    restaurantId: number;
    action: string;
    resource: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  await db.auditLog.create({
    data: {
      userId: input.userId,
      userRole: input.role,
      restaurantId: input.restaurantId,
      action: input.action,
      resource: input.resource,
      metadata: input.metadata,
    },
  });
}
