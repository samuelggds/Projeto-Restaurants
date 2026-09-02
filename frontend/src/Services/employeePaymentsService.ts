import api from './api';

export type EmployeeCompensationBaseModel = 'NONE' | 'FIXED_MONTHLY' | 'HOURLY';
export type EmployeeCompensationVariableModel =
  'NONE' | 'SERVICE_FEE_PERCENTAGE' | 'FIXED_PER_TABLE' | 'TABLE_SALES_PERCENTAGE';
export type EmployeeCompensationProrationMode = 'NONE' | 'CALENDAR_DAYS';
export type EmployeeWorkEntryStatus = 'DRAFT' | 'APPROVED' | 'CANCELED';
export type EmployeeEarningDirection = 'CREDIT' | 'DEBIT';
export type EmployeeEarningType =
  | 'FIXED_MONTHLY'
  | 'HOURLY'
  | 'WAITER_SERVICE_FEE'
  | 'WAITER_TABLE_FIXED'
  | 'WAITER_TABLE_SALES'
  | 'BONUS'
  | 'DEDUCTION'
  | 'ADVANCE'
  | 'CORRECTION'
  | 'REFUND_REVERSAL';
export type EmployeeSettlementStatus =
  'DRAFT' | 'CONFIRMED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELED';
export type EmployeeSettlementPaymentMethod = 'PIX' | 'CASH' | 'BANK_TRANSFER' | 'OTHER';
export type EmployeeSettlementPaymentStatus = 'ACTIVE' | 'REVERSED';

export type EmployeeCompensationPerson = {
  id: number;
  name: string;
  email?: string;
  subRole: 'COZINHA' | 'GARCOM' | 'ATENDENTE' | null;
  active: boolean;
};

export type EmployeeCompensationPolicy = {
  publicId: string;
  employeeId: number;
  baseModel: EmployeeCompensationBaseModel;
  fixedMonthlyCents: number | null;
  hourlyRateCents: number | null;
  variableModel: EmployeeCompensationVariableModel;
  variableBasisPoints: number | null;
  fixedPerTableCents: number | null;
  prorationMode: EmployeeCompensationProrationMode;
  effectiveFrom: string;
  effectiveUntil: string | null;
  version: number;
  active: boolean;
  employee?: EmployeeCompensationPerson;
};

export type EmployeeWorkEntry = {
  publicId: string;
  employeeId: number;
  workDate: string;
  minutesWorked: number;
  status: EmployeeWorkEntryStatus;
  approvedAt: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  version: number;
  employee: EmployeeCompensationPerson;
};

export type EmployeeEarning = {
  publicId: string;
  employeeId: number;
  type: EmployeeEarningType;
  direction: EmployeeEarningDirection;
  amountCents: number;
  sourceType: string;
  sourcePublicId: string | null;
  policyVersion: number | null;
  financialBaseCents: number | null;
  appliedBasisPoints: number | null;
  occurredAt: string;
  settledAt: string | null;
  employee: EmployeeCompensationPerson;
};

export type EmployeeSettlementPayment = {
  publicId: string;
  amountCents: number;
  method: EmployeeSettlementPaymentMethod;
  reference: string | null;
  notes: string | null;
  status: EmployeeSettlementPaymentStatus;
  registeredAt: string;
  reversedAt: string | null;
  reverseReason: string | null;
};

export type EmployeeSettlementItem = {
  publicId: string;
  typeSnapshot: EmployeeEarningType;
  directionSnapshot: EmployeeEarningDirection;
  amountCentsSnapshot: number;
  active: boolean;
  earning?: EmployeeEarning;
};

export type EmployeeSettlement = {
  publicId: string;
  employeeId: number;
  periodYear: number;
  periodMonth: number;
  periodStart: string;
  periodEnd: string;
  status: EmployeeSettlementStatus;
  grossCreditsCents: number;
  grossDebitsCents: number;
  totalDueCents: number;
  confirmedAt: string | null;
  paidAt: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  version: number;
  employee: EmployeeCompensationPerson;
  items?: EmployeeSettlementItem[];
  payments: EmployeeSettlementPayment[];
};

export type CompensationPolicyInput = {
  baseModel: EmployeeCompensationBaseModel;
  fixedMonthlyCents?: number | null;
  hourlyRateCents?: number | null;
  variableModel: EmployeeCompensationVariableModel;
  variableBasisPoints?: number | null;
  fixedPerTableCents?: number | null;
  prorationMode: EmployeeCompensationProrationMode;
  effectiveFrom: string;
  effectiveUntil?: string | null;
};

