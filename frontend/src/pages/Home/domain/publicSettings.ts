import type { BusinessHour } from '../../admin/types';
import type { CheckoutPaymentMethod } from './checkout';

export type HomeFontFamily = 'Inter' | 'Manrope' | 'DM Sans';
export type HomeSocialNetwork = 'instagram' | 'facebook' | 'tiktok' | 'youtube';

const HOME_FONT_FAMILIES = new Set<HomeFontFamily>(['Inter', 'Manrope', 'DM Sans']);

export function normalizeHomeFontFamily(value: unknown): HomeFontFamily {
  const normalized = String(value || '').trim() as HomeFontFamily;
  return HOME_FONT_FAMILIES.has(normalized) ? normalized : 'Inter';
}

export function readPublicFeatureFlag(
  settings: Record<string, unknown> | null,
  key: string,
  legacyFallback = true,
) {
  if (!settings || !Object.prototype.hasOwnProperty.call(settings, key)) return legacyFallback;
  return settings[key] !== false;
}

export function readOptionalPositiveMoney(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function resolveAvailableFulfillmentMethod(
  preferred: 'delivery' | 'pickup',
  allowDelivery: boolean,
  allowPickup: boolean,
) {
  if (preferred === 'delivery' && !allowDelivery && allowPickup) return 'pickup';
  if (preferred === 'pickup' && !allowPickup && allowDelivery) return 'delivery';
  return preferred;
}

export function resolveDefaultCheckoutPaymentMethod(
  availableMethods: CheckoutPaymentMethod[],
): CheckoutPaymentMethod | null {
  if (availableMethods.includes('pix')) return 'pix';
  return availableMethods[0] ?? null;
}

export function getAvailablePaymentMethods({
  allowPayOnDelivery,
  allowPayAtPickup = !allowPayOnDelivery,
  allowPix = true,
  allowOpenFinancePix = false,
  allowCard = true,
  allowDebitCard = false,
}: {
  allowPayOnDelivery: boolean;
  allowPayAtPickup?: boolean;
  allowPix?: boolean;
  allowOpenFinancePix?: boolean;
  allowCard?: boolean;
  allowDebitCard?: boolean;
}): CheckoutPaymentMethod[] {
  const methods: CheckoutPaymentMethod[] = [];
  if (allowPix) methods.push('pix');
  if (allowOpenFinancePix) methods.push('open_finance_pix');
  if (allowCard) methods.push('card');
  if (allowDebitCard) methods.push('debit_card');
  if (allowPayOnDelivery && allowPix) methods.push('delivery_pix');
  if (allowPayOnDelivery && allowCard) methods.push('delivery_card');
  if (allowPayOnDelivery) methods.push('delivery_cash');
  if (allowPayAtPickup && allowPix) methods.push('pickup_pix');
  if (allowPayAtPickup && allowCard) methods.push('pickup_card');
  if (allowPayAtPickup) methods.push('pickup_cash');
  return methods;
}

const BUSINESS_DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const BUSINESS_DAY_SHORT_LABELS: Record<string, string> = {
  monday: 'Seg',
  tuesday: 'Ter',
  wednesday: 'Qua',
  thursday: 'Qui',
  friday: 'Sex',
  saturday: 'Sáb',
  sunday: 'Dom',
};

function formatBusinessDayIndexes(indexes: number[]) {
  if (!indexes.length) return '';

  const ranges: Array<{ start: number; end: number }> = [];
  let start = indexes[0];
  let end = indexes[0];

  for (const index of indexes.slice(1)) {
    if (index === end + 1) {
      end = index;
      continue;
    }

    ranges.push({ start, end });
    start = index;
    end = index;
  }

  ranges.push({ start, end });

  const labels = ranges.map(({ start: rangeStart, end: rangeEnd }) => {
    const first = BUSINESS_DAY_SHORT_LABELS[BUSINESS_DAY_ORDER[rangeStart]];
    const last = BUSINESS_DAY_SHORT_LABELS[BUSINESS_DAY_ORDER[rangeEnd]];
    return rangeStart === rangeEnd ? first : `${first}–${last}`;
  });

  if (labels.length <= 1) return labels[0] || '';
  if (labels.length === 2) return `${labels[0]} e ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
}

export function formatBusinessHoursSummary(businessHours?: BusinessHour[]) {
  const configured = new Map(
    (businessHours || [])
      .filter((entry) => entry.enabled)
      .map((entry) => [String(entry.id), entry] as const),
  );

  const enabledIndexes = BUSINESS_DAY_ORDER
    .map((id, index) => (configured.has(id) ? index : -1))
    .filter((index) => index >= 0);

  if (!enabledIndexes.length) return '';

  const groups = new Map<
    string,
    {
      openingTime: string;
      closingTime: string;
      indexes: number[];
    }
  >();

  enabledIndexes.forEach((index) => {
    const id = BUSINESS_DAY_ORDER[index];
    const entry = configured.get(id);
    if (!entry) return;

    const openingTime = String(entry.openingTime || '').trim();
    const closingTime = String(entry.closingTime || '').trim();
    if (!openingTime || !closingTime) return;

    const key = `${openingTime}|${closingTime}`;
    const existing = groups.get(key);
    if (existing) {
      existing.indexes.push(index);
      return;
    }

    groups.set(key, { openingTime, closingTime, indexes: [index] });
  });

  const scheduleGroups = Array.from(groups.values()).sort(
    (left, right) => left.indexes[0] - right.indexes[0],
  );

  if (
    scheduleGroups.length === 1 &&
    scheduleGroups[0].indexes.length === BUSINESS_DAY_ORDER.length
  ) {
    return `Todos os dias: ${scheduleGroups[0].openingTime} - ${scheduleGroups[0].closingTime}`;
  }

  return scheduleGroups
    .map(
      (group) =>
        `${formatBusinessDayIndexes(group.indexes)}: ${group.openingTime} - ${group.closingTime}`,
    )
    .join(' | ');
}

export function buildWhatsAppUrl(number: string | undefined, message?: string) {
  const digits = String(number || '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) return '';
  const normalizedMessage = String(message || '').trim();
  return `https://wa.me/${digits}${
    normalizedMessage ? `?text=${encodeURIComponent(normalizedMessage)}` : ''
  }`;
}

export function buildSocialProfileUrl(network: HomeSocialNetwork, value?: string) {
  const normalized = String(value || '').trim();
  if (!normalized || /\s/.test(normalized) || /^javascript:/i.test(normalized)) return '';

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
    } catch {
      return '';
    }
  }

  const withoutProtocol = normalized.replace(/^\/\//, '').replace(/^www\./i, '');
  const expectedHost = network === 'youtube' ? 'youtube.com' : `${network}.com`;
  if (withoutProtocol.toLowerCase().startsWith(`${expectedHost}/`)) {
    return `https://${withoutProtocol}`;
  }

  const handle = withoutProtocol.replace(/^@/, '').replace(/^\/+/, '');
  if (!handle) return '';
  if (network === 'tiktok' || network === 'youtube') {
    return `https://${expectedHost}/@${handle.replace(/^@/, '')}`;
  }
  return `https://${expectedHost}/${handle}`;
}

export function applyHomeSeoMetadata(
  targetDocument: Document,
  _titleValue: string,
  descriptionValue: string,
) {
  const seoDescription = String(descriptionValue || '').trim();
  if (!seoDescription) return () => undefined;

  const existingDescription = targetDocument.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );
  const previousDescription = existingDescription?.getAttribute('content') ?? null;
  let descriptionMeta = existingDescription;
  let createdDescription = false;

  if (!descriptionMeta) {
    descriptionMeta = targetDocument.createElement('meta');
    descriptionMeta.name = 'description';
    targetDocument.head.appendChild(descriptionMeta);
    createdDescription = true;
  }
  descriptionMeta.content = seoDescription;

  return () => {
    if (!descriptionMeta) return;
    if (createdDescription) {
      descriptionMeta.remove();
    } else if (previousDescription === null) {
      descriptionMeta.removeAttribute('content');
    } else {
      descriptionMeta.content = previousDescription;
    }
  };
}
