import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ShoppingBag,
  House,
  AtSign,
  Search,
  Menu,
  Grid2x2,
  Square,
  ChevronUp,
  Star,
  Check,
} from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import menuService from "../../Services/menuService";
import ordersService from "../../Services/ordersService";
import tableSessionService from "../../Services/tableSessionService";
import restaurantSettingsService from "../../Services/restaurantSettingsService";
import {
  connectTableSessionSocket,
  disconnectTableSessionSocket,
} from "../../Services/socketService";
import {
  buildCardPaymentSummary,
  findSavedCard,
  getCardCheckoutFieldErrors,
  getEmptyCardDraft,
  normalizeCardExpiryInput,
  persistCardWallet,
  readCardWallet,
  sanitizeCardDraft,
  validateCardCheckoutInput,
} from "../../config/cardPaymentWallet";
import {
  MAX_RATING_STARS,
  formatCpfInput,
  normalizeInstagramUrl,
  readTableSession,
  resolveProductImage,
  toInt,
  toPrice,
  toRatingLabel,
} from "./helpers";
import useProductRatings from "./useProductRatings";
import * as S from "./styles";

const ProductDetailModal = lazy(
  () => import("./components/ProductDetailModal"),
);
const OrderDrawer = lazy(() => import("./components/OrderDrawer"));
const PixPaymentPanel = lazy(
  () => import("../Cart/components/PixPaymentPanel"),
);

const MENU_RESTAURANT_KEY = "menuRestaurantId";
const MESA_ORDERS_KEY = "@PecaJaFood:mesaOrders";
const MIN_CONFIRMATION_DELAY_MS = 5000;
const CONFIRMED_STATE_DELAY_MS = 2000;
const PRODUCT_DETAIL_CLOSE_MS = 240;
const PIX_AUTO_STATUS_CHECK_INTERVAL_MS = 4000;
const ALLOWED_PAYMENT_METHODS = new Set(["PIX", "CARTAO", "DINHEIRO"]);

function parseLastMesaOrder(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const id = Number(raw.id || 0);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return {
    id,
    status: String(raw.status || "PENDENTE").toUpperCase(),
    total: Number(raw.total || 0),
    paymentMethod: String(raw.paymentMethod || "PIX").toUpperCase(),
    paid: Boolean(raw.paid),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    customerName: String(raw.customerName || ""),
    tableId: Number(raw.tableId || 0) || null,
    restaurantId: Number(raw.restaurantId || 0) || null,
  };
}

function parseStoredMesaOrders(raw) {
  if (!raw) {
    return [];
  }

  const items = Array.isArray(raw) ? raw : [raw];

  return items
    .map((item) => parseLastMesaOrder(item))
    .filter((item) => Boolean(item));
}

function normalizeRealtimeOrderUpdate(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const id = Number(payload.id || payload.orderId || 0);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return {
    id,
    status: String(payload.status || "PENDENTE").toUpperCase(),
    total: Number(payload.total || 0),
    paymentMethod: String(payload.paymentMethod || "PIX").toUpperCase(),
    paid: Boolean(payload.paid),
    createdAt: String(payload.createdAt || new Date().toISOString()),
    customerName: String(payload?.user?.name || payload.customerName || ""),
    tableId: Number(payload.tableId || payload?.table?.id || 0) || null,
    tableNumber:
      Number(payload.tableNumber || payload?.table?.number || 0) || null,
    restaurantId: Number(payload.restaurantId || 0) || null,
  };
}

function isDeliveredStatus(status) {
  return (
    String(status || "")
      .trim()
      .toUpperCase() === "ENTREGUE"
  );
}

function parseStockValue(rawStock) {
  if (rawStock === null || rawStock === undefined || rawStock === "") {
    return null;
  }

  return typeof rawStock === "string"
    ? Number(rawStock.replace(",", "."))
    : Number(rawStock);
}

function isProductUnavailable(product) {
  if (!product) {
    return true;
  }

  if (product.active === false) {
    return true;
  }

  const stockValue = parseStockValue(product.stock);

  return Number.isFinite(stockValue) && stockValue <= 0;
}

function toStoredOrderShape(payload, fallback = null) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const id = Number(payload.id || payload.orderId || fallback?.id || 0);

  if (!Number.isInteger(id) || id <= 0) {
    return fallback;
  }

  return {
    id,
    status: String(
      payload.status || fallback?.status || "PENDENTE",
    ).toUpperCase(),
    total: Number(payload.total || fallback?.total || 0),
    paymentMethod: String(
      payload.paymentMethod || fallback?.paymentMethod || "PIX",
    ).toUpperCase(),
    paid:
      typeof payload.paid === "boolean"
        ? payload.paid
        : Boolean(fallback?.paid),
    createdAt: String(
      payload.createdAt || fallback?.createdAt || new Date().toISOString(),
    ),
    customerName: String(
      payload?.user?.name ||
        payload.customerName ||
        fallback?.customerName ||
        "",
    ),
    tableId:
      Number(payload.tableId || payload?.table?.id || fallback?.tableId || 0) ||
      null,
    tableNumber:
      Number(
        payload.tableNumber ||
          payload?.table?.number ||
          fallback?.tableNumber ||
          0,
      ) || null,
    restaurantId:
      Number(payload.restaurantId || fallback?.restaurantId || 0) || null,
  };
}