class EmployeePaymentsService {
  async listPolicies(employeeId?: number) {
    const response = await api.get<EmployeeCompensationPolicy[]>(
      '/employee-compensation/admin/policies',
      { params: employeeId ? { employeeId } : undefined },
    );
    return response.data;
  }

  async getEmployeePolicies(employeeId: number) {
    const response = await api.get<EmployeeCompensationPolicy[]>(
      `/employee-compensation/admin/employees/${employeeId}/policies`,
    );
    return response.data;
  }

  async createPolicy(employeeId: number, input: CompensationPolicyInput) {
    const response = await api.post<EmployeeCompensationPolicy>(
      `/employee-compensation/admin/employees/${employeeId}/policies`,
      input,
    );
    return response.data;
  }

  async closePolicy(publicId: string, effectiveUntil?: string) {
    const response = await api.post<EmployeeCompensationPolicy>(
      `/employee-compensation/admin/policies/${publicId}/close`,
      effectiveUntil ? { effectiveUntil } : {},
    );
    return response.data;
  }

  async listEarnings(params?: { employeeId?: number; from?: string; until?: string }) {
    const response = await api.get<EmployeeEarning[]>('/employee-compensation/admin/earnings', {
      params,
    });
    return response.data;
  }

  async createAdjustment(
    input: {
      employeeId: number;
      type: Extract<EmployeeEarningType, 'BONUS' | 'DEDUCTION' | 'ADVANCE' | 'CORRECTION'>;
      direction?: EmployeeEarningDirection;
      amountCents: number;
      reason: string;
      occurredAt?: string;
    },
    idempotencyKey: string,
  ) {
    const response = await api.post<EmployeeEarning>(
      '/employee-compensation/admin/earnings/adjustments',
      input,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return response.data;
  }

  async listWorkEntries(params?: { employeeId?: number; status?: EmployeeWorkEntryStatus }) {
    const response = await api.get<EmployeeWorkEntry[]>(
      '/employee-compensation/admin/work-entries',
      { params },
    );
    return response.data;
  }

  async createWorkEntry(input: { employeeId: number; workDate: string; minutesWorked: number }) {
    const response = await api.post<EmployeeWorkEntry>(
      '/employee-compensation/admin/work-entries',
      input,
    );
    return response.data;
  }

  async approveWorkEntry(publicId: string) {
    const response = await api.post<EmployeeWorkEntry>(
      `/employee-compensation/admin/work-entries/${publicId}/approve`,
    );
    return response.data;
  }

  async cancelWorkEntry(publicId: string, reason: string) {
    const response = await api.post<EmployeeWorkEntry>(
      `/employee-compensation/admin/work-entries/${publicId}/cancel`,
      { reason },
    );
    return response.data;
  }

  async listSettlements(params?: { employeeId?: number; status?: EmployeeSettlementStatus }) {
    const response = await api.get<EmployeeSettlement[]>(
      '/employee-compensation/admin/settlements',
      { params },
    );
    return response.data;
  }

  async generateSettlement(input: { employeeId: number; referenceMonth: string }) {
    const response = await api.post<EmployeeSettlement>(
      '/employee-compensation/admin/settlements',
      input,
    );
    return response.data;
  }

  async getSettlement(publicId: string) {
    const response = await api.get<EmployeeSettlement>(
      `/employee-compensation/admin/settlements/${publicId}`,
    );
    return response.data;
  }

  async confirmSettlement(publicId: string) {
    const response = await api.post<EmployeeSettlement>(
      `/employee-compensation/admin/settlements/${publicId}/confirm`,
    );
    return response.data;
  }

  async cancelSettlement(publicId: string, reason: string) {
    const response = await api.post<EmployeeSettlement>(
      `/employee-compensation/admin/settlements/${publicId}/cancel`,
      { reason },
    );
    return response.data;
  }

  async registerSettlementPayment(
    publicId: string,
    input: {
      amountCents: number;
      method: EmployeeSettlementPaymentMethod;
      reference?: string;
      notes?: string;
    },
    idempotencyKey: string,
  ) {
    const response = await api.post<{
      payment: EmployeeSettlementPayment;
      settlement: EmployeeSettlement;
      idempotentReplay: boolean;
    }>(`/employee-compensation/admin/settlements/${publicId}/payments`, input, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return response.data;
  }

  async reversePayment(publicId: string, reason: string) {
    const response = await api.post<{
      payment: EmployeeSettlementPayment;
      settlement: EmployeeSettlement;
    }>(`/employee-compensation/admin/payments/${publicId}/reverse`, { reason });
    return response.data;
  }
}

export default new EmployeePaymentsService();
