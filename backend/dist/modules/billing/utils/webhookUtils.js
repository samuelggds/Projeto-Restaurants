const APPROVED_STATUSES = new Set([
    "approved",
    "paid",
    "authorized",
    "settled",
]);
export function normalizePaymentStatus(status) {
    return String(status || "")
        .trim()
        .toLowerCase();
}
export function isApprovedPaymentStatus(status) {
    return APPROVED_STATUSES.has(normalizePaymentStatus(status));
}
function readFirstDefined(...values) {
    for (const value of values) {
        if (value === undefined || value === null || value === "") {
            continue;
        }
        return value;
    }
    return null;
}
export function extractInvoiceId(payload = {}, paymentDetails = {}) {
    const payloadData = payload;
    const detailsData = paymentDetails;
    const candidates = [
        readFirstDefined(payloadData.data?.external_reference, payloadData.external_reference, payloadData.externalReference, payloadData.metadata?.invoice_id, payloadData.metadata?.invoiceId, payloadData.invoice_id, payloadData.invoiceId, detailsData.external_reference, detailsData.body?.external_reference, detailsData.metadata?.invoice_id, detailsData.metadata?.invoiceId, detailsData.invoice_id, detailsData.invoiceId),
        payloadData.resource?.external_reference,
        detailsData.resource?.external_reference,
    ];
    for (const candidate of candidates) {
        if (candidate === null || candidate === undefined || candidate === "") {
            continue;
        }
        const numericCandidate = Number(String(candidate).trim());
        if (!Number.isNaN(numericCandidate)) {
            return numericCandidate;
        }
        const match = String(candidate).match(/(\d+)/);
        if (match) {
            return Number(match[1]);
        }
    }
    return null;
}
export function shouldProcessPayment(payload = {}, paymentDetails = {}) {
    const payloadData = payload;
    const detailsData = paymentDetails;
    const status = normalizePaymentStatus(readFirstDefined(payloadData.status, payloadData.body?.status, payloadData.data?.status, detailsData.status, detailsData.body?.status));
    if (isApprovedPaymentStatus(status)) {
        return true;
    }
    const action = normalizePaymentStatus(readFirstDefined(payloadData.action, payloadData.type, payloadData.event, detailsData.action));
    return Boolean(action.includes("payment") &&
        (action.includes("updated") || action.includes("created")) &&
        extractInvoiceId(payload, paymentDetails));
}
