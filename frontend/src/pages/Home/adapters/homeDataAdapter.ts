import { isPersistentImageSource } from '../../../utils/persistentImage';
import { createRestaurantMonogram } from '../../../utils/restaurantMonogram';
import type { HomeBanner, HomeCategory, HomeData, HomeProduct } from '../../Home/types';
import { isProductUnavailable } from '../domain/productAvailability';
import {
  getRestaurantAvailability,
  isBusinessHoursScheduleConfigured,
  isRestaurantOpenForOrders,
  normalizeBusinessHours,
} from '../../admin/domain/businessHours';
import { defaultBusinessHours } from '../../admin/data';
import {
  normalizeHomeFontFamily,
  readOptionalPositiveMoney,
  readPublicFeatureFlag,
} from '../domain/publicSettings';

function formatFooterAddress(restaurant: Record<string, unknown>) {
  const street = [
    String(restaurant.address || '').trim(),
    String(restaurant.addressNumber || '').trim(),
  ]
    .filter(Boolean)
    .join(', ');
  const city = [
    String(restaurant.city || '').trim(),
    String(restaurant.state || '')
      .trim()
      .toUpperCase(),
  ]
    .filter(Boolean)
    .join(' - ');
  return [street, String(restaurant.addressDistrict || '').trim(), city]
    .filter(Boolean)
    .join(' • ');
}

const CATEGORY_IMAGES: Record<string, string> = {
  pizza:
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
  burger:
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
  hamburguer:
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
  lanche:
    'https://images.unsplash.com/photo-1561626423-a51b45aef0a1?auto=format&fit=crop&w=800&q=80',
  frango:
    'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80',
  carne:
    'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=800&q=80',
  massa:
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&q=80',
  salada:
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
  sobremesa:
    'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80',
  bebida:
    'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80',
  cerveja:
    'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=800&q=80',
  combo:
    'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=80',
  acompanhamento:
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
};

const PRODUCT_FALLBACKS = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
];

export function mapProductOptionGroupsFromApi(product: Record<string, unknown>) {
  if (!Array.isArray(product.optionGroups)) return [];
  return product.optionGroups
    .map((rawGroup) => {
      const group = rawGroup as Record<string, unknown>;
      const options = Array.isArray(group.options)
        ? group.options
            .map((rawOption) => {
              const option = rawOption as Record<string, unknown>;
              const ingredient = (option.ingredient as Record<string, unknown> | null) ?? {};
              return {
                id: String(option.id ?? ''),
                ingredientId: String(option.ingredientId ?? ingredient.id ?? ''),
                name: String(ingredient.name || option.name || ''),
                price: Number(ingredient.price ?? option.price ?? 0),
                active: option.active !== false && ingredient.active !== false,
              };
            })
            .filter((option) => option.id && option.name && option.active)
        : [];
      return {
        id: String(group.id ?? ''),
        name: String(group.name || 'Escolhas'),
        description: String(group.description || ''),
        required: Boolean(group.required),
        selectionType:
          group.selectionType === 'SINGLE' ? ('SINGLE' as const) : ('MULTIPLE' as const),
        minSelections: Number(group.minSelections ?? (group.required ? 1 : 0)),
        maxSelections:
          group.maxSelections === null || group.maxSelections === undefined
            ? null
            : Number(group.maxSelections),
        options,
      };
    })
    .filter((group) => group.id && group.options.length > 0);
}

