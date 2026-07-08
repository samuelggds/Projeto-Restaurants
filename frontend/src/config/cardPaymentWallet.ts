import visaLogo from "../assets/card-brands/visa.svg";
import mastercardLogo from "../assets/card-brands/mastercard.svg";
import eloLogo from "../assets/card-brands/elo.svg";
import hipercardLogo from "../assets/card-brands/hipercard.svg";
import amexLogo from "../assets/card-brands/amex.svg";
import defaultCardLogo from "../assets/card-brands/default-card.svg";

export const CARD_PAYMENT_WALLET_KEY = "@PecaJaFood:cardPaymentWallet";

export type CardPaymentDraft = {
  holderName: string;
  brand: string;
  lastFour: string;
};

export type SavedCardProfile = CardPaymentDraft & {
  id: string;
};

export const CARD_BRAND_OPTIONS = [
  "Visa",
  "Mastercard",
  "Elo",
  "Hipercard",
  "American Express",
  "Outra",
];

export function getCardBrandDisplay(brand: string | null | undefined) {
  const normalized = String(brand || "")
    .trim()
    .toLowerCase();

  if (normalized === "visa") {
    return {
      label: "Visa",
      badge: "V",
      accent: "#dbeafe",
    };
  }

  if (normalized === "mastercard") {
    return {
      label: "Master",
      badge: "MC",
      accent: "#ffedd5",
    };
  }

  if (normalized === "elo") {
    return {
      label: "Elo",
      badge: "E",
      accent: "#e5e7eb",
    };
  }

  if (normalized === "hipercard") {
    return {
      label: "Hiper",
      badge: "H",
      accent: "#ffe4e6",
    };
  }

  if (normalized === "american express") {
    return {
      label: "Amex",
      badge: "AX",
      accent: "#ccfbf1",
    };
  }

  if (normalized === "outra") {
    return {
      label: "Outra",
      badge: "+",
      accent: "#e2e8f0",
    };
  }

  return {
    label: String(brand || "Bandeira") || "Bandeira",
    badge: "?",
    accent: "#e2e8f0",
  };
}

type CardWalletState = {
  cards: SavedCardProfile[];
  selectedCardId: string | null;
  defaultCardId: string | null;
};

export function getEmptyCardDraft(): CardPaymentDraft {
  return {
    holderName: "",
    brand: "",
    lastFour: "",
  };
}

export function sanitizeCardDraft(
  draft: Partial<CardPaymentDraft> | null | undefined,
): CardPaymentDraft {
  return {
    holderName: String(draft?.holderName || ""),
    brand: String(draft?.brand || ""),
    lastFour: String(draft?.lastFour || "")
      .replace(/\D/g, "")
      .slice(0, 4),
  };
}

export function isCardDraftComplete(
  draft: Partial<CardPaymentDraft> | null | undefined,
) {
  const sanitized = sanitizeCardDraft(draft);

  return (
    sanitized.holderName.trim().length >= 3 &&
    sanitized.brand.trim().length >= 2 &&
    sanitized.lastFour.length === 4
  );
}

export function buildCardPaymentSummary(
  cardDraft: Partial<CardPaymentDraft> | null | undefined,
) {
  const sanitized = sanitizeCardDraft(cardDraft);

  if (!isCardDraftComplete(sanitized)) {
    return "";
  }

  return `Cartao: ${sanitized.brand.trim().toUpperCase()} final ${sanitized.lastFour} | Titular: ${sanitized.holderName.trim()}`;
}

export function readCardWallet(): CardWalletState {
  if (typeof window === "undefined") {
    return {
      cards: [],
      selectedCardId: null,
      defaultCardId: null,
    };
  }

  try {
    const raw = JSON.parse(
      localStorage.getItem(CARD_PAYMENT_WALLET_KEY) || "null",
    );
    const cards = Array.isArray(raw?.cards)
      ? raw.cards
          .map((card) => ({
            id: String(card?.id || ""),
            ...sanitizeCardDraft(card),
          }))
          .filter((card) => card.id && isCardDraftComplete(card))
      : [];
    const selectedCardId = String(raw?.selectedCardId || "").trim() || null;
    const defaultCardId = String(raw?.defaultCardId || "").trim() || null;

    return {
      cards,
      selectedCardId:
        selectedCardId && cards.some((card) => card.id === selectedCardId)
          ? selectedCardId
          : defaultCardId && cards.some((card) => card.id === defaultCardId)
            ? defaultCardId
            : cards[0]?.id || null,
      defaultCardId:
        defaultCardId && cards.some((card) => card.id === defaultCardId)
          ? defaultCardId
          : cards[0]?.id || null,
    };
  } catch {
    return {
      cards: [],
      selectedCardId: null,
      defaultCardId: null,
    };
  }
}

export function persistCardWallet(
  cards: SavedCardProfile[],
  selectedCardId: string | null,
  defaultCardId: string | null,
) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedCards = cards
    .map((card) => ({
      id: String(card?.id || ""),
      ...sanitizeCardDraft(card),
    }))
    .filter((card) => card.id && isCardDraftComplete(card));

  localStorage.setItem(
    CARD_PAYMENT_WALLET_KEY,
    JSON.stringify({
      cards: normalizedCards,
      selectedCardId,
      defaultCardId,
    }),
  );
}

export function findSavedCard(
  cards: SavedCardProfile[],
  cardId: string | null | undefined,
) {
  return cards.find((card) => card.id === cardId) || null;
}

export function normalizeCardNumberInput(value: string | null | undefined) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 19);

  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export function getCardNumberDigits(value: string | null | undefined) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 19);
}

export function isCardNumberValid(value: string | null | undefined) {
  const digits = getCardNumberDigits(value);
  return digits.length >= 13 && digits.length <= 19;
}

export function getCardBrandPalette(brand: string | null | undefined) {
  const normalized = String(brand || "")
    .trim()
    .toLowerCase();

  if (normalized === "visa") {
    return {
      background: "linear-gradient(135deg, #1d4ed8, #60a5fa)",
      color: "#eff6ff",
    };
  }

  if (normalized === "mastercard") {
    return {
      background: "linear-gradient(135deg, #b91c1c, #f97316)",
      color: "#fff7ed",
    };
  }

  if (normalized === "elo") {
    return {
      background: "linear-gradient(135deg, #111827, #374151)",
      color: "#f9fafb",
    };
  }

  if (normalized === "hipercard") {
    return {
      background: "linear-gradient(135deg, #be123c, #fb7185)",
      color: "#fff1f2",
    };
  }

  if (normalized === "american express") {
    return {
      background: "linear-gradient(135deg, #0f766e, #2dd4bf)",
      color: "#f0fdfa",
    };
  }

  return {
    background: "linear-gradient(135deg, #334155, #64748b)",
    color: "#f8fafc",
  };
}

export function getCardBrandLogo(brand: string | null | undefined) {
  const normalized = String(brand || "")
    .trim()
    .toLowerCase();

  if (normalized === "visa") {
    return visaLogo;
  }

  if (normalized === "mastercard") {
    return mastercardLogo;
  }

  if (normalized === "elo") {
    return eloLogo;
  }

  if (normalized === "hipercard") {
    return hipercardLogo;
  }

  if (normalized === "american express") {
    return amexLogo;
  }

  return defaultCardLogo;
}
