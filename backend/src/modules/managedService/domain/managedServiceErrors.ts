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
      return new ManagedServiceError(
        'Já existe um registro com esses dados.',
        409,
        'MANAGED_SERVICE_CONFLICT',
      );
    }
    if (error.code === 'P2025') {
      return managedNotFound('Registro não encontrado.');
    }
  }

  return error;
}

export async function managedMutation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const normalized = normalizeManagedServiceError(error);
    if (normalized !== error) throw normalized;

    if (error instanceof Error) {
      // Os serviços de catálogo existentes usam Error para regras de domínio esperadas.
      // Aqui eles são convertidos para 400, sem transformar falhas Prisma/infra em erro do cliente.
      throw managedBadRequest(error.message);
    }

    throw error;
  }
}
