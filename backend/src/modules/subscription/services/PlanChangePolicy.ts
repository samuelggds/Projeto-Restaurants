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
  consumedInvoiceId,
  hasScheduledPlan = false,
  now = new Date(),
}: PlanChangePolicyInput): PlanChangeEligibility {
  if (hasScheduledPlan) {
    return {
      allowed: false,
      invoiceId: consumedInvoiceId || null,
      reason: 'A escolha deste ciclo já foi registrada e a troca está agendada.',
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
      invoiceId: null,
      reason: 'Pague a fatura vencida para liberar a escolha do próximo plano.',
    };
  }

  const paidOverdueInvoice = [...invoices]
    .filter((invoice) => {
      if (String(invoice.status || '').toUpperCase() !== 'PAGO' || !invoice.paidAt) {
        return false;
      }

      return normalizeDate(invoice.paidAt) > normalizeDate(invoice.dueDate);
    })
    .sort((left, right) => Number(right.id) - Number(left.id))[0];

  if (!paidOverdueInvoice) {
    return {
      allowed: false,
      invoiceId: null,
      reason: 'A escolha será liberada após o pagamento de uma fatura vencida.',
    };
  }

  if (Number(consumedInvoiceId) === paidOverdueInvoice.id) {
    return {
      allowed: false,
      invoiceId: paidOverdueInvoice.id,
      reason: 'A escolha referente à última fatura paga já foi registrada.',
    };
  }

  return {
    allowed: true,
    invoiceId: paidOverdueInvoice.id,
    reason: 'Fatura vencida paga. Escolha manter o plano atual ou trocar no próximo ciclo.',
  };
}
