const APPROVED_STATUSES = new Set([
  "approved",
  "paid",
  "authorized",
  "settled",
]);

export function normalizePaymentStatus(status: any) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

export function isApprovedPaymentStatus(status: any) {
  return APPROVED_STATUSES.has(normalizePaymentStatus(status));
}

function readFirstDefined(...values: any[]) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    return value;
  }

  return null;
}

export function extractInvoiceId(payload: any = {}, paymentDetails: any = {}) {
  const candidates = [
    readFirstDefined(
      payload?.data?.external_reference,
      payload?.external_reference,
      payload?.externalReference,
      payload?.metadata?.invoice_id,
      payload?.metadata?.invoiceId,
      payload?.invoice_id,
      payload?.invoiceId,
      paymentDetails?.external_reference,
      paymentDetails?.body?.external_reference,
      paymentDetails?.metadata?.invoice_id,
      paymentDetails?.metadata?.invoiceId,
      paymentDetails?.invoice_id,
      paymentDetails?.invoiceId,
    ),
    payload?.resource?.external_reference,
    paymentDetails?.resource?.external_reference,
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

export function shouldProcessPayment(
  payload: any = {},
  paymentDetails: any = {},
) {
  const status = normalizePaymentStatus(
    readFirstDefined(
      payload?.status,
      payload?.body?.status,
      payload?.data?.status,
      paymentDetails?.status,
      paymentDetails?.body?.status,
    ),
  );

  if (isApprovedPaymentStatus(status)) {
    return true;
  }

  const action = normalizePaymentStatus(
    readFirstDefined(
      payload?.action,
      payload?.type,
      payload?.event,
      paymentDetails?.action,
    ),
  );

  return Boolean(
    action.includes("payment") &&
    (action.includes("updated") || action.includes("created")) &&
    extractInvoiceId(payload, paymentDetails),
  );
}
