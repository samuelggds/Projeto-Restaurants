export type TableAccountStatus = 'OPEN' | 'CLOSING_REQUESTED' | 'CLOSED';
export type TablePaymentStatus =
  'RESERVED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELED' | 'REFUNDED';
export type TablePaymentSelectionMode =
  'MY_ITEMS' | 'SELECTED_ITEMS' | 'EQUAL_SPLIT' | 'FULL_ACCOUNT' | 'WAITER';
export type TablePaymentMethod = 'PIX' | 'CARD' | 'CASH' | 'CARD_MACHINE';
export type TableServiceFeeMode = 'DISABLED' | 'OPTIONAL' | 'MANDATORY';

export type TableAccountSnapshot = {
  contractVersion: 1;
  currentParticipantPublicId: string;
  capabilities: {
    enabled: boolean;
    allowCash: boolean;
    allowCardMachine: boolean;
    allowOnlinePayment: boolean;
    allowSplit: boolean;
    serviceFeeMode: TableServiceFeeMode;
    serviceFeeBasisPoints: number;
    reservationTimeoutMinutes: number;
  };
  summary: {
    sessionPublicId: string;
    tableNumber: number;
    status: TableAccountStatus;
    consumedCents: number;
    serviceFeeCents: number;
    grossPaidCents: number;
    refundedCents: number;
    netPaidCents: number;
    reservedCents: number;
    processingCents: number;
    remainingCents: number;
    overpaidCents: number;
    participantsCount: number;
  };
  participants: Array<{
    publicId: string;
    displayName: string | null;
    status: 'ACTIVE' | 'LEFT';
    joinedAt: string;
    leftAt: string | null;
  }>;
  items: Array<{
    publicId: string;
    orderPublicId: string;
    productName: string;
    unitIndex: number;
    unitPriceCents: number;
    paidCents: number;
    reservedCents: number;
    processingCents: number;
    availableCents: number;
    financialStatus: 'UNPAID' | 'RESERVED' | 'PROCESSING' | 'PAID' | 'REFUNDED';
    orderStatus: 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELED';
    orderedByParticipantPublicId: string;
    orderedByDisplayName: string;
  }>;
  payments: Array<{
    publicId: string;
    payerParticipantPublicId: string;
    selectionMode: TablePaymentSelectionMode;
    status: TablePaymentStatus;
    totalCents: number;
    createdAt: string;
  }>;
};

export type TablePaymentDraft = {
  selectionMode: TablePaymentSelectionMode;
  method: TablePaymentMethod;
  billItemPublicIds?: string[];
  splitCount?: number;
  includeOptionalServiceFee?: boolean;
};

export type TablePaymentIntent = {
  publicId: string;
  sessionPublicId: string;
  payerParticipantPublicId: string;
  selectionMode: TablePaymentSelectionMode;
  method: TablePaymentMethod;
  status: TablePaymentStatus;
  billItemPublicIds: string[];
  subtotalCents: number;
  serviceFeeCents: number;
  totalCents: number;
  provider: string | null;
  externalId: string | null;
  checkoutUrl: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateTablePaymentResult = {
  payment: TablePaymentIntent;
  idempotentReplay: boolean;
};

export function createTablePaymentIdempotencyKey() {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) return `table-payment:${randomId}`;
  return `table-payment:${Date.now()}:${Math.random().toString(36).slice(2, 14)}`;
}

export function tablePaymentFingerprint(draft: TablePaymentDraft) {
  return JSON.stringify({
    ...draft,
    billItemPublicIds: [...(draft.billItemPublicIds || [])].sort(),
  });
}

export function buildTablePaymentPayload(draft: TablePaymentDraft) {
  return {
    selectionMode: draft.selectionMode,
    method: draft.method,
    ...(draft.selectionMode === 'SELECTED_ITEMS'
      ? { billItemPublicIds: [...(draft.billItemPublicIds || [])] }
      : {}),
    ...(draft.selectionMode === 'EQUAL_SPLIT' ? { splitCount: draft.splitCount } : {}),
    includeOptionalServiceFee: Boolean(draft.includeOptionalServiceFee),
  };
}

export function isCancelableOwnTablePayment(
  payment: TableAccountSnapshot['payments'][number],
  currentParticipantPublicId: string,
) {
  return (
    payment.payerParticipantPublicId === currentParticipantPublicId &&
    (payment.status === 'RESERVED' || payment.status === 'PROCESSING')
  );
}

export function formatTableMoney(cents: number) {
  return (Number(cents || 0) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
