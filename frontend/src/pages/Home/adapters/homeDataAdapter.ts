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
              const referenceProduct =
                (option.referenceProduct as Record<string, unknown> | null) ?? {};
              const isProductBacked = Boolean(option.referenceProductId || referenceProduct.id);
              const linkedPrice = Number(referenceProduct.price ?? 0);
              return {
                id: String(option.id ?? ''),
                ingredientId: String(option.ingredientId ?? ingredient.id ?? '') || undefined,
                referenceProductId:
                  String(option.referenceProductId ?? referenceProduct.id ?? '') || undefined,
                name: String(referenceProduct.name || ingredient.name || option.name || ''),
                image: isPersistentImageSource(referenceProduct.image)
                  ? String(referenceProduct.image).trim()
                  : isPersistentImageSource(ingredient.image)
                    ? String(ingredient.image).trim()
                    : null,
                price: isProductBacked
                  ? linkedPrice
                  : Number(option.additionalPrice ?? ingredient.price ?? option.price ?? 0),
                pricingMode: isProductBacked
                  ? ('ABSOLUTE' as const)
                  : option.pricingMode === 'ABSOLUTE'
                    ? ('ABSOLUTE' as const)
                    : ('ADDITIVE' as const),
                absolutePrice: isProductBacked
                  ? linkedPrice
                  : option.absolutePrice === null || option.absolutePrice === undefined
                    ? null
                    : Number(option.absolutePrice),
                allowQuantity: option.allowQuantity === true,
                minQuantity: Math.max(1, Number(option.minQuantity ?? 1)),
                maxQuantity: Math.max(1, Number(option.maxQuantity ?? 1)),
                defaultQuantity: Math.max(1, Number(option.defaultQuantity ?? 1)),
                defaultSelected: option.defaultSelected === true,
                locked: option.locked === true,
                active:
                  option.active !== false &&
                  (isProductBacked
                    ? referenceProduct.active !== false &&
                      referenceProduct.kind !== 'COMBO' &&
                      referenceProduct.pricingMode !== 'HIGHEST_OPTION'
                    : ingredient.active !== false),
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

export function resolveProductImage(product: Record<string, unknown>, _index: number): string {
  return isPersistentImageSource(product.image) ? String(product.image).trim() : '';
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
      const isLegacyMainBanner = storedTitle === 'Banner principal' && !highlight && !description;

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
    logoUrl: isPersistentImageSource(restaurant.logo) ? String(restaurant.logo) : '',
    category: String(
      restaurant.category || settings?.restaurantCategory || settings?.category || 'RESTAURANTE',
    ),
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
      kind: product.kind === 'COMBO' ? 'COMBO' : 'STANDARD',
      saleMode: product.saleMode === 'COMPLETE' ? 'COMPLETE' : 'BUILDABLE',
      pricingMode: product.pricingMode === 'HIGHEST_OPTION' ? 'HIGHEST_OPTION' : 'BASE',
      comboGroups: Array.isArray(product.comboGroups)
        ? product.comboGroups
            .map((rawGroup) => {
              const group = rawGroup as Record<string, unknown>;
              const options = Array.isArray(group.options)
                ? group.options
                    .map((rawOption) => {
                      const option = rawOption as Record<string, unknown>;
                      const component =
                        (option.componentProduct as Record<string, unknown> | null) ?? {};
                      const stock =
                        component.stock === null || component.stock === undefined
                          ? null
                          : Number(component.stock);
                      return {
                        id: String(option.id ?? ''),
                        productId: String(option.componentProductId ?? component.id ?? ''),
                        name: String(component.name || ''),
                        description: String(component.description || ''),
                        image: component.image ? String(component.image) : null,
                        basePrice: Number(component.price || 0),
                        additionalPrice: Number(option.additionalPrice || 0),
                        minQuantity: Math.max(0, Number(option.minQuantity ?? 0)),
                        maxQuantity: Math.max(1, Number(option.maxQuantity ?? 1)),
                        defaultQuantity: Math.max(0, Number(option.defaultQuantity ?? 0)),
                        locked: option.locked === true,
                        active:
                          option.active !== false &&
                          component.active !== false &&
                          (stock === null || stock > 0),
                        stock,
                      };
                    })
                    .filter((option) => option.id && option.productId && option.name)
                : [];
              return {
                id: String(group.id ?? ''),
                name: String(group.name || 'Escolhas'),
                description: String(group.description || ''),
                minSelections: Math.max(0, Number(group.minSelections ?? 1)),
                maxSelections: Math.max(1, Number(group.maxSelections ?? 1)),
                options,
              };
            })
            .filter((group) => group.id && group.options.length > 0)
        : [],
      configurationVersion: Math.max(1, Number(product.configurationVersion ?? 1)),
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
      compositionItems: Array.isArray(product.compositionItems)
        ? product.compositionItems
            .map((value) => {
              const item = value as Record<string, unknown>;
              const ingredient = (item.ingredient as Record<string, unknown> | null) ?? {};
              return {
                id: String(item.id ?? ''),
                ingredientId: String(item.ingredientId ?? ingredient.id ?? ''),
                name: String(ingredient.name ?? ''),
                removable: item.removable === true,
                active: item.active !== false && ingredient.active !== false,
              };
            })
            .filter((item) => item.id && item.name && item.active)
        : [],
      portionConfiguration: product.portionConfiguration
        ? {
            enabled: (product.portionConfiguration as Record<string, unknown>).enabled !== false,
            optionGroupId: String(
              (product.portionConfiguration as Record<string, unknown>).optionGroupId ?? '',
            ),
            minPortions: Math.max(
              1,
              Number((product.portionConfiguration as Record<string, unknown>).minPortions ?? 1),
            ),
            maxPortions: Math.max(
              1,
              Number((product.portionConfiguration as Record<string, unknown>).maxPortions ?? 2),
            ),
            pricingStrategy: String(
              (product.portionConfiguration as Record<string, unknown>).pricingStrategy ??
                'HIGHEST',
            ) as 'ADD' | 'HIGHEST' | 'AVERAGE' | 'PROPORTIONAL' | 'FIXED',
            allowPortionObservations:
              (product.portionConfiguration as Record<string, unknown>).allowPortionObservations !==
              false,
          }
        : null,
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
    openFinancePixEnabled: settings?.openFinancePixEnabled === true,
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
