import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ChevronRight,
  MapPin,
  CreditCard,
  X,
  CheckCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  extractCepDigits,
  fetchAddressByCep,
  normalizeCepInput,
} from "../../Services/cepService";
import ordersService from "../../Services/ordersService";
import restaurantSettingsService from "../../Services/restaurantSettingsService";
import { connectSocket, disconnectSocket } from "../../Services/socketService";
import {
  CARD_BRAND_OPTIONS,
  buildCardPaymentSummary,
  findSavedCard,
  getCardCheckoutFieldErrors,
  getCardBrandDisplay,
  getCardBrandLogo,
  getExpectedCardCvvLength,
  getEmptyCardDraft,
  getCardBrandPalette,
  normalizeCardNumberInput,
  normalizeCardExpiryInput,
  persistCardWallet,
  readCardWallet,
  sanitizeCardDraft,
  validateCardCheckoutInput,
} from "../../config/cardPaymentWallet";
import { useAuth } from "../../contexts/authContext";
import * as S from "./styles";

const PixPaymentPanel = lazy(() => import("./components/PixPaymentPanel"));

const ADDRESS_STORAGE_KEY = "@PecaJaFood:enderecos";
const ADDRESS_SELECTED_KEY = "@PecaJaFood:enderecoSelecionadoId";
const MIN_CONFIRMATION_DELAY_MS = 5000;
const CONFIRMED_STATE_DELAY_MS = 2000;
const PIX_AUTO_STATUS_CHECK_INTERVAL_MS = 4000;
const PENDING_PIX_CHECKOUT_STORAGE_KEY = "@PecaJaFood:pendingPixCheckout";
const PENDING_PIX_CHECKOUT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const DELIVERY_PAYMENT_REQUIRED_MESSAGE =
  "Seu pedido foi criado, mas so sera liberado para a equipe apos pagamento confirmado. Pague e confirme o pedido para liberar o preparo.";
const CARD_BRAND_LOGO_STYLE_BASE = {
  width: 62,
  height: 24,
  borderRadius: 0,
  objectFit: "contain" as const,
  display: "block",
  background: "transparent",
  padding: 0,
  boxSizing: "border-box" as const,
  border: "none",
};

const CARD_BRAND_LOGO_SIZE_PRESETS = {
  default: {
    compact: { width: 62, height: 24 },
    preview: { width: 72, height: 24 },
  },
  visa: {
    compact: { width: 54, height: 20 },
    preview: { width: 64, height: 20 },
  },
  mastercard: {
    compact: { width: 60, height: 24 },
    preview: { width: 70, height: 24 },
  },
  elo: {
    compact: { width: 70, height: 26 },
    preview: { width: 76, height: 28 },
  },
  hipercard: {
    compact: { width: 64, height: 24 },
    preview: { width: 72, height: 24 },
  },
  "american express": {
    compact: { width: 68, height: 24 },
    preview: { width: 74, height: 24 },
  },
} as const;

function normalizeCardBrandKey(brand) {
  return String(brand || "")
    .trim()
    .toLowerCase();
}

