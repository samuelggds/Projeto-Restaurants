/**
 * Contratos canônicos da conta da mesa.
 *
 * Nesta etapa eles não dependem do Prisma nem de um provedor de pagamento.
 * Valores monetários são representados exclusivamente em centavos inteiros.
 */
export const TABLE_ACCOUNT_CONTRACT_VERSION = 1 as const;

export const TABLE_ACCOUNT_SESSION_STATUSES = ['OPEN', 'CLOSING_REQUESTED', 'CLOSED'] as const;

export const TABLE_PARTICIPANT_STATUSES = ['ACTIVE', 'LEFT'] as const;

export const TABLE_ORDER_SETTLEMENT_MODES = ['TABLE_ACCOUNT', 'PAY_NOW'] as const;

export const TABLE_ORDER_OPERATIONAL_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'DELIVERED',
  'CANCELED',
] as const;

export const TABLE_BILL_ITEM_FINANCIAL_STATUSES = [
  'UNPAID',
  'RESERVED',
  'PROCESSING',
  'PAID',
  'REFUNDED',
] as const;

export const TABLE_PAYMENT_INTENT_STATUSES = [
  'RESERVED',
  'PROCESSING',
  'PAID',
  'FAILED',
  'EXPIRED',
  'CANCELED',
  'REFUNDED',
] as const;

export const TABLE_PAYMENT_SELECTION_MODES = [
  'MY_ITEMS',
  'SELECTED_ITEMS',
  'EQUAL_SPLIT',
  'FULL_ACCOUNT',
  'WAITER',
] as const;

export const TABLE_PAYMENT_METHODS = ['PIX', 'CARD', 'CASH', 'CARD_MACHINE'] as const;

export const TABLE_SERVICE_FEE_MODES = ['DISABLED', 'OPTIONAL', 'MANDATORY'] as const;

export const TABLE_ACCOUNT_ROLES = [
  'ADMIN',
  'FUNCIONARIO',
  'CLIENTE',
  'MOTOQUEIRO',
  'SUPER_ADMIN',
] as const;

export const TABLE_ACCOUNT_EMPLOYEE_SUB_ROLES = ['GARCOM', 'COZINHA'] as const;

export const DEFAULT_TABLE_ACCOUNT_TIME_ZONE = 'America/Sao_Paulo' as const;

/** Nenhum provedor foi escolhido nesta etapa, por decisão de produto. */
export const TABLE_ACCOUNT_PAYMENT_PROVIDER = null;

/**
 * Decisões aprovadas para orientar as próximas etapas sem deixar regras
 * implícitas em controllers ou componentes de interface.
 */
export const TABLE_ACCOUNT_PRODUCT_DECISIONS = {
  participantDisplayNameRequired: false,
  participantPhoneOrLoginRequired: false,
  participantsAndItemsVisibleToTable: true,
  paymentMethodVisibleToOtherParticipants: false,
  quantityCreatesIndividualFinancialUnits: true,
  equalSplitPartsProvidedByCustomer: true,
  equalSplitRemainderAllocation: 'FIRST_PARTS',
  prepaymentThresholdBasis: 'PROJECTED_OUTSTANDING_BALANCE',
  optionalServiceFeeChoicePerPayment: true,
  waiterCanConfirmCashOrCardMachine: true,
  forceCloseAndRefundRestrictedToAdmin: true,
  paidItemCancellationRequiresCompletedRefund: true,
  defaultTimeZone: DEFAULT_TABLE_ACCOUNT_TIME_ZONE,
  selectedPaymentProvider: TABLE_ACCOUNT_PAYMENT_PROVIDER,
} as const;

export type MoneyCents = number;
export type IsoDateTimeString = string;

