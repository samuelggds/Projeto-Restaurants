const PRODUCT_RATING_CLIENT_KEY = "digitalMenuRatingClientKey";

const PRODUCT_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1617470702892-e01504297db7?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1620374645313-5081f3a5f9dc?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1548365328-9f547fb0953c?auto=format&fit=crop&w=1200&q=80",
];

export const MAX_RATING_STARS = 5;

export function toInt(value) {
  const parsed = Number(value || 0);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function toPrice(value) {
  return Number(value || 0)
    .toFixed(2)
    .replace(".", ",");
}

export function formatCpfInput(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 11);

  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function readTableSession() {
  try {
    return JSON.parse(localStorage.getItem("tableSession") || "null");
  } catch {
    return null;
  }
}

export function normalizeInstagramUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const username = raw.replace(/^@/, "");
  return `https://instagram.com/${username}`;
}

export function resolveProductImage(product, fallbackIndex = 0) {
  const directImage = String(product?.image || "").trim();

  if (directImage) {
    return directImage;
  }

  const idNumber = Number(product?.id);
  const nameLength = String(product?.name || "").length;
  const seed =
    Number.isFinite(idNumber) && idNumber > 0 ? idNumber : nameLength;
  const imageIndex =
    Math.abs(seed || fallbackIndex) % PRODUCT_FALLBACK_IMAGES.length;

  return PRODUCT_FALLBACK_IMAGES[imageIndex];
}

export function readOrCreateDeviceRatingKey() {
  try {
    const existing = localStorage.getItem(PRODUCT_RATING_CLIENT_KEY);

    if (existing && String(existing).trim()) {
      return String(existing).trim();
    }

    const generated =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `dm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    localStorage.setItem(PRODUCT_RATING_CLIENT_KEY, generated);
    return generated;
  } catch {
    return `dm-fallback-${Date.now()}`;
  }
}

export function resolveRatingClientKey(tableSession) {
  const sessionId = Number(tableSession?.sessionId || 0);
  const sessionToken = String(tableSession?.sessionToken || "").trim();

  if (sessionId > 0) {
    return `session:${sessionId}`;
  }

  if (sessionToken) {
    return `token:${sessionToken}`;
  }

  return `device:${readOrCreateDeviceRatingKey()}`;
}

export function toRatingLabel(value) {
  return Number(value || 0)
    .toFixed(1)
    .replace(".", ",");
}
