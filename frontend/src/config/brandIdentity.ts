export const BRAND_IDENTITY_STORAGE_KEY = "@PecaJaFood:brandIdentity";
export const BRAND_IDENTITY_UPDATED_EVENT = "pecajaf:brand-identity-updated";

export type BrandIdentity = {
  name: string;
  logoUrl: string;
};

const DEFAULT_BRAND_NAME = "Peça Já Food";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function parseJson(raw: string | null) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractFromUserStorage(): BrandIdentity {
  const parsedUser = parseJson(localStorage.getItem("user")) as Record<
    string,
    unknown
  > | null;
  const restaurant =
    parsedUser && typeof parsedUser.restaurant === "object"
      ? (parsedUser.restaurant as Record<string, unknown>)
      : null;

  const name =
    normalizeText(parsedUser?.restaurantName) ||
    normalizeText(restaurant?.name) ||
    normalizeText(restaurant?.restaurantName);
  const logoUrl =
    normalizeText(parsedUser?.restaurantLogo) ||
    normalizeText(restaurant?.logo) ||
    normalizeText(restaurant?.restaurantLogo);

  return {
    name,
    logoUrl,
  };
}

export function readBrandIdentityFromStorage(): BrandIdentity {
  const parsed = parseJson(
    localStorage.getItem(BRAND_IDENTITY_STORAGE_KEY),
  ) as Record<string, unknown> | null;

  return {
    name: normalizeText(parsed?.name),
    logoUrl: normalizeText(parsed?.logoUrl),
  };
}

export function getBrandIdentity(): BrandIdentity {
  const fromStorage = readBrandIdentityFromStorage();

  if (fromStorage.name || fromStorage.logoUrl) {
    return {
      name: fromStorage.name || DEFAULT_BRAND_NAME,
      logoUrl: fromStorage.logoUrl,
    };
  }

  const fromUserStorage = extractFromUserStorage();

  return {
    name: fromUserStorage.name || DEFAULT_BRAND_NAME,
    logoUrl: fromUserStorage.logoUrl,
  };
}

export function persistBrandIdentity(partial: Partial<BrandIdentity>) {
  const previous = readBrandIdentityFromStorage();
  const next: BrandIdentity = {
    name: normalizeText(partial.name) || previous.name || DEFAULT_BRAND_NAME,
    logoUrl: normalizeText(partial.logoUrl) || previous.logoUrl,
  };

  localStorage.setItem(BRAND_IDENTITY_STORAGE_KEY, JSON.stringify(next));

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(BRAND_IDENTITY_UPDATED_EVENT, {
        detail: next,
      }),
    );
  }

  return next;
}
