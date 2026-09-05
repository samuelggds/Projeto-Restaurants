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

export function getAvailablePaymentMethods({
  allowPayOnDelivery,
  allowPayAtPickup = false,
  allowPix = true,
  allowCard = true,
}: {
  allowPayOnDelivery: boolean;
  allowPayAtPickup?: boolean;
  allowPix?: boolean;
  allowCard?: boolean;
}): CheckoutPaymentMethod[] {
  const methods: CheckoutPaymentMethod[] = [];
  if (allowPix) methods.push('pix');
  if (allowCard) methods.push('card');
  if (allowPayOnDelivery && allowPix) methods.push('delivery_pix');
  if (allowPayOnDelivery && allowCard) methods.push('delivery_card');
  if (allowPayAtPickup) methods.push('pickup_store');
  return methods;
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
