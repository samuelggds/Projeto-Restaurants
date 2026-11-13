/**
 * Public catalog allowlist. Never serialize Prisma records (or nested relations)
 * with a spread: new database columns must remain private by default.
 *
 * Stock remains public because the existing storefront uses its exact value
 * to limit cart quantities; payment/stock rules are still enforced server-side.
 */
type RecordLike = Record<string, unknown>;

function record(value: unknown): RecordLike {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordLike)
    : {};
}

function pick(value: unknown, fields: readonly string[]): RecordLike {
  const source = record(value);
  const result: RecordLike = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(source, field)) result[field] = source[field];
  }
  return result;
}

function optional(value: unknown, fields: readonly string[]) {
  return value === null || value === undefined ? null : pick(value, fields);
}

function entries(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function ingredient(value: unknown) {
  return optional(value, ['id', 'name', 'category', 'price', 'image', 'active']);
}

export function presentPublicProduct(value: unknown) {
  const product = record(value);

  return {
    ...pick(product, [
      'id', 'restaurantId', 'categoryId', 'name', 'description', 'image',
      'price', 'active', 'featured', 'preparationTime', 'stock',
      'configurationVersion', 'kind', 'saleMode', 'pricingMode',
    ]),
    category: optional(product.category, ['id', 'name', 'description', 'image', 'active', 'sortOrder']),
    discount: optional(product.discount, ['id', 'kind', 'value', 'label', 'active', 'startsAt', 'endsAt']),
    pricing: optional(product.pricing, [
      'originalBasePrice', 'effectiveBasePrice', 'discountAmount',
      'discountPercentage', 'badgeLabel', 'active', 'endsAt',
    ]),
    ingredients: entries(product.ingredients).map((item) =>
      pick(item, ['id', 'name', 'price', 'required', 'active'])),
    compositionItems: entries(product.compositionItems).map((item) => ({
      ...pick(item, ['id', 'ingredientId', 'removable', 'active', 'position']),
      ingredient: ingredient(record(item).ingredient),
    })),
    portionConfiguration: optional(product.portionConfiguration, [
      'id', 'optionGroupId', 'enabled', 'minPortions', 'maxPortions',
      'pricingStrategy', 'allowPortionObservations',
    ]),
    optionGroups: entries(product.optionGroups).map((item) => ({
      ...pick(item, [
        'id', 'name', 'description', 'required', 'selectionType',
        'minSelections', 'maxSelections', 'position', 'active',
      ]),
      options: entries(record(item).options).map((option) => ({
        ...pick(option, [
          'id', 'ingredientId', 'referenceProductId', 'additionalPrice',
          'pricingMode', 'absolutePrice', 'allowQuantity', 'minQuantity',
          'maxQuantity', 'defaultQuantity', 'defaultSelected', 'locked',
          'active', 'position',
        ]),
        ingredient: ingredient(record(option).ingredient),
        referenceProduct: optional(record(option).referenceProduct, [
          'id', 'name', 'image', 'price', 'pricingMode', 'active', 'kind', 'stock',
        ]),
      })),
    })),
    comboGroups: entries(product.comboGroups).map((item) => ({
      ...pick(item, ['id', 'name', 'description', 'minSelections', 'maxSelections', 'position', 'active']),
      options: entries(record(item).options).map((option) => ({
        ...pick(option, [
          'id', 'componentProductId', 'additionalPrice', 'minQuantity',
          'maxQuantity', 'defaultQuantity', 'locked', 'active', 'position',
        ]),
        componentProduct: optional(record(option).componentProduct, [
          'id', 'name', 'description', 'image', 'price', 'stock', 'active', 'kind',
        ]),
      })),
    })),
  };
}
