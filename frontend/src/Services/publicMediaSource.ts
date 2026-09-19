export function resolvePublicMediaSource(source: unknown, baseUrl: unknown) {
  const normalizedSource = String(source || '').trim();
  if (!normalizedSource.startsWith('/public-media/')) return source;
  const normalizedBaseUrl = String(baseUrl || '')
    .trim()
    .replace(/\/+$/, '');
  return normalizedBaseUrl ? `${normalizedBaseUrl}${normalizedSource}` : normalizedSource;
}

function resolvePublicIngredientImage(ingredient: unknown, baseUrl: unknown) {
  if (!ingredient || typeof ingredient !== 'object') return ingredient;
  const record = ingredient as Record<string, unknown>;
  return {
    ...record,
    image: resolvePublicMediaSource(record.image, baseUrl),
  };
}

export function resolvePublicProductImages(products: unknown, baseUrl: unknown) {
  if (!Array.isArray(products)) return [];
  return products.map((product) => {
    if (!product || typeof product !== 'object') return product;
    const record = product as Record<string, unknown>;
    return {
      ...record,
      image: resolvePublicMediaSource(record.image, baseUrl),
      optionGroups: Array.isArray(record.optionGroups)
        ? record.optionGroups.map((group) => {
            if (!group || typeof group !== 'object') return group;
            const groupRecord = group as Record<string, unknown>;
            return {
              ...groupRecord,
              options: Array.isArray(groupRecord.options)
                ? groupRecord.options.map((option) => {
                    if (!option || typeof option !== 'object') return option;
                    const optionRecord = option as Record<string, unknown>;
                    const referenceProduct =
                      optionRecord.referenceProduct &&
                      typeof optionRecord.referenceProduct === 'object'
                        ? (optionRecord.referenceProduct as Record<string, unknown>)
                        : null;
                    return {
                      ...optionRecord,
                      ingredient: resolvePublicIngredientImage(optionRecord.ingredient, baseUrl),
                      referenceProduct: referenceProduct
                        ? {
                            ...referenceProduct,
                            image: resolvePublicMediaSource(referenceProduct.image, baseUrl),
                          }
                        : optionRecord.referenceProduct,
                    };
                  })
                : groupRecord.options,
            };
          })
        : record.optionGroups,
      comboGroups: Array.isArray(record.comboGroups)
        ? record.comboGroups.map((group) => {
            if (!group || typeof group !== 'object') return group;
            const groupRecord = group as Record<string, unknown>;
            return {
              ...groupRecord,
              options: Array.isArray(groupRecord.options)
                ? groupRecord.options.map((option) => {
                    if (!option || typeof option !== 'object') return option;
                    const optionRecord = option as Record<string, unknown>;
                    const component =
                      optionRecord.componentProduct &&
                      typeof optionRecord.componentProduct === 'object'
                        ? (optionRecord.componentProduct as Record<string, unknown>)
                        : null;
                    return {
                      ...optionRecord,
                      componentProduct: component
                        ? {
                            ...component,
                            image: resolvePublicMediaSource(component.image, baseUrl),
                          }
                        : optionRecord.componentProduct,
                    };
                  })
                : groupRecord.options,
            };
          })
        : record.comboGroups,
    };
  });
}

export function resolvePublicIngredientImages(ingredients: unknown, baseUrl: unknown) {
  if (!Array.isArray(ingredients)) return [];
  return ingredients.map((ingredient) => {
    return resolvePublicIngredientImage(ingredient, baseUrl);
  });
}
