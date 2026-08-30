export type CardBrandId =
  | 'visa'
  | 'mastercard'
  | 'elo'
  | 'amex'
  | 'hipercard'
  | 'diners'
  | 'discover'
  | 'jcb'
  | 'card';

export type CardBrandDetails = {
  id: CardBrandId;
  label: string;
  shortLabel: string;
};

const BRANDS: Record<CardBrandId, CardBrandDetails> = {
  visa: { id: 'visa', label: 'Visa', shortLabel: 'VISA' },
  mastercard: { id: 'mastercard', label: 'Mastercard', shortLabel: 'MC' },
  elo: { id: 'elo', label: 'Elo', shortLabel: 'ELO' },
  amex: { id: 'amex', label: 'American Express', shortLabel: 'AMEX' },
  hipercard: { id: 'hipercard', label: 'Hipercard', shortLabel: 'HIPER' },
  diners: { id: 'diners', label: 'Diners Club', shortLabel: 'DINERS' },
  discover: { id: 'discover', label: 'Discover', shortLabel: 'DISCOVER' },
  jcb: { id: 'jcb', label: 'JCB', shortLabel: 'JCB' },
  card: { id: 'card', label: 'Cartão', shortLabel: 'CARTÃO' },
};

const digitsOnly = (value: string) => value.replace(/\D/g, '');

function prefixInRange(digits: string, size: number, minimum: number, maximum: number) {
  if (digits.length < size) return false;
  const prefix = Number(digits.slice(0, size));
  return prefix >= minimum && prefix <= maximum;
}

function isElo(digits: string) {
  if (digits.length < 6) return false;
  const prefix = Number(digits.slice(0, 6));
  const exact = new Set([
    401178, 401179, 431274, 438935, 451416, 457393, 457631, 457632,
    504175, 627780, 636297, 636368,
  ]);
  return exact.has(prefix)
    || (prefix >= 506699 && prefix <= 506778)
    || (prefix >= 509000 && prefix <= 509999)
    || (prefix >= 650031 && prefix <= 650051)
    || (prefix >= 650405 && prefix <= 650439)
    || (prefix >= 650485 && prefix <= 650598)
    || (prefix >= 650700 && prefix <= 650727)
    || (prefix >= 650901 && prefix <= 650920)
    || (prefix >= 651652 && prefix <= 651679)
    || (prefix >= 655000 && prefix <= 655058);
}

export function detectCardBrand(value: string): CardBrandDetails {
  const digits = digitsOnly(value);
  if (!digits) return BRANDS.card;
  if (isElo(digits)) return BRANDS.elo;
  if (/^3[47]/.test(digits)) return BRANDS.amex;
  if (/^(606282|3841)/.test(digits)) return BRANDS.hipercard;
  if (/^(30[0-5]|36|38|39)/.test(digits)) return BRANDS.diners;
  if (prefixInRange(digits, 4, 3528, 3589)) return BRANDS.jcb;
  if (/^6011/.test(digits) || prefixInRange(digits, 3, 644, 649) || /^65/.test(digits)) {
    return BRANDS.discover;
  }
  if (/^5[1-5]/.test(digits) || prefixInRange(digits, 4, 2221, 2720)) {
    return BRANDS.mastercard;
  }
  if (/^4/.test(digits)) return BRANDS.visa;
  return BRANDS.card;
}

export function getCardBrandDetails(value: string): CardBrandDetails {
  const normalized = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (/^(visa)$/.test(normalized)) return BRANDS.visa;
  if (/^(master|mastercard|mc)$/.test(normalized)) return BRANDS.mastercard;
  if (normalized === 'elo') return BRANDS.elo;
  if (/^(amex|americanexpress)$/.test(normalized)) return BRANDS.amex;
  if (normalized === 'hipercard') return BRANDS.hipercard;
  if (/^(diners|dinersclub)$/.test(normalized)) return BRANDS.diners;
  if (normalized === 'discover') return BRANDS.discover;
  if (normalized === 'jcb') return BRANDS.jcb;
  return /^\d+$/.test(normalized) ? detectCardBrand(normalized) : BRANDS.card;
}

export function maskedCardNumber(value: string) {
  const digits = digitsOnly(value);
  const last4 = digits.length >= 4 ? digits.slice(-4) : '••••';
  return `•••• •••• •••• ${last4}`;
}
