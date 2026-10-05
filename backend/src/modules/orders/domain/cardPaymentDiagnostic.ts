// Only machine codes are retained. Provider messages may echo payment secrets.
const codes = new Set(
  `created processed accredited partially_refunded processing pending in_process
pending_review_manual action_required waiting_payment waiting_capture waiting_transfer pending_challenge
waiting_retry charged_back settled reimbursed expired refunded failed rejected declined canceled cancelled
in_review bad_filled_card_data invalid_card_token high_risk rejected_by_issuer required_call_for_authorize
max_attempts_exceeded card_disabled insufficient_amount amount_limit_exceeded processing_error
invalid_installments 3ds_challenge_expired card_insufficient_amount cc_rejected_bad_filled_card_number
cc_rejected_bad_filled_date cc_rejected_bad_filled_other cc_rejected_bad_filled_security_code
cc_rejected_blacklist cc_rejected_call_for_authorize cc_rejected_card_disabled cc_rejected_card_error
cc_rejected_duplicated_payment cc_rejected_high_risk cc_rejected_insufficient_amount
cc_rejected_invalid_installments cc_rejected_max_attempts cc_rejected_other_reason
property_value property_type required_properties unsupported_properties invalid_properties
invalid_total_amount json_syntax_error minimum_properties minimum_items maximum_items invalid_order_type
bad_request invalid_request unauthorized forbidden not_found idempotency_key_already_used
invalid_credentials invalid_token internal_error processing_error card_payment_failed
saved_card_reference_invalid saved_card_reference_mismatch saved_card_refresh_failed
saved_card_refresh_unavailable saved_card_refresh_invalid_response saved_card_email_mismatch
missing_device_session missing_3ds_challenge_url`.split(
    /\s+/,
  ),
);

export function safePaymentCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toLowerCase();
  return codes.has(code) ? code : null;
}

export function safePaymentReference(value: unknown): string | null {
  const reference = typeof value === 'number' ? String(value) : value;
  if (typeof reference !== 'string' || /^(APP_USR|TEST)-/i.test(reference)) return null;
  return /^[a-zA-Z0-9_-]{1,160}$/.test(reference) ? reference : null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function extractPaymentDiagnostic(body: Record<string, unknown>) {
  const data = body.data && typeof body.data === 'object' ? record(body.data) : body;
  const transactions = record(data.transactions);
  const payment = record(Array.isArray(transactions.payments) ? transactions.payments[0] : null);
  const errors = [body.cause, body.error_messages, body.errors].flatMap((value) =>
    Array.isArray(value) ? value.slice(0, 10).map(record) : [],
  );
  const details = errors.flatMap((error) =>
    Array.isArray(error.details) ? error.details.slice(0, 10).map(record) : [],
  );
  const rawCodes = [...errors, ...details].map((item) => item.code).filter(Boolean);
  rawCodes.push(body.code, body.error);
  const providerCodes = [...new Set(rawCodes.map(safePaymentCode).filter((code) => code !== null))];
  const rawStatus = [
    payment.status,
    ...details.map((item) => item.status),
    data.status,
    body.status,
  ].find(Boolean);
  // Unknown transaction states must not fall through to a processed parent order.
  const status = rawStatus ? safePaymentCode(rawStatus) || 'unknown' : null;
  const rawStatusDetails = [
    payment.status_detail,
    payment.statusDetail,
    ...details.flatMap((item) => [item.status_detail, item.statusDetail, item.code]),
    data.status_detail,
    data.statusDetail,
    body.status_detail,
    body.statusDetail,
  ];
  const statusDetail = rawStatusDetails.map(safePaymentCode).find(Boolean) || null;
  return {
    status,
    statusDetail,
    providerCode: providerCodes[0] || null,
    providerCodes,
    hasUnrecognizedCode: [...rawCodes, ...rawStatusDetails, rawStatus].some(
      (code) => Boolean(code) && !safePaymentCode(code),
    ),
    providerOrderId: safePaymentReference(data.id || body.id),
    providerPaymentId: safePaymentReference(payment.id),
  };
}
