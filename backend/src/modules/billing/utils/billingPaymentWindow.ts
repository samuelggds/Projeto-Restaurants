type InvoicePaymentWindow = {
  status: string;
  dueDate: Date | string;
};

export function getPixAvailableAt(dueDate: Date | string) {
  const availableAt = new Date(dueDate);
  const configuredDays = Number(process.env.BILLING_PIX_OPEN_DAYS_BEFORE_DUE || 5);
  const daysBeforeDue =
    Number.isFinite(configuredDays) && configuredDays >= 0 ? Math.floor(configuredDays) : 5;

  availableAt.setDate(availableAt.getDate() - daysBeforeDue);
  return availableAt;
}

export function isInvoicePixAvailable(invoice: InvoicePaymentWindow, now = new Date()) {
  const status = String(invoice.status || '').toUpperCase();

  if (!['PENDENTE', 'ATRASADO', 'VENCIDO'].includes(status)) {
    return false;
  }

  return now >= getPixAvailableAt(invoice.dueDate);
}
