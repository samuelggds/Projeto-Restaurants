import type {
  EmployeeCompensationPolicy,
  EmployeeWorkEntry,
  EmployeeEarning,
  EmployeeSettlement,
  EmployeeSettlementPayment,
  CompensationPolicyInput,
  EmployeeCompensationPerson,
} from '../../../Services/employeePaymentsService';
import type { Employee } from '../../admin/types';
import type { DemoOperationContext } from './demoAdminLocalOperations';

export function demoEmployeePayments(
  ctx: DemoOperationContext & { employees?: Employee[] },
): { data: unknown } | undefined {
  const { path, method, body, query, state, records, nextId } = ctx;
  if (!path.startsWith('/employee-compensation/admin/')) return;
  const prefix = '/employee-compensation/admin';
  const get = <T>(key: string): T[] => (records.get(`employee:${key}`) as T[] | undefined) ?? [];
  const put = <T>(key: string, values: T[]) => records.set(`employee:${key}`, values);
  const result = (data: unknown) => ({ data });
  const now = new Date().toISOString();
  const id = () => `demo-payroll-${nextId()}`;
  const employee = (value: unknown): EmployeeCompensationPerson => {
    const person = ctx.employees?.find((item) => item.id === String(value));
    if (person)
      return {
        id: Number(value),
        name: person.name,
        email: person.email,
        active: person.active,
        subRole:
          person.role === 'COOK' ? 'COZINHA' : person.role === 'WAITER' ? 'GARCOM' : 'ATENDENTE',
      };
    const account = state.accounts.filter((item) => !['ADMIN', 'CLIENTE'].includes(item.role))[
      Number(value) - 3
    ];
    if (!account) throw new Error('Escolha um funcionário da demonstração.');
    return {
      id: Number(value),
      name: account.name,
      email: account.email,
      active: true,
      subRole:
        account.role === 'COZINHA' ? 'COZINHA' : account.role === 'GARCOM' ? 'GARCOM' : 'ATENDENTE',
    };
  };
  const filter = <T extends { employeeId: number; status?: string }>(rows: T[]) =>
    rows.filter(
      (item) =>
        (!query.employeeId || item.employeeId === Number(query.employeeId)) &&
        (!query.status || item.status === query.status),
    );
  const policies = get<EmployeeCompensationPolicy>('policies');
  const work = get<EmployeeWorkEntry>('work');
  let earnings = get<EmployeeEarning>('earnings');
  const settlements = get<EmployeeSettlement>('settlements');
  const policyRoute = path.match(/\/employees\/(\d+)\/policies$/);
  if (path === `${prefix}/policies` && method === 'GET') return result(filter(policies));
  if (policyRoute && ['GET', 'POST'].includes(method)) {
    const employeeId = Number(policyRoute[1]);
    if (method === 'GET') return result(policies.filter((item) => item.employeeId === employeeId));
    const input = body as unknown as CompensationPolicyInput;
    const policy: EmployeeCompensationPolicy = {
      ...input,
      publicId: id(),
      employeeId,
      employee: employee(employeeId),
      version: policies.filter((item) => item.employeeId === employeeId).length + 1,
      active: true,
      fixedMonthlyCents: input.fixedMonthlyCents ?? null,
      hourlyRateCents: input.hourlyRateCents ?? null,
      variableBasisPoints: input.variableBasisPoints ?? null,
      fixedPerTableCents: input.fixedPerTableCents ?? null,
      effectiveUntil: input.effectiveUntil ?? null,
    };
    put('policies', [
      ...policies.map((item) =>
        item.employeeId === employeeId
          ? { ...item, active: false, effectiveUntil: input.effectiveFrom }
          : item,
      ),
      policy,
    ]);
    return result(policy);
  }
  const close = path.match(/\/policies\/([^/]+)\/close$/);
  if (close) {
    const policy = policies.find((item) => item.publicId === close[1]);
    if (!policy) throw new Error('Regra não encontrada.');
    const updated = {
      ...policy,
      active: false,
      effectiveUntil: String(body.effectiveUntil ?? now),
    };
    put(
      'policies',
      policies.map((item) => (item === policy ? updated : item)),
    );
    return result(updated);
  }
  const earning = (
    employeeId: number,
    amount: number,
    source: string,
    type: EmployeeEarning['type'],
    direction: EmployeeEarning['direction'] = 'CREDIT',
  ): EmployeeEarning => ({
    publicId: id(),
    employeeId,
    employee: employee(employeeId),
    type,
    direction,
    amountCents: Math.round(amount),
    sourceType: 'DEMO',
    sourcePublicId: source,
    policyVersion: null,
    financialBaseCents: null,
    appliedBasisPoints: null,
    occurredAt: now,
    settledAt: null,
  });
  if (path === `${prefix}/earnings` && method === 'GET')
    return result(
      filter(earnings).filter(
        (item) =>
          (!query.from || item.occurredAt >= String(query.from)) &&
          (!query.until || item.occurredAt.slice(0, 10) <= String(query.until).slice(0, 10)),
      ),
    );
  if (path === `${prefix}/earnings/adjustments` && method === 'POST') {
    if (!(Number(body.amountCents) > 0) || String(body.reason ?? '').trim().length < 3)
      throw new Error('Informe um valor e uma justificativa.');
    const row = earning(
      Number(body.employeeId),
      Number(body.amountCents),
      String(body.reason),
      body.type as EmployeeEarning['type'],
      body.direction === 'DEBIT' || ['DEDUCTION', 'ADVANCE'].includes(String(body.type))
        ? 'DEBIT'
        : 'CREDIT',
    );
    row.occurredAt = String(body.occurredAt ?? now);
    put('earnings', [...earnings, row]);
    return result(row);
  }
  if (path === `${prefix}/work-entries`) {
    if (method === 'GET') return result(filter(work));
    if (
      !Number.isInteger(body.minutesWorked) ||
      Number(body.minutesWorked) < 1 ||
      Number(body.minutesWorked) > 1440
    )
      throw new Error('Informe uma duração válida para o turno.');
    const row: EmployeeWorkEntry = {
      publicId: id(),
      employeeId: Number(body.employeeId),
      employee: employee(body.employeeId),
      workDate: String(body.workDate),
      minutesWorked: Number(body.minutesWorked),
      status: 'DRAFT',
      approvedAt: null,
      canceledAt: null,
      cancelReason: null,
      version: 1,
    };
    put('work', [...work, row]);
    return result(row);
  }
  const actionWork = path.match(/\/work-entries\/([^/]+)\/(approve|cancel)$/);
  if (actionWork) {
    const row = work.find((item) => item.publicId === actionWork[1]);
    if (!row) throw new Error('Turno não encontrado.');
    if (actionWork[2] === 'approve' && row.status === 'APPROVED') return result(row);
    if (row.status === 'CANCELED') throw new Error('Este turno já foi cancelado.');
    if (
      actionWork[2] === 'cancel' &&
      earnings.some((item) => item.sourcePublicId === row.publicId && item.settledAt)
    )
      throw new Error('Cancele o acerto vinculado antes de cancelar este turno.');
    const approved = actionWork[2] === 'approve';
    const updated = {
      ...row,
      status: approved ? ('APPROVED' as const) : ('CANCELED' as const),
      approvedAt: approved ? now : row.approvedAt,
      canceledAt: approved ? null : now,
      cancelReason: approved ? null : String(body.reason ?? ''),
      version: row.version + 1,
    };
    const policy = [...policies]
      .reverse()
      .find(
        (item) =>
          item.employeeId === row.employeeId &&
          item.baseModel === 'HOURLY' &&
          item.effectiveFrom.slice(0, 10) <= row.workDate.slice(0, 10) &&
          (!item.effectiveUntil || item.effectiveUntil.slice(0, 10) >= row.workDate.slice(0, 10)),
      );
    if (approved && policy) {
      const generated = earning(
        row.employeeId,
        ((policy.hourlyRateCents ?? 0) * row.minutesWorked) / 60,
        row.publicId,
        'HOURLY',
      );
      generated.occurredAt = new Date(row.workDate).toISOString();
      earnings = [...earnings, generated];
    }
    if (!approved)
      earnings = earnings.filter((item) => item.sourcePublicId !== row.publicId || item.settledAt);
    put('earnings', earnings);
    put(
      'work',
      work.map((item) => (item === row ? updated : item)),
    );
    return result(updated);
  }
  if (path === `${prefix}/settlements`) {
    if (method === 'GET') return result(filter(settlements));
    const [year, month] = String(body.referenceMonth).split('-').map(Number);
    if (!year || month < 1 || month > 12) throw new Error('Escolha um mês válido.');
    const employeeId = Number(body.employeeId);
    const person = employee(employeeId);
    const existing = settlements.find(
      (item) =>
        item.employeeId === employeeId &&
        item.periodYear === year &&
        item.periodMonth === month &&
        item.status !== 'CANCELED',
    );
    if (existing) return result(existing);
    const periodStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString();
    const policy = [...policies]
      .reverse()
      .find(
        (item) =>
          item.employeeId === employeeId &&
          item.baseModel === 'FIXED_MONTHLY' &&
          item.effectiveFrom <= periodEnd &&
          (!item.effectiveUntil || item.effectiveUntil >= periodStart),
      );
    if (policy) {
      const source = `${employeeId}:${year}-${month}`;
      if (!earnings.some((item) => item.sourcePublicId === source)) {
        const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const from = Math.max(Date.parse(periodStart), Date.parse(policy.effectiveFrom));
        const until = Math.min(
          Date.parse(periodEnd),
          Date.parse(policy.effectiveUntil ?? periodEnd),
        );
        const ratio =
          policy.prorationMode === 'CALENDAR_DAYS'
            ? Math.min(days, Math.ceil((until - from) / 86400000)) / days
            : 1;
        const row = earning(
          employeeId,
          (policy.fixedMonthlyCents ?? 0) * ratio,
          source,
          'FIXED_MONTHLY',
        );
        row.occurredAt = periodStart;
        earnings.push(row);
        put('earnings', earnings);
      }
    }
    const available = earnings.filter(
      (item) =>
        item.employeeId === employeeId &&
        !item.settledAt &&
        item.occurredAt >= periodStart &&
        item.occurredAt <= periodEnd,
    );
    const credits = available
      .filter((item) => item.direction === 'CREDIT')
      .reduce((sum, item) => sum + item.amountCents, 0);
    const debits = available
      .filter((item) => item.direction === 'DEBIT')
      .reduce((sum, item) => sum + item.amountCents, 0);
    const settlement: EmployeeSettlement = {
      publicId: id(),
      employeeId,
      employee: person,
      periodYear: year,
      periodMonth: month,
      periodStart,
      periodEnd,
      status: 'DRAFT',
      grossCreditsCents: credits,
      grossDebitsCents: debits,
      totalDueCents: Math.max(0, credits - debits),
      confirmedAt: null,
      paidAt: null,
      canceledAt: null,
      cancelReason: null,
      version: 1,
      payments: [],
      items: available.map((item) => ({
        publicId: id(),
        typeSnapshot: item.type,
        directionSnapshot: item.direction,
        amountCentsSnapshot: item.amountCents,
        active: true,
        earning: item,
      })),
    };
    put('settlements', [...settlements, settlement]);
    return result(settlement);
  }
  const settlementAction = path.match(/\/settlements\/([^/]+)(?:\/(confirm|cancel|payments))?$/);
  const reverse = path.match(/\/payments\/([^/]+)\/reverse$/);
  if (settlementAction || reverse) {
    const row = settlements.find((item) =>
      reverse
        ? item.payments.some((payment) => payment.publicId === reverse[1])
        : item.publicId === settlementAction?.[1],
    );
    if (!row) throw new Error('Acerto não encontrado.');
    if (method === 'GET') return result(row);
    const updated = { ...row, payments: [...row.payments], version: row.version + 1 };
    if (row.status === 'CANCELED') throw new Error('Este acerto já foi cancelado.');
    let payment: EmployeeSettlementPayment | undefined;
    if (reverse) {
      payment = {
        ...row.payments.find((item) => item.publicId === reverse[1])!,
        status: 'REVERSED',
        reversedAt: now,
        reverseReason: String(body.reason ?? ''),
      };
      updated.payments = row.payments.map((item) =>
        item.publicId === payment!.publicId ? payment! : item,
      );
    } else if (settlementAction?.[2] === 'confirm') {
      if (row.status !== 'DRAFT') return result(row);
      updated.status = 'CONFIRMED';
      updated.confirmedAt = now;
      const ids = new Set(row.items?.map((item) => item.earning?.publicId));
      put(
        'earnings',
        earnings.map((item) => (ids.has(item.publicId) ? { ...item, settledAt: now } : item)),
      );
    } else if (settlementAction?.[2] === 'cancel') {
      if (row.payments.some((item) => item.status === 'ACTIVE'))
        throw new Error('Estorne os pagamentos antes de cancelar.');
      updated.status = 'CANCELED';
      updated.canceledAt = now;
      updated.cancelReason = String(body.reason ?? '');
      const ids = new Set(row.items?.map((item) => item.earning?.publicId));
      put(
        'earnings',
        earnings.map((item) => (ids.has(item.publicId) ? { ...item, settledAt: null } : item)),
      );
    } else if (settlementAction?.[2] === 'payments') {
      const paid = row.payments
        .filter((item) => item.status === 'ACTIVE')
        .reduce((sum, item) => sum + item.amountCents, 0);
      if (
        !['CONFIRMED', 'PARTIALLY_PAID'].includes(row.status) ||
        !Number.isSafeInteger(body.amountCents) ||
        Number(body.amountCents) <= 0 ||
        Number(body.amountCents) > row.totalDueCents - paid
      )
        throw new Error('Confira a confirmação do acerto e o saldo a pagar.');
      payment = {
        publicId: id(),
        amountCents: Number(body.amountCents),
        method: body.method as EmployeeSettlementPayment['method'],
        reference: String(body.reference ?? ''),
        notes: String(body.notes ?? ''),
        status: 'ACTIVE',
        registeredAt: now,
        reversedAt: null,
        reverseReason: null,
      };
      updated.payments.push(payment);
    }
    if (payment) {
      const paid = updated.payments
        .filter((item) => item.status === 'ACTIVE')
        .reduce((sum, item) => sum + item.amountCents, 0);
      updated.status =
        paid >= updated.totalDueCents ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'CONFIRMED';
      updated.paidAt = updated.status === 'PAID' ? now : null;
    }
    put(
      'settlements',
      settlements.map((item) => (item === row ? updated : item)),
    );
    return result(payment ? { payment, settlement: updated, idempotentReplay: false } : updated);
  }
}
