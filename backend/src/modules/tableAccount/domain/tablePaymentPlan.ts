import type { CreateTablePaymentIntentInput } from './tableAccountSchemas.js';
import { splitCentsEqually } from './tableAccountRules.js';
import {
  allocateCentsAcrossTableBillItems,
  sumAvailableTableBillItemCents,
} from './tablePaymentAllocation.js';

export interface TablePaymentPlanItem {
  id: number;
  publicId: string;
  participantId: number;
  unitPriceCents: number;
  paidCents: number;
  reservedCents: number;
  processingCents: number;
  availableCents: number;
  projectedStatus: 'UNPAID' | 'RESERVED' | 'PROCESSING' | 'PAID' | 'REFUNDED';
  canceled: boolean;
}

export class TablePaymentPlanError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'TablePaymentPlanError';
  }
}

export function buildTablePaymentPlan(input: {
  payment: CreateTablePaymentIntentInput;
  participantId: number;
  items: readonly TablePaymentPlanItem[];
}) {
  const eligibleItems = input.items.filter(
    (item) => !item.canceled && item.projectedStatus !== 'REFUNDED' && item.availableCents > 0,
  );
  const activeBlockers = input.items.filter(
    (item) => !item.canceled && (item.reservedCents > 0 || item.processingCents > 0),
  );

  let selected: TablePaymentPlanItem[];
  if (input.payment.selectionMode === 'SELECTED_ITEMS') {
    const requestedIds = new Set(input.payment.billItemPublicIds || []);
    selected = eligibleItems.filter((item) => requestedIds.has(item.publicId));
    const fullyAvailable = selected.every(
      (item) => item.availableCents === item.unitPriceCents - item.paidCents,
    );
    if (selected.length !== requestedIds.size || !fullyAvailable) {
      throw new TablePaymentPlanError(
        'Um ou mais itens já foram pagos, reservados ou não pertencem a esta mesa.',
        'BILL_ITEM_UNAVAILABLE',
      );
    }
  } else if (input.payment.selectionMode === 'MY_ITEMS') {
    if (activeBlockers.some((item) => item.participantId === input.participantId)) {
      throw new TablePaymentPlanError(
        'Seus itens já possuem um pagamento em andamento. Aguarde ou atualize a conta.',
        'PARTICIPANT_BALANCE_RESERVED',
      );
    }
    selected = eligibleItems.filter((item) => item.participantId === input.participantId);
  } else {
    if (activeBlockers.length > 0) {
      throw new TablePaymentPlanError(
        'Já existe outro pagamento em andamento nesta mesa. Aguarde ou atualize a conta.',
        'TABLE_BALANCE_RESERVED',
      );
    }
    selected = eligibleItems;
  }

  const selectedAvailableCents = sumAvailableTableBillItemCents(selected);
  if (selectedAvailableCents <= 0) {
    throw new TablePaymentPlanError(
      'Não há saldo disponível para esta forma de pagamento.',
      'NO_AVAILABLE_BALANCE',
    );
  }

  const subtotalCents =
    input.payment.selectionMode === 'EQUAL_SPLIT'
      ? splitCentsEqually(selectedAvailableCents, Number(input.payment.splitCount))[0]
      : selectedAvailableCents;

  return {
    subtotalCents,
    allocations: allocateCentsAcrossTableBillItems(selected, subtotalCents),
    selectedItemPublicIds: selected.map((item) => item.publicId),
  };
}