function getApiErrorMessage(error, fallbackMessage) {
  const responseData = error?.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  if (responseData?.error && String(responseData.error).trim()) {
    return String(responseData.error);
  }

  if (responseData?.message && String(responseData.message).trim()) {
    return String(responseData.message);
  }

  if (Array.isArray(responseData?.issues) && responseData.issues.length > 0) {
    const firstIssue = responseData.issues[0];
    if (firstIssue?.message) {
      return String(firstIssue.message);
    }
  }

  if (error?.message && String(error.message).trim()) {
    return String(error.message);
  }

  return fallbackMessage;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function DigitalMenu() {
  const navigate = useNavigate();
  const { tableNumber: tableNumberParam } = useParams();
  const [searchParams] = useSearchParams();
  const previewPaymentSuccess =
    String(searchParams.get("preview") || "")
      .trim()
      .toLowerCase() === "payment-success";
  const initialCardWallet = useMemo(() => readCardWallet(), []);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState("pedido");
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [paymentTiming, setPaymentTiming] = useState<"NOW" | "LATER">("LATER");
  const [observation, setObservation] = useState("");
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
  const [submitting, setSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [pixPaymentData, setPixPaymentData] = useState(null);
  const [isSubmittingPixConfirmation, setIsSubmittingPixConfirmation] =
    useState(false);
  const [paymentSuccessState, setPaymentSuccessState] = useState<{
    orderId: number | null;
    provider: string;
    title: string;
    message: string;
  } | null>(null);
  const [tablePin, setTablePin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isPinValidating, setIsPinValidating] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isClosingProductDetail, setIsClosingProductDetail] = useState(false);
  const [mesaOrders, setMesaOrders] = useState([]);
  const [addedProductMap, setAddedProductMap] = useState({});
  const [restaurantProfile, setRestaurantProfile] = useState({
    name: "Restaurante",
    logo: "",
    coverImage: "",
    instagram: "",
  });
  const [tableSession, setTableSession] = useState(() => readTableSession());
  const pinRequestKeyRef = useRef("");
  const sessionClosedToastShownRef = useRef(false);
  const closeProductDetailTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  function clearMesaSession(showToast = true) {
    localStorage.removeItem("tableSession");
    localStorage.removeItem("tableSessionToken");
    setTableSession(null);
    setDrawerOpen(false);
    setDrawerStep("pedido");

    if (showToast && !sessionClosedToastShownRef.current) {
      toast.info(
        "Mesa encerrada pela equipe. Solicite um novo PIN para continuar.",
      );
      sessionClosedToastShownRef.current = true;
    }
  }

  const routeTableNumber = toInt(tableNumberParam);
  const routeTableId =
    toInt(searchParams.get("tableId")) ||
    toInt(searchParams.get("tid")) ||
    routeTableNumber;
  const routeRestaurantId =
    toInt(searchParams.get("restaurantId")) ||
    toInt(searchParams.get("rid")) ||
    toInt(searchParams.get("restauranteId"));

  const tableNumber =
    routeTableNumber ||
    toInt(tableSession?.tableNumber) ||
    toInt(tableSession?.tableId);
  const isMesaContext = Boolean(routeTableId || tableNumber);
  const mesaSessionIsActive = Boolean(
    isMesaContext &&
    tableSession?.sessionToken &&
    Number(tableSession?.tableId) === Number(routeTableId) &&
    (!routeRestaurantId ||
      Number(tableSession?.restaurantId) === Number(routeRestaurantId)),
  );
  const restaurantId = !isMesaContext
    ? null
    : Number(tableSession?.restaurantId || 0) || routeRestaurantId || null;

  const {
    ratingHover,
    isRatingSubmitting,
    getProductRating,
    handleRateProduct,
    setRatingHover,
  } = useProductRatings({
    restaurantId,
    tableSession,
  });

  useEffect(() => {
    if (!mesaSessionIsActive || !restaurantId) {
      return;
    }

    let mounted = true;

    async function loadProducts() {
      try {
        setLoadingProducts(true);
        localStorage.setItem(MENU_RESTAURANT_KEY, String(restaurantId));
        const data = await menuService.listProducts(restaurantId);

        if (!mounted) {
          return;
        }

        setProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        const message =
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Erro ao carregar cardápio";
        toast.error(message);
      } finally {
        if (mounted) {
          setLoadingProducts(false);
        }
      }
    }

    loadProducts();

    return () => {
      mounted = false;
    };
  }, [mesaSessionIsActive, restaurantId]);

  useEffect(() => {
    const cardCheckoutStatus = String(
      searchParams.get("cardCheckoutStatus") || "",
    ).trim();

    if (!cardCheckoutStatus) {
      return;
    }

    if (cardCheckoutStatus === "success") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCart([]);
      setDrawerOpen(true);
      setDrawerStep("fluxo");
      toast.success(
        "Pagamento do cartao concluido. Aguardando confirmacao final do pedido.",
      );
      return;
    }

    if (cardCheckoutStatus === "cancel") {
      toast.info(
        "Pagamento com cartao cancelado. Seu pedido continuou no carrinho.",
      );
      setDrawerOpen(true);
      setDrawerStep("finalizar");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!restaurantId) {
      return;
    }

    let mounted = true;

    async function loadRestaurantProfile() {
      try {
        const settings =
          await restaurantSettingsService.getPublicSettings(restaurantId);

        if (!mounted) {
          return;
        }

        const fallbackImage = products[0]
          ? resolveProductImage(products[0], 0)
          : "";

        setRestaurantProfile({
          name: settings?.restaurant?.name || "Restaurante",
          logo: settings?.restaurant?.logo || fallbackImage,
          coverImage: settings?.restaurant?.coverImage || fallbackImage,
          instagram: normalizeInstagramUrl(settings?.instagram),
        });
      } catch {
        if (!mounted) {
          return;
        }

        const fallbackImage = products[0]
          ? resolveProductImage(products[0], 0)
          : "";

        setRestaurantProfile((prev) => ({
          ...prev,
          logo: prev.logo || fallbackImage,
          coverImage: prev.coverImage || fallbackImage,
        }));
      }
    }

    loadRestaurantProfile();

    return () => {
      mounted = false;
    };
  }, [restaurantId, products]);

  useEffect(() => {
    if (!isMesaContext) {
      return;
    }

    const sameTable = Number(tableSession?.tableId) === Number(routeTableId);
    const sameRestaurant =
      !routeRestaurantId ||
      Number(tableSession?.restaurantId) === Number(routeRestaurantId);

    if (!sameTable || !sameRestaurant) {
      localStorage.removeItem("tableSession");
      localStorage.removeItem("tableSessionToken");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTableSession(null);
    }
  }, [
    isMesaContext,
    routeTableId,
    routeRestaurantId,
    tableSession?.tableId,
    tableSession?.restaurantId,
  ]);

  useEffect(() => {
    const stored = localStorage.getItem(MESA_ORDERS_KEY);

    if (!stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMesaOrders([]);
      return;
    }

    try {
      const parsedOrders = parseStoredMesaOrders(JSON.parse(stored));
      const filteredOrders = parsedOrders.filter((order) => {
        if (
          routeTableId &&
          Number(order.tableId || 0) !== Number(routeTableId)
        ) {
          return false;
        }

        if (
          routeRestaurantId &&
          Number(order.restaurantId || 0) !== Number(routeRestaurantId)
        ) {
          return false;
        }

        return !isDeliveredStatus(order.status);
      });

      setMesaOrders(filteredOrders);

      if (filteredOrders.length === 0) {
        localStorage.removeItem(MESA_ORDERS_KEY);
        return;
      }

      localStorage.setItem(MESA_ORDERS_KEY, JSON.stringify(filteredOrders));
    } catch {
      setMesaOrders([]);
    }
  }, [routeTableId, routeRestaurantId]);

  useEffect(() => {
    if (!isMesaContext || mesaSessionIsActive || !routeTableId) {
      return;
    }

    const requestKey = `${Number(routeTableId)}:${Number(routeRestaurantId || 0)}`;

    if (pinRequestKeyRef.current === requestKey) {
      return;
    }

    pinRequestKeyRef.current = requestKey;

    async function requestPinAssistance() {
      try {
        await tableSessionService.requestPinAssistance(routeTableId);
        toast.info(
          `Avisamos a equipe da Mesa ${tableNumber || routeTableId} para informar o PIN.`,
        );
      } catch {
        // O cliente ainda pode digitar o PIN manualmente se já tiver recebido.
      }
    }

    requestPinAssistance();
  }, [
    isMesaContext,
    mesaSessionIsActive,
    routeTableId,
    routeRestaurantId,
    tableNumber,
  ]);

  useEffect(() => {
    if (!mesaSessionIsActive) {
      sessionClosedToastShownRef.current = false;
      return;
    }

    let mounted = true;

    async function validateCurrentSession() {
      try {
        await tableSessionService.getCurrentSession();
      } catch (error) {
        const status = Number(error?.response?.status || 0);
        const isSessionClosed = status === 403 || status === 404;

        if (!mounted || !isSessionClosed) {
          return;
        }

        clearMesaSession(true);
      }
    }

    validateCurrentSession();
    const intervalId = setInterval(validateCurrentSession, 7000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [mesaSessionIsActive]);

  useEffect(() => {
    if (!mesaSessionIsActive || !tableSession?.sessionToken) {
      disconnectTableSessionSocket();
      return;
    }

    const socket = connectTableSessionSocket(
      tableSession.sessionToken,
      "digital-menu",
    );

    if (!socket) {
      return;
    }

    const onSessionClosed = () => {
      clearMesaSession(true);
    };

    const applyLatestOrderUpdate = (payload) => {
      setMesaOrders((prev) => {
        const normalizedPayload =
          normalizeRealtimeOrderUpdate(payload) || payload;
        const fallback =
          prev.find(
            (order) =>
              Number(order?.id || 0) ===
              Number(normalizedPayload?.id || normalizedPayload?.orderId || 0),
          ) || null;
        const nextOrder = toStoredOrderShape(normalizedPayload, fallback);

        if (!nextOrder) {
          return prev;
        }

        const tableCandidates = new Set(
          [
            Number(routeTableId || 0),
            Number(routeTableNumber || 0),
            Number(tableSession?.tableId || 0),
            Number(tableSession?.tableNumber || 0),
          ].filter((value) => Number.isInteger(value) && value > 0),
        );
        const nextTableId = Number(nextOrder.tableId || 0);
        const nextTableNumber = Number(nextOrder.tableNumber || 0);
        const isSameTableById =
          nextTableId > 0 && tableCandidates.has(nextTableId);
        const isSameTableByNumber =
          nextTableNumber > 0 && tableCandidates.has(nextTableNumber);
        const isSameTable = isSameTableById || isSameTableByNumber;

        if (!isSameTable) {
          return prev;
        }

        const existingIndex = prev.findIndex(
          (order) => Number(order?.id || 0) === Number(nextOrder.id),
        );
        const existingOrder = existingIndex >= 0 ? prev[existingIndex] : null;
        const merged = {
          ...(existingOrder || {}),
          ...nextOrder,
          total:
            Number(nextOrder.total || 0) > 0
              ? Number(nextOrder.total)
              : Number(existingOrder?.total || 0),
          createdAt: nextOrder.createdAt || existingOrder?.createdAt,
          customerName:
            nextOrder.customerName || existingOrder?.customerName || "",
        };

        const nextOrders =
          existingIndex >= 0
            ? prev.map((order, index) =>
                index === existingIndex ? merged : order,
              )
            : [merged, ...prev];

        const activeOrders = nextOrders.filter(
          (order) => !isDeliveredStatus(order.status),
        );

        if (activeOrders.length === 0) {
          localStorage.removeItem(MESA_ORDERS_KEY);
          return [];
        }

        localStorage.setItem(MESA_ORDERS_KEY, JSON.stringify(activeOrders));

        return activeOrders;
      });
    };

    const onOrderStatusChanged = (payload) => {
      applyLatestOrderUpdate(payload);
    };

    const onOrderPaymentConfirmed = (payload) => {
      const payloadOrderId = Number(payload?.orderId || 0);

      if (!Number.isInteger(payloadOrderId) || payloadOrderId <= 0) {
        return;
      }

      setMesaOrders((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) {
          return prev;
        }

        const nextOrders = prev.map((order) => {
          if (Number(order?.id || 0) !== payloadOrderId) {
            return order;
          }

          return {
            ...order,
            paid: true,
            paymentMethod: String(
              payload?.paymentMethod || order?.paymentMethod || "PIX",
            ).toUpperCase(),
          };
        });

        localStorage.setItem(MESA_ORDERS_KEY, JSON.stringify(nextOrders));

        return nextOrders;
      });
    };

    socket.on("table:session-closed", onSessionClosed);
    socket.on("order:status-changed", onOrderStatusChanged);
    socket.on("order:payment-confirmed", onOrderPaymentConfirmed);

    return () => {
      socket.off("table:session-closed", onSessionClosed);
      socket.off("order:status-changed", onOrderStatusChanged);
      socket.off("order:payment-confirmed", onOrderPaymentConfirmed);
      disconnectTableSessionSocket();
    };
  }, [
    mesaSessionIsActive,
    routeTableId,
    routeTableNumber,
    tableSession?.sessionToken,
    tableSession?.tableId,
    tableSession?.tableNumber,
  ]);

  useEffect(() => {
    if (!mesaSessionIsActive || !tableSession?.sessionToken) {
      return;
    }

    let cancelled = false;

    const syncCurrentTableOrder = async () => {
      try {
        const order = await ordersService.getCurrentTableOrder();

        if (cancelled || !order) {
          return;
        }

        const nextOrder = toStoredOrderShape(order);

        if (!nextOrder) {
          return;
        }

        setMesaOrders((prev) => {
          const existingIndex = prev.findIndex(
            (order) => Number(order?.id || 0) === Number(nextOrder.id),
          );
          const existingOrder = existingIndex >= 0 ? prev[existingIndex] : null;
          const merged = {
            ...(existingOrder || {}),
            ...nextOrder,
          };
          const nextOrders =
            existingIndex >= 0
              ? prev.map((order, index) =>
                  index === existingIndex ? merged : order,
                )
              : [merged, ...prev];
          const activeOrders = nextOrders.filter(
            (order) => !isDeliveredStatus(order.status),
          );

          if (activeOrders.length === 0) {
            localStorage.removeItem(MESA_ORDERS_KEY);
            return [];
          }

          localStorage.setItem(MESA_ORDERS_KEY, JSON.stringify(activeOrders));
          return activeOrders;
        });
      } catch {
        // O fallback por polling nao deve interromper a experiencia se falhar.
      }
    };

    syncCurrentTableOrder();
    const intervalId = setInterval(syncCurrentTableOrder, 4000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [mesaSessionIsActive, tableSession?.sessionToken]);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 480);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (closeProductDetailTimeoutRef.current) {
        clearTimeout(closeProductDetailTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    persistCardWallet(savedCards, selectedSavedCardId, defaultSavedCardId);
  }, [savedCards, selectedSavedCardId, defaultSavedCardId]);

  useEffect(() => {
    if (
      String(paymentMethod || "")
        .trim()
        .toUpperCase() === "CARTAO"
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPaymentTiming("NOW");
    }
  }, [paymentMethod]);

  const cardFieldErrors = useMemo(() => {
    if (!showCardFieldErrors || paymentMethod !== "CARTAO") {
      return {};
    }

    const selectedCard = findSavedCard(savedCards, selectedSavedCardId);

    return getCardCheckoutFieldErrors({
      cardDraft: selectedCard || cardPaymentDraft,
      cardNumber,
      cardExpiry,
      cardCvv,
    });
  }, [
    showCardFieldErrors,
    paymentMethod,
    savedCards,
    selectedSavedCardId,
    cardPaymentDraft,
    cardNumber,
    cardExpiry,
    cardCvv,
  ]);

  async function handleCopyPixKey() {
    try {
      const pixCode = String(pixPaymentData?.pixCode || "").trim();

      if (!pixCode) {
        throw new Error("Codigo PIX indisponivel para copia.");
      }

      if (!navigator?.clipboard?.writeText) {
        throw new Error("Seu navegador nao permite copiar automaticamente.");
      }

      await navigator.clipboard.writeText(pixCode);
      toast.success("Codigo PIX copiado!");
    } catch (error) {
      toast.error(error?.message || "Erro ao copiar codigo PIX");
    }
  }

  const handleConfirmPixPaymentAndCreateOrder = useCallback(async () => {
    if (!pixPaymentData || isSubmittingPixConfirmation) {
      return;
    }

    const normalizedPaymentId = String(pixPaymentData?.paymentId || "").trim();
    const normalizedOrderId = Number(pixPaymentData?.orderId || 0);

    if (!normalizedPaymentId || !normalizedOrderId || !restaurantId) {
      toast.error("Dados de pagamento PIX incompletos.");
      return;
    }

    try {
      setIsSubmittingPixConfirmation(true);
      await ordersService.confirmPixPayment({
        orderId: normalizedOrderId,
        paymentId: normalizedPaymentId,
        restaurantId,
      });

      setMesaOrders((prev) =>
        prev.map((order) =>
          Number(order?.id || 0) === normalizedOrderId
            ? {
                ...order,
                paid: true,
                paymentMethod: "PIX",
              }
            : order,
        ),
      );

      setPixPaymentData(null);
      setDrawerOpen(false);
      setCart([]);
      setObservation("");
      setPaymentSuccessState({
        orderId: normalizedOrderId,
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

      toast.error(getApiErrorMessage(error, "Erro ao confirmar pagamento PIX"));
    } finally {
      setIsSubmittingPixConfirmation(false);
    }
  }, [isSubmittingPixConfirmation, pixPaymentData, restaurantId]);

  useEffect(() => {
    const provider = String(pixPaymentData?.provider || "").toUpperCase();
    const shouldAutoPollMercadoPago =
      provider === "MERCADO_PAGO" &&
      Boolean(pixPaymentData?.paymentId) &&
      Boolean(pixPaymentData?.orderId) &&
      !isSubmittingPixConfirmation;

    if (!shouldAutoPollMercadoPago) {
      return undefined;
    }

    let cancelled = false;

    async function checkAndConfirmPixPayment() {
      if (cancelled || !restaurantId) {
        return;
      }

      try {
        const status = await ordersService.getPixPaymentStatus({
          paymentId: String(pixPaymentData.paymentId || "").trim(),
          restaurantId,
        });
        const normalizedStatus = String(status?.status || "")
          .trim()
          .toLowerCase();

        if (!["approved", "accredited", "paid"].includes(normalizedStatus)) {
          return;
        }

        await handleConfirmPixPaymentAndCreateOrder();
      } catch {
        // Mantem polling silencioso ate o provedor aprovar.
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
    handleConfirmPixPaymentAndCreateOrder,
    isSubmittingPixConfirmation,
    pixPaymentData,
    restaurantId,
  ]);

  const categories = useMemo(() => {
    const categoryMap = new Map();

    products.forEach((item, index) => {
      const categoryName = String(item?.category?.name || "").trim();

      if (!categoryName) {
        return;
      }

      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          id: categoryName,
          label: categoryName,
          coverImage: resolveProductImage(item, index),
        });
      }
    });

    return [
      {
        id: "all",
        label: "Categorias",
        coverImage: products[0] ? resolveProductImage(products[0], 0) : "",
      },
      ...Array.from(categoryMap.values()),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") {
      return products;
    }

    return products.filter((item) => item?.category?.name === activeCategory);
  }, [products, activeCategory]);

  const groupedProducts = useMemo(() => {
    const source = activeCategory === "all" ? products : filteredProducts;

    return source.reduce<Record<string, (typeof source)[number][]>>(
      (acc, product) => {
        const categoryName = String(product?.category?.name || "Outros").trim();
        const key = categoryName || "Outros";

        if (!acc[key]) {
          acc[key] = [];
        }

        acc[key].push(product);
        return acc;
      },
      {},
    );
  }, [activeCategory, products, filteredProducts]);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    );
  }, [cart]);

  const cartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
  }, [cart]);

  async function handleValidateTablePin(event) {
    event.preventDefault();

    if (!routeTableId) {
      toast.error("QR da mesa inválido. Escaneie novamente.");
      return;
    }

    if (!tablePin.trim()) {
      toast.error("Digite o PIN da mesa.");
      return;
    }

    try {
      setIsPinValidating(true);
      setPinError("");

      const result = await tableSessionService.validatePin({
        tableId: routeTableId,
        pin: tablePin.trim(),
      });

      const nextSession = {
        sessionToken: result.sessionToken,
        sessionId: result.sessionId,
        tableId: Number(result.tableId || routeTableId),
        tableNumber: Number(result.tableNumber || tableNumber || routeTableId),
        restaurantId:
          Number(result.restaurantId || routeRestaurantId || 0) || null,
      };

      localStorage.setItem("tableSession", JSON.stringify(nextSession));
      localStorage.setItem("tableSessionToken", result.sessionToken);
      setTableSession(nextSession);
      setTablePin("");
      toast.success(`Mesa ${nextSession.tableNumber} liberada!`);
    } catch (error) {
      const message =
        error?.response?.data?.error || error?.message || "Erro ao validar PIN";
      setPinError(message);
      toast.error(message);
    } finally {
      setIsPinValidating(false);
    }
  }

  function markProductAsAdded(productId) {
    const key = String(productId);

    setAddedProductMap((prev) => ({
      ...prev,
      [key]: true,
    }));

    window.setTimeout(() => {
      setAddedProductMap((prev) => {
        if (!prev[key]) {
          return prev;
        }

        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 1150);
  }

  function addToCart(product) {
    if (isProductUnavailable(product)) {
      toast.error(
        `Produto indisponivel no momento: ${product?.name || "Item"}`,
      );
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);

      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.price || 0),
          quantity: 1,
        },
      ];
    });
  }

  function updateQuantity(productId, delta) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  async function handleFinishOrder() {
    if (submitting || isConfirmed) {
      return;
    }

    if (!mesaSessionIsActive || !tableSession?.tableId || !restaurantId) {
      toast.error("Valide o PIN da mesa para continuar.");
      return;
    }

    if (cart.length === 0) {
      toast.error("Adicione produtos antes de finalizar.");
      return;
    }

    if (loadingProducts) {
      toast.error("Aguarde o cardápio carregar para finalizar o pedido.");
      return;
    }

    const trimmedName = customerName.trim();
    const cpfDigits = customerCpf.replace(/\D/g, "");
    const normalizedPaymentMethod = String(paymentMethod || "")
      .trim()
      .toUpperCase();
    const normalizedPaymentTiming = String(paymentTiming || "LATER")
      .trim()
      .toUpperCase();

    if (!ALLOWED_PAYMENT_METHODS.has(normalizedPaymentMethod)) {
      toast.error("Selecione uma forma de pagamento válida.");
      return;
    }

    if (!["NOW", "LATER"].includes(normalizedPaymentTiming)) {
      toast.error("Selecione quando deseja pagar o pedido.");
      return;
    }

    if (trimmedName.length < 2) {
      toast.error("Digite seu nome para concluir o pedido.");
      return;
    }

    if (cpfDigits.length !== 11) {
      toast.error("Digite um CPF válido com 11 dígitos.");
      return;
    }

    const selectedCard =
      normalizedPaymentMethod === "CARTAO"
        ? findSavedCard(savedCards, selectedSavedCardId)
        : null;

    if (normalizedPaymentMethod === "CARTAO" && !selectedCard) {
      toast.error(
        "Para pagar com cartao, cadastre e selecione um cartao antes de finalizar o pedido.",
      );
      return;
    }

    if (normalizedPaymentMethod === "CARTAO") {
      setShowCardFieldErrors(true);
      const validationError = validateCardCheckoutInput({
        cardDraft: selectedCard || cardPaymentDraft,
        cardNumber,
        cardExpiry,
        cardCvv,
      });

      if (validationError) {
        toast.error(validationError);
        return;
      }
    }

    for (const item of cart) {
      const product = products.find(
        (current) => Number(current?.id) === Number(item.productId),
      );

      if (!product) {
        toast.error(`Produto indisponível no cardápio: ${item.name}`);
        return;
      }

      if (isProductUnavailable(product)) {
        toast.error(`Produto indisponível no cardápio: ${product.name}`);
        return;
      }

      const quantity = Number(item.quantity || 0);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        toast.error(`Quantidade inválida para ${product.name}.`);
        return;
      }

      const stockValue = parseStockValue(product.stock);

      if (
        Number.isFinite(stockValue) &&
        stockValue >= 0 &&
        quantity > stockValue
      ) {
        toast.error(
          `Estoque insuficiente para ${product.name}. Disponível: ${stockValue}.`,
        );
        return;
      }
    }

    const startedAt = Date.now();

    try {
      setSubmitting(true);

      try {
        await tableSessionService.getCurrentSession();
      } catch (sessionError) {
        const status = Number(sessionError?.response?.status || 0);

        if (status === 401 || status === 403 || status === 404) {
          clearMesaSession(false);
          throw new Error(
            "Sessao da mesa expirada. Solicite um novo PIN para continuar.",
            { cause: sessionError },
          );
        }

        throw sessionError;
      }

      const cardPaymentSummary =
        normalizedPaymentMethod === "CARTAO" && selectedCard
          ? buildCardPaymentSummary(selectedCard)
          : normalizedPaymentMethod === "CARTAO"
            ? buildCardPaymentSummary(cardPaymentDraft)
            : "";

      if (
        normalizedPaymentMethod === "PIX" &&
        normalizedPaymentTiming === "NOW"
      ) {
        const pixPayment = await ordersService.createPixPayment({
          restaurantId,
          type: "MESA",
          tableId: Number(tableSession.tableId),
          paymentMethod: normalizedPaymentMethod,
          customerName: trimmedName,
          customerCpf: cpfDigits,
          observation: observation.trim() || undefined,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        });

        const nextOrder = {
          id: Number(pixPayment?.orderId || 0),
          status: "PENDENTE",
          total: Number(pixPayment?.totalAmount || cartTotal || 0),
          paymentMethod: "PIX",
          paid: false,
          createdAt: new Date().toISOString(),
          customerName: trimmedName,
          tableId: Number(tableSession.tableId || 0),
          restaurantId: Number(restaurantId || 0),
        };

        if (nextOrder.id > 0) {
          setMesaOrders((prev) => {
            const nextOrders = [
              nextOrder,
              ...prev.filter(
                (order) => Number(order?.id || 0) !== Number(nextOrder.id),
              ),
            ].filter((order) => !isDeliveredStatus(order.status));

            localStorage.setItem(MESA_ORDERS_KEY, JSON.stringify(nextOrders));
            return nextOrders;
          });
        }

        setDrawerOpen(false);
        setSubmitting(false);
        setPixPaymentData({
          orderId: Number(pixPayment?.orderId || 0) || null,
          total: Number(pixPayment?.totalAmount || cartTotal || 0),
          paymentId: String(pixPayment?.paymentId || ""),
          provider: String(pixPayment?.provider || "MERCADO_PAGO")
            .trim()
            .toUpperCase(),
          pixCode: String(pixPayment?.qrCode || ""),
          qrCodeBase64: pixPayment?.qrCodeBase64 || null,
          requiresStatusCheck: Boolean(pixPayment?.requiresStatusCheck),
        });
        toast.info(
          "Pagamento PIX iniciado. Assim que aprovar, seu pedido sera marcado como pago automaticamente.",
        );
        return;
      }

      const createdOrder = await ordersService.createOrder({
        restaurantId,
        type: "MESA",
        tableId: Number(tableSession.tableId),
        paymentMethod: normalizedPaymentMethod,
        paid: normalizedPaymentMethod === "CARTAO",
        customerName: trimmedName,
        customerCpf: cpfDigits,
        observation:
          [observation.trim(), cardPaymentSummary]
            .filter(Boolean)
            .join(" | ") || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      const nextOrder = {
        id: Number(createdOrder?.id || 0),
        status: String(createdOrder?.status || "PENDENTE").toUpperCase(),
        total: Number(createdOrder?.total || cartTotal || 0),
        paymentMethod: String(
          createdOrder?.paymentMethod || normalizedPaymentMethod || "PIX",
        ).toUpperCase(),
        paid: Boolean(createdOrder?.paid),
        createdAt: String(createdOrder?.createdAt || new Date().toISOString()),
        customerName: trimmedName,
        tableId: Number(createdOrder?.tableId || tableSession.tableId || 0),
        restaurantId: Number(createdOrder?.restaurantId || restaurantId || 0),
      };

      setMesaOrders((prev) => {
        const nextOrders = [
          nextOrder,
          ...prev.filter(
            (order) => Number(order?.id || 0) !== Number(nextOrder.id),
          ),
        ].filter((order) => !isDeliveredStatus(order.status));

        if (nextOrders.length === 0) {
          localStorage.removeItem(MESA_ORDERS_KEY);
          return [];
        }

        localStorage.setItem(MESA_ORDERS_KEY, JSON.stringify(nextOrders));
        return nextOrders;
      });

      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_CONFIRMATION_DELAY_MS) {
        await new Promise((resolve) => {
          setTimeout(resolve, MIN_CONFIRMATION_DELAY_MS - elapsed);
        });
      }

      setSubmitting(false);
      setIsConfirmed(true);

      await new Promise((resolve) => {
        setTimeout(resolve, CONFIRMED_STATE_DELAY_MS);
      });

      setIsConfirmed(false);
      setCart([]);
      setCustomerName("");
      setCustomerCpf("");
      setObservation("");
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");
      setShowCardFieldErrors(false);
      setPaymentTiming("LATER");

      if (normalizedPaymentMethod === "CARTAO" && Boolean(nextOrder.paid)) {
        setDrawerOpen(false);
        setPaymentSuccessState({
          orderId: Number(nextOrder.id || 0) || null,
          provider: "CARTAO",
          title: "Fique tranquilo",
          message: "Este pedido ja foi pago.",
        });
        return;
      }

      setDrawerOpen(true);
      setDrawerStep("fluxo");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Erro ao finalizar pedido"));
      setIsConfirmed(false);
      setSubmitting(false);
    }
  }

  function handleScrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCardPaymentDraftChange(field, value) {
    setCardPaymentDraft((prev) => ({
      ...prev,
      [field]:
        field === "lastFour"
          ? String(value || "")
              .replace(/\D/g, "")
              .slice(0, 4)
          : value,
    }));
  }

  function handleSelectSavedCard(cardId) {
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
  }

  function handleStartNewSavedCard() {
    setSelectedSavedCardId(null);
    setCardPaymentDraft(getEmptyCardDraft());
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setShowCardFieldErrors(false);
  }

  function handleSetDefaultSavedCard(cardId) {
    const selectedCard = findSavedCard(savedCards, cardId);

    if (!selectedCard) {
      return;
    }

    setDefaultSavedCardId(selectedCard.id);
    toast.success("Cartao padrao atualizado.");
  }

  function handleSaveCurrentCard() {
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
  }

  function handleRemoveSavedCard(cardId) {
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
  }

  function handleOpenProductDetail(product) {
    setIsClosingProductDetail(false);
    setRatingHover(0);
    setSelectedProduct(product);
  }

  function handleCloseProductDetail() {
    if (isClosingProductDetail) {
      return;
    }

    if (closeProductDetailTimeoutRef.current) {
      clearTimeout(closeProductDetailTimeoutRef.current);
    }

    setIsClosingProductDetail(true);
    setRatingHover(0);

    closeProductDetailTimeoutRef.current = setTimeout(() => {
      setSelectedProduct(null);
      setIsClosingProductDetail(false);
      closeProductDetailTimeoutRef.current = null;
    }, PRODUCT_DETAIL_CLOSE_MS);
  }

  function handleGoToOrderFlow() {
    const targetTableNumber =
      toInt(tableNumberParam) ||
      routeTableId ||
      toInt(tableSession?.tableNumber) ||
      toInt(tableSession?.tableId);
    const currentReturnTo = `${window.location.pathname}${window.location.search}`;
    const cartReturnQuery = `?from=menu&returnTo=${encodeURIComponent(currentReturnTo)}`;

    if (previewPaymentSuccess) {
      if (targetTableNumber) {
        navigate(`/mesa/${targetTableNumber}`);
      } else {
        navigate(`/cart${cartReturnQuery}`);
      }

      return;
    }

    setPaymentSuccessState(null);
    setDrawerOpen(true);
    setDrawerStep("fluxo");
  }

  const activePaymentSuccessState =
    paymentSuccessState ||
    (previewPaymentSuccess
      ? {
          orderId: Number(searchParams.get("orderId") || 1024) || 1024,
          provider: String(searchParams.get("provider") || "PIX")
            .trim()
            .toUpperCase(),
          title: "Fique tranquilo",
          message: "Este pedido ja foi pago.",
        }
      : null);

  if (activePaymentSuccessState) {
    const displayProvider =
      activePaymentSuccessState.provider === "MERCADO_PAGO"
        ? "Mercado Pago"
        : activePaymentSuccessState.provider === "CARTAO"
          ? "Cartao"
          : activePaymentSuccessState.provider;

    return (
      <>
        <S.GlobalMenuStyle />
        <S.PaymentSuccessWrap>
          <S.PaymentSuccessFrame>
            <S.PaymentSuccessCard>
              <S.PaymentSuccessIconRing>
                <Check size={46} strokeWidth={2.5} />
              </S.PaymentSuccessIconRing>
              <S.PaymentSuccessTitle>
                {activePaymentSuccessState.title}
              </S.PaymentSuccessTitle>
              <S.PaymentSuccessText>
                {activePaymentSuccessState.message}
              </S.PaymentSuccessText>
              <S.PaymentSuccessMeta>
                Loja: {restaurantProfile.name}
                <br />
                Pedido: {activePaymentSuccessState.orderId || "-"}
                <br />
                Via: {displayProvider}
              </S.PaymentSuccessMeta>
              <S.PaymentSuccessAction
                type="button"
                onClick={handleGoToOrderFlow}
              >
                IR PARA O PEDIDO
              </S.PaymentSuccessAction>
            </S.PaymentSuccessCard>
          </S.PaymentSuccessFrame>
        </S.PaymentSuccessWrap>
      </>
    );
  }

  if (pixPaymentData) {
    return (
      <>
        <S.GlobalMenuStyle />
        <S.Page>
          <Suspense fallback={null}>
            <PixPaymentPanel
              pixPaymentData={pixPaymentData}
              formatCurrency={formatCurrency}
              onCopyPixKey={handleCopyPixKey}
            />
          </Suspense>
        </S.Page>
      </>
    );
  }

  return (
    <>
      <S.GlobalMenuStyle />

      <S.Page>
        {!isMesaContext ? (
          <S.PinGateWrap>
            <S.PinGateCard>
              <h1>Acesso exclusivo por QR da mesa</h1>
              <p>
                Este cardapio digital funciona apenas para pedidos na mesa.
                Escaneie o QR da mesa para continuar.
              </p>
            </S.PinGateCard>
          </S.PinGateWrap>
        ) : !mesaSessionIsActive ? (
          <S.PinGateWrap>
            <S.PinGateCard>
              <S.PinPreviewHeader>
                <S.PinPreviewCover $image={restaurantProfile.coverImage} />

                <S.PinPreviewIdentity>
                  <S.PinPreviewLogoWrap>
                    <S.PinPreviewLogoImage $image={restaurantProfile.logo} />
                  </S.PinPreviewLogoWrap>

                  <div>
                    <strong>{restaurantProfile.name}</strong>
                    <span>Acesso da mesa por PIN</span>
                  </div>
                </S.PinPreviewIdentity>
              </S.PinPreviewHeader>

              <S.TableCallout>
                Mesa <strong>{tableNumber || routeTableId}</strong>
              </S.TableCallout>
              <h1>Bem-vindo ao cardapio da mesa</h1>
              <p>
                Digite o PIN de 4 digitos informado pelo garcom para liberar o
                pedido desta mesa.
              </p>

              <form onSubmit={handleValidateTablePin}>
                <S.PinInput
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="PIN da mesa"
                  value={tablePin}
                  onChange={(event) =>
                    setTablePin(
                      event.target.value.replace(/\D/g, "").slice(0, 4),
                    )
                  }
                />

                {pinError ? <S.PinError>{pinError}</S.PinError> : null}

                <S.PinSubmitButton type="submit" disabled={isPinValidating}>
                  {isPinValidating ? "Validando..." : "Liberar cardapio"}
                </S.PinSubmitButton>
              </form>
            </S.PinGateCard>
          </S.PinGateWrap>
        ) : (
          <>
            <S.ProfileHeaderSection>
              <S.ProfileCover $image={restaurantProfile.coverImage} />

              <S.ProfileInfoCard>
                <S.ProfileLogoWrap>
                  <S.ProfileLogoImage $image={restaurantProfile.logo} />
                </S.ProfileLogoWrap>

                <S.ProfileIdentity>
                  <h1>{restaurantProfile.name}</h1>
                  {tableNumber ? (
                    <S.TableNumberBadge>
                      Mesa <strong>{tableNumber}</strong>
                    </S.TableNumberBadge>
                  ) : null}
                  <S.ProfileActionsRow>
                    <button type="button" aria-label="Inicio">
                      <House size={22} />
                    </button>

                    {restaurantProfile.instagram ? (
                      <a
                        href={restaurantProfile.instagram}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Instagram"
                      >
                        <AtSign size={22} />
                      </a>
                    ) : (
                      <button type="button" aria-label="Instagram">
                        <AtSign size={22} />
                      </button>
                    )}

                    <button type="button" aria-label="Buscar">
                      <Search size={22} />
                    </button>
                  </S.ProfileActionsRow>

                  <S.ProfileRateText>Avaliar ★</S.ProfileRateText>
                </S.ProfileIdentity>
              </S.ProfileInfoCard>
            </S.ProfileHeaderSection>

            <S.MobileTopBar>
              <S.MobileBrand>
                <strong>{restaurantProfile.name}</strong>
                {tableNumber ? (
                  <S.MobileTableNumberBadge>
                    Mesa <strong>{tableNumber}</strong>
                  </S.MobileTableNumberBadge>
                ) : null}
              </S.MobileBrand>

              <S.MobileActions>
                <button type="button" aria-label="Lista">
                  <Menu size={18} />
                </button>
                <button type="button" aria-label="Grade">
                  <Grid2x2 size={18} />
                </button>
                <button type="button" aria-label="Blocos">
                  <Square size={18} />
                </button>
              </S.MobileActions>
            </S.MobileTopBar>

            {restaurantId ? (
              <S.CategoryCircleRail>
                {categories.map((category) => (
                  <S.CategoryCircleButton
                    type="button"
                    key={category.id}
                    $active={activeCategory === category.id}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    <S.CategoryCircleThumb $image={category.coverImage} />
                    <span>{category.label}</span>
                  </S.CategoryCircleButton>
                ))}
              </S.CategoryCircleRail>
            ) : null}

            <S.Section>
              {!restaurantId ? (
                <S.EmptyHint>
                  Não foi possível identificar o restaurante desta mesa.
                </S.EmptyHint>
              ) : loadingProducts ? (
                <S.EmptyHint>Carregando produtos...</S.EmptyHint>
              ) : filteredProducts.length === 0 ? (
                <S.EmptyHint>
                  Nenhum produto encontrado nesta categoria no momento.
                </S.EmptyHint>
              ) : (
                Object.entries(groupedProducts).map(
                  ([groupName, groupItems]) => (
                    <S.MenuCategoryBlock key={groupName}>
                      <S.MenuCategoryHeader>{groupName}</S.MenuCategoryHeader>

                      <S.MenuList>
                        {groupItems.map((product, index) => {
                          const rating = getProductRating(product.id);
                          const isAdded = Boolean(
                            addedProductMap[String(product.id)],
                          );
                          const isUnavailable = isProductUnavailable(product);

                          return (
                            <S.MenuItemCard
                              key={product.id}
                              onClick={() => handleOpenProductDetail(product)}
                              role="button"
                              tabIndex={0}
                            >
                              <S.MenuItemText>
                                <h3>{product.name}</h3>
                                <p>
                                  {product.description ||
                                    "Sem descrição disponível para este item."}
                                </p>

                                {isUnavailable && (
                                  <p
                                    style={{
                                      margin: "0.12rem 0 0",
                                      color: "#b91c1c",
                                      fontWeight: 700,
                                      fontSize: "0.78rem",
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    Produto indisponivel
                                  </p>
                                )}

                                <S.MenuItemRatingRow>
                                  <S.MenuItemRatingStars>
                                    {Array.from(
                                      { length: MAX_RATING_STARS },
                                      (_, starIndex) => {
                                        const value = starIndex + 1;
                                        const filled =
                                          value <= Math.round(rating.average);

                                        return (
                                          <Star
                                            key={`${product.id}-rating-${value}`}
                                            size={13}
                                            fill={
                                              filled ? "#d7b35e" : "transparent"
                                            }
                                            color={
                                              filled ? "#d7b35e" : "#c7c6ce"
                                            }
                                            strokeWidth={2.1}
                                          />
                                        );
                                      },
                                    )}
                                  </S.MenuItemRatingStars>

                                  <S.MenuItemRatingText>
                                    {rating.count > 0
                                      ? `${toRatingLabel(rating.average)} (${rating.count})`
                                      : "Sem avaliações"}
                                  </S.MenuItemRatingText>
                                </S.MenuItemRatingRow>

                                <S.MenuItemBottom>
                                  <S.Price>R$ {toPrice(product.price)}</S.Price>

                                  <S.AddButton
                                    type="button"
                                    $added={isAdded}
                                    disabled={isUnavailable}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      markProductAsAdded(product.id);
                                      addToCart(product);
                                    }}
                                  >
                                    {isUnavailable
                                      ? "Indisponivel"
                                      : isAdded
                                        ? "Adicionado"
                                        : "Adicionar"}
                                  </S.AddButton>
                                </S.MenuItemBottom>
                              </S.MenuItemText>

                              <S.MenuItemImageWrap>
                                <S.MenuItemImage
                                  $image={resolveProductImage(product, index)}
                                />
                              </S.MenuItemImageWrap>
                            </S.MenuItemCard>
                          );
                        })}
                      </S.MenuList>
                    </S.MenuCategoryBlock>
                  ),
                )
              )}
            </S.Section>

            {showScrollTop && (
              <S.ScrollTopButton type="button" onClick={handleScrollToTop}>
                <ChevronUp size={20} />
              </S.ScrollTopButton>
            )}

            <S.FloatingCart type="button" onClick={() => setDrawerOpen(true)}>
              <ShoppingBag size={18} /> Pedido ({cartCount})
              <b>R$ {toPrice(cartTotal)}</b>
            </S.FloatingCart>

            {selectedProduct ? (
              <Suspense fallback={null}>
                <ProductDetailModal
                  selectedProduct={selectedProduct}
                  isUnavailable={isProductUnavailable(selectedProduct)}
                  isClosingProductDetail={isClosingProductDetail}
                  selectedRating={getProductRating(selectedProduct.id)}
                  ratingHover={ratingHover}
                  isRatingSubmitting={isRatingSubmitting}
                  maxRatingStars={MAX_RATING_STARS}
                  resolveProductImage={resolveProductImage}
                  toPrice={toPrice}
                  toRatingLabel={toRatingLabel}
                  setRatingHover={setRatingHover}
                  handleRateProduct={handleRateProduct}
                  addToCart={addToCart}
                  isAddedToCart={Boolean(
                    addedProductMap[String(selectedProduct.id)],
                  )}
                  handleCloseProductDetail={handleCloseProductDetail}
                />
              </Suspense>
            ) : null}

            <Suspense fallback={null}>
              <OrderDrawer
                drawerOpen={drawerOpen}
                drawerStep={drawerStep}
                setDrawerOpen={setDrawerOpen}
                setDrawerStep={setDrawerStep}
                cart={cart}
                cartTotal={cartTotal}
                toPrice={toPrice}
                updateQuantity={updateQuantity}
                customerName={customerName}
                customerCpf={customerCpf}
                paymentMethod={paymentMethod}
                paymentTiming={paymentTiming}
                observation={observation}
                savedCards={savedCards}
                selectedSavedCardId={selectedSavedCardId}
                defaultSavedCardId={defaultSavedCardId}
                cardPaymentDraft={cardPaymentDraft}
                cardNumber={cardNumber}
                cardExpiry={cardExpiry}
                cardCvv={cardCvv}
                cardFieldErrors={cardFieldErrors}
                showCardFieldFeedback={showCardFieldErrors}
                setCustomerName={setCustomerName}
                onCustomerCpfChange={(value) =>
                  setCustomerCpf(formatCpfInput(value))
                }
                setPaymentMethod={setPaymentMethod}
                setPaymentTiming={setPaymentTiming}
                setObservation={setObservation}
                onCardPaymentDraftChange={handleCardPaymentDraftChange}
                onSelectSavedCard={handleSelectSavedCard}
                onSetDefaultSavedCard={handleSetDefaultSavedCard}
                onStartNewSavedCard={handleStartNewSavedCard}
                onSaveCurrentCard={handleSaveCurrentCard}
                onRemoveSavedCard={handleRemoveSavedCard}
                onCardNumberChange={setCardNumber}
                onCardExpiryChange={(value) =>
                  setCardExpiry(normalizeCardExpiryInput(value))
                }
                onCardCvvChange={setCardCvv}
                handleFinishOrder={handleFinishOrder}
                submitting={submitting}
                isConfirmed={isConfirmed}
                loadingProducts={loadingProducts}
                mesaOrders={mesaOrders}
              />
            </Suspense>
          </>
        )}
      </S.Page>
    </>
  );
}
