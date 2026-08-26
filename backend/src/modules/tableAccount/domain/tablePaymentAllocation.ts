import type {
  TableBillItemFinancialStatus,
  TablePaymentIntentStatus,
} from './tableAccountContracts.js';
import { assertMoneyCents, sumMoneyCents } from './tableAccountRules.js';

export interface TablePaymentAllocationView {
  amountCents: number;
  intentStatus: TablePaymentIntentStatus;
  expiresAt?: Date | string | null;
}

export interface TableBillItemLedgerInput {
  unitPriceCents: number;
  projectedStatus: TableBillItemFinancialStatus;
  allocations: readonly TablePaymentAllocationView[];
  canceled?: boolean;
  now?: Date;
}

export interface TableBillItemLedger {
  unitPriceCents: number;
  paidCents: number;
  reservedCents: number;
  processingCents: number;
  availableCents: number;
  projectedStatus: TableBillItemFinancialStatus;
}

function isReservationCurrent(expiresAt: Date | string | null | undefined, now: Date) {
  if (!expiresAt) {
    return true;
  }

  const parsed = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return Number.isFinite(parsed.getTime()) && parsed.getTime() > now.getTime();
}

/**
 * Calcula a situação real de uma unidade usando as alocações como fonte.
 * Itens legados, ainda sem alocação, preservam a projeção persistida.
 */
export function calculateTableBillItemLedger({
  unitPriceCents,
  projectedStatus,
  allocations,
  canceled = false,
  now = new Date(),
}: TableBillItemLedgerInput): TableBillItemLedger {
  const safeUnitPrice = assertMoneyCents(unitPriceCents, 'preço unitário');

  if (canceled || projectedStatus === 'REFUNDED') {
    return {
      unitPriceCents: safeUnitPrice,
      paidCents: 0,
      reservedCents: 0,
      processingCents: 0,
      availableCents: 0,
      projectedStatus: projectedStatus === 'REFUNDED' ? 'REFUNDED' : 'UNPAID',
    };
  }

  if (allocations.length === 0) {
    const paidCents = projectedStatus === 'PAID' ? safeUnitPrice : 0;
    const reservedCents = projectedStatus === 'RESERVED' ? safeUnitPrice : 0;
    const processingCents = projectedStatus === 'PROCESSING' ? safeUnitPrice : 0;

    return {
      unitPriceCents: safeUnitPrice,
      paidCents,
      reservedCents,
      processingCents,
      availableCents: Math.max(
        0,
        safeUnitPrice - paidCents - reservedCents - processingCents,
      ),
      projectedStatus,
    };
  }

  let paidCents = 0;
  let reservedCents = 0;
  let processingCents = 0;

  allocations.forEach((allocation, index) => {
    const amountCents = assertMoneyCents(allocation.amountCents, `alocação[${index}]`);

    if (allocation.intentStatus === 'PAID') {
      paidCents = sumMoneyCents([paidCents, amountCents]);
      return;
    }

    if (
      allocation.intentStatus === 'RESERVED' &&
      isReservationCurrent(allocation.expiresAt, now)
    ) {
      reservedCents = sumMoneyCents([reservedCents, amountCents]);
      return;
    }

    if (
      allocation.intentStatus === 'PROCESSING' &&
      isReservationCurrent(allocation.expiresAt, now)
    ) {
      processingCents = sumMoneyCents([processingCents, amountCents]);
    }
  });

  const committedCents = sumMoneyCents([paidCents, reservedCents, processingCents]);
  if (committedCents > safeUnitPrice) {
    throw new RangeError('As alocações financeiras ultrapassam o valor do item.');
  }

  const availableCents = safeUnitPrice - committedCents;
  const nextProjectedStatus: TableBillItemFinancialStatus =
    paidCents === safeUnitPrice
      ? 'PAID'
      : processingCents > 0
        ? 'PROCESSING'
        : reservedCents > 0
          ? 'RESERVED'
          : 'UNPAID';

  return {
    unitPriceCents: safeUnitPrice,
    paidCents,
    reservedCents,
    processingCents,
    availableCents,
    projectedStatus: nextProjectedStatus,
  };
}

export interface AllocatableTableBillItem {
  id: number;
  publicId: string;
  availableCents: number;
}

export interface TablePaymentAllocationSeed {
  tableBillItemId: number;
  tableBillItemPublicId: string;
  amountCents: number;
}

/** Distribui o valor em ordem estável e permite cortar uma unidade em centavos. */
export function allocateCentsAcrossTableBillItems(
  items: readonly AllocatableTableBillItem[],
  requestedCents: number,
): TablePaymentAllocationSeed[] {
  const safeRequested = assertMoneyCents(requestedCents, 'valor solicitado');
  if (safeRequested === 0) {
    throw new RangeError('O pagamento deve possuir valor maior que zero.');
  }

  let remainingCents = safeRequested;
  const result: TablePaymentAllocationSeed[] = [];

  for (const item of items) {
    if (remainingCents === 0) {
      break;
    }

    const availableCents = assertMoneyCents(item.availableCents, 'saldo disponível do item');
    const amountCents = Math.min(availableCents, remainingCents);
    if (amountCents <= 0) {
      continue;
    }

    result.push({
      tableBillItemId: item.id,
      tableBillItemPublicId: item.publicId,
      amountCents,
    });
    remainingCents -= amountCents;
  }

  if (remainingCents !== 0) {
    throw new RangeError('O saldo disponível não cobre o valor solicitado.');
  }

  return result;
}

export function sumAvailableTableBillItemCents(items: readonly AllocatableTableBillItem[]) {
  return sumMoneyCents(items.map((item) => item.availableCents));
}
