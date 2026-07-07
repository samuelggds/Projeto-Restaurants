import { addBusinessDays } from "./dateUtils.js";

type InvoiceLike = {
  status: string;
  dueDate: Date;
};

export function getGraceLimitDate(dueDate: Date) {
  return addBusinessDays(dueDate, 5);
}

export function isInvoiceBlocking(invoice: InvoiceLike, now = new Date()) {
  if (invoice.status === "ATRASADO") {
    return true;
  }

  if (invoice.status !== "PENDENTE") {
    return false;
  }

  const graceLimitDate = getGraceLimitDate(invoice.dueDate);
  return now > graceLimitDate;
}

export function hasBlockingInvoices(
  invoices: InvoiceLike[] = [],
  now = new Date(),
) {
  return invoices.some((invoice) => isInvoiceBlocking(invoice, now));
}
