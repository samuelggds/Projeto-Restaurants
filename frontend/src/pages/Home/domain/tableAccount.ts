export type TableAccountStatus = 'OPEN' | 'CLOSING_REQUESTED' | 'CLOSED';
export type TablePaymentStatus =
  'RESERVED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELED' | 'REFUNDED';
export type TablePaymentSelectionMode =
  'MY_ITEMS' | 'SELECTED_ITEMS' | 'CUSTOM_AMOUNT' | 'EQUAL_SPLIT' | 'FULL_ACCOUNT' | 'WAITER';
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
    allowPix: boolean;
    allowCard: boolean;
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
    authenticated?: boolean;
    status: 'ACTIVE' | 'LEFT';
    joinedAt: string;
    leftAt: string | null;
  }>;
  participantAccounts?: Array<{
    publicId: string;
    displayName: string | null;
    status: 'ACTIVE' | 'LEFT';
    consumedCents: number;
    paidCents: number;
    reservedCents: number;
    processingCents: number;
    remainingCents: number;
  }>;
  activePayment: TablePaymentIntent | null;
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
  customAmountCents?: number;
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
  paymentCode: string | null;
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
    ...(draft.selectionMode === 'CUSTOM_AMOUNT'
      ? { customAmountCents: draft.customAmountCents }
      : {}),
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

export function tablePaymentMethodLabel(method: TablePaymentMethod) {
  switch (method) {
    case 'PIX':
      return 'PIX';
    case 'CASH':
      return 'Dinheiro';
    case 'CARD':
      return 'Cartão';
    case 'CARD_MACHINE':
      return 'Cartão na maquininha';
  }
}

export function tablePaymentStatusLabel(status: TablePaymentStatus) {
  switch (status) {
    case 'RESERVED':
      return 'Reservado';
    case 'PROCESSING':
      return 'Em confirmação';
    case 'PAID':
      return 'Confirmado';
    case 'FAILED':
      return 'Falhou';
    case 'EXPIRED':
      return 'Expirado';
    case 'CANCELED':
      return 'Cancelado';
    case 'REFUNDED':
      return 'Estornado';
  }
}

/** Prévia de MY_ITEMS; o backend continua sendo a autoridade sobre a cobrança. */
export function previewIndividualTablePayment(snapshot: TableAccountSnapshot) {
  const items = snapshot.items.filter(
    (item) =>
      item.orderedByParticipantPublicId === snapshot.currentParticipantPublicId &&
      item.orderStatus !== 'CANCELED',
  );
  const blocked = items.some((item) => item.reservedCents > 0 || item.processingCents > 0);
  const subtotalCents = items
    .filter((item) => item.financialStatus !== 'REFUNDED')
    .reduce((total, item) => total + item.availableCents, 0);
  // Mesmo arredondamento em centavos (half-up) usado pelo serviço de pagamentos.
  const serviceFeeCents =
    snapshot.capabilities.serviceFeeMode === 'MANDATORY'
      ? Number(
          (BigInt(subtotalCents) * BigInt(snapshot.capabilities.serviceFeeBasisPoints) + 5_000n) /
            10_000n,
        )
      : 0;
  return { subtotalCents, serviceFeeCents, totalCents: subtotalCents + serviceFeeCents, blocked };
}


export function currentParticipantAccount(snapshot: TableAccountSnapshot | null) {
  if (!snapshot) return null;

  const canonical = snapshot.participantAccounts?.find(
    (participant) => participant.publicId === snapshot.currentParticipantPublicId,
  );
  if (canonical) return canonical;

  const participant = snapshot.participants.find(
    (entry) => entry.publicId === snapshot.currentParticipantPublicId,
  );
  const ownItems = snapshot.items.filter(
    (item) =>
      item.orderedByParticipantPublicId === snapshot.currentParticipantPublicId &&
      item.orderStatus !== 'CANCELED' &&
      item.financialStatus !== 'REFUNDED',
  );
  const consumedCents = ownItems.reduce((total, item) => total + item.unitPriceCents, 0);
  const paidCents = ownItems.reduce((total, item) => total + item.paidCents, 0);
  const reservedCents = ownItems.reduce((total, item) => total + item.reservedCents, 0);
  const processingCents = ownItems.reduce((total, item) => total + item.processingCents, 0);

  return {
    publicId: snapshot.currentParticipantPublicId,
    displayName: participant?.displayName || null,
    status: participant?.status || 'ACTIVE',
    consumedCents,
    paidCents,
    reservedCents,
    processingCents,
    remainingCents: Math.max(0, consumedCents - paidCents),
  };
}
