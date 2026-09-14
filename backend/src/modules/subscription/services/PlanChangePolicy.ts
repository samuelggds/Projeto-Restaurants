type InvoiceForPlanChange = {
  id: number;
  status: string;
  dueDate: Date | string;
  paidAt?: Date | string | null;
};

type PlanChangePolicyInput = {
  invoices: InvoiceForPlanChange[];
  consumedInvoiceId?: number | null;
  hasScheduledPlan?: boolean;
  now?: Date;
};

export type PlanChangeEligibility = {
  allowed: boolean;
  invoiceId: number | null;
  reason: string;
};

const normalizeDate = (value: Date | string) => new Date(value);

export function evaluatePlanChangeEligibility({
  invoices,
  hasScheduledPlan = false,
  now = new Date(),
}: PlanChangePolicyInput): PlanChangeEligibility {
  if (hasScheduledPlan) {
    return {
      allowed: false,
      invoiceId: null,
      reason: 'Já existe uma troca de plano agendada para o próximo ciclo.',
    };
  }

  const overdueOpenInvoice = invoices.find((invoice) => {
    const status = String(invoice.status || '').toUpperCase();
    return (
      status === 'ATRASADO' ||
      status === 'VENCIDO' ||
      (status === 'PENDENTE' && normalizeDate(invoice.dueDate) < now)
    );
  });

  if (overdueOpenInvoice) {
    return {
      allowed: false,
      invoiceId: overdueOpenInvoice.id,
      reason: 'Pague a fatura vencida para alterar o plano.',
    };
  }

  const latestInvoice = [...invoices].sort((left, right) => Number(right.id) - Number(left.id))[0];
  return {
    allowed: true,
    invoiceId: latestInvoice?.id ?? null,
    reason: 'Assinatura em dia. A alteração será aplicada sem mudar cobranças já emitidas.',
  };
}
