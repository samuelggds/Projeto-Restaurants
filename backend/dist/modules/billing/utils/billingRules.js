import { addBusinessDays } from "./dateUtils.js";
export function getGraceLimitDate(dueDate) {
    return addBusinessDays(dueDate, 5);
}
export function isInvoiceBlocking(invoice, now = new Date()) {
    if (invoice.status === "ATRASADO") {
        return true;
    }
    if (invoice.status !== "PENDENTE") {
        return false;
    }
    const graceLimitDate = getGraceLimitDate(invoice.dueDate);
    return now > graceLimitDate;
}
export function hasBlockingInvoices(invoices = [], now = new Date()) {
    return invoices.some((invoice) => isInvoiceBlocking(invoice, now));
}
