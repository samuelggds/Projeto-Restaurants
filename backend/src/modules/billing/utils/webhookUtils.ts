const APPROVED_STATUSES = new Set([
  "approved",
  "paid",
  "authorized",
  "settled",
]);

type LooseObject = Record<string, unknown>;

type MetadataLike = {
  invoice_id?: unknown;
  invoiceId?: unknown;
};

type PaymentLike = {
  status?: unknown;
  action?: unknown;
  type?: unknown;
  event?: unknown;
  external_reference?: unknown;
  externalReference?: unknown;
  invoice_id?: unknown;
  invoiceId?: unknown;
  metadata?: MetadataLike;
  data?: {
    external_reference?: unknown;
    status?: unknown;
  };
  body?: {
    status?: unknown;
    external_reference?: unknown;
  };
  resource?: {
    external_reference?: unknown;
  };
};

export function normalizePaymentStatus(status: unknown) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

export function isApprovedPaymentStatus(status: unknown) {
  return APPROVED_STATUSES.has(normalizePaymentStatus(status));
}

function readFirstDefined(...values: unknown[]) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    return value;
  }

  return null;
}

export function extractInvoiceId(
  payload: LooseObject = {},
  paymentDetails: LooseObject = {},
) {
  const payloadData = payload as PaymentLike;
  const detailsData = paymentDetails as PaymentLike;

  const candidates = [
    readFirstDefined(
      payloadData.data?.external_reference,
      payloadData.external_reference,
      payloadData.externalReference,
      payloadData.metadata?.invoice_id,
      payloadData.metadata?.invoiceId,
      payloadData.invoice_id,
      payloadData.invoiceId,
      detailsData.external_reference,
      detailsData.body?.external_reference,
      detailsData.metadata?.invoice_id,
      detailsData.metadata?.invoiceId,
      detailsData.invoice_id,
      detailsData.invoiceId,
    ),
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

export function shouldProcessPayment(
  payload: LooseObject = {},
  paymentDetails: LooseObject = {},
) {
  const payloadData = payload as PaymentLike;
  const detailsData = paymentDetails as PaymentLike;

  const status = normalizePaymentStatus(
    readFirstDefined(
      payloadData.status,
      payloadData.body?.status,
      payloadData.data?.status,
      detailsData.status,
      detailsData.body?.status,
    ),
  );

  if (isApprovedPaymentStatus(status)) {
    return true;
  }

  const action = normalizePaymentStatus(
    readFirstDefined(
      payloadData.action,
      payloadData.type,
      payloadData.event,
      detailsData.action,
    ),
  );

  return Boolean(
    action.includes("payment") &&
    (action.includes("updated") || action.includes("created")) &&
    extractInvoiceId(payload, paymentDetails),
  );
}
