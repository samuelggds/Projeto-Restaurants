import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import menuService from "../../Services/menuService";
import restaurantSettingsService from "../../Services/restaurantSettingsService";
import tableSessionService from "../../Services/tableSessionService";
import favoritesService from "../../Services/favoritesService";
import ordersService from "../../Services/ordersService";
import { useAuth } from "../../contexts/authContext";
import { HomePage } from "./HomePage";
import PixPaymentPanel from "../Cart/components/PixPaymentPanel";
import type { HomeData, HomeProduct, HomeCategory } from "./types";
import * as S from "./Home.styles";
import { isPersistentImageSource } from "../../utils/persistentImage";

// ── Fallback images by category name keyword
const CAT_IMGS: Record<string, string> = {
  pizza:
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80",
  burger:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  hamburguer:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  lanche:
    "https://images.unsplash.com/photo-1561626423-a51b45aef0a1?auto=format&fit=crop&w=800&q=80",
  frango:
    "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80",
  carne:
    "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=800&q=80",
  massa:
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&q=80",
  salada:
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
  sobremesa:
    "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80",
  bebida:
    "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80",
  cerveja:
    "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=800&q=80",
  combo:
    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=80",
  acompanhamento:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
};

const PRODUCT_FALLBACKS = [
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
];

function getProductImage(p: Record<string, unknown>, index: number): string {
  if (p.image && String(p.image).startsWith("http")) return String(p.image);
  const terms = [p.name, p.description, (p.category as { name?: string })?.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  for (const [key, url] of Object.entries(CAT_IMGS)) {
    if (terms.includes(key)) return url;
  }
  return PRODUCT_FALLBACKS[index % PRODUCT_FALLBACKS.length];
}

function isUnavailable(p: Record<string, unknown>): boolean {
  if (p.active === false) return true;
  const s = p.stock;
  if (s === null || s === undefined || s === "") return false;
  const v = typeof s === "string" ? Number(s.replace(",", ".")) : Number(s);
  return Number.isFinite(v) && v <= 0;
}

function toPositiveNumber(v: unknown): number | null {
  const n = Number(v || 0);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

type NotifType = "success" | "error" | "info" | "warning";
type Notif = {
  id: number;
  type: NotifType;
  title: string;
  msg?: string;
  visible: boolean;
};

const NOTIF_ICONS: Record<NotifType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
  warning: "!",
};

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

type PixPaymentData = {
  orderId: number | null;
  total: number;
  paymentId?: string;
  provider: string;
  pixCode: string;
  qrCodeBase64: string | null;
  requiresStatusCheck?: boolean;
  paid?: boolean;
};

export default function Home() {
  const navigate = useNavigate();
  const { tableNumber: routeTableNumber, restaurantSlug } = useParams();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();

  const normalizedSlug = String(restaurantSlug || "")
    .trim()
    .toLowerCase();
  const routeTableNumberValue = toPositiveNumber(routeTableNumber);
  const routeRestaurantId = toPositiveNumber(
    searchParams.get("restaurantId") || searchParams.get("rid"),
  );
  const routeTableId =
    toPositiveNumber(searchParams.get("tableId") || searchParams.get("tid")) ||
    routeTableNumberValue;
  const mesaMode = Boolean(routeTableNumberValue || routeTableId);
  const hasRouteRestaurantId = Boolean(routeRestaurantId);

  const [resolvedRestaurantId, setResolvedRestaurantId] = useState<
    number | null
  >(null);
  const [backendProducts, setBackendProducts] = useState<
    Record<string, unknown>[]
  >([]);
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(
    null,
  );
  const [cart, setCart] = useState<CartItem[]>(() =>
    readJson<CartItem[]>("cartItems", []).map((i) => ({
      ...i,
      price: Number(i.price || 0),
      quantity: Number(i.quantity || 1),
    })),
  );
  const [tablePin, setTablePin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isPinValidating, setIsPinValidating] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [pixPaymentData, setPixPaymentData] =
    useState<PixPaymentData | null>(null);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [tableSession, setTableSession] = useState(() =>
    readJson<Record<string, unknown> | null>("tableSession", null),
  );

  const toggleFavorite = useCallback(async (productId: string) => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (user.role !== "CLIENTE") return;
    const isFavorite = favoriteProductIds.includes(productId);
    setFavoriteProductIds((current) => isFavorite
      ? current.filter((id) => id !== productId)
      : [productId, ...current]);
    try {
      if (isFavorite) await favoritesService.remove(productId);
      else await favoritesService.add(productId);
    } catch {
      setFavoriteProductIds((current) => isFavorite
        ? [productId, ...current]
        : current.filter((id) => id !== productId));
      // O estado otimista é revertido quando a API rejeita a operação.
    }
  }, [favoriteProductIds, navigate, user]);

  // ── Notification system (defined early so useEffects can use it)
  const notify = useCallback(
    (type: NotifType, title: string, msg?: string, duration = 3500) => {
      const id = Date.now();
      setNotifs((prev) => [
        ...prev.slice(-3),
        { id, type, title, msg, visible: false },
      ]);
      requestAnimationFrame(() =>
        setNotifs((prev) =>
          prev.map((n) => (n.id === id ? { ...n, visible: true } : n)),
        ),
      );
      setTimeout(() => {
        setNotifs((prev) =>
          prev.map((n) => (n.id === id ? { ...n, visible: false } : n)),
        );
        setTimeout(
          () => setNotifs((prev) => prev.filter((n) => n.id !== id)),
          400,
        );
      }, duration);
    },
    [],
  );

  function dismissNotif(id: number) {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, visible: false } : n)),
    );
    setTimeout(() => setNotifs((prev) => prev.filter((n) => n.id !== id)), 400);
  }

  const mesaLabel =
    routeTableNumberValue ||
    tableSession?.tableNumber ||
    tableSession?.tableId ||
    routeTableId ||
    "";
  const hasValidQrContext =
    !mesaMode || Boolean(routeTableNumberValue && routeTableId);
  const mesaSessionIsActive =
    !mesaMode ||
    Boolean(
      tableSession?.sessionToken &&
      Number(tableSession?.tableId) === Number(routeTableId) &&
      (!hasRouteRestaurantId ||
        Number(tableSession?.restaurantId) === Number(routeRestaurantId)),
    );

  const storedSessionRestaurantId = Number(
    readJson<{ restaurantId?: number } | null>("tableSession", null)
      ?.restaurantId || 0,
  );
  const restaurantId = mesaMode
    ? routeRestaurantId ||
      storedSessionRestaurantId ||
      resolvedRestaurantId ||
      null
    : normalizedSlug
      ? resolvedRestaurantId
      : (user as { restaurantId?: number })?.restaurantId ||
        Number(localStorage.getItem("menuRestaurantId")) ||
        storedSessionRestaurantId ||
        null;

  useEffect(() => {
    if (user?.role !== "CLIENTE" || !restaurantId) {
      return;
    }
    let active = true;
    favoritesService
      .list(restaurantId)
      .then((items) => {
        if (active) {
          setFavoriteProductIds(items.map((item) => String(item.id)));
        }
      })
      .catch(() => {
        if (active) setFavoriteProductIds([]);
      });
    return () => {
      active = false;
    };
  }, [restaurantId, user]);

  useEffect(() => {
    if (
      !pixPaymentData?.requiresStatusCheck ||
      pixPaymentData.paid ||
      !pixPaymentData.paymentId ||
      !pixPaymentData.orderId ||
      !restaurantId
    ) return;

    let active = true;
    let checking = false;
    const checkPayment = async () => {
      if (!active || checking) return;
      checking = true;
      try {
        const status = await ordersService.getPixPaymentStatus({
          paymentId: pixPaymentData.paymentId,
          restaurantId,
        });
        if (status?.isApproved && active) {
          await ordersService.confirmPixPayment({
            orderId: pixPaymentData.orderId,
            paymentId: pixPaymentData.paymentId,
            restaurantId,
          });
          if (active) {
            setPixPaymentData((current) =>
              current ? { ...current, paid: true } : current,
            );
          }
        }
      } catch {
        // A próxima consulta repete a verificação enquanto o QR estiver aberto.
      } finally {
        checking = false;
      }
    };

    void checkPayment();
    const intervalId = window.setInterval(checkPayment, 5000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [pixPaymentData, restaurantId]);

  // Resolve slug → restaurantId
  useEffect(() => {
    if (!normalizedSlug) return;
    let mounted = true;
    restaurantSettingsService
      .getPublicSettingsBySlug(normalizedSlug)
      .then((s) => {
        if (!mounted) return;
        const id = toPositiveNumber(s?.restaurantId);
        setResolvedRestaurantId(id);
        if (id) localStorage.setItem("menuRestaurantId", String(id));
      })
      .catch(() => {
        /* silent */
      });
    return () => {
      mounted = false;
    };
  }, [normalizedSlug]);

  // Load restaurant settings (brand, colors)
  useEffect(() => {
    if (!restaurantId) return;
    let mounted = true;
    restaurantSettingsService
      .getPublicSettings(Number(restaurantId))
      .then((d) => {
        if (mounted) setSettings(d ?? null);
      })
      .catch(() => {
        /* silent */
      });
    return () => {
      mounted = false;
    };
  }, [restaurantId]);

  // Load products
  useEffect(() => {
    if (!restaurantId) return;
    let mounted = true;
    localStorage.setItem("menuRestaurantId", String(restaurantId));
    const req = normalizedSlug
      ? menuService.listProductsBySlug(normalizedSlug)
      : menuService.listProducts(Number(restaurantId));
    req
      .then((data) => {
        if (mounted)
          setBackendProducts(
            Array.isArray(data) ? (data as Record<string, unknown>[]) : [],
          );
      })
      .catch((err) =>
        notify(
          "error",
          "Erro ao carregar cardápio",
          err?.response?.data?.error,
        ),
      );
    return () => {
      mounted = false;
    };
  }, [restaurantId, normalizedSlug, notify]);

  // Persist cart
  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cart));
  }, [cart]);

  // Clear stale mesa session
  useEffect(() => {
    if (!mesaMode || !tableSession?.sessionToken) return;
    const sameTable = Number(tableSession?.tableId) === Number(routeTableId);
    const sameRestaurant =
      !hasRouteRestaurantId ||
      Number(tableSession?.restaurantId) === Number(routeRestaurantId);
    if (!sameTable || !sameRestaurant) {
      localStorage.removeItem("tableSession");
      localStorage.removeItem("tableSessionToken");
    }
  }, [
    mesaMode,
    routeTableId,
    routeRestaurantId,
    hasRouteRestaurantId,
    tableSession?.sessionToken,
    tableSession?.tableId,
    tableSession?.restaurantId,
  ]);

  async function handleValidateTablePin(event: React.FormEvent) {
    event.preventDefault();
    if (!routeTableId || !routeTableNumberValue) {
      notify(
        "error",
        "QR inválido",
        "Escaneie o QR oficial da mesa novamente.",
      );
      return;
    }
    if (!tablePin.trim()) {
      notify(
        "warning",
        "PIN obrigatório",
        "Digite o PIN informado pelo garçom.",
      );
      return;
    }
    try {
      setIsPinValidating(true);
      setPinError("");
      const result = await tableSessionService.validatePin({
        tableId: routeTableId,
        pin: tablePin.trim(),
      });
      const next = {
        sessionToken: result.sessionToken,
        sessionId: result.sessionId,
        tableId: Number(result.tableId || routeTableId),
        tableNumber: Number(result.tableNumber || mesaLabel) || null,
        restaurantId:
          Number(result.restaurantId || routeRestaurantId || 0) || null,
      };
      localStorage.setItem("tableSession", JSON.stringify(next));
      localStorage.setItem("tableSessionToken", result.sessionToken);
      if (next.restaurantId)
        localStorage.setItem("menuRestaurantId", String(next.restaurantId));
      setTableSession(next);
      setTablePin("");
      notify(
        "success",
        `Mesa ${next.tableNumber} liberada!`,
        "Cardápio disponível. Bom apetite!",
      );
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ||
        (err as { message?: string })?.message ||
        "Erro ao validar PIN";
      setPinError(msg);
      notify("error", "Erro no PIN", msg);
    } finally {
      setIsPinValidating(false);
    }
  }

  // ── Map backend → HomeData
  const homeData: HomeData = useMemo(() => {
    const r = (settings?.restaurant as Record<string, unknown>) ?? {};
    const persistedBanners = Array.isArray(r?.banners)
      ? (r.banners as Record<string, unknown>[])
      : [];
    const bannerByTitle = (title: string) =>
      persistedBanners.find((item) => String(item.title || "") === title);
    const mainBanner = bannerByTitle("Banner principal");
    const promotionBanners = [
      bannerByTitle("Promoção 1"),
      bannerByTitle("Promoção 2"),
    ].filter(Boolean) as Record<string, unknown>[];
    const hero = mainBanner && isPersistentImageSource(mainBanner.image)
      ? {
          title: "Confira nossas",
          highlight: "promoções",
          description: "Ofertas especiais preparadas para você.",
          image: String(mainBanner.image),
        }
      : { title: "", highlight: "", description: "", image: "" };
    const banners = promotionBanners
      .filter((item) => isPersistentImageSource(item.image))
      .map((item) => ({
        title: String(item.title || ""),
        highlight: "",
        description: "",
        image: String(item.image),
      }));
    const brand = {
      name: String(r?.name || settings?.restaurantName || ""),
      monogram:
        String(r?.name || "")
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((w: string) => w[0])
          .join("")
          .toUpperCase() || "R",
      address: String(settings?.address || ""),
      primaryColor: String(settings?.primaryColor || "#d64d08"),
      whatsapp: String(settings?.whatsapp || ""),
      instagram: String(settings?.instagram || ""),
      facebook: String(settings?.facebook || ""),
      logoUrl: isPersistentImageSource(r?.logo) ? String(r.logo) : "",
    };

    if (backendProducts.length === 0) {
      return {
        brand,
        hero,
        banners,
        categories: [],
        products: [],
        deliveryTime: String(settings?.averageDeliveryTime || ""),
        minimumOrder: Number(settings?.minimumOrder || 0),
        freeDeliveryFrom: 0,
        isOpen: false,
        about: String(settings?.description || ""),
      };
    }

    const availableProducts = backendProducts.filter((p) => !isUnavailable(p));

    const products: HomeProduct[] = availableProducts.map((p, i) => ({
      id: String(p.id),
      categoryId: String((p.category as { name?: string })?.name || "outros"),
      name: String(p.name || ""),
      description: String(p.description || ""),
      price: Number(p.price || 0),
      image: getProductImage(p, i),
      rating: Number((p as { averageRating?: number }).averageRating || 0),
    }));

    const seen = new Set<string>();
    const categories: HomeCategory[] = [
      { id: "todos", name: "Todos", image: "" },
      ...(availableProducts
        .map((p) => {
          const name = String((p.category as { name?: string })?.name || "");
          if (!name || seen.has(name)) return null;
          seen.add(name);
          return { id: name, name, image: getProductImage(p, 0) };
        })
        .filter(Boolean) as HomeCategory[]),
    ];

    return {
      brand,
      hero,
      banners,
      categories,
      products,
      deliveryTime: String(settings?.averageDeliveryTime || ""),
      minimumOrder: Number(settings?.minimumOrder || 0),
      freeDeliveryFrom: 0,
      isOpen: false,
      about: String(settings?.description || ""),
    };
  }, [backendProducts, settings]);

  function addToCart(productId: string) {
    const product = homeData.products.find((p) => p.id === productId);
    if (!product) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing)
        return prev.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i,
        );
      return [
        ...prev,
        {
          productId,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image,
        },
      ];
    });
    notify("success", product.name, "Adicionado à sacola!", 2000);
  }

  function decreaseCart(productId: string) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }

  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const cartTotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);

  async function handleCheckout() {
    if (!restaurantId || !cart.length || checkoutLoading) return;

    const customer = (user || {}) as Record<string, unknown>;
    const type = mesaMode
      ? "MESA"
      : orderType === "delivery"
        ? "DELIVERY"
        : "RETIRADA";

    if (!mesaMode && !user) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (
      type === "DELIVERY" &&
      [customer.address, customer.number, customer.district, customer.city, customer.state]
        .some((value) => !String(value || "").trim())
    ) {
      notify(
        "warning",
        "Complete seu endereço",
        "Cadastre o endereço completo no perfil antes de finalizar o delivery.",
      );
      navigate("/profile");
      return;
    }

    const payload = {
      restaurantId,
      type,
      paymentMethod: paymentMethod === "pix" ? "PIX" : "CARTAO",
      items: cart.map((item) => ({
        productId: Number(item.productId),
        quantity: item.quantity,
      })),
      tableId: mesaMode ? routeTableId : undefined,
      customerName: String(customer.name || "Cliente"),
      customerPhone: String(customer.phone || ""),
      address: String(customer.address || ""),
      number: String(customer.number || ""),
      district: String(customer.district || ""),
      city: String(customer.city || ""),
      state: String(customer.state || ""),
      zipCode: String(customer.zipCode || ""),
      complement: String(customer.complement || ""),
    };

    setCheckoutLoading(true);
    try {
      if (paymentMethod === "pix") {
        const result = await ordersService.createPixPayment({
          ...payload,
          pixProvider: String(settings?.pixProvider || ""),
        });
        setPixPaymentData({
          orderId: Number(result.orderId) || null,
          total: Number(result.totalAmount || cartTotal),
          paymentId: String(result.paymentId || ""),
          provider: String(result.provider || "PIX"),
          pixCode: String(result.qrCode || ""),
          qrCodeBase64: result.qrCodeBase64
            ? String(result.qrCodeBase64)
            : null,
          requiresStatusCheck: Boolean(result.requiresStatusCheck),
        });
        setCart([]);
        setCartOpen(false);
        return;
      }

      const result = await ordersService.createCardCheckout({
        ...payload,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      });
      const checkoutUrl = String(result.checkoutUrl || "");
      if (!/^https:\/\//i.test(checkoutUrl)) {
        throw new Error("O gateway não retornou um endereço seguro de pagamento.");
      }
      setCart([]);
      window.location.assign(checkoutUrl);
    } catch (error: unknown) {
      const responseMessage =
        typeof error === "object" && error !== null
          ? String(
              (error as { response?: { data?: { error?: unknown } }; message?: unknown })
                .response?.data?.error ||
                (error as { message?: unknown }).message ||
                "",
            )
          : "";
      notify(
        "error",
        "Não foi possível iniciar o pagamento",
        responseMessage || "Confira as configurações de pagamento do restaurante.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  const primary = homeData.brand.primaryColor || "#d64d08";

  if (pixPaymentData) {
    return (
      <PixPaymentPanel
        pixPaymentData={pixPaymentData}
        formatCurrency={(value) =>
          value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        }
        onCopyPixKey={() => navigator.clipboard.writeText(pixPaymentData.pixCode)}
        onBackToCart={() => setPixPaymentData(null)}
      />
    );
  }

  // ── PIN Gate: invalid QR
  if (mesaMode && !hasValidQrContext) {
    return (
      <S.HomeRoot $primary={primary}>
        <S.Main
          style={{ display: "grid", placeItems: "center", minHeight: "80vh" }}
        >
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                color: primary,
                marginBottom: 10,
              }}
            >
              Acesso por QR Code
            </div>
            <h1
              style={{ fontSize: "clamp(22px,4vw,32px)", margin: "0 0 10px" }}
            >
              Link inválido da mesa
            </h1>
            <p style={{ color: "#6f6a63" }}>
              Escaneie o QR oficial da mesa para acessar o cardápio.
            </p>
          </div>
        </S.Main>
      </S.HomeRoot>
    );
  }

  // ── PIN Gate: awaiting PIN
  if (mesaMode && !mesaSessionIsActive) {
    return (
      <S.HomeRoot $primary={primary}>
        <S.Main
          style={{ display: "grid", placeItems: "center", minHeight: "80vh" }}
        >
          <div
            style={{
              width: "min(480px,100%)",
              background: "#fff",
              border: "1px solid #eadfd3",
              borderRadius: 20,
              padding: "clamp(28px,4vw,44px)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "6px 14px",
                background: "#fdeee7",
                borderRadius: 999,
                color: primary,
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                marginBottom: 12,
              }}
            >
              Mesa {String(mesaLabel)}
            </div>
            <h1
              style={{
                fontSize: "clamp(22px,4vw,30px)",
                fontWeight: 800,
                margin: "0 0 8px",
              }}
            >
              Cardápio digital
            </h1>
            <p style={{ color: "#6f6a63", fontSize: 14, marginBottom: 20 }}>
              Digite o PIN de 4 dígitos informado pelo garçom.
            </p>
            <form
              onSubmit={handleValidateTablePin}
              style={{ display: "grid", gap: 10 }}
            >
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="PIN da mesa"
                value={tablePin}
                onChange={(e) =>
                  setTablePin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                style={{
                  width: "100%",
                  height: 52,
                  border: `2px solid ${tablePin ? primary : "#eadfd3"}`,
                  borderRadius: 12,
                  fontSize: 22,
                  letterSpacing: ".3em",
                  textAlign: "center",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              {pinError && (
                <p style={{ color: "#b91c1c", fontSize: 13, margin: 0 }}>
                  {pinError}
                </p>
              )}
              <button
                type="submit"
                disabled={isPinValidating}
                style={{
                  height: 50,
                  background: primary,
                  color: "white",
                  border: "none",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  opacity: isPinValidating ? 0.6 : 1,
                }}
              >
                {isPinValidating ? "Validando..." : "Liberar cardápio"}
              </button>
            </form>
          </div>
        </S.Main>
      </S.HomeRoot>
    );
  }

  // ── Main render
  return (
    <>
      <HomePage
        data={homeData}
        cartCount={cartCount}
        userName={
          user
            ? String((user as Record<string, unknown>).name || "")
            : undefined
        }
        userEmail={
          user
            ? String((user as Record<string, unknown>).email || "")
            : undefined
        }
        userLoggedIn={!!user}
        isAdmin={user?.role === "ADMIN"}
        favoriteProductIds={user?.role === "CLIENTE" ? favoriteProductIds : []}
        onOpenCart={() => setCartOpen(true)}
        onOpenProfile={() => navigate("/profile")}
        onOpenAdmin={() => navigate("/admin")}
        onAddProduct={addToCart}
        onToggleFavorite={toggleFavorite}
        onLogout={() => {
          logout();
        }}
        onSelectCategory={() => {
          /* handled inside HomePage */
        }}
      />

      {/* ── Cart drawer */}
      <S.CartOverlay
        $open={cartOpen}
        onClick={() => setCartOpen(false)}
        aria-label="Fechar sacola"
      />
      <S.CartDrawer $open={cartOpen}>
        <S.CartHead>
          <div className="cart-title">
            <h2>Minha sacola</h2>
            <small>
              {cartCount === 0
                ? "Nenhum item"
                : `${cartCount} ${cartCount === 1 ? "item" : "itens"}`}
            </small>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Fechar"
          >
            ×
          </button>
        </S.CartHead>

        <S.CartItems>
          {cart.length ? (
            cart.map((item) => (
              <S.CartItemRow key={item.productId}>
                <img
                  src={
                    item.image ||
                    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=80&q=80"
                  }
                  alt=""
                />
                <S.CartItemInfo>
                  <strong>{item.name}</strong>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <S.CartQty>
                      <button
                        type="button"
                        onClick={() => decreaseCart(item.productId)}
                      >
                        −
                      </button>
                      <b>{item.quantity}</b>
                      <button
                        type="button"
                        onClick={() => addToCart(item.productId)}
                      >
                        +
                      </button>
                    </S.CartQty>
                    <span className="item-price">
                      {(item.price * item.quantity).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                </S.CartItemInfo>
              </S.CartItemRow>
            ))
          ) : (
            <S.CartEmpty>
              <div className="icon">🛒</div>
              <strong>Sacola vazia</strong>
              <p>Adicione itens do cardápio para começar seu pedido.</p>
            </S.CartEmpty>
          )}
        </S.CartItems>

        <S.CartFoot>
          {/* ── Delivery / pickup */}
          {cart.length > 0 && !mesaMode && (
            <>
              <S.CartSectionLabel>Como deseja receber?</S.CartSectionLabel>
              <S.DeliveryToggle>
                <S.DeliveryBtn
                  type="button"
                  $active={orderType === "delivery"}
                  onClick={() => setOrderType("delivery")}
                >
                  <span className="btn-icon">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 640 640"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill="currentColor"
                        d="M64 160C64 124.7 92.7 96 128 96L416 96C451.3 96 480 124.7 480 160L480 192L530.7 192C547.7 192 564 198.7 576 210.7L621.3 256C633.3 268 640 284.3 640 301.3L640 448C640 483.3 611.3 512 576 512L572.7 512C562.3 548.9 528.3 576 488 576C447.7 576 413.8 548.9 403.3 512L300.7 512C290.3 548.9 256.3 576 216 576C175.7 576 141.8 548.9 131.3 512L128 512C92.7 512 64 483.3 64 448L64 400L24 400C10.7 400 0 389.3 0 376C0 362.7 10.7 352 24 352L136 352C149.3 352 160 341.3 160 328C160 314.7 149.3 304 136 304L24 304C10.7 304 0 293.3 0 280C0 266.7 10.7 256 24 256L200 256C213.3 256 224 245.3 224 232C224 218.7 213.3 208 200 208L24 208C10.7 208 0 197.3 0 184C0 170.7 10.7 160 24 160L64 160zM576 352L576 301.3L530.7 256L480 256L480 352L576 352zM256 488C256 465.9 238.1 448 216 448C193.9 448 176 465.9 176 488C176 510.1 193.9 528 216 528C238.1 528 256 510.1 256 488zM488 528C510.1 528 528 510.1 528 488C528 465.9 510.1 448 488 448C465.9 448 448 465.9 448 488C448 510.1 465.9 528 488 528z"
                      />
                    </svg>
                  </span>
                  Delivery
                </S.DeliveryBtn>
                <S.DeliveryBtn
                  type="button"
                  $active={orderType === "pickup"}
                  onClick={() => setOrderType("pickup")}
                >
                  <span className="btn-icon">
                    {/* sacola de retirada */}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <line
                        x1="3"
                        y1="6"
                        x2="21"
                        y2="6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M16 10a4 4 0 0 1-8 0"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  Retirada
                </S.DeliveryBtn>
              </S.DeliveryToggle>
            </>
          )}

          {/* ── Payment method */}
          {cart.length > 0 && (
            <>
              <S.CartSectionLabel>Forma de pagamento</S.CartSectionLabel>
              <S.PaymentGrid>
                <S.PaymentCard
                  type="button"
                  $active={paymentMethod === "pix"}
                  $color="#32BCAD"
                  onClick={() => setPaymentMethod("pix")}
                >
                  <div className="pm-badge">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 640 640"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill={paymentMethod === "pix" ? "#fff" : "#32BCAD"}
                        d="M306.4 356.5C311.8 351.1 321.1 351.1 326.5 356.5L403.5 433.5C417.7 447.7 436.6 455.5 456.6 455.5L471.7 455.5L374.6 552.6C344.3 582.1 295.1 582.1 264.8 552.6L167.3 455.2L176.6 455.2C196.6 455.2 215.5 447.4 229.7 433.2L306.4 356.5zM326.5 282.9C320.1 288.4 311.9 288.5 306.4 282.9L229.7 206.2C215.5 191.1 196.6 184.2 176.6 184.2L167.3 184.2L264.7 86.8C295.1 56.5 344.3 56.5 374.6 86.8L471.8 183.9L456.6 183.9C436.6 183.9 417.7 191.7 403.5 205.9L326.5 282.9zM176.6 206.7C190.4 206.7 203.1 212.3 213.7 222.1L290.4 298.8C297.6 305.1 307 309.6 316.5 309.6C325.9 309.6 335.3 305.1 342.5 298.8L419.5 221.8C429.3 212.1 442.8 206.5 456.6 206.5L494.3 206.5L552.6 264.8C582.9 295.1 582.9 344.3 552.6 374.6L494.3 432.9L456.6 432.9C442.8 432.9 429.3 427.3 419.5 417.5L342.5 340.5C328.6 326.6 304.3 326.6 290.4 340.6L213.7 417.2C203.1 427 190.4 432.6 176.6 432.6L144.8 432.6L86.8 374.6C56.5 344.3 56.5 295.1 86.8 264.8L144.8 206.7L176.6 206.7z"
                      />
                    </svg>
                  </div>
                  <span className="pm-name">Pix</span>
                  <span className="pm-desc">Aprovação instantânea</span>
                </S.PaymentCard>
                <S.PaymentCard
                  type="button"
                  $active={paymentMethod === "card"}
                  $color="#3b6cf6"
                  onClick={() => setPaymentMethod("card")}
                >
                  <div className="pm-badge">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect
                        x="2"
                        y="5"
                        width="20"
                        height="14"
                        rx="2"
                        stroke={paymentMethod === "card" ? "#fff" : "#3b6cf6"}
                        strokeWidth="1.8"
                      />
                      <path
                        d="M2 10h20"
                        stroke={paymentMethod === "card" ? "#fff" : "#3b6cf6"}
                        strokeWidth="1.8"
                      />
                      <rect
                        x="5"
                        y="14"
                        width="5"
                        height="2"
                        rx="1"
                        fill={paymentMethod === "card" ? "#fff" : "#3b6cf6"}
                      />
                      <rect
                        x="12"
                        y="14"
                        width="3"
                        height="2"
                        rx="1"
                        fill={
                          paymentMethod === "card"
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(59,108,246,0.4)"
                        }
                      />
                    </svg>
                  </div>
                  <span className="pm-name">Cartão</span>
                  <span className="pm-desc">
                    Ambiente seguro do gateway
                  </span>
                </S.PaymentCard>
              </S.PaymentGrid>
            </>
          )}

          {/* ── Summary */}
          {cart.length > 0 && (
            <S.CartSummaryRow>
              <span>
                Subtotal ({cartCount} {cartCount === 1 ? "item" : "itens"})
              </span>
              <span>
                {cartTotal.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </S.CartSummaryRow>
          )}
          <S.CartTotal>
            <span>Total</span>
            <span>
              {cartTotal.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </S.CartTotal>
          <S.CartCheckout
            type="button"
            disabled={!cart.length || checkoutLoading}
            onClick={handleCheckout}
          >
            {checkoutLoading
              ? "Processando..."
              : paymentMethod === "pix"
                ? "⚡ Gerar código Pix"
                : "💳 Ir para pagamento seguro"}{" "}
            →
          </S.CartCheckout>
        </S.CartFoot>
      </S.CartDrawer>

      {/* ── Login nudge (public users only, not in mesa mode) */}
      {!user && !mesaMode && !nudgeDismissed && (
        <S.LoginNudge>
          <span>🔔 Faça login para acompanhar seus pedidos em tempo real</span>
          <button
            className="nudge-login"
            type="button"
            onClick={() => navigate("/login")}
          >
            Entrar
          </button>
          <button
            className="nudge-dismiss"
            type="button"
            onClick={() => setNudgeDismissed(true)}
          >
            Agora não
          </button>
        </S.LoginNudge>
      )}

      {/* ── In-app notifications */}
      <S.NotifStack>
        {notifs.map((n) => (
          <S.NotifItem key={n.id} $type={n.type} $visible={n.visible}>
            <div className="notif-icon">{NOTIF_ICONS[n.type]}</div>
            <div className="notif-body">
              <span className="notif-title">{n.title}</span>
              {n.msg && <span className="notif-msg">{n.msg}</span>}
            </div>
            <button
              className="notif-close"
              type="button"
              onClick={() => dismissNotif(n.id)}
            >
              ×
            </button>
          </S.NotifItem>
        ))}
      </S.NotifStack>
    </>
  );
}
