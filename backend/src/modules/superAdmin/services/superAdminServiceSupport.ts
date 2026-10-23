import type { Prisma } from '@prisma/client';
import type { ZodType } from 'zod';
import { SuperAdminError } from '../domain/superAdminErrors.js';
import type {
  AuditContext,
  SuperAdminDatabaseClient,
  SuperAdminRepository,
} from '../repositories/SuperAdminRepository.js';

export async function requireSuperAdminActor(
  repository: Pick<SuperAdminRepository, 'findActor'>,
  context: AuditContext,
  transaction: SuperAdminDatabaseClient,
) {
  const actor = await repository.findActor(context.actorUserId, transaction);
  if (!actor) {
    throw new SuperAdminError('SUPER_ADMIN não encontrado ou inativo.', 403, 'ACTOR_FORBIDDEN');
  }
  return actor;
}

export function asTransactionClient(value: SuperAdminDatabaseClient) {
  return value as Prisma.TransactionClient;
}

export function parseSuperAdminPayload<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new SuperAdminError(
      result.error.issues[0]?.message || 'Dados inválidos.',
      400,
      'VALIDATION_ERROR',
    );
  }
  return result.data;
}