function getCardBrandLogoStyle(
  brand,
  variant: "compact" | "preview" = "compact",
) {
  const key = normalizeCardBrandKey(brand);
  const sizeSet =
    CARD_BRAND_LOGO_SIZE_PRESETS[key] || CARD_BRAND_LOGO_SIZE_PRESETS.default;

  return {
    ...CARD_BRAND_LOGO_STYLE_BASE,
    ...sizeSet[variant],
  };
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseMoney(value, fallback = 0) {
  const normalized = Number(value);
  if (Number.isNaN(normalized)) {
    return fallback;
  }

  return normalized;
}

function readJsonStorage(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizePendingPixCheckout(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const orderId = Number(value?.orderId || 0);
  const paymentId = String(value?.paymentId || "").trim();
  const pixCode = String(value?.pixCode || "").trim();

  if (!Number.isInteger(orderId) || orderId <= 0 || !paymentId || !pixCode) {
    return null;
  }

  const total = Number(value?.total || 0);
  const savedAt = Number(value?.savedAt || Date.now());

  return {
    orderId,
    total: Number.isFinite(total) ? total : 0,
    paymentId,
    provider: String(value?.provider || "MERCADO_PAGO")
      .trim()
      .toUpperCase(),
    pixCode,
    qrCodeBase64: value?.qrCodeBase64 || null,
    requiresStatusCheck: Boolean(value?.requiresStatusCheck),
    savedAt,
  };
}

function readPendingPixCheckout() {
  const raw = readJsonStorage(PENDING_PIX_CHECKOUT_STORAGE_KEY, null);
  const normalized = normalizePendingPixCheckout(raw);

  if (!normalized) {
    return null;
  }

  const ageMs = Date.now() - Number(normalized.savedAt || 0);
  if (!Number.isFinite(ageMs) || ageMs > PENDING_PIX_CHECKOUT_MAX_AGE_MS) {
    localStorage.removeItem(PENDING_PIX_CHECKOUT_STORAGE_KEY);
    return null;
  }

  return normalized;
}

function formatPhoneInput(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (
    digits.startsWith("55") &&
    (digits.length === 12 || digits.length === 13)
  ) {
    digits = digits.slice(2);
  }

  digits = digits.slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);

  if (local.length <= 4) {
    return `(${ddd}) ${local}`;
  }

  if (local.length <= 8) {
    return `(${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
  }

  return `(${ddd}) ${local.slice(0, 5)}-${local.slice(5, 9)}`;
}

function normalizeStoredAddress(address) {
  return {
    id: Number(address?.id || Date.now()),
    rotulo: String(address?.rotulo || "Principal"),
    rua: String(address?.rua || ""),
    numero: String(address?.numero || ""),
    bairro: String(address?.bairro || ""),
    cidade: String(address?.cidade || ""),
    estado: String(address?.estado || ""),
    cep: String(address?.cep || ""),
    complemento: String(address?.complemento || ""),
    pontoReferencia: String(address?.pontoReferencia || ""),
  };
}

function mergeComplementAndReference(complemento, pontoReferencia) {
  const normalizedComplemento = String(complemento || "").trim();
  const normalizedReference = String(pontoReferencia || "").trim();

  if (normalizedComplemento && normalizedReference) {
    return `${normalizedComplemento} | Ref.: ${normalizedReference}`;
  }

  if (normalizedComplemento) {
    return normalizedComplemento;
  }

  if (normalizedReference) {
    return `Ref.: ${normalizedReference}`;
  }

  return "";
}

function buildDeliveryAddress(user) {
  const savedAddresses = readJsonStorage(ADDRESS_STORAGE_KEY, []);
  const selectedId = Number(localStorage.getItem(ADDRESS_SELECTED_KEY) || 0);
  const addresses = Array.isArray(savedAddresses)
    ? savedAddresses.map(normalizeStoredAddress)
    : [];

  const selectedAddress =
    addresses.find((address) => address.id === selectedId) ||
    addresses[0] ||
    null;

  return {
    cep: selectedAddress?.cep || user?.zipCode || "",
    logradouro: selectedAddress?.rua || user?.address || "",
    numero: selectedAddress?.numero || user?.number || "",
    bairro: selectedAddress?.bairro || user?.district || "",
    cidade: selectedAddress?.cidade || user?.city || "Fortaleza",
    estado: selectedAddress?.estado || user?.state || "CE",
    complemento: selectedAddress?.complemento || user?.complement || "",
    pontoReferencia: selectedAddress?.pontoReferencia || "",
  };
}

function getAddressSignature(address) {
  return [
    address?.logradouro,
    address?.numero,
    address?.bairro,
    address?.cidade,
    address?.estado,
    address?.cep,
    address?.complemento,
    address?.pontoReferencia,
  ]
    .map((value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    )
    .join("|");
}

function loadInitialCart() {
  const raw = localStorage.getItem("cartItems");
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.map((item) => ({
    ...item,
    productId: Number(item.productId),
    quantity: Number(item.quantity || 1),
    price: Number(item.price || 0),
  }));
}

function maskCardDigits(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 16);
  if (!digits) {
    return "1234 1234 1234 1234";
  }

  const grouped = digits.match(/.{1,4}/g) || [];
  return grouped.join(" ").padEnd(19, "_");
}

function resolveCardHolderName(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "SMITH PLACE HOLDER";
  }

  return text.toUpperCase().slice(0, 26);
}

export default function Cart() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, login } = useAuth();
  const initialCardWallet = useMemo(() => readCardWallet(), []);
  const [isDarkMode] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [cartItems, setCartItems] = useState(loadInitialCart);
  const [orderType, setOrderType] = useState("DELIVERY");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [isPayOnDelivery, setIsPayOnDelivery] = useState(false);
  const [payOnDeliveryMethod, setPayOnDeliveryMethod] = useState("DINHEIRO");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [pixPaymentData, setPixPaymentData] = useState(() =>
    readPendingPixCheckout(),
  );
  const [isPixPaymentPanelMinimized, setIsPixPaymentPanelMinimized] =
    useState(false);
  const [, setPendingPixOrderPayload] = useState(null);
  const [paymentSuccessState, setPaymentSuccessState] = useState<{
    orderId: number | null;
    provider: string;
    title: string;
    message: string;
  } | null>(null);
  const [publicRestaurantSettings, setPublicRestaurantSettings] = useState({
    deliveryFee: 8.5,
    minimumOrder: 0,
    pixProvider: "MERCADO_PAGO",
    pixKey: "",
  });

  const storedUser = user || readJsonStorage("user", null);

  const [endereco, setEndereco] = useState(() =>
    buildDeliveryAddress(storedUser),
  );
  const lastCepLookupRef = useRef("");
  const [isCepLookupLoading, setIsCepLookupLoading] = useState(false);
  const [customerPhone, setCustomerPhone] = useState(() =>
    formatPhoneInput(storedUser?.phone || ""),
  );
  const [savedCards, setSavedCards] = useState(initialCardWallet.cards);
  const [selectedSavedCardId, setSelectedSavedCardId] = useState(
    initialCardWallet.selectedCardId,
  );
  const [defaultSavedCardId, setDefaultSavedCardId] = useState(
    initialCardWallet.defaultCardId,
  );
  const [cardPaymentDraft, setCardPaymentDraft] = useState(() => {
    const selectedCard = findSavedCard(
      initialCardWallet.cards,
      initialCardWallet.selectedCardId,
    );

    return selectedCard ? sanitizeCardDraft(selectedCard) : getEmptyCardDraft();
  });
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [showCardFieldErrors, setShowCardFieldErrors] = useState(false);
  const cardPreviewDigits = maskCardDigits(cardNumber);
  const cardPreviewHolder = resolveCardHolderName(cardPaymentDraft.holderName);
  const cardPreviewCvv = String(cardCvv || "").trim() || "789";
  const cardPreviewBrand = String(cardPaymentDraft.brand || "").trim();
  const cardPreviewBrandSource = cardPreviewBrand || "outra";
  const expectedCardCvvLength = getExpectedCardCvvLength(
    cardPaymentDraft.brand,
  );
  const cardPreviewBrandLabel =
    getCardBrandDisplay(cardPreviewBrandSource).label || "Bandeira";
  const cardFieldErrors = useMemo(() => {
    if (!showCardFieldErrors || isPayOnDelivery || paymentMethod !== "CARTAO") {
      return {};
    }

    return getCardCheckoutFieldErrors({
      cardDraft: cardPaymentDraft,
      cardNumber,
      cardExpiry,
      cardCvv,
    });
  }, [
    showCardFieldErrors,
    isPayOnDelivery,
    paymentMethod,
    cardPaymentDraft,
    cardNumber,
    cardExpiry,
    cardCvv,
  ]);
  const cardErrorTextStyle = {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 4,
    fontWeight: 600,
  } as const;
  const cardFieldErrorStyle = {
    border: "1px solid #ef4444",
    boxShadow: "0 0 0 1px rgba(239, 68, 68, 0.18)",
  } as const;
  const cardFieldValidStyle = {
    border: "1px solid #22c55e",
    boxShadow: "0 0 0 1px rgba(34, 197, 94, 0.2)",
  } as const;

  useEffect(() => {
    const normalized = normalizePendingPixCheckout(pixPaymentData);

    if (!normalized) {
      localStorage.removeItem(PENDING_PIX_CHECKOUT_STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      PENDING_PIX_CHECKOUT_STORAGE_KEY,
      JSON.stringify({
        ...normalized,
        savedAt: Date.now(),
      }),
    );
  }, [pixPaymentData]);

  function resolveCardFieldStyle(hasError, isValid) {
    if (!showCardFieldErrors || isPayOnDelivery || paymentMethod !== "CARTAO") {
      return undefined;
    }

    if (hasError) {
      return cardFieldErrorStyle;
    }

    if (isValid) {
      return cardFieldValidStyle;
    }

    return undefined;
  }

  const tableSession = useMemo(() => {
    const raw = localStorage.getItem("tableSession");
    return raw ? JSON.parse(raw) : null;
  }, []);

  const restaurantId =
    Number(tableSession?.restaurantId) ||
    Number(storedUser?.restaurantId) ||
    Number(localStorage.getItem("menuRestaurantId")) ||
    null;

  const mesaReturnPath = tableSession?.tableId
    ? `/mesa/${tableSession.tableNumber || tableSession.tableId}?tableId=${tableSession.tableId}${restaurantId ? `&restaurantId=${restaurantId}` : ""}`
    : "/menu";
  const storedMenuRestaurantSlug = String(
    localStorage.getItem("menuRestaurantSlug") || "",
  )
    .trim()
    .toLowerCase();
  const cartOrigin = String(
    searchParams.get("from") || searchParams.get("origin") || "",
  )
    .trim()
    .toLowerCase();
  const explicitReturnPath = String(searchParams.get("returnTo") || "").trim();
  const returnMenuPath = explicitReturnPath.startsWith("/")
    ? explicitReturnPath
    : cartOrigin === "home"
      ? "/menu"
      : cartOrigin === "menu" || cartOrigin === "cardapio"
        ? mesaReturnPath
        : tableSession?.tableId
          ? mesaReturnPath
          : "/menu";
  const paymentSuccessReturnPath = explicitReturnPath.startsWith("/")
    ? explicitReturnPath
    : cartOrigin === "menu" || cartOrigin === "cardapio"
      ? mesaReturnPath
      : storedMenuRestaurantSlug
        ? `/${storedMenuRestaurantSlug}`
        : "/home";

  const isMesa = Boolean(tableSession?.tableId);
  const isDelivery = !isMesa && orderType === "DELIVERY";
  const effectivePaymentMethod = isPayOnDelivery
    ? payOnDeliveryMethod
    : paymentMethod;
  const shouldUsePixCheckout =
    isDelivery && !isPayOnDelivery && paymentMethod === "PIX";
  const shouldUseCardCheckout = !isPayOnDelivery && paymentMethod === "CARTAO";

  useEffect(() => {
    if (!isDelivery && isPayOnDelivery) {
      setIsPayOnDelivery(false);
    }
  }, [isDelivery, isPayOnDelivery]);

  useEffect(() => {
    let mounted = true;

    async function loadPublicRestaurantSettings() {
      if (!restaurantId) {
        return;
      }

      try {
        const settings =
          await restaurantSettingsService.getPublicSettings(restaurantId);

        if (!mounted) {
          return;
        }

        setPublicRestaurantSettings({
          deliveryFee: Math.max(parseMoney(settings?.deliveryFee, 8.5), 0),
          minimumOrder: Math.max(parseMoney(settings?.minimumOrder, 0), 0),
          pixProvider: String(settings?.pixProvider || "MERCADO_PAGO")
            .trim()
            .toUpperCase(),
          pixKey: String(settings?.pixKey || "").trim(),
        });
      } catch {
        if (!mounted) {
          return;
        }

        setPublicRestaurantSettings({
          deliveryFee: 8.5,
          minimumOrder: 0,
          pixProvider: "MERCADO_PAGO",
          pixKey: "",
        });
      }
    }

    loadPublicRestaurantSettings();

    return () => {
      mounted = false;
    };
  }, [restaurantId]);

  useEffect(() => {
    const cardCheckoutStatus = String(
      searchParams.get("cardCheckoutStatus") || "",
    ).trim();

    if (!cardCheckoutStatus) {
      return;
    }

    if (cardCheckoutStatus === "success") {
      localStorage.removeItem("cartItems");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCartItems([]);
      const params = new URLSearchParams(searchParams);
      params.delete("cardCheckoutStatus");
      params.set("paymentSuccess", "1");
      params.set("provider", "CARTAO");
      if (Number(searchParams.get("orderId") || 0) > 0) {
        params.set("orderId", String(Number(searchParams.get("orderId"))));
      }
      navigate(
        {
          pathname: "/cart",
          search: params.toString() ? `?${params.toString()}` : "",
        },
        { replace: true },
      );
      return;
    }

    if (cardCheckoutStatus === "cancel") {
      toast.info("Pagamento com cartao cancelado. Seu carrinho foi mantido.");
      const params = new URLSearchParams(searchParams);
      params.delete("cardCheckoutStatus");
      navigate(
        {
          pathname: "/cart",
          search: params.toString() ? `?${params.toString()}` : "",
        },
        { replace: true },
      );
    }
  }, [navigate, searchParams]);

  useEffect(() => {
    persistCardWallet(savedCards, selectedSavedCardId, defaultSavedCardId);
  }, [savedCards, selectedSavedCardId, defaultSavedCardId]);

  function handleGoToOrderFromPaymentSuccess() {
    setPaymentSuccessState(null);
    navigate(paymentSuccessReturnPath, { replace: true });
  }

  const paymentSuccessFromQuery =
    String(searchParams.get("paymentSuccess") || "") === "1"
      ? {
          orderId: Number(searchParams.get("orderId") || 0) || null,
          provider: String(searchParams.get("provider") || "PIX")
            .trim()
            .toUpperCase(),
          title: "Fique tranquilo",
          message: "Este pedido ja foi pago.",
        }
      : null;

  const activePaymentSuccessState =
    paymentSuccessState || paymentSuccessFromQuery;

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const taxaEntrega =
    isMesa || orderType === "RETIRADA"
      ? 0
      : publicRestaurantSettings.deliveryFee;
  const total = subtotal + taxaEntrega;
  const hasMinimumOrderForDelivery =
    isDelivery && publicRestaurantSettings.minimumOrder > 0;
  const minimumOrderShortfall = hasMinimumOrderForDelivery
    ? Math.max(publicRestaurantSettings.minimumOrder - subtotal, 0)
    : 0;
  const isMinimumOrderReached =
    hasMinimumOrderForDelivery && minimumOrderShortfall <= 0;
  const isBlockedByMinimumOrder =
    hasMinimumOrderForDelivery && !isMinimumOrderReached;

  function buildOrderPayload({ paid = false, pixPaymentId = null } = {}) {
    const cardPaymentSummary = shouldUseCardCheckout
      ? buildCardPaymentSummary(cardPaymentDraft)
      : "";

    return {
      restaurantId,
      type: isMesa ? "MESA" : orderType,
      paymentMethod: effectivePaymentMethod,
      payOnDelivery: isPayOnDelivery,
      payOnDeliveryMethod: isPayOnDelivery ? effectivePaymentMethod : undefined,
      pixProvider:
        effectivePaymentMethod === "PIX" && !isPayOnDelivery
          ? String(publicRestaurantSettings.pixProvider || "MERCADO_PAGO")
              .trim()
              .toUpperCase()
          : undefined,
      paid,
      pixPaymentId: pixPaymentId || undefined,
      observation: cardPaymentSummary || undefined,
      customerPhone: isDelivery
        ? String(customerPhone || "").trim() || undefined
        : undefined,
      tableId: isMesa ? Number(tableSession.tableId) : undefined,
      address: isDelivery ? endereco.logradouro : undefined,
      number: isDelivery ? endereco.numero : undefined,
      district: isDelivery ? endereco.bairro : undefined,
      city: isDelivery ? endereco.cidade : undefined,
      state: isDelivery ? endereco.estado : undefined,
      zipCode: isDelivery ? endereco.cep : undefined,
      complement: isDelivery
        ? mergeComplementAndReference(
            endereco.complemento,
            endereco.pontoReferencia,
          ) || undefined
        : undefined,
      items: cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    };
  }

  function persist(items) {
    localStorage.setItem("cartItems", JSON.stringify(items));
    setCartItems(items);
  }

  function increaseItem(productId) {
    const updated = cartItems.map((item) =>
      item.productId === productId
        ? { ...item, quantity: item.quantity + 1 }
        : item,
    );
    persist(updated);
  }

  function decreaseItem(productId) {
    const updated = cartItems
      .map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item,
      )
      .filter((item) => item.quantity > 0);
    persist(updated);
  }

  function removeItem(productId) {
    const updated = cartItems.filter((item) => item.productId !== productId);
    persist(updated);
  }

  function clearCart() {
    localStorage.removeItem("cartItems");
    setCartItems([]);
    toast.info("Carrinho esvaziado.");
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    if (name === "cep") {
      const normalizedCep = normalizeCepInput(value);
      const cepDigits = extractCepDigits(normalizedCep);

      if (cepDigits.length < 8) {
        lastCepLookupRef.current = "";
      }

      setEndereco((prev) => ({ ...prev, cep: normalizedCep }));
      return;
    }

    setEndereco((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const cepDigits = extractCepDigits(endereco.cep);

    if (!isDelivery || cepDigits.length !== 8) {
      return;
    }

    if (lastCepLookupRef.current === cepDigits) {
      return;
    }

    let cancelled = false;

    async function fillAddressFromCep() {
      try {
        setIsCepLookupLoading(true);
        const viaCepAddress = await fetchAddressByCep(cepDigits);

        if (cancelled) {
          return;
        }

        lastCepLookupRef.current = cepDigits;
        setEndereco((prev) => ({
          ...prev,
          cep: normalizeCepInput(prev.cep),
          logradouro: viaCepAddress.logradouro || prev.logradouro,
          bairro: viaCepAddress.bairro || prev.bairro,
          cidade: viaCepAddress.localidade || prev.cidade,
          estado: viaCepAddress.uf || prev.estado,
        }));
      } catch (error) {
        if (cancelled) {
          return;
        }

        lastCepLookupRef.current = cepDigits;
        toast.warning(
          error instanceof Error
            ? error.message
            : "Nao foi possivel preencher o endereco por CEP.",
        );
      } finally {
        if (!cancelled) {
          setIsCepLookupLoading(false);
        }
      }
    }

    fillAddressFromCep();

    return () => {
      cancelled = true;
    };
  }, [endereco.cep, isDelivery]);

  const handleCustomerPhoneChange = (event) => {
    setCustomerPhone(formatPhoneInput(event.target.value));
  };

  const handleCardPaymentDraftChange = (field, value) => {
    setCardPaymentDraft((prev) => ({
      ...prev,
      [field]:
        field === "lastFour"
          ? String(value || "")
              .replace(/\D/g, "")
              .slice(0, 4)
          : value,
    }));
  };

  const handleSelectSavedCard = (cardId) => {
    const selectedCard = findSavedCard(savedCards, cardId);

    if (!selectedCard) {
      return;
    }

    setSelectedSavedCardId(selectedCard.id);
    setCardPaymentDraft(sanitizeCardDraft(selectedCard));
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setShowCardFieldErrors(false);
  };

  const handleStartNewSavedCard = () => {
    setSelectedSavedCardId(null);
    setCardPaymentDraft(getEmptyCardDraft());
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setShowCardFieldErrors(false);
  };

  const handleSetDefaultSavedCard = (cardId) => {
    const selectedCard = findSavedCard(savedCards, cardId);

    if (!selectedCard) {
      return;
    }

    setDefaultSavedCardId(selectedCard.id);
    toast.success("Cartao padrao atualizado.");
  };

  const handleSaveCurrentCard = () => {
    setShowCardFieldErrors(true);
    const sanitizedDraft = sanitizeCardDraft(cardPaymentDraft);

    const validationError = validateCardCheckoutInput({
      cardDraft: sanitizedDraft,
      cardNumber,
      cardExpiry,
      cardCvv,
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    const normalizedHolder = sanitizedDraft.holderName.trim().toLowerCase();
    const normalizedBrand = sanitizedDraft.brand.trim().toLowerCase();

    const existingCard =
      findSavedCard(savedCards, selectedSavedCardId) ||
      savedCards.find(
        (card) =>
          card.lastFour === sanitizedDraft.lastFour &&
          card.holderName.trim().toLowerCase() === normalizedHolder &&
          card.brand.trim().toLowerCase() === normalizedBrand,
      ) ||
      null;

    const nextCard = {
      id: existingCard?.id || `${Date.now()}`,
      ...sanitizedDraft,
    };

    const nextCards = existingCard
      ? savedCards.map((card) =>
          card.id === existingCard.id ? nextCard : card,
        )
      : [...savedCards, nextCard];

    setSavedCards(nextCards);
    setSelectedSavedCardId(nextCard.id);
    setDefaultSavedCardId((prev) => prev || nextCard.id);
    setCardPaymentDraft(sanitizeCardDraft(nextCard));
    setShowCardFieldErrors(false);
    toast.success(existingCard ? "Cartao atualizado." : "Cartao salvo.");
  };

  const handleRemoveSavedCard = (cardId) => {
    const nextCards = savedCards.filter((card) => card.id !== cardId);
    const nextSelectedCardId = nextCards[0]?.id || null;
    const nextDefaultCardId =
      defaultSavedCardId === cardId
        ? nextCards[0]?.id || null
        : defaultSavedCardId;

    setSavedCards(nextCards);
    setSelectedSavedCardId(nextSelectedCardId);
    setDefaultSavedCardId(nextDefaultCardId);
    setCardPaymentDraft(
      nextSelectedCardId
        ? sanitizeCardDraft(findSavedCard(nextCards, nextSelectedCardId))
        : getEmptyCardDraft(),
    );
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setShowCardFieldErrors(false);
    toast.info("Cartao removido.");
  };

  const persistDeliveryAddress = useCallback(
    (address) => {
      const normalizedAddress = normalizeStoredAddress({
        rotulo: "Entrega recente",
        rua: address.logradouro,
        numero: address.numero,
        bairro: address.bairro,
        cidade: address.cidade,
        estado: address.estado,
        cep: address.cep,
        complemento: address.complemento,
        pontoReferencia: address.pontoReferencia,
      });

      const currentAddresses = readJsonStorage(ADDRESS_STORAGE_KEY, []);
      const addresses = Array.isArray(currentAddresses)
        ? currentAddresses.map(normalizeStoredAddress)
        : [];

      const addressSignature = getAddressSignature(address);
      const existingIndex = addresses.findIndex(
        (savedAddress) =>
          getAddressSignature({
            logradouro: savedAddress.rua,
            numero: savedAddress.numero,
            bairro: savedAddress.bairro,
            cidade: savedAddress.cidade,
            estado: savedAddress.estado,
            cep: savedAddress.cep,
            complemento: savedAddress.complemento,
            pontoReferencia: savedAddress.pontoReferencia,
          }) === addressSignature,
      );

      const nextAddress =
        existingIndex >= 0
          ? addresses[existingIndex]
          : {
              ...normalizedAddress,
              id: Date.now(),
            };

      const nextAddresses =
        existingIndex >= 0 ? addresses : [...addresses, nextAddress];

      localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(nextAddresses));
      localStorage.setItem(ADDRESS_SELECTED_KEY, String(nextAddress.id));

      const currentUser = storedUser || {};
      const nextUser = {
        ...currentUser,
        phone: String(customerPhone || "").trim() || currentUser.phone,
        address: nextAddress.rua,
        number: nextAddress.numero,
        district: nextAddress.bairro,
        city: nextAddress.cidade,
        state: nextAddress.estado,
        zipCode: nextAddress.cep,
        complement: mergeComplementAndReference(
          nextAddress.complemento,
          nextAddress.pontoReferencia,
        ),
        defaultAddressId: nextAddress.id,
        defaultAddressLabel: nextAddress.rotulo,
      };

      const token = localStorage.getItem("token");
      if (token) {
        login(nextUser, token);
      } else {
        localStorage.setItem("user", JSON.stringify(nextUser));
      }
    },
    [customerPhone, login, storedUser],
  );

  async function handleSubmitOrder() {
    if (isSubmitting || isConfirmed) {
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Seu carrinho está vazio.");
      return;
    }

    if (!restaurantId) {
      toast.error("Não foi possível identificar o restaurante do pedido.");
      return;
    }

    if (isDelivery) {
      const phoneDigits = String(customerPhone || "").replace(/\D/g, "");
      if (phoneDigits.length < 10 || phoneDigits.length > 13) {
        toast.error(
          "Informe um celular/WhatsApp válido para pedidos de delivery.",
        );
        return;
      }

      if (
        publicRestaurantSettings.minimumOrder > 0 &&
        subtotal < publicRestaurantSettings.minimumOrder
      ) {
        toast.error(
          `Pedido mínimo sobre o subtotal para delivery: ${formatCurrency(publicRestaurantSettings.minimumOrder)}. A taxa de entrega é cobrada à parte.`,
        );
        return;
      }

      const required = [
        endereco.logradouro,
        endereco.numero,
        endereco.bairro,
        endereco.cidade,
        endereco.estado,
      ];
      if (required.some((field) => !field)) {
        toast.error("Preencha os dados obrigatórios de entrega.");
        return;
      }
    }

    if (shouldUseCardCheckout) {
      setShowCardFieldErrors(true);
      const validationError = validateCardCheckoutInput({
        cardDraft: cardPaymentDraft,
        cardNumber,
        cardExpiry,
        cardCvv,
      });

      if (validationError) {
        toast.error(validationError);
        return;
      }
    }

    const startedAt = Date.now();

    try {
      setIsSubmitting(true);

      if (shouldUsePixCheckout) {
        const pixPayment = await ordersService.createPixPayment(
          buildOrderPayload({ paid: false }),
        );

        setIsDrawerOpen(false);
        setIsSubmitting(false);
        setPixPaymentData({
          orderId: Number(pixPayment?.orderId || 0) || null,
          total: Number(pixPayment?.totalAmount || total),
          paymentId: String(pixPayment?.paymentId || ""),
          provider: String(
            pixPayment?.provider ||
              publicRestaurantSettings.pixProvider ||
              "MERCADO_PAGO",
          )
            .trim()
            .toUpperCase(),
          pixCode: String(pixPayment?.qrCode || ""),
          qrCodeBase64: pixPayment?.qrCodeBase64 || null,
          requiresStatusCheck: Boolean(pixPayment?.requiresStatusCheck),
        });
        setIsPixPaymentPanelMinimized(false);
        setPendingPixOrderPayload(null);
        toast.info(DELIVERY_PAYMENT_REQUIRED_MESSAGE);
        return;
      }

      if (shouldUseCardCheckout) {
        const checkout = await ordersService.createCardCheckout({
          ...buildOrderPayload({ paid: false }),
          customerName: String(storedUser?.name || "Cliente"),
          customerCpf:
            String(storedUser?.cpf || "").replace(/\D/g, "") || undefined,
          successUrl: window.location.href,
          cancelUrl: window.location.href,
        });

        if (!checkout?.checkoutUrl) {
          throw new Error("Nao foi possivel iniciar o pagamento com cartao.");
        }

        window.location.href = String(checkout.checkoutUrl);
        return;
      }

      await ordersService.createOrder(buildOrderPayload({ paid: false }));

      if (
        isDelivery &&
        !isPayOnDelivery &&
        effectivePaymentMethod !== "DINHEIRO"
      ) {
        toast.info(DELIVERY_PAYMENT_REQUIRED_MESSAGE);
      }

      localStorage.removeItem("cartItems");
      if (isDelivery) {
        persistDeliveryAddress(endereco);
      }

      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_CONFIRMATION_DELAY_MS) {
        await new Promise((resolve) => {
          setTimeout(resolve, MIN_CONFIRMATION_DELAY_MS - elapsed);
        });
      }

      setIsSubmitting(false);
      setIsConfirmed(true);

      await new Promise((resolve) => {
        setTimeout(resolve, CONFIRMED_STATE_DELAY_MS);
      });

      setIsConfirmed(false);
      navigate(returnMenuPath, { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao enviar pedido");
      setIsSubmitting(false);
    }
  }

  async function handleCopyPixKey() {
    try {
      const pixCode = String(pixPaymentData?.pixCode || "").trim();

      if (!pixCode) {
        throw new Error("Código PIX indisponível para cópia.");
      }

      if (!navigator?.clipboard?.writeText) {
        throw new Error("Seu navegador não permite copiar automaticamente.");
      }

      await navigator.clipboard.writeText(pixCode);
      toast.success("Código PIX copiado!");
    } catch (error) {
      toast.error(error?.message || "Erro ao copiar código PIX");
    }
  }

  useEffect(() => {
    const shouldAutoConfirmPix =
      Boolean(pixPaymentData?.requiresStatusCheck) &&
      Boolean(pixPaymentData?.paymentId) &&
      Boolean(pixPaymentData?.orderId) &&
      String(pixPaymentData?.provider || "").trim().length > 0;

    if (!shouldAutoConfirmPix) {
      return undefined;
    }

    let cancelled = false;

    async function checkAndConfirmPixPayment() {
      try {
        await ordersService.confirmPixPayment({
          restaurantId,
          orderId: pixPaymentData.orderId,
          paymentId: pixPaymentData.paymentId,
        });

        if (cancelled) {
          return;
        }

        localStorage.removeItem("cartItems");
        if (isDelivery) {
          persistDeliveryAddress(endereco);
        }

        setPendingPixOrderPayload(null);
        setPixPaymentData(null);
        setIsPixPaymentPanelMinimized(false);
        setPaymentSuccessState({
          orderId: Number(pixPaymentData?.orderId || 0) || null,
          provider: String(pixPaymentData?.provider || "PIX")
            .trim()
            .toUpperCase(),
          title: "Fique tranquilo",
          message: "Este pedido ja foi pago.",
        });
      } catch (error) {
        const message = String(
          error?.response?.data?.error || error?.message || "",
        );

        if (
          message.includes("ainda nao foi aprovado") ||
          message.includes("ainda não foi aprovado")
        ) {
          return;
        }
        // Keep polling silently; the manual button remains available.
      }
    }

    const intervalId = window.setInterval(() => {
      void checkAndConfirmPixPayment();
    }, PIX_AUTO_STATUS_CHECK_INTERVAL_MS);

    void checkAndConfirmPixPayment();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    endereco,
    isDelivery,
    pixPaymentData,
    persistDeliveryAddress,
    restaurantId,
  ]);
  useEffect(() => {
    const token = localStorage.getItem("token");
    const normalizedOrderId = Number(pixPaymentData?.orderId || 0);

    if (
      !token ||
      !Number.isInteger(normalizedOrderId) ||
      normalizedOrderId <= 0
    ) {
      return undefined;
    }

    const socket = connectSocket(token, "cart-pix-realtime-confirmation");

    function handleRealtimePaymentConfirmed(payload) {
      const payloadOrderId = Number(payload?.orderId || 0);

      if (payloadOrderId !== normalizedOrderId) {
        return;
      }

      setPixPaymentData(null);
      setIsDrawerOpen(false);
      localStorage.removeItem("cartItems");
      setCartItems([]);
      setPaymentSuccessState({
        orderId: normalizedOrderId,
        provider: String(
          payload?.paymentMethod || pixPaymentData?.provider || "PIX",
        )
          .trim()
          .toUpperCase(),
        title: "Fique tranquilo",
        message: "Este pedido ja foi pago.",
      });
    }

    socket.on("payment-confirmed", handleRealtimePaymentConfirmed);
    socket.on("order:payment-confirmed", handleRealtimePaymentConfirmed);

    return () => {
      socket.off("payment-confirmed", handleRealtimePaymentConfirmed);
      socket.off("order:payment-confirmed", handleRealtimePaymentConfirmed);
      disconnectSocket();
    };
  }, [pixPaymentData]);

  if (activePaymentSuccessState) {
    const displayProvider =
      activePaymentSuccessState.provider === "MERCADO_PAGO"
        ? "Mercado Pago"
        : activePaymentSuccessState.provider === "CARTAO"
          ? "Cartao"
          : activePaymentSuccessState.provider;

    return (
      <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
        <S.HomeLayout>
          <S.PaymentSuccessWrap>
            <S.PaymentSuccessFrame>
              <S.PaymentSuccessCard>
                <S.PaymentSuccessIcon>
                  <CheckCircle size={46} strokeWidth={2.5} />
                </S.PaymentSuccessIcon>
                <S.PaymentSuccessTitle>
                  {activePaymentSuccessState.title}
                </S.PaymentSuccessTitle>
                <S.PaymentSuccessText>
                  {activePaymentSuccessState.message}
                </S.PaymentSuccessText>
                <S.PaymentSuccessMeta>
                  Pedido: {activePaymentSuccessState.orderId || "-"}
                  <div>Via: {displayProvider}</div>
                </S.PaymentSuccessMeta>
                <S.PaymentSuccessAction
                  type="button"
                  onClick={handleGoToOrderFromPaymentSuccess}
                >
                  VOLTAR PARA O PEDIDO
                </S.PaymentSuccessAction>
              </S.PaymentSuccessCard>
            </S.PaymentSuccessFrame>
          </S.PaymentSuccessWrap>
        </S.HomeLayout>
      </ThemeProvider>
    );
  }

  if (pixPaymentData && !isPixPaymentPanelMinimized) {
    return (
      <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
        <S.HomeLayout>
          <S.Navbar>
            <S.Brand>
              <ShoppingBag size={24} />
              <span>Pagamento via PIX</span>
            </S.Brand>
          </S.Navbar>

          <S.MenuSection>
            <Suspense fallback={null}>
              <PixPaymentPanel
                pixPaymentData={pixPaymentData}
                formatCurrency={formatCurrency}
                onCopyPixKey={handleCopyPixKey}
                onBackToCart={() => {
                  setIsPixPaymentPanelMinimized(true);
                  toast.info(
                    `PIX pendente do pedido #${pixPaymentData?.orderId || "-"}. Voce pode retomar o pagamento a qualquer momento.`,
                  );
                }}
              />
            </Suspense>
          </S.MenuSection>
        </S.HomeLayout>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
      <S.HomeLayout>
        <S.Navbar>
          <S.Brand>
            <ShoppingBag size={24} />
            <span>Seu Carrinho</span>
          </S.Brand>

          {isMesa && (
            <div
              style={{
                padding: "0.55rem 0.85rem",
                borderRadius: 999,
                background: "rgba(63, 100, 255, 0.14)",
                color: isDarkMode ? "#dbe5ff" : "#2f4bc5",
                border: `1px solid ${isDarkMode ? "rgba(126,151,255,0.34)" : "rgba(63,100,255,0.32)"}`,
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              Mesa {tableSession?.tableNumber || tableSession?.tableId}
            </div>
          )}
        </S.Navbar>

        <S.MenuSection>
          <button
            onClick={() => navigate(returnMenuPath)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              marginBottom: "1.5rem",
              color: isDarkMode ? "#88a2ff" : "#3f64ff",
              fontWeight: "600",
            }}
          >
            <ArrowLeft size={18} /> Voltar ao Cardápio
          </button>

          <S.CartSplitLayout>
            <S.CartItemsSection>
              <h3>Itens Selecionados</h3>
              {cartItems.length === 0 ? (
                <p style={{ opacity: 0.5 }}>Seu carrinho está vazio.</p>
              ) : (
                cartItems.map((item) => (
                  <S.ProductCard
                    key={item.productId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "1.25rem",
                      marginBottom: "1rem",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <h4 style={{ margin: "0 0 0.25rem 0" }}>{item.name}</h4>
                      <span
                        style={{
                          fontWeight: "700",
                          color: isDarkMode ? "#88a2ff" : "#3f64ff",
                        }}
                      >
                        R$ {item.price.toFixed(2)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1.5rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          background: "rgba(0,0,0,0.04)",
                          padding: "6px 12px",
                          borderRadius: "20px",
                        }}
                      >
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                          onClick={() => decreaseItem(item.productId)}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={{ fontWeight: "600" }}>
                          {item.quantity}
                        </span>
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                          onClick={() => increaseItem(item.productId)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        style={{
                          border: "none",
                          background: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                        }}
                        onClick={() => removeItem(item.productId)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </S.ProductCard>
                ))
              )}
            </S.CartItemsSection>

            <S.CartSummarySection>
              <S.ProductCard style={{ padding: "1.5rem" }}>
                <h3>Resumo dos Valores</h3>
                <hr style={{ opacity: 0.1, margin: "1rem 0" }} />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.75rem",
                  }}
                >
                  <span>Subtotal:</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "1.25rem",
                  }}
                >
                  <span>Taxa de Entrega:</span>
                  <span>R$ {taxaEntrega.toFixed(2)}</span>
                </div>

                {isDelivery && (
                  <div
                    style={{
                      marginBottom: "1.25rem",
                      padding: "0.75rem",
                      borderRadius: "10px",
                      border: hasMinimumOrderForDelivery
                        ? isMinimumOrderReached
                          ? "1px solid rgba(34, 197, 94, 0.45)"
                          : "1px solid rgba(239, 68, 68, 0.45)"
                        : "1px solid rgba(148, 163, 184, 0.4)",
                      background: hasMinimumOrderForDelivery
                        ? isMinimumOrderReached
                          ? "rgba(34, 197, 94, 0.12)"
                          : "rgba(239, 68, 68, 0.12)"
                        : "rgba(148, 163, 184, 0.08)",
                      fontSize: "0.9rem",
                      lineHeight: 1.45,
                      color: hasMinimumOrderForDelivery
                        ? isMinimumOrderReached
                          ? "#166534"
                          : "#991b1b"
                        : isDarkMode
                          ? "#e2e8f0"
                          : "#334155",
                    }}
                  >
                    {hasMinimumOrderForDelivery ? (
                      <div>
                        Pedido mínimo do delivery:{" "}
                        {formatCurrency(publicRestaurantSettings.minimumOrder)}
                        {minimumOrderShortfall > 0
                          ? ` (faltam ${formatCurrency(minimumOrderShortfall)} no subtotal)`
                          : " (mínimo atingido)"}
                      </div>
                    ) : (
                      <div>Sem pedido mínimo configurado para delivery.</div>
                    )}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: "800",
                    fontSize: "1.3rem",
                    marginBottom: "1.5rem",
                    borderTop: "1px dashed rgba(63, 100, 255, 0.34)",
                    paddingTop: "1rem",
                  }}
                >
                  <span>Total:</span>
                  <span style={{ color: isDarkMode ? "#88a2ff" : "#3f64ff" }}>
                    R$ {total.toFixed(2)}
                  </span>
                </div>

                <S.PrimaryButton
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setIsDrawerOpen(true)}
                >
                  Continuar para Entrega <ChevronRight size={20} />
                </S.PrimaryButton>

                <button
                  type="button"
                  onClick={clearCart}
                  disabled={cartItems.length === 0}
                  style={{
                    width: "100%",
                    marginTop: "0.75rem",
                    padding: "0.9rem 1rem",
                    borderRadius: "8px",
                    border: "1px solid #ef4444",
                    background: "transparent",
                    color: "#ef4444",
                    fontWeight: 700,
                    cursor: cartItems.length === 0 ? "not-allowed" : "pointer",
                    opacity: cartItems.length === 0 ? 0.5 : 1,
                  }}
                >
                  Esvaziar carrinho
                </button>
              </S.ProductCard>
            </S.CartSummarySection>
          </S.CartSplitLayout>
        </S.MenuSection>
        {pixPaymentData && isPixPaymentPanelMinimized ? (
          <div
            style={{
              marginBottom: "1rem",
              border: "1px solid #f59e0b66",
              background: "#fffbeb",
              color: "#92400e",
              borderRadius: 14,
              padding: "0.85rem 0.95rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.55rem",
            }}
          >
            <div style={{ display: "grid", gap: "0.15rem" }}>
              <strong style={{ fontSize: 14 }}>
                Voce tem um PIX pendente do pedido #
                {pixPaymentData?.orderId || "-"}
              </strong>
              <small style={{ fontSize: 12, fontWeight: 700 }}>
                O pedido so sera liberado apos a confirmacao do pagamento.
              </small>
            </div>
            <button
              type="button"
              onClick={() => setIsPixPaymentPanelMinimized(false)}
              style={{
                border: "1px solid #f59e0b",
                background: "#ffffff",
                color: "#92400e",
                borderRadius: 999,
                minHeight: 34,
                padding: "0 0.85rem",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Retomar pagamento PIX
            </button>
          </div>
        ) : null}

        {isDrawerOpen && (
          <S.DrawerOverlay onClick={() => setIsDrawerOpen(false)} />
        )}

        <S.DrawerContainer $isOpen={isDrawerOpen}>
          <S.DrawerHeader>
            <h3>Dados de Entrega & Pagamento</h3>
            <button onClick={() => setIsDrawerOpen(false)}>
              <X size={22} />
            </button>
          </S.DrawerHeader>

          <S.DrawerContent>
            {!isMesa && (
              <div style={{ marginBottom: "1.5rem" }}>
                <h4
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  Tipo do Pedido
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.75rem",
                  }}
                >
                  <button
                    type="button"
                    style={{
                      padding: "1rem",
                      borderRadius: "8px",
                      border:
                        orderType === "DELIVERY"
                          ? "2px solid #3f64ff"
                          : "1px solid #c9d3e8",
                      background: "transparent",
                      fontWeight: "600",
                      cursor: "pointer",
                      color: "inherit",
                    }}
                    onClick={() => setOrderType("DELIVERY")}
                  >
                    Delivery
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: "1rem",
                      borderRadius: "8px",
                      border:
                        orderType === "RETIRADA"
                          ? "2px solid #3f64ff"
                          : "1px solid #c9d3e8",
                      background: "transparent",
                      fontWeight: "600",
                      cursor: "pointer",
                      color: "inherit",
                    }}
                    onClick={() => setOrderType("RETIRADA")}
                  >
                    Retirada
                  </button>
                </div>
              </div>
            )}

            {isDelivery && (
              <div style={{ marginBottom: "2rem" }}>
                <h4
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <MapPin size={18} /> Endereço de Entrega
                </h4>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <input
                    type="text"
                    name="cep"
                    placeholder="CEP"
                    value={endereco.cep}
                    onChange={handleInputChange}
                  />
                  <input
                    type="text"
                    name="customerPhone"
                    placeholder="Celular/WhatsApp para confirmação (Ex: (85) 99999-9999)"
                    value={customerPhone}
                    onChange={handleCustomerPhoneChange}
                    required
                  />
                  {isCepLookupLoading && (
                    <small
                      style={{
                        marginTop: "-0.25rem",
                        color: isDarkMode ? "#cbd5e1" : "#475569",
                        display: "block",
                      }}
                    >
                      Buscando endereco pelo CEP...
                    </small>
                  )}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "3fr 1fr",
                      gap: "0.75rem",
                    }}
                  >
                    <input
                      type="text"
                      name="logradouro"
                      placeholder="Endereço"
                      value={endereco.logradouro}
                      onChange={handleInputChange}
                    />
                    <input
                      type="text"
                      name="numero"
                      placeholder="Nº"
                      value={endereco.numero}
                      onChange={handleInputChange}
                    />
                  </div>
                  <input
                    type="text"
                    name="bairro"
                    placeholder="Bairro"
                    value={endereco.bairro}
                    onChange={handleInputChange}
                  />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr",
                      gap: "0.75rem",
                    }}
                  >
                    <input
                      type="text"
                      name="cidade"
                      placeholder="Cidade"
                      value={endereco.cidade}
                      onChange={handleInputChange}
                    />
                    <input
                      type="text"
                      name="estado"
                      placeholder="UF"
                      value={endereco.estado}
                      onChange={handleInputChange}
                      maxLength={2}
                    />
                  </div>
                  <input
                    type="text"
                    name="complemento"
                    placeholder="Complemento (opcional)"
                    value={endereco.complemento}
                    onChange={handleInputChange}
                  />
                  <input
                    type="text"
                    name="pontoReferencia"
                    placeholder="Ponto de referência (opcional)"
                    value={endereco.pontoReferencia}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: "2rem" }}>
              <h4
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                <CreditCard size={18} /> Forma de Pagamento
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isDelivery ? "1fr 1fr 1fr" : "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <button
                  type="button"
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    border:
                      !isPayOnDelivery && paymentMethod === "PIX"
                        ? "2px solid #3f64ff"
                        : "1px solid #c9d3e8",
                    background: "transparent",
                    fontWeight: "600",
                    cursor: "pointer",
                    color: "inherit",
                  }}
                  onClick={() => {
                    setIsPayOnDelivery(false);
                    setPaymentMethod("PIX");
                  }}
                >
                  Pix
                </button>
                <button
                  type="button"
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    border:
                      !isPayOnDelivery && paymentMethod === "CARTAO"
                        ? "2px solid #3f64ff"
                        : "1px solid #c9d3e8",
                    background: "transparent",
                    cursor: "pointer",
                    color: "inherit",
                  }}
                  onClick={() => {
                    setIsPayOnDelivery(false);
                    setPaymentMethod("CARTAO");
                  }}
                >
                  Cartão
                </button>
                {isDelivery ? (
                  <button
                    type="button"
                    style={{
                      padding: "1rem",
                      borderRadius: "8px",
                      border: isPayOnDelivery
                        ? "2px solid #3f64ff"
                        : "1px solid #c9d3e8",
                      background: "transparent",
                      fontWeight: "600",
                      cursor: "pointer",
                      color: "inherit",
                    }}
                    onClick={() => {
                      setIsPayOnDelivery(true);
                    }}
                  >
                    Pagar na entrega
                  </button>
                ) : null}
              </div>

              {isDelivery && isPayOnDelivery ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: "0.5rem",
                    marginTop: "0.75rem",
                  }}
                >
                  {[
                    { value: "PIX", label: "PIX" },
                    { value: "CARTAO", label: "Cartão" },
                    { value: "DINHEIRO", label: "Dinheiro" },
                  ].map((option) => {
                    const isActive = payOnDeliveryMethod === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPayOnDeliveryMethod(option.value)}
                        style={{
                          minHeight: 48,
                          borderRadius: "10px",
                          border: isActive
                            ? "2px solid #3f64ff"
                            : "1px solid #c9d3e8",
                          background: isActive
                            ? "rgba(63, 100, 255, 0.08)"
                            : "transparent",
                          color: "inherit",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {shouldUseCardCheckout ? (
                <div
                  style={{
                    marginTop: "1rem",
                    display: "grid",
                    gap: "0.75rem",
                  }}
                >
                  <S.CardVisualPreview>
                    <S.CardVisualTop>
                      <S.CardChip />
                      <S.CardBrandLogo
                        src={getCardBrandLogo(cardPreviewBrandSource)}
                        alt={`Bandeira ${cardPreviewBrandLabel}`}
                        style={getCardBrandLogoStyle(
                          cardPreviewBrandSource,
                          "preview",
                        )}
                      />
                    </S.CardVisualTop>
                    <S.CardVisualNumber>{cardPreviewDigits}</S.CardVisualNumber>
                    <S.CardVisualFooter>
                      <div className="left">
                        <small>CVC</small>
                        <strong>{cardPreviewCvv}</strong>
                      </div>
                      <div className="right">
                        <small>Nome no cartao</small>
                        <strong>{cardPreviewHolder}</strong>
                      </div>
                    </S.CardVisualFooter>
                  </S.CardVisualPreview>

                  {savedCards.length > 0 ? (
                    <div
                      style={{
                        display: "grid",
                        gap: "0.5rem",
                      }}
                    >
                      <label
                        htmlFor="saved-card-select"
                        style={{ fontSize: 13, fontWeight: 700 }}
                      >
                        Escolher cartao salvo
                      </label>
                      <select
                        id="saved-card-select"
                        value={selectedSavedCardId || ""}
                        onChange={(event) =>
                          event.target.value
                            ? handleSelectSavedCard(event.target.value)
                            : handleStartNewSavedCard()
                        }
                        style={{
                          width: "100%",
                          minHeight: 48,
                          borderRadius: 12,
                          padding: "0.75rem 0.9rem",
                          border: "1px solid #c9d3e8",
                          background: isDarkMode ? "#1f2937" : "#ffffff",
                          color: "inherit",
                          fontWeight: 700,
                        }}
                      >
                        <option value="">Novo cartao</option>
                        {savedCards.map((card) => (
                          <option key={card.id} value={card.id}>
                            {`${card.brand} final ${card.lastFour} - ${card.holderName}`}
                          </option>
                        ))}
                      </select>
                      <strong style={{ fontSize: 14 }}>Cartoes salvos</strong>
                      {savedCards.map((card) => {
                        const isSelected = selectedSavedCardId === card.id;
                        const isDefault = defaultSavedCardId === card.id;

                        return (
                          <div
                            key={card.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr auto auto",
                              gap: "0.5rem",
                              alignItems: "center",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectSavedCard(card.id)}
                              style={{
                                textAlign: "left",
                                padding: "0.95rem 1rem",
                                borderRadius: 16,
                                border: isSelected
                                  ? "2px solid #3f64ff"
                                  : "1px solid #c9d3e8",
                                ...getCardBrandPalette(card.brand),
                                boxShadow: isSelected
                                  ? "0 14px 30px rgba(63, 100, 255, 0.2)"
                                  : "0 10px 24px rgba(15, 23, 42, 0.10)",
                                cursor: "pointer",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: "0.75rem",
                                  alignItems: "center",
                                  marginBottom: "0.6rem",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.45rem",
                                  }}
                                >
                                  <img
                                    src={getCardBrandLogo(card.brand)}
                                    alt={`Bandeira ${card.brand}`}
                                    style={getCardBrandLogoStyle(card.brand)}
                                  />
                                  <strong>{card.brand.toUpperCase()}</strong>
                                </div>
                                <span style={{ fontSize: 11, opacity: 0.9 }}>
                                  {isDefault
                                    ? "PADRAO"
                                    : isSelected
                                      ? "EM USO"
                                      : "SALVO"}
                                </span>
                              </div>
                              <div style={{ fontSize: 18, fontWeight: 800 }}>
                                •••• •••• •••• {card.lastFour}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  opacity: 0.88,
                                  marginTop: "0.5rem",
                                }}
                              >
                                {card.holderName}
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetDefaultSavedCard(card.id)}
                              style={{
                                borderRadius: 10,
                                border: isDefault
                                  ? "1px solid rgba(34, 197, 94, 0.35)"
                                  : "1px solid rgba(148, 163, 184, 0.35)",
                                background: isDefault
                                  ? "rgba(34, 197, 94, 0.1)"
                                  : "transparent",
                                color: isDefault ? "#166534" : "inherit",
                                padding: "0.7rem 0.85rem",
                                cursor: "pointer",
                                fontWeight: 700,
                              }}
                            >
                              {isDefault ? "Padrao" : "Definir padrao"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSavedCard(card.id)}
                              style={{
                                borderRadius: 10,
                                border: "1px solid rgba(239, 68, 68, 0.35)",
                                background: "rgba(239, 68, 68, 0.1)",
                                color: "#991b1b",
                                padding: "0.7rem 0.85rem",
                                cursor: "pointer",
                              }}
                            >
                              Remover
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  <input
                    type="text"
                    placeholder="Nome do titular"
                    value={cardPaymentDraft.holderName}
                    style={resolveCardFieldStyle(
                      Boolean(cardFieldErrors.holderName),
                      String(cardPaymentDraft.holderName || "").trim().length >=
                        3,
                    )}
                    onChange={(event) =>
                      handleCardPaymentDraftChange(
                        "holderName",
                        event.target.value,
                      )
                    }
                  />
                  {cardFieldErrors.holderName ? (
                    <small style={cardErrorTextStyle}>
                      {cardFieldErrors.holderName}
                    </small>
                  ) : null}
                  <S.CardDraftRow>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Numero do cartao"
                      value={cardNumber}
                      style={resolveCardFieldStyle(
                        Boolean(cardFieldErrors.cardNumber),
                        String(cardNumber || "").trim().length >= 13,
                      )}
                      onChange={(event) =>
                        setCardNumber(
                          normalizeCardNumberInput(event.target.value),
                        )
                      }
                    />
                    <select
                      value={cardPaymentDraft.brand}
                      onChange={(event) =>
                        handleCardPaymentDraftChange(
                          "brand",
                          event.target.value,
                        )
                      }
                      style={{
                        width: "100%",
                        minHeight: 48,
                        borderRadius: 12,
                        padding: "0.75rem 0.9rem",
                        border: cardFieldErrors.brand
                          ? "1px solid #ef4444"
                          : showCardFieldErrors &&
                              shouldUseCardCheckout &&
                              String(cardPaymentDraft.brand || "").trim()
                                .length > 0
                            ? "1px solid #22c55e"
                            : "1px solid #c9d3e8",
                        background: isDarkMode ? "#1f2937" : "#ffffff",
                        color: "inherit",
                        fontWeight: 700,
                        boxShadow: cardFieldErrors.brand
                          ? "0 0 0 1px rgba(239, 68, 68, 0.18)"
                          : showCardFieldErrors &&
                              shouldUseCardCheckout &&
                              String(cardPaymentDraft.brand || "").trim()
                                .length > 0
                            ? "0 0 0 1px rgba(34, 197, 94, 0.2)"
                            : "none",
                      }}
                    >
                      <option value="">Selecione a bandeira</option>
                      {CARD_BRAND_OPTIONS.map((brand) => (
                        <option key={brand} value={brand}>
                          {getCardBrandDisplay(brand).label}
                        </option>
                      ))}
                    </select>
                  </S.CardDraftRow>
                  {cardFieldErrors.cardNumber ? (
                    <small style={cardErrorTextStyle}>
                      {cardFieldErrors.cardNumber}
                    </small>
                  ) : null}
                  {cardFieldErrors.brand ? (
                    <small style={cardErrorTextStyle}>
                      {cardFieldErrors.brand}
                    </small>
                  ) : null}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: "0.5rem",
                    }}
                  >
                    {CARD_BRAND_OPTIONS.map((brand) => {
                      const isActive = cardPaymentDraft.brand === brand;

                      return (
                        <button
                          key={brand}
                          type="button"
                          onClick={() =>
                            handleCardPaymentDraftChange("brand", brand)
                          }
                          style={{
                            minHeight: 58,
                            borderRadius: 12,
                            border: isActive
                              ? "2px solid #3f64ff"
                              : cardFieldErrors.brand
                                ? "1px solid #ef4444"
                                : "1px solid #c9d3e8",
                            background: isActive
                              ? "rgba(63, 100, 255, 0.12)"
                              : "transparent",
                            color: "inherit",
                            cursor: "pointer",
                            display: "grid",
                            justifyItems: "center",
                            alignContent: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <img
                            src={getCardBrandLogo(brand)}
                            alt={`Bandeira ${brand}`}
                            style={getCardBrandLogoStyle(brand)}
                          />
                          <span style={{ fontSize: 11, fontWeight: 700 }}>
                            {getCardBrandDisplay(brand).label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <S.CardLastRow>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Final 1234"
                      value={cardPaymentDraft.lastFour}
                      style={resolveCardFieldStyle(
                        Boolean(cardFieldErrors.lastFour),
                        String(cardPaymentDraft.lastFour || "").replace(
                          /\D/g,
                          "",
                        ).length === 4,
                      )}
                      onChange={(event) =>
                        handleCardPaymentDraftChange(
                          "lastFour",
                          event.target.value,
                        )
                      }
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM/AA"
                      value={cardExpiry}
                      style={resolveCardFieldStyle(
                        Boolean(cardFieldErrors.cardExpiry),
                        String(cardExpiry || "").trim().length === 5,
                      )}
                      onChange={(event) =>
                        setCardExpiry(
                          normalizeCardExpiryInput(event.target.value),
                        )
                      }
                    />
                    <input
                      type="password"
                      inputMode="numeric"
                      placeholder={
                        expectedCardCvvLength === 4 ? "CVV (4)" : "CVV"
                      }
                      value={cardCvv}
                      maxLength={expectedCardCvvLength}
                      style={resolveCardFieldStyle(
                        Boolean(cardFieldErrors.cardCvv),
                        new RegExp(`^\\d{${expectedCardCvvLength}}$`).test(
                          String(cardCvv || "")
                            .replace(/\D/g, "")
                            .slice(0, expectedCardCvvLength),
                        ),
                      )}
                      onChange={(event) =>
                        setCardCvv(
                          String(event.target.value || "")
                            .replace(/\D/g, "")
                            .slice(0, expectedCardCvvLength),
                        )
                      }
                    />
                  </S.CardLastRow>
                  {cardFieldErrors.lastFour ? (
                    <small style={cardErrorTextStyle}>
                      {cardFieldErrors.lastFour}
                    </small>
                  ) : null}
                  {cardFieldErrors.cardExpiry ? (
                    <small style={cardErrorTextStyle}>
                      {cardFieldErrors.cardExpiry}
                    </small>
                  ) : null}
                  {cardFieldErrors.cardCvv ? (
                    <small style={cardErrorTextStyle}>
                      {cardFieldErrors.cardCvv}
                    </small>
                  ) : null}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleSaveCurrentCard}
                      style={{
                        padding: "0.8rem 1rem",
                        borderRadius: 10,
                        border: "1px solid rgba(34, 197, 94, 0.35)",
                        background: "rgba(34, 197, 94, 0.12)",
                        color: "#166534",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      {selectedSavedCardId
                        ? "Atualizar cartao"
                        : "Salvar cartao"}
                    </button>
                    <button
                      type="button"
                      onClick={handleStartNewSavedCard}
                      style={{
                        padding: "0.8rem 1rem",
                        borderRadius: 10,
                        border: "1px solid #c9d3e8",
                        background: "transparent",
                        color: "inherit",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      Novo cartao
                    </button>
                  </div>
                  <small
                    style={{
                      color: isDarkMode ? "#a8b4d3" : "#475569",
                      lineHeight: 1.45,
                    }}
                  >
                    Por seguranca, este aparelho salva apenas titular, bandeira
                    e os 4 ultimos digitos do cartao. Numero completo e CVV nao
                    sao armazenados; o CVV vale apenas para esta compra.
                  </small>
                </div>
              ) : null}
            </div>

            <div
              style={{
                background: "rgba(0,0,0,0.03)",
                padding: "1rem",
                borderRadius: "12px",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  marginBottom: "0.9rem",
                  paddingBottom: "0.7rem",
                  borderBottom: `1px dashed ${isDarkMode ? "rgba(148,163,184,0.35)" : "rgba(71,85,105,0.25)"}`,
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: isDarkMode ? "#cbd5e1" : "#334155",
                    marginBottom: "0.45rem",
                  }}
                >
                  Resumo da entrega e pagamento
                </div>
                <div
                  style={{
                    display: "grid",
                    gap: "0.25rem",
                    fontSize: "0.9rem",
                    color: isDarkMode ? "#e2e8f0" : "#0f172a",
                  }}
                >
                  <div>
                    <strong>Tipo:</strong>{" "}
                    {isMesa
                      ? "Mesa"
                      : orderType === "DELIVERY"
                        ? "Delivery"
                        : "Retirada"}
                  </div>
                  <div>
                    <strong>Pagamento:</strong>{" "}
                    {isPayOnDelivery
                      ? `Pagar na entrega (${effectivePaymentMethod === "CARTAO" ? "Cartao" : effectivePaymentMethod})`
                      : paymentMethod === "PIX"
                        ? "PIX"
                        : paymentMethod === "CARTAO"
                          ? "Cartao"
                          : "Dinheiro"}
                  </div>
                  {isDelivery && customerPhone ? (
                    <div>
                      <strong>Contato:</strong> {customerPhone}
                    </div>
                  ) : null}
                  {isDelivery ? (
                    <div>
                      <strong>Endereco:</strong>{" "}
                      {[endereco.logradouro, endereco.numero, endereco.bairro]
                        .filter(Boolean)
                        .join(", ") || "Preencha para concluir"}
                    </div>
                  ) : null}
                </div>
              </div>

              {isDelivery && (
                <div
                  style={{
                    marginBottom: "0.75rem",
                    fontSize: "0.86rem",
                    lineHeight: 1.45,
                    color: hasMinimumOrderForDelivery
                      ? isMinimumOrderReached
                        ? "#166534"
                        : "#991b1b"
                      : isDarkMode
                        ? "#a8b4d3"
                        : "#334155",
                    border: hasMinimumOrderForDelivery
                      ? isMinimumOrderReached
                        ? "1px solid rgba(34, 197, 94, 0.45)"
                        : "1px solid rgba(239, 68, 68, 0.45)"
                      : "1px solid rgba(148, 163, 184, 0.35)",
                    background: hasMinimumOrderForDelivery
                      ? isMinimumOrderReached
                        ? "rgba(34, 197, 94, 0.1)"
                        : "rgba(239, 68, 68, 0.1)"
                      : "rgba(148, 163, 184, 0.08)",
                    borderRadius: "10px",
                    padding: "0.65rem 0.75rem",
                  }}
                >
                  <div>
                    Taxa de entrega aplicada: {formatCurrency(taxaEntrega)}
                  </div>
                  {hasMinimumOrderForDelivery ? (
                    <div>
                      Mínimo do delivery:{" "}
                      {formatCurrency(publicRestaurantSettings.minimumOrder)}
                      {minimumOrderShortfall > 0
                        ? ` (faltam ${formatCurrency(minimumOrderShortfall)} no subtotal)`
                        : " (mínimo atingido)"}
                    </div>
                  ) : (
                    <div>Sem pedido mínimo configurado.</div>
                  )}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "700",
                }}
              >
                <span>Total a pagar:</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <S.PrimaryButton
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "1rem",
                background: isConfirmed
                  ? "linear-gradient(135deg, #0f172a, #1d4ed8)"
                  : isBlockedByMinimumOrder
                    ? "#9ca3af"
                    : undefined,
                color: isConfirmed ? "#ffffff" : undefined,
                border: isConfirmed
                  ? "1px solid rgba(148, 163, 184, 0.32)"
                  : undefined,
                boxShadow: isConfirmed
                  ? "0 14px 28px rgba(29, 78, 216, 0.32)"
                  : undefined,
                letterSpacing: isConfirmed ? "0.01em" : undefined,
              }}
              $loading={isSubmitting && !isConfirmed}
              disabled={isSubmitting || isConfirmed || isBlockedByMinimumOrder}
              aria-busy={isSubmitting}
              onClick={handleSubmitOrder}
            >
              {isConfirmed ? (
                <>
                  <CheckCircle size={18} /> Confirmado
                </>
              ) : isSubmitting ? (
                <>
                  <S.LoadingFill />
                  <S.LoadingSpinner />
                  Confirmando pedido...
                </>
              ) : isBlockedByMinimumOrder ? (
                <>
                  <CheckCircle size={18} /> Atinga o mínimo para continuar
                </>
              ) : (
                <>
                  <CheckCircle size={18} /> Confirmar e Fazer Pedido
                </>
              )}
            </S.PrimaryButton>
          </S.DrawerContent>
        </S.DrawerContainer>
      </S.HomeLayout>
    </ThemeProvider>
  );
}
