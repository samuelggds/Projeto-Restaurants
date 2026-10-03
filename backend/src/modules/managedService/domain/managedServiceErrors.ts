import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export class ManagedServiceError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ManagedServiceError';
    this.status = status;
    this.code = code;
  }
}

export const managedBadRequest = (message: string, code = 'INVALID_MANAGED_SERVICE_REQUEST') =>
  new ManagedServiceError(message, 400, code);

export const managedForbidden = (message: string, code = 'MANAGED_SERVICE_FORBIDDEN') =>
  new ManagedServiceError(message, 403, code);

export const managedConflict = (message: string, code = 'MANAGED_SERVICE_CONFLICT') =>
  new ManagedServiceError(message, 409, code);

export const managedNotFound = (message: string, code = 'MANAGED_SERVICE_NOT_FOUND') =>
  new ManagedServiceError(message, 404, code);

export function normalizeManagedServiceError(error: unknown) {
  if (error instanceof ManagedServiceError) return error;

  if (error instanceof ZodError) {
    const issue = error.issues[0]?.message || 'Revise os dados informados.';
    return managedBadRequest(issue, 'MANAGED_SERVICE_VALIDATION_ERROR');
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return managedConflict('Já existe um registro com esses dados.');
    }
    if (error.code === 'P2025') {
      return managedNotFound('Registro não encontrado.');
    }
  }

  return error;
}

function isInternalProgrammingOrInfrastructureError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof TypeError ||
    error instanceof ReferenceError ||
    error instanceof RangeError
  );
}

export async function managedMutation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const normalized = normalizeManagedServiceError(error);
    if (normalized instanceof ManagedServiceError) throw normalized;
    if (isInternalProgrammingOrInfrastructureError(error)) throw error;

    if (error instanceof Error) {
      // Os serviços legados de catálogo usam Error para regras de domínio esperadas.
      throw managedBadRequest(error.message);
    }

    throw error;
  }
}