export function resolveProductImage(product: Record<string, unknown>, index: number): string {
  if (product.image && String(product.image).startsWith('http')) return String(product.image);
  const terms = [product.name, product.description, (product.category as { name?: string })?.name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  for (const [keyword, url] of Object.entries(CATEGORY_IMAGES)) {
    if (terms.includes(keyword)) return url;
  }
  return PRODUCT_FALLBACKS[index % PRODUCT_FALLBACKS.length];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optionalBannerText(value: unknown) {
  const normalized = String(value || '').trim();
  return normalized || undefined;
}

export function mapHomeBanners(values: unknown[]): HomeBanner[] {
  return values
    .map<HomeBanner | null>((value, index) => {
      const banner = asRecord(value);
      const id = Number(banner.id);
      const storedTitle = String(banner.title || '').trim();
      const image = String(banner.image || '').trim();
      const rawPosition = Number(banner.position);
      const position = Number.isInteger(rawPosition) && rawPosition >= 0 ? rawPosition : index;

      if (
        !Number.isInteger(id) ||
        id <= 0 ||
        !storedTitle ||
        !isPersistentImageSource(image) ||
        banner.active === false
      ) {
        return null;
      }

      const highlight = optionalBannerText(banner.highlight);
      const description = optionalBannerText(banner.description);
      const buttonLabel = optionalBannerText(banner.buttonLabel);
      const isLegacyMainBanner =
        storedTitle === 'Banner principal' && !highlight && !description;

      return {
        id,
        title: isLegacyMainBanner ? 'Confira nossas' : storedTitle,
        highlight: isLegacyMainBanner ? 'promoções' : highlight,
        description: isLegacyMainBanner ? 'Ofertas especiais preparadas para você.' : description,
        buttonLabel: isLegacyMainBanner ? 'Ver cardápio' : buttonLabel,
        image,
        active: true,
        position,
      };
    })
    .filter((banner): banner is HomeBanner => banner !== null)
    .sort((left, right) => left.position - right.position || left.id - right.id);
}

export function mapProductPricingFromApi(product: Record<string, unknown>) {
  const pricing = asRecord(product.pricing);
  const discount = asRecord(product.discount);
  const originalBasePrice = Number(pricing.originalBasePrice ?? product.price ?? 0);
  const effectiveCandidate = Number(pricing.effectiveBasePrice ?? originalBasePrice);
  const effectiveBasePrice =
    Number.isFinite(effectiveCandidate) && effectiveCandidate >= 0
      ? effectiveCandidate
      : originalBasePrice;
  const active =
    pricing.active === true &&
    Number.isFinite(originalBasePrice) &&
    effectiveBasePrice < originalBasePrice;
  const discountAmount = active
    ? Number(pricing.discountAmount ?? originalBasePrice - effectiveBasePrice)
    : 0;
  const discountPercentage = active
    ? Number(
        pricing.discountPercentage ??
          (originalBasePrice > 0 ? (discountAmount / originalBasePrice) * 100 : 0),
      )
    : 0;

  return {
    originalBasePrice,
    effectiveBasePrice: active ? effectiveBasePrice : originalBasePrice,
    promotion: active
      ? {
          active: true,
          discountAmount,
          discountPercentage,
          badgeLabel:
            String(pricing.badgeLabel || discount.badgeLabel || '').trim() ||
            `${Math.round(discountPercentage)}% OFF`,
          endsAt: String(pricing.endsAt || discount.endsAt || '').trim() || undefined,
        }
      : undefined,
  };
}

export function buildHomeData(
  productsFromApi: Record<string, unknown>[],
  settings: Record<string, unknown> | null,
  date = new Date(),
): HomeData {
  const restaurant = (settings?.restaurant as Record<string, unknown>) ?? {};
  const persistedBanners = Array.isArray(restaurant.banners)
    ? (restaurant.banners as Record<string, unknown>[])
    : [];
  const banners = mapHomeBanners(persistedBanners);
  const firstBanner = banners[0];
  const hero = firstBanner
    ? {
        title: firstBanner.title,
        highlight: firstBanner.highlight,
        description: firstBanner.description,
        image: firstBanner.image,
      }
    : { title: '', highlight: '', description: '', image: '' };
  const restaurantName = String(restaurant.name || '');
  const rawWhatsapp = String(settings?.whatsapp || restaurant.whatsapp || '').replace(/\D/g, '');
  const hasWhatsappFlag = Boolean(
    settings && Object.prototype.hasOwnProperty.call(settings, 'whatsappEnabled'),
  );
  const whatsappEnabled = hasWhatsappFlag
    ? settings?.whatsappEnabled === true
    : Boolean(rawWhatsapp);
  const brand = {
    name: String(restaurantName || settings?.restaurantName || ''),
    monogram: createRestaurantMonogram(restaurantName || settings?.restaurantName),
    address: formatFooterAddress(restaurant),
    primaryColor: String(settings?.primaryColor || '#d64d08'),
    whatsapp: whatsappEnabled ? rawWhatsapp : '',
    whatsappDisplayName: String(settings?.whatsappDisplayName || ''),
    whatsappDefaultMessage: String(settings?.whatsappDefaultMessage || ''),
    instagram: String(settings?.instagram || ''),
    facebook: String(settings?.facebook || ''),
    tiktok: String(settings?.tiktok || ''),
    youtube: String(settings?.youtube || ''),
    legalName: String(settings?.companyLegalName || ''),
    phone: String(settings?.ownerPhone || ''),
    email: String(settings?.ownerEmail || ''),
    logoUrl: isPersistentImageSource(restaurant.logo) ? String(restaurant.logo) : '',
  };
  const products: HomeProduct[] = productsFromApi.map((product, index) => {
    const pricing = mapProductPricingFromApi(product);
    return {
      id: String(product.id),
      categoryId: String((product.category as { name?: string })?.name || 'outros'),
      name: String(product.name || ''),
      description: String(product.description || ''),
      price: pricing.effectiveBasePrice,
      originalPrice: pricing.originalBasePrice,
      promotion: pricing.promotion,
      image: resolveProductImage(product, index),
      rating: Number(product.averageRating || 0),
      stock: product.stock === null || product.stock === undefined ? null : Number(product.stock),
      available: !isProductUnavailable(product),
      ingredients: Array.isArray(product.ingredients)
        ? product.ingredients
            .filter((item) => (item as { active?: boolean }).active !== false)
            .map((item) => ({
              id: String((item as { id: unknown }).id),
              name: String((item as { name: unknown }).name),
              price: Number((item as { price: unknown }).price || 0),
              required: Boolean((item as { required?: unknown }).required),
            }))
        : [],
      optionGroups: mapProductOptionGroupsFromApi(product),
    };
  });
  const seen = new Set<string>();
  const categories: HomeCategory[] = [
    { id: 'todos', name: 'Todos', image: '' },
    ...(productsFromApi
      .map((product) => {
        const name = String((product.category as { name?: string })?.name || '');
        if (!name || seen.has(name)) return null;
        seen.add(name);
        return { id: name, name, image: resolveProductImage(product, 0) };
      })
      .filter(Boolean) as HomeCategory[]),
  ];
  const configuredBusinessHours = isBusinessHoursScheduleConfigured(settings?.businessHours)
    ? settings.businessHours
    : undefined;
  const configuredDayIds = new Set(configuredBusinessHours?.map((day) => day.id) || []);
  const businessHours = configuredBusinessHours
    ? normalizeBusinessHours(configuredBusinessHours, defaultBusinessHours).filter((day) =>
        configuredDayIds.has(day.id),
      )
    : undefined;
  const isOpenForOrders = isRestaurantOpenForOrders(settings?.isOpenForOrders);
  const availability = getRestaurantAvailability(businessHours, isOpenForOrders, date);
  return {
    brand,
    hero,
    banners,
    categories,
    products,
    deliveryTime: String(settings?.averageDeliveryTime || ''),
    minimumOrder: Number(settings?.minimumOrder || 0),
    freeDeliveryFrom: readOptionalPositiveMoney(settings?.freeShippingMinimum),
    acceptsDelivery: readPublicFeatureFlag(settings, 'acceptsDelivery'),
    acceptsPickup: readPublicFeatureFlag(settings, 'acceptsPickup'),
    acceptsPix: readPublicFeatureFlag(settings, 'acceptsPix'),
    acceptsCard: readPublicFeatureFlag(settings, 'acceptsCard'),
    fontFamily: normalizeHomeFontFamily(settings?.fontFamily),
    seoTitle: String(settings?.seoTitle || '').trim(),
    seoDescription: String(settings?.seoDescription || '').trim(),
    isOpen: availability.isOpen,
    isOpenForOrders,
    about: String(
      restaurant.description || settings?.restaurantDescription || settings?.description || '',
    ),
    businessHours,
  };
}
