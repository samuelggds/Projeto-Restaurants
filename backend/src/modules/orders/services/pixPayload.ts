import { PIX_PROVIDERS, type PixProvider } from "../../payments/providers/providerCatalog.js";

export type ParsedProviderPaymentId = {
  provider: PixProvider;
  rawPaymentId: string;
};

export function extractErrorText(error: unknown) {
  if (typeof error === "string") {
    return error.trim().toLowerCase();
  }

  const asRecord =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : null;
  const message = String(
    asRecord?.message ||
      (asRecord?.cause as { message?: unknown } | undefined)?.message ||
      "",
  );
  const causeText = String(asRecord?.cause || "");
  return `${message} ${causeText}`.trim().toLowerCase();
}

export function isMarketplaceSplitConfigurationError(error: unknown) {
  const text = extractErrorText(error);

  if (!text) {
    return false;
  }

  return (
    text.includes("application_fee") ||
    text.includes("marketplace") ||
    text.includes("split") ||
    text.includes("collector") ||
    text.includes("platform") ||
    text.includes("not allowed") ||
    text.includes("unauthorized") ||
    text.includes("invalid")
  );
}

export function parseProviderPaymentId(paymentId: string): ParsedProviderPaymentId {
  const normalizedPaymentId = String(paymentId || "").trim();

  if (normalizedPaymentId.toLowerCase().startsWith("asaas:")) {
    return {
      provider: PIX_PROVIDERS.ASAAS,
      rawPaymentId: normalizedPaymentId.slice("asaas:".length).trim(),
    };
  }

  if (normalizedPaymentId.toLowerCase().startsWith("pagbank:")) {
    return {
      provider: PIX_PROVIDERS.PAGBANK,
      rawPaymentId: normalizedPaymentId.slice("pagbank:".length).trim(),
    };
  }

  return {
    provider: PIX_PROVIDERS.MERCADO_PAGO,
    rawPaymentId: normalizedPaymentId,
  };
}

export function buildEmvField(id: string, value: string | number) {
  const normalizedValue = String(value || "");
  const byteLength = new TextEncoder().encode(normalizedValue).length;
  return `${id}${String(byteLength).padStart(2, "0")}${normalizedValue}`;
}

export function normalizePixText(
  value: string | number | null | undefined,
  maxLength: number,
  fallback: string,
) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, maxLength)
    .toUpperCase();

  if (normalized) {
    return normalized;
  }

  return String(fallback || "")
    .slice(0, maxLength)
    .toUpperCase();
}

export function normalizeTxid(value: string | number | null | undefined) {
  const normalized = String(value || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 25);

  return normalized || "***";
}

export function isValidCpf(value: string | number | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!/^\d{11}$/.test(digits)) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const calculateCheckDigit = (baseDigits: string, factorStart: number) => {
    let total = 0;

    for (let i = 0; i < baseDigits.length; i += 1) {
      total += Number(baseDigits[i]) * (factorStart - i);
    }

    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstCheckDigit = calculateCheckDigit(digits.slice(0, 9), 10);
  const secondCheckDigit = calculateCheckDigit(digits.slice(0, 10), 11);

  return (
    firstCheckDigit === Number(digits[9]) &&
    secondCheckDigit === Number(digits[10])
  );
}

export function normalizePixKey(value: string | number | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const emailCandidate = raw.toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCandidate)) {
    return raw.toLowerCase();
  }

  const digits = raw.replace(/\D/g, "");

  if (isValidCpf(digits)) {
    return digits;
  }

  const looksLikeFormattedPhone = /[()+\-\s]/.test(raw);

  if (/^55\d{10,11}$/.test(digits)) {
    return `+${digits}`;
  }

  if (/^\d{11}$/.test(digits) && digits[2] === "9") {
    return `+55${digits}`;
  }

  if (/^\d{10}$/.test(digits)) {
    return `+55${digits}`;
  }

  if (looksLikeFormattedPhone && digits.length >= 10 && digits.length <= 13) {
    if (
      (digits.length === 12 || digits.length === 13) &&
      digits.startsWith("55")
    ) {
      return `+${digits}`;
    }

    if (digits.length === 10 || digits.length === 11) {
      return `+55${digits}`;
    }
  }

  return raw;
}

export function calculateCrc16(payload: string) {
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }

      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixPayload({
  pixKey,
  amount,
  merchantName = "RESTAURANTE",
  merchantCity = "SAO PAULO",
  txid = "***",
}: {
  pixKey: string;
  amount: number;
  merchantName?: string;
  merchantCity?: string;
  txid?: string;
}) {
  const normalizedKey = String(pixKey || "").trim();
  const normalizedPixKey = normalizePixKey(normalizedKey);
  if (!normalizedPixKey) {
    return "";
  }

  const normalizedName = normalizePixText(merchantName, 25, "RESTAURANTE");
  const normalizedCity = normalizePixText(merchantCity, 15, "SAO PAULO");
  const normalizedTxid = normalizeTxid(txid);

  const merchantAccountInfo = [
    buildEmvField("00", "BR.GOV.BCB.PIX"),
    buildEmvField("01", normalizedPixKey),
  ].join("");

  const additionalDataField = buildEmvField("05", normalizedTxid);
  const normalizedAmount = Number(amount || 0);
  const hasAmount = Number.isFinite(normalizedAmount) && normalizedAmount > 0;

  const payload = [
    buildEmvField("00", "01"),
    buildEmvField("01", "11"),
    buildEmvField("26", merchantAccountInfo),
    buildEmvField("52", "0000"),
    buildEmvField("53", "986"),
    hasAmount ? buildEmvField("54", normalizedAmount.toFixed(2)) : "",
    buildEmvField("58", "BR"),
    buildEmvField("59", normalizedName),
    buildEmvField("60", normalizedCity),
    buildEmvField("62", additionalDataField),
  ].join("");

  const payloadForCrc = `${payload}6304`;
  const crc = calculateCrc16(payloadForCrc);
  return `${payloadForCrc}${crc}`;
}


