import { startTransition, useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';

import employeePaymentsService, {
  type CompensationPolicyInput,
  type EmployeeCompensationPolicy,
  type EmployeeEarning,
  type EmployeeEarningDirection,
  type EmployeeSettlement,
  type EmployeeSettlementStatus,
  type EmployeeWorkEntry,
  type EmployeeWorkEntryStatus,
} from '../../../Services/employeePaymentsService';
import { useAppDialog } from '../../../components/AppDialog/context';
import {
  activePaidCents,
  currentMonth,
  duration,
  earningTypeLabel,
  errorMessage,
  idempotencyKey,
  localDate,
  money,
  moneyInput,
  nextPolicyDate,
  parseScaledDecimal,
  roleLabel,
  shortDate,
  type AdjustmentDraft,
  type EmployeeCompensationSettingsProps,
  type ModalState,
  type PaymentDraft,
  type PolicyDraft,
  type ReasonAction,
  type StaffEmployee,
  type View,
  type WorkDraft,
} from './EmployeeCompensationSettings.shared';

export function useEmployeeCompensationModel({
  employees,
  onOpenEmployees,
}: EmployeeCompensationSettingsProps) {
  const { confirmDialog } = useAppDialog();
  const [view, setView] = useState<View>('policies');
  const [referenceMonth, setReferenceMonth] = useState(currentMonth);
  const [policies, setPolicies] = useState<EmployeeCompensationPolicy[]>([]);
  const [workEntries, setWorkEntries] = useState<EmployeeWorkEntry[]>([]);
  const [earnings, setEarnings] = useState<EmployeeEarning[]>([]);
  const [settlements, setSettlements] = useState<EmployeeSettlement[]>([]);
  const [settlementDetail, setSettlementDetail] = useState<EmployeeSettlement | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null,
  );
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [workStatus, setWorkStatus] = useState<EmployeeWorkEntryStatus | ''>('');
  const [settlementStatus, setSettlementStatus] = useState<
    EmployeeSettlementStatus | 'MISSING' | ''
  >('');
  const [ledgerDirection, setLedgerDirection] = useState<EmployeeEarningDirection | ''>('');
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [reason, setReason] = useState('');
  const [policyDraft, setPolicyDraft] = useState<PolicyDraft>({
    baseModel: 'FIXED_MONTHLY',
    baseValue: '',
    prorationMode: 'NONE',
    variableModel: 'NONE',
    variableValue: '',
    effectiveFrom: localDate(),
  });
  const [workDraft, setWorkDraft] = useState<WorkDraft>({
    employeeId: '',
    workDate: localDate(),
    hours: '8',
    minutes: '0',
  });
  const [adjustmentDraft, setAdjustmentDraft] = useState<AdjustmentDraft>({
    employeeId: '',
    type: 'BONUS',
    direction: 'CREDIT',
    amount: '',
    occurredAt: localDate(),
    reason: '',
    idempotencyKey: idempotencyKey(),
  });
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>({
    amount: '',
    method: 'PIX',
    reference: '',
    notes: '',
    idempotencyKey: idempotencyKey(),
  });
  const adjustmentRetryRef = useRef<AdjustmentDraft | null>(null);
  const paymentRetryRef = useRef<{
    settlementPublicId: string;
    draft: PaymentDraft;
  } | null>(null);

  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase('pt-BR'));
  const staff = employees
    .filter((employee) => employee.role !== 'COURIER')
    .map((employee) => ({ ...employee, numericId: Number(employee.id) }))
    .filter((employee) => Number.isSafeInteger(employee.numericId) && employee.numericId > 0);
  const activeStaff = staff.filter((employee) => employee.active);

  const load = useCallback(async (background = false) => {
    try {
      const [nextPolicies, nextWorkEntries, nextEarnings, nextSettlements] = await Promise.all([
        employeePaymentsService.listPolicies(),
        employeePaymentsService.listWorkEntries(),
        employeePaymentsService.listEarnings(),
        employeePaymentsService.listSettlements(),
      ]);
      setPolicies(nextPolicies);
      setWorkEntries(nextWorkEntries);
      setEarnings(nextEarnings);
      setSettlements(nextSettlements);
      setLoadError('');
      return true;
    } catch (error) {
      const text = errorMessage(error, 'Não foi possível carregar a remuneração da equipe.');
      if (background) setFeedback({ tone: 'error', text });
      else setLoadError(text);
      return false;
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(loadTimer);
  }, [load]);

  const currentPolicies = new Map<number, EmployeeCompensationPolicy>();
  policies.forEach((policy) => {
    if (policy.active && !currentPolicies.has(policy.employeeId)) {
      currentPolicies.set(policy.employeeId, policy);
    }
  });
  const monthEarnings = earnings.filter(
    (earning) => earning.occurredAt.slice(0, 7) === referenceMonth,
  );
  const monthWorkEntries = workEntries.filter(
    (entry) => entry.workDate.slice(0, 7) === referenceMonth,
  );
  const [selectedYear, selectedMonth] = referenceMonth.split('-').map(Number);
  const monthSettlements = settlements.filter(
    (settlement) =>
      settlement.periodYear === selectedYear && settlement.periodMonth === selectedMonth,
  );
  const settlementByEmployee = new Map(
    monthSettlements.map((settlement) => [settlement.employeeId, settlement]),
  );
  const unsettledCredits = monthEarnings
    .filter((earning) => earning.direction === 'CREDIT' && !earning.settledAt)
    .reduce((total, earning) => total + earning.amountCents, 0);
  const unsettledDebits = monthEarnings
    .filter((earning) => earning.direction === 'DEBIT' && !earning.settledAt)
    .reduce((total, earning) => total + earning.amountCents, 0);
  const openSettlements = monthSettlements.filter(
    (settlement) => !['PAID', 'CANCELED'].includes(settlement.status),
  );
  const paidThisMonth = monthSettlements.reduce(
    (total, settlement) => total + activePaidCents(settlement),
    0,
  );

  const visibleStaff = staff.filter((employee) => {
    if (!showInactive && !employee.active) return false;
    if (!deferredSearch) return true;
    return `${employee.name} ${employee.email} ${roleLabel(employee.role)}`
      .toLocaleLowerCase('pt-BR')
      .includes(deferredSearch);
  });
  const visibleWorkEntries = monthWorkEntries.filter((entry) => {
    const matchesStatus = !workStatus || entry.status === workStatus;
    const matchesSearch =
      !deferredSearch ||
      `${entry.employee.name} ${roleLabel(
        staff.find((employee) => employee.numericId === entry.employeeId)?.role || 'ATTENDANT',
      )}`
        .toLocaleLowerCase('pt-BR')
        .includes(deferredSearch);
    return matchesStatus && matchesSearch;
  });
  const visibleEarnings = monthEarnings.filter((earning) => {
    const matchesDirection = !ledgerDirection || earning.direction === ledgerDirection;
    const matchesSearch =
      !deferredSearch ||
      `${earning.employee.name} ${earningTypeLabel[earning.type]}`
        .toLocaleLowerCase('pt-BR')
        .includes(deferredSearch);
    return matchesDirection && matchesSearch;
  });
  const settlementRows = staff.filter((employee) => {
    const settlement = settlementByEmployee.get(employee.numericId);
    if (!employee.active && !showInactive && !settlement) return false;
    if (
      deferredSearch &&
      !`${employee.name} ${employee.email} ${roleLabel(employee.role)}`
        .toLocaleLowerCase('pt-BR')
        .includes(deferredSearch)
    ) {
      return false;
    }
    if (settlementStatus === 'MISSING') return !settlement;
    if (settlementStatus) return settlement?.status === settlementStatus;
    return true;
  });

  async function runAction<T>(
    key: string,
    action: () => Promise<T>,
    success: string,
    closeModal = true,
  ) {
    if (busy) return null;
    setBusy(key);
    setFeedback(null);
    try {
      const result = await action();
      if (closeModal) setModal(null);
      setFeedback({ tone: 'success', text: success });
      await load(true);
      if (!closeModal && modal?.kind === 'settlement') {
        const refreshed = await employeePaymentsService
          .getSettlement(modal.settlement.publicId)
          .catch(() => null);
        if (refreshed) {
          setSettlementDetail(refreshed);
          setModal({ kind: 'settlement', settlement: refreshed });
        }
      }
      return result;
    } catch (error) {
      setFeedback({ tone: 'error', text: errorMessage(error) });
      return null;
    } finally {
      setBusy('');
    }
  }

  function switchView(nextView: View) {
    startTransition(() => {
      setView(nextView);
      setSearch('');
    });
  }

  function openPolicy(employee: StaffEmployee) {
    const current = currentPolicies.get(employee.numericId);
    setPolicyDraft({
      baseModel: current?.baseModel || 'FIXED_MONTHLY',
      baseValue:
        current?.baseModel === 'HOURLY'
          ? moneyInput(current.hourlyRateCents)
          : moneyInput(current?.fixedMonthlyCents),
      prorationMode: current?.prorationMode || 'NONE',
      variableModel: employee.role === 'WAITER' ? current?.variableModel || 'NONE' : 'NONE',
      variableValue:
        current?.variableModel === 'FIXED_PER_TABLE'
          ? moneyInput(current.fixedPerTableCents)
          : current?.variableBasisPoints !== null && current?.variableBasisPoints !== undefined
            ? (current.variableBasisPoints / 100).toFixed(2)
            : '',
      effectiveFrom: nextPolicyDate(current),
    });
    setModal({ kind: 'policy', employee });
  }

  async function savePolicy() {
    if (modal?.kind !== 'policy') return;
    const currentPolicy = currentPolicies.get(modal.employee.numericId);
    if (currentPolicy && policyDraft.effectiveFrom < nextPolicyDate(currentPolicy)) {
      setFeedback({
        tone: 'error',
        text: `A nova versão deve iniciar a partir de ${shortDate(nextPolicyDate(currentPolicy))}.`,
      });
      return;
    }
    const baseCents =
      policyDraft.baseModel === 'NONE' ? 0 : parseScaledDecimal(policyDraft.baseValue, 100);
    const variableValue =
      policyDraft.variableModel === 'NONE'
        ? 0
        : parseScaledDecimal(
            policyDraft.variableValue,
            100,
            policyDraft.variableModel === 'FIXED_PER_TABLE',
          );
    if (baseCents === null || variableValue === null || !policyDraft.effectiveFrom) {
      setFeedback({ tone: 'error', text: 'Revise os valores e a data de vigência da regra.' });
      return;
    }
    const input: CompensationPolicyInput = {
      baseModel: policyDraft.baseModel,
      fixedMonthlyCents: policyDraft.baseModel === 'FIXED_MONTHLY' ? baseCents : null,
      hourlyRateCents: policyDraft.baseModel === 'HOURLY' ? baseCents : null,
      variableModel: modal.employee.role === 'WAITER' ? policyDraft.variableModel : 'NONE',
      variableBasisPoints:
        modal.employee.role === 'WAITER' &&
        ['SERVICE_FEE_PERCENTAGE', 'TABLE_SALES_PERCENTAGE'].includes(policyDraft.variableModel)
          ? variableValue
          : null,
      fixedPerTableCents:
        modal.employee.role === 'WAITER' && policyDraft.variableModel === 'FIXED_PER_TABLE'
          ? variableValue
          : null,
      prorationMode: policyDraft.baseModel === 'FIXED_MONTHLY' ? policyDraft.prorationMode : 'NONE',
      effectiveFrom: `${policyDraft.effectiveFrom}T12:00:00.000Z`,
      effectiveUntil: null,
    };
    await runAction(
      'policy',
      () => employeePaymentsService.createPolicy(modal.employee.numericId, input),
      `Nova regra de ${modal.employee.name} criada.`,
    );
  }

  async function closePolicy(policy: EmployeeCompensationPolicy, employeeName: string) {
    const confirmed = await confirmDialog({
      title: 'Encerrar regra vigente?',
      description: `A regra de ${employeeName} será encerrada agora. Os lançamentos anteriores permanecem intactos.`,
      confirmLabel: 'Encerrar regra',
      tone: 'danger',
    });
    if (!confirmed) return;
    await runAction(
      `close-policy-${policy.publicId}`,
      () => employeePaymentsService.closePolicy(policy.publicId),
      `Regra de ${employeeName} encerrada.`,
      false,
    );
  }

  function openWork(employee?: StaffEmployee) {
    setWorkDraft({
      employeeId: employee ? String(employee.numericId) : String(activeStaff[0]?.numericId || ''),
      workDate: localDate(),
      hours: '8',
      minutes: '0',
    });
    setModal({ kind: 'work', employee });
  }

  async function saveWorkEntry() {
    const hours = Number(workDraft.hours || 0);
    const minutes = Number(workDraft.minutes || 0);
    const totalMinutes = hours * 60 + minutes;
    if (
      !Number.isSafeInteger(hours) ||
      !Number.isSafeInteger(minutes) ||
      minutes < 0 ||
      minutes > 59 ||
      totalMinutes < 1 ||
      totalMinutes > 1_440 ||
      !workDraft.employeeId ||
      !workDraft.workDate
    ) {
      setFeedback({
        tone: 'error',
        text: 'Informe funcionário, data e duração entre 1 minuto e 24 horas.',
      });
      return;
    }
    const employee = staff.find((entry) => entry.numericId === Number(workDraft.employeeId));
    await runAction(
      'work',
      () =>
        employeePaymentsService.createWorkEntry({
          employeeId: Number(workDraft.employeeId),
          workDate: workDraft.workDate,
          minutesWorked: totalMinutes,
        }),
      `Horas de ${employee?.name || 'funcionário'} registradas em rascunho.`,
    );
  }

  async function approveWork(entry: EmployeeWorkEntry) {
    const confirmed = await confirmDialog({
      title: 'Aprovar horas lançadas?',
      description: `${duration(entry.minutesWorked)} de ${entry.employee.name} ficará disponível para o acerto mensal.`,
      confirmLabel: 'Aprovar horas',
    });
    if (!confirmed) return;
    await runAction(
      `approve-${entry.publicId}`,
      () => employeePaymentsService.approveWorkEntry(entry.publicId),
      `Horas de ${entry.employee.name} aprovadas.`,
      false,
    );
  }

  function openAdjustment(employee?: StaffEmployee) {
    setAdjustmentDraft(
      adjustmentRetryRef.current || {
        employeeId: employee ? String(employee.numericId) : String(activeStaff[0]?.numericId || ''),
        type: 'BONUS',
        direction: 'CREDIT',
        amount: '',
        occurredAt: localDate(),
        reason: '',
        idempotencyKey: idempotencyKey(),
      },
    );
    setModal({ kind: 'adjustment', employee });
  }

  async function saveAdjustment() {
    const amountCents = parseScaledDecimal(adjustmentDraft.amount, 100, true);
    if (!amountCents || !adjustmentDraft.employeeId || !adjustmentDraft.reason.trim()) {
      setFeedback({ tone: 'error', text: 'Informe funcionário, valor e motivo do lançamento.' });
      return;
    }
    const direction: EmployeeEarningDirection =
      adjustmentDraft.type === 'BONUS'
        ? 'CREDIT'
        : adjustmentDraft.type === 'CORRECTION'
          ? adjustmentDraft.direction
          : 'DEBIT';
    adjustmentRetryRef.current = { ...adjustmentDraft };
    const result = await runAction(
      'adjustment',
      () =>
        employeePaymentsService.createAdjustment(
          {
            employeeId: Number(adjustmentDraft.employeeId),
            type: adjustmentDraft.type,
            amountCents,
            reason: adjustmentDraft.reason.trim(),
            occurredAt: `${adjustmentDraft.occurredAt}T12:00:00.000Z`,
            ...(adjustmentDraft.type === 'CORRECTION' ? { direction } : {}),
          },
          adjustmentDraft.idempotencyKey,
        ),
      'Lançamento incluído no ledger.',
    );
    if (result) adjustmentRetryRef.current = null;
  }

  async function generateSettlement(employee: Pick<StaffEmployee, 'numericId' | 'name'>) {
    await runAction(
      `generate-${employee.numericId}`,
      () =>
        employeePaymentsService.generateSettlement({
          employeeId: employee.numericId,
          referenceMonth,
        }),
      `Acerto de ${employee.name} gerado em rascunho.`,
      false,
    );
  }

  async function confirmSettlement(settlement: EmployeeSettlement) {
    const confirmed = await confirmDialog({
      title: 'Confirmar este acerto?',
      description: `O valor de ${money(settlement.totalDueCents)} será congelado para pagamento.`,
      confirmLabel: 'Confirmar acerto',
    });
    if (!confirmed) return;
    await runAction(
      `confirm-${settlement.publicId}`,
      () => employeePaymentsService.confirmSettlement(settlement.publicId),
      `Acerto de ${settlement.employee.name} confirmado.`,
      false,
    );
  }

  async function openSettlement(settlement: EmployeeSettlement) {
    setSettlementDetail(null);
    setModal({ kind: 'settlement', settlement });
    setDetailLoading(true);
    try {
      setSettlementDetail(await employeePaymentsService.getSettlement(settlement.publicId));
    } catch (error) {
      setFeedback({ tone: 'error', text: errorMessage(error, 'Não foi possível abrir o acerto.') });
    } finally {
      setDetailLoading(false);
    }
  }

  function openPayment(settlement: EmployeeSettlement) {
    const retry =
      paymentRetryRef.current?.settlementPublicId === settlement.publicId
        ? paymentRetryRef.current.draft
        : null;
    const remaining = Math.max(0, settlement.totalDueCents - activePaidCents(settlement));
    setPaymentDraft(
      retry || {
        amount: moneyInput(remaining),
        method: 'PIX',
        reference: '',
        notes: '',
        idempotencyKey: idempotencyKey(),
      },
    );
    setModal({ kind: 'payment', settlement });
  }

  async function savePayment() {
    if (modal?.kind !== 'payment') return;
    const amountCents = parseScaledDecimal(paymentDraft.amount, 100, true);
    const remaining = modal.settlement.totalDueCents - activePaidCents(modal.settlement);
    if (!amountCents || amountCents > remaining) {
      setFeedback({
        tone: 'error',
        text: 'Informe um valor maior que zero e dentro do saldo do acerto.',
      });
      return;
    }
    paymentRetryRef.current = {
      settlementPublicId: modal.settlement.publicId,
      draft: { ...paymentDraft },
    };
    const result = await runAction(
      'payment',
      () =>
        employeePaymentsService.registerSettlementPayment(
          modal.settlement.publicId,
          {
            amountCents,
            method: paymentDraft.method,
            ...(paymentDraft.reference.trim() ? { reference: paymentDraft.reference.trim() } : {}),
            ...(paymentDraft.notes.trim() ? { notes: paymentDraft.notes.trim() } : {}),
          },
          paymentDraft.idempotencyKey,
        ),
      `Pagamento de ${modal.settlement.employee.name} registrado.`,
    );
    if (result) paymentRetryRef.current = null;
  }

  function requestReason(action: ReasonAction, publicId: string, subject: string) {
    setReason('');
    setModal({ kind: 'reason', action, publicId, subject });
  }

  async function submitReason() {
    if (modal?.kind !== 'reason' || !reason.trim()) {
      setFeedback({ tone: 'error', text: 'Informe o motivo para preservar a auditoria.' });
      return;
    }
    const reasonText = reason.trim();
    if (modal.action === 'cancel-work') {
      await runAction(
        'reason',
        () => employeePaymentsService.cancelWorkEntry(modal.publicId, reasonText),
        `Lançamento de ${modal.subject} cancelado.`,
      );
      return;
    }
    if (modal.action === 'cancel-settlement') {
      await runAction(
        'reason',
        () => employeePaymentsService.cancelSettlement(modal.publicId, reasonText),
        `Acerto de ${modal.subject} cancelado.`,
      );
      return;
    }
    await runAction(
      'reason',
      () => employeePaymentsService.reversePayment(modal.publicId, reasonText),
      `Pagamento de ${modal.subject} revertido.`,
    );
  }

  const detail = modal?.kind === 'settlement' ? settlementDetail || modal.settlement : null;
  const detailActivePayments =
    detail?.payments.filter((payment) => payment.status === 'ACTIVE') || [];

  return {
    activeStaff,
    adjustmentDraft,
    approveWork,
    busy,
    closePolicy,
    confirmSettlement,
    currentPolicies,
    detail,
    detailActivePayments,
    detailLoading,
    expandedEmployeeId,
    feedback,
    generateSettlement,
    ledgerDirection,
    load,
    loadError,
    loading,
    modal,
    monthEarnings,
    monthSettlements,
    monthWorkEntries,
    onOpenEmployees,
    openAdjustment,
    openPayment,
    openPolicy,
    openSettlement,
    openSettlements,
    openWork,
    paidThisMonth,
    paymentDraft,
    policies,
    policyDraft,
    reason,
    referenceMonth,
    requestReason,
    saveAdjustment,
    savePayment,
    savePolicy,
    saveWorkEntry,
    search,
    setAdjustmentDraft,
    setExpandedEmployeeId,
    setFeedback,
    setLedgerDirection,
    setLoading,
    setModal,
    setPaymentDraft,
    setPolicyDraft,
    setReason,
    setReferenceMonth,
    setSearch,
    setSettlementStatus,
    setShowInactive,
    settlementByEmployee,
    settlementRows,
    settlementStatus,
    setWorkDraft,
    setWorkStatus,
    showInactive,
    submitReason,
    switchView,
    unsettledCredits,
    unsettledDebits,
    view,
    visibleEarnings,
    visibleStaff,
    visibleWorkEntries,
    workDraft,
    workStatus,
  };
}

export type EmployeeCompensationModel = ReturnType<typeof useEmployeeCompensationModel>;
