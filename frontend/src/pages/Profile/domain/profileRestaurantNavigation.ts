type UnknownRecord = Record<string, unknown>;

function normalizeSlug(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function buildProfileRestaurantHomePath(
  settings: UnknownRecord | null | undefined,
  user: UnknownRecord | null | undefined,
) {
  const settingsRestaurant = (settings?.restaurant as UnknownRecord | null) || {};
  const userRestaurant = (user?.restaurant as UnknownRecord | null) || {};
  const slug = normalizeSlug(
    settingsRestaurant.slug || settings?.slug || userRestaurant.slug || user?.restaurantSlug,
  );

  return slug ? `/${slug}` : null;
}

export function buildProfileRestaurantMenuPath(homePath: string) {
  return `${homePath}#cardapio`;
}
