const REFERENCE_PATTERN = /\[withdrawal:([0-9a-f-]{36})\]/iu;

export type WithdrawalValidationInput = {
  transferId: string;
  operationType: string;
  value: number;
  description: string;
};

export type PendingWithdrawal = {
  publicId: string;
  status: string;
  value: number;
  expiresAt: Date;
  providerTransferId?: string | null;
};

export function buildWithdrawalReference(publicId: string) {
  return `[withdrawal:${publicId}]`;
}

export function extractWithdrawalReference(description: unknown) {
  return REFERENCE_PATTERN.exec(String(description || ''))?.[1] || null;
}

export function validateWithdrawalAgainstRequest(
  input: WithdrawalValidationInput,
  request: PendingWithdrawal | null,
  now = new Date(),
) {
  if (!input.transferId || input.operationType.toUpperCase() !== 'PIX') {
    return { approved: false, reason: 'Operacao de saque invalida.' } as const;
  }
  if (!Number.isFinite(input.value) || input.value <= 0) {
    return { approved: false, reason: 'Valor de saque invalido.' } as const;
  }
  if (!request) {
    return { approved: false, reason: 'Solicitacao interna de saque nao encontrada.' } as const;
  }
  if (request.expiresAt.getTime() <= now.getTime()) {
    return { approved: false, reason: 'Solicitacao interna de saque expirada.' } as const;
  }
  if (Math.abs(request.value - input.value) > 0.009) {
    return { approved: false, reason: 'Valor divergente da solicitacao interna.' } as const;
  }
  if (request.status === 'VALIDATED' && request.providerTransferId === input.transferId) {
    return { approved: true, repeated: true } as const;
  }
  if (request.status !== 'REQUESTED') {
    return { approved: false, reason: 'Solicitacao interna nao esta pendente.' } as const;
  }
  if (request.providerTransferId && request.providerTransferId !== input.transferId) {
    return { approved: false, reason: 'Transferencia nao corresponde a solicitacao interna.' } as const;
  }
  return { approved: true, repeated: false } as const;
}