export type TableAccountSessionStatus = (typeof TABLE_ACCOUNT_SESSION_STATUSES)[number];
export type TableParticipantStatus = (typeof TABLE_PARTICIPANT_STATUSES)[number];
export type TableOrderSettlementMode = (typeof TABLE_ORDER_SETTLEMENT_MODES)[number];
export type TableOrderOperationalStatus = (typeof TABLE_ORDER_OPERATIONAL_STATUSES)[number];
export type TableBillItemFinancialStatus = (typeof TABLE_BILL_ITEM_FINANCIAL_STATUSES)[number];
export type TablePaymentIntentStatus = (typeof TABLE_PAYMENT_INTENT_STATUSES)[number];
export type TablePaymentSelectionMode = (typeof TABLE_PAYMENT_SELECTION_MODES)[number];
export type TablePaymentMethod = (typeof TABLE_PAYMENT_METHODS)[number];
export type TableServiceFeeMode = (typeof TABLE_SERVICE_FEE_MODES)[number];
export type TableAccountRole = (typeof TABLE_ACCOUNT_ROLES)[number];
export type TableAccountEmployeeSubRole = (typeof TABLE_ACCOUNT_EMPLOYEE_SUB_ROLES)[number] | null;

export interface TableAccountActor {
  id: number;
  role: TableAccountRole;
  subRole: TableAccountEmployeeSubRole;
  restaurantId: number | null;
}

export interface TablePrepaymentWindowDto {
  /** Convenção JavaScript: 0 = domingo e 6 = sábado. */
  weekdays: number[];
  startsAtMinute: number;
  endsAtMinute: number;
}

export interface TableAccountSettingsDto {
  enabled: boolean;
  requirePrepaymentAboveCents: MoneyCents | null;
  prepaymentWindows: TablePrepaymentWindowDto[];
  allowCash: boolean;
  allowCardMachine: boolean;
  allowSplit: boolean;
  serviceFeeMode: TableServiceFeeMode;
  serviceFeeBasisPoints: number;
  preventCloseWithOutstandingBalance: boolean;
  requireEmployeeApprovalForPreparedItemCancellation: boolean;
  blockNewOrdersOnClosingRequest: boolean;
  reservationTimeoutMinutes: number;
  timeZone: string;
}

export interface TableParticipantDto {
  publicId: string;
  displayName: string | null;
  status: TableParticipantStatus;
  joinedAt: IsoDateTimeString;
  leftAt: IsoDateTimeString | null;
}

export interface TableBillItemDto {
  publicId: string;
  orderPublicId: string;
  productName: string;
  unitIndex: number;
  unitPriceCents: MoneyCents;
  financialStatus: TableBillItemFinancialStatus;
  orderStatus: TableOrderOperationalStatus;
  orderedByParticipantPublicId: string;
  orderedByDisplayName: string;
}

export interface TableAccountSummaryDto {
  sessionPublicId: string;
  tableNumber: number;
  status: TableAccountSessionStatus;
  consumedCents: MoneyCents;
  serviceFeeCents: MoneyCents;
  grossPaidCents: MoneyCents;
  refundedCents: MoneyCents;
  netPaidCents: MoneyCents;
  reservedCents: MoneyCents;
  processingCents: MoneyCents;
  remainingCents: MoneyCents;
  overpaidCents: MoneyCents;
  participantsCount: number;
}

export interface TablePaymentIntentDto {
  publicId: string;
  sessionPublicId: string;
  payerParticipantPublicId: string;
  selectionMode: TablePaymentSelectionMode;
  method: TablePaymentMethod;
  status: TablePaymentIntentStatus;
  billItemPublicIds: string[];
  subtotalCents: MoneyCents;
  serviceFeeCents: MoneyCents;
  totalCents: MoneyCents;
  provider: string | null;
  externalId: string | null;
  expiresAt: IsoDateTimeString;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

/** Visão segura para os demais participantes, sem forma de pagamento. */
export interface TablePaymentSummaryDto {
  publicId: string;
  payerParticipantPublicId: string;
  selectionMode: TablePaymentSelectionMode;
  status: TablePaymentIntentStatus;
  totalCents: MoneyCents;
  createdAt: IsoDateTimeString;
}

export interface TableAccountBaseSnapshotDto {
  contractVersion: typeof TABLE_ACCOUNT_CONTRACT_VERSION;
  summary: TableAccountSummaryDto;
  participants: TableParticipantDto[];
  items: TableBillItemDto[];
}

export interface TableAccountSnapshotDto extends TableAccountBaseSnapshotDto {
  currentParticipantPublicId: string;
  payments: TablePaymentSummaryDto[];
}

export interface TableAccountAdminSnapshotDto extends TableAccountBaseSnapshotDto {
  paymentIntents: TablePaymentIntentDto[];
}
