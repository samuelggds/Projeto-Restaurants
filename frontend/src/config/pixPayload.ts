function buildEmvField(id, value) {
  const normalizedValue = String(value || '');
  const byteLength = new TextEncoder().encode(normalizedValue).length;
  return `${id}${String(byteLength).padStart(2, '0')}${normalizedValue}`;
}

function normalizePixText(value, maxLength, fallback) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .slice(0, maxLength)
    .toUpperCase();

  if (normalized) {
    return normalized;
  }

  return String(fallback || '')
    .slice(0, maxLength)
    .toUpperCase();
}

function normalizeTxid(value) {
  const normalized = String(value || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 25);

  return normalized || '***';
}

function isValidCpf(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!/^\d{11}$/.test(digits)) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const calculateCheckDigit = (baseDigits, factorStart) => {
    let total = 0;

    for (let i = 0; i < baseDigits.length; i += 1) {
      total += Number(baseDigits[i]) * (factorStart - i);
    }

    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstCheckDigit = calculateCheckDigit(digits.slice(0, 9), 10);
  const secondCheckDigit = calculateCheckDigit(digits.slice(0, 10), 11);

  return firstCheckDigit === Number(digits[9]) && secondCheckDigit === Number(digits[10]);
}

function normalizePixKey(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  const emailCandidate = raw.toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCandidate)) {
    return raw.toLowerCase();
  }

  const digits = raw.replace(/\D/g, '');

  if (isValidCpf(digits)) {
    return digits;
  }

  const looksLikeFormattedPhone = /[()+\-\s]/.test(raw);

  if (/^55\d{10,11}$/.test(digits)) {
    return `+${digits}`;
  }

  if (/^\d{11}$/.test(digits) && digits[2] === '9') {
    return `+55${digits}`;
  }

  if (/^\d{10}$/.test(digits)) {
    return `+55${digits}`;
  }

  if (looksLikeFormattedPhone && digits.length >= 10 && digits.length <= 13) {
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
      return `+${digits}`;
    }

    if (digits.length === 10 || digits.length === 11) {
      return `+55${digits}`;
    }
  }

  return raw;
}

function calculateCrc16(payload) {
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

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

type PixPayloadInput = {
  pixKey?: string;
  amount?: number | string;
  merchantName?: string;
  merchantCity?: string;
  txid?: string;
};

export function buildPixPayload({
  pixKey,
  amount,
  merchantName = 'RESTAURANTE',
  merchantCity = 'SAO PAULO',
  txid = '***',
}: PixPayloadInput = {}) {
  const normalizedKey = String(pixKey || '').trim();
  const normalizedPixKey = normalizePixKey(normalizedKey);
  if (!normalizedPixKey) {
    return '';
  }

  const normalizedName = normalizePixText(merchantName, 25, 'RESTAURANTE');
  const normalizedCity = normalizePixText(merchantCity, 15, 'SAO PAULO');
  const normalizedTxid = normalizeTxid(txid);

  const merchantAccountInfo = [
    buildEmvField('00', 'BR.GOV.BCB.PIX'),
    buildEmvField('01', normalizedPixKey),
  ].join('');

  const additionalDataField = buildEmvField('05', normalizedTxid);
  const normalizedAmount = Number(amount || 0);
  const hasAmount = Number.isFinite(normalizedAmount) && normalizedAmount > 0;

  const payload = [
    buildEmvField('00', '01'),
    buildEmvField('01', '11'),
    buildEmvField('26', merchantAccountInfo),
    buildEmvField('52', '0000'),
    buildEmvField('53', '986'),
    hasAmount ? buildEmvField('54', normalizedAmount.toFixed(2)) : '',
    buildEmvField('58', 'BR'),
    buildEmvField('59', normalizedName),
    buildEmvField('60', normalizedCity),
    buildEmvField('62', additionalDataField),
  ].join('');

  const payloadForCrc = `${payload}6304`;
  const crc = calculateCrc16(payloadForCrc);
  return `${payloadForCrc}${crc}`;
}
