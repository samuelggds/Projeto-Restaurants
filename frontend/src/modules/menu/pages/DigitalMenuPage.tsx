import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import menuService from "../../../Services/menuService";
import ordersService from "../../../Services/ordersService";
import tableSessionService from "../../../Services/tableSessionService";
import restaurantSettingsService from "../../../Services/restaurantSettingsService";
import {
  connectTableSessionSocket,
  disconnectTableSessionSocket,
} from "../../../Services/socketService";
import { CategoryRail } from "../components/CategoryRail";
import { MenuHeader } from "../components/MenuHeader";
import { MenuProductCard } from "../components/MenuProductCard";
import { RestaurantSummary } from "../components/RestaurantSummary";
import { ProductModal } from "../components/ProductModal";
import { MenuCart } from "../components/MenuCart";
import { useMenuCart } from "../hooks/useMenuCart";
import type {
  MenuCategory,
  MenuProduct,
  MenuRestaurant,
  ProductOption,
} from "../types/menu.types";
import "../styles/menu.css";

const PixPaymentPanel = lazy(
  () => import("../../../pages/Cart/components/PixPaymentPanel"),
);

const PIX_AUTO_STATUS_CHECK_MS = 4000;

function toInt(value: unknown): number | null {
  const parsed = Number(value || 0);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isProductUnavailable(product: MenuProduct): boolean {
  if (product.active === false) return true;
  const rawStock = product.stock;
  if (rawStock === null || rawStock === undefined || rawStock === "")
    return false;
  const stockValue =
    typeof rawStock === "string"
      ? Number(rawStock.replace(",", "."))
      : Number(rawStock);
  return Number.isFinite(stockValue) && stockValue <= 0;
}

type PixPaymentData = {
  orderId: number | null;
  total: number;
  paymentId?: string;
  provider: string;
  pixCode: string;
  qrCodeBase64: string | null;
};

function mapProduct(raw: Record<string, unknown>): MenuProduct {
  const categoryName = String(
    (raw.category as Record<string, unknown>)?.name ?? raw.categoryId ?? "",
  );
  return {
    id: Number(raw.id),
    categoryId: categoryName,
    name: String(raw.name || ""),
    description: String(raw.description || ""),
    price: Number(raw.price || 0),
    image: String(
      raw.image ||
        "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80",
    ),
    rating: Number(raw.averageRating || 0),
    preparationTime: "30–45 min",
    available: !isProductUnavailable({
      ...raw,
      id: Number(raw.id),
      categoryId: categoryName,
      name: String(raw.name || ""),
      description: String(raw.description || ""),
      price: Number(raw.price || 0),
      image: String(raw.image || ""),
      rating: 0,
      preparationTime: "",
      available: true,
    } as MenuProduct),
    active: raw.active as boolean | undefined,
    stock: raw.stock as number | string | null | undefined,
    category: raw.category as MenuProduct["category"],
  };
}

function readTableSession(): Record<string, unknown> | null {
  try {
    return JSON.parse(localStorage.getItem("tableSession") || "null");
  } catch {
    return null;
  }
}

export default function DigitalMenu() {
  const { tableNumber: tableNumberParam } = useParams();
  const [searchParams] = useSearchParams();

  const cart = useMenuCart();

  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MenuProduct | null>(
    null,
  );
  const [tablePin, setTablePin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isPinValidating, setIsPinValidating] = useState(false);
  const [tableSession, setTableSession] = useState<Record<
    string,
    unknown
  > | null>(() => readTableSession());
  const [restaurantProfile, setRestaurantProfile] = useState<MenuRestaurant>({
    name: "Restaurante",
    logoUrl: "",
    primaryColor: "#c95d3d",
    coverImage: "",
    deliveryTime: "30–45 min",
    deliveryFee: 0,
    minimumOrder: 0,
    rating: 0,
    isOpen: true,
  });
  const [pixPaymentData, setPixPaymentData] = useState<PixPaymentData | null>(
    null,
  );
  const [isSubmittingPix, setIsSubmittingPix] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "PIX" | "CARTAO" | "DINHEIRO"
  >("PIX");
  const [observation, setObservation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderId: number;
    paymentMethod: string;
  } | null>(null);

  const sessionClosedRef = useRef(false);

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

  const restaurantId =
    Number(tableSession?.restaurantId || 0) || routeRestaurantId || null;

  // Clear stale table session
  useEffect(() => {
    if (!isMesaContext) return;
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

  // Load products
  useEffect(() => {
    if (!mesaSessionIsActive || !restaurantId) return;
    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingProducts(true);
    localStorage.setItem("menuRestaurantId", String(restaurantId));
    menuService
      .listProducts(restaurantId)
      .then((data) => {
        if (!mounted) return;
        setProducts(
          Array.isArray(data)
            ? data.map((p) => mapProduct(p as Record<string, unknown>))
            : [],
        );
      })
      .catch((err) =>
        toast.error(err?.response?.data?.error || "Erro ao carregar cardápio"),
      )
      .finally(() => {
        if (mounted) setLoadingProducts(false);
      });
    return () => {
      mounted = false;
    };
  }, [mesaSessionIsActive, restaurantId]);

  // Load restaurant profile
  useEffect(() => {
    if (!restaurantId) return;
    let mounted = true;
    restaurantSettingsService
      .getPublicSettings(restaurantId)
      .then((data) => {
        if (!mounted) return;
        const r = (data?.restaurant as Record<string, unknown>) ?? {};
        setRestaurantProfile((prev) => ({
          ...prev,
          name: String(r?.name || prev.name),
          logoUrl: String(r?.logo || prev.logoUrl),
          coverImage: String(r?.coverImage || prev.coverImage),
          primaryColor: String(data?.primaryColor || prev.primaryColor),
        }));
      })
      .catch(() => {
        /* silent */
      });
    return () => {
      mounted = false;
    };
  }, [restaurantId]);

  // Request PIN assistance when session is not active
  useEffect(() => {
    if (!isMesaContext || mesaSessionIsActive || !routeTableId) return;
    tableSessionService.requestPinAssistance(routeTableId).catch(() => {
      /* silent */
    });
  }, [isMesaContext, mesaSessionIsActive, routeTableId]);

  // Validate current session periodically
  useEffect(() => {
    if (!mesaSessionIsActive) {
      sessionClosedRef.current = false;
      return;
    }
    let mounted = true;
    async function validate() {
      try {
        await tableSessionService.getCurrentSession();
      } catch (err) {
        const status = Number(
          (err as { response?: { status?: number } })?.response?.status || 0,
        );
        if (mounted && (status === 403 || status === 404)) {
          localStorage.removeItem("tableSession");
          localStorage.removeItem("tableSessionToken");
          setTableSession(null);
          if (!sessionClosedRef.current) {
            toast.info("Mesa encerrada. Solicite um novo PIN para continuar.");
            sessionClosedRef.current = true;
          }
        }
      }
    }
    validate();
    const id = setInterval(validate, 7000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [mesaSessionIsActive]);

  // Socket connection for real-time order updates
  useEffect(() => {
    if (!mesaSessionIsActive || !tableSession?.sessionToken) {
      disconnectTableSessionSocket();
      return;
    }
    const socket = connectTableSessionSocket(
      tableSession.sessionToken as string,
      "digital-menu",
    );
    if (!socket) return;
    const onSessionClosed = () => {
      localStorage.removeItem("tableSession");
      localStorage.removeItem("tableSessionToken");
      setTableSession(null);
      if (!sessionClosedRef.current) {
        toast.info("Mesa encerrada pela equipe. Solicite um novo PIN.");
        sessionClosedRef.current = true;
      }
    };
    socket.on("table:session-closed", onSessionClosed);
    return () => {
      socket.off("table:session-closed", onSessionClosed);
      disconnectTableSessionSocket();
    };
  }, [mesaSessionIsActive, tableSession?.sessionToken]);

  // Auto-confirm PIX for Mercado Pago
  const handleConfirmPix = useCallback(async () => {
    if (!pixPaymentData || isSubmittingPix) return;
    const paymentId = String(pixPaymentData.paymentId || "").trim();
    const orderId = Number(pixPaymentData.orderId || 0);
    if (!paymentId || !orderId || !restaurantId) return;
    try {
      setIsSubmittingPix(true);
      await ordersService.confirmPixPayment({
        orderId,
        paymentId,
        restaurantId,
      });
      setPixPaymentData(null);
      setOrderSuccess({ orderId, paymentMethod: "PIX" });
    } catch {
      /* silent - auto-retry */
    } finally {
      setIsSubmittingPix(false);
    }
  }, [pixPaymentData, isSubmittingPix, restaurantId]);

  useEffect(() => {
    const provider = String(pixPaymentData?.provider || "").toUpperCase();
    if (
      provider !== "MERCADO_PAGO" ||
      !pixPaymentData?.paymentId ||
      isSubmittingPix
    )
      return;
    let cancelled = false;
    async function checkPix() {
      if (cancelled || !restaurantId) return;
      try {
        const status = await ordersService.getPixPaymentStatus({
          paymentId: String(pixPaymentData!.paymentId || "").trim(),
          restaurantId,
        });
        if (
          ["approved", "accredited", "paid"].includes(
            String(status?.status || "").toLowerCase(),
          )
        )
          await handleConfirmPix();
      } catch {
        /* silent */
      }
    }
    const id = window.setInterval(
      () => void checkPix(),
      PIX_AUTO_STATUS_CHECK_MS,
    );
    void checkPix();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [handleConfirmPix, isSubmittingPix, pixPaymentData, restaurantId]);

  async function handleValidatePin(event: React.FormEvent) {
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
      const next = {
        sessionToken: result.sessionToken,
        sessionId: result.sessionId,
        tableId: Number(result.tableId || routeTableId),
        tableNumber:
          Number(result.tableNumber || tableNumber || routeTableId) || null,
        restaurantId:
          Number(result.restaurantId || routeRestaurantId || 0) || null,
      };
      localStorage.setItem("tableSession", JSON.stringify(next));
      localStorage.setItem("tableSessionToken", result.sessionToken);
      setTableSession(next);
      setTablePin("");
      toast.success(`Mesa ${next.tableNumber} liberada!`);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ||
        (err as { message?: string })?.message ||
        "Erro ao validar PIN";
      setPinError(msg);
      toast.error(msg);
    } finally {
      setIsPinValidating(false);
    }
  }

  function formatCpfInput(value: string) {
    const d = value.replace(/\D/g, "").slice(0, 11);
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  async function handleFinishOrder() {
    if (submitting) return;
    if (!mesaSessionIsActive || !tableSession?.tableId || !restaurantId) {
      toast.error("Valide o PIN da mesa para continuar.");
      return;
    }
    if (cart.items.length === 0) {
      toast.error("Adicione produtos antes de finalizar.");
      return;
    }
    if (customerName.trim().length < 2) {
      toast.error("Digite seu nome para concluir.");
      return;
    }
    if (customerCpf.replace(/\D/g, "").length !== 11) {
      toast.error("Digite um CPF válido.");
      return;
    }
    const items = cart.items.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      notes: item.notes || undefined,
    }));
    try {
      setSubmitting(true);
      if (paymentMethod === "PIX") {
        const pixPayment = await ordersService.createPixPayment({
          restaurantId,
          type: "MESA",
          tableId: Number(tableSession.tableId),
          paymentMethod: "PIX",
          customerName: customerName.trim(),
          customerCpf: customerCpf.replace(/\D/g, ""),
          observation: observation.trim() || undefined,
          items,
        });
        setCheckoutOpen(false);
        setPixPaymentData({
          orderId: Number(pixPayment?.orderId || 0),
          total: Number(pixPayment?.totalAmount || cart.subtotal),
          paymentId: String(pixPayment?.paymentId || ""),
          provider: String(
            pixPayment?.provider || "MERCADO_PAGO",
          ).toUpperCase(),
          pixCode: String(pixPayment?.qrCode || ""),
          qrCodeBase64: pixPayment?.qrCodeBase64 || null,
        });
        toast.info("Pagamento PIX iniciado. Aguardando confirmação...");
        return;
      }
      const created = await ordersService.createOrder({
        restaurantId,
        type: "MESA",
        tableId: Number(tableSession.tableId),
        paymentMethod,
        paid: false,
        customerName: customerName.trim(),
        customerCpf: customerCpf.replace(/\D/g, ""),
        observation: observation.trim() || undefined,
        items,
      });
      setCheckoutOpen(false);
      setOrderSuccess({ orderId: Number(created?.id || 0), paymentMethod });
      toast.success("Pedido realizado com sucesso!");
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Erro ao finalizar pedido",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const categories: MenuCategory[] = useMemo(() => {
    const seen = new Set<string>();
    const cats: MenuCategory[] = [{ id: "all", name: "Categorias", icon: "◇" }];
    products.forEach((p) => {
      if (p.categoryId && !seen.has(p.categoryId)) {
        seen.add(p.categoryId);
        cats.push({ id: p.categoryId, name: p.categoryId, icon: "◈" });
      }
    });
    return cats;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const s = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCat =
        activeCategory === "all" || p.categoryId === activeCategory;
      const matchesSearch =
        !s || `${p.name} ${p.description}`.toLowerCase().includes(s);
      return matchesCat && matchesSearch;
    });
  }, [products, activeCategory, search]);

  // ── PIX payment screen ───────────────────────────────────────────
  if (pixPaymentData) {
    return (
      <main
        className="digital-menu"
        style={
          { "--menu-primary": restaurantProfile.primaryColor } as CSSProperties
        }
      >
        <Suspense fallback={null}>
          <PixPaymentPanel
            pixPaymentData={pixPaymentData}
            formatCurrency={(v: number) =>
              v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            }
            onCopyPixKey={async () => {
              const code = String(pixPaymentData.pixCode || "");
              if (!code) return;
              try {
                await navigator.clipboard.writeText(code);
                toast.success("Código PIX copiado!");
              } catch {
                toast.error("Erro ao copiar código PIX");
              }
            }}
          />
        </Suspense>
      </main>
    );
  }

  // ── Order success screen ─────────────────────────────────────────
  if (orderSuccess) {
    return (
      <main
        className="digital-menu"
        style={
          { "--menu-primary": restaurantProfile.primaryColor } as CSSProperties
        }
      >
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h2
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "2rem",
                fontWeight: 400,
                margin: "0 0 12px",
              }}
            >
              Pedido recebido!
            </h2>
            <p style={{ color: "#756f69", marginBottom: 24 }}>
              Pedido #{orderSuccess.orderId} foi enviado para a cozinha.
            </p>
            <button
              className="checkout-button"
              type="button"
              onClick={() => setOrderSuccess(null)}
            >
              Fazer novo pedido
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── No mesa context ──────────────────────────────────────────────
  if (!isMesaContext) {
    return (
      <main className="digital-menu">
        <div className="digital-menu__container" style={{ paddingTop: 60 }}>
          <div className="digital-menu__empty">
            <span>◎</span>
            <strong>Acesso exclusivo por QR da mesa</strong>
            <p>Escaneie o QR Code da mesa para acessar o cardápio digital.</p>
          </div>
        </div>
      </main>
    );
  }

  // ── PIN gate ─────────────────────────────────────────────────────
  if (!mesaSessionIsActive) {
    return (
      <main
        className="digital-menu"
        style={
          { "--menu-primary": restaurantProfile.primaryColor } as CSSProperties
        }
      >
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "20px",
            background: "var(--dm-light-bg, #eef1f6)",
          }}
        >
          <div
            style={{
              width: "min(520px,100%)",
              background: "white",
              borderRadius: 18,
              padding: "clamp(24px,4vw,40px)",
              border: "1px solid rgba(0,0,0,.08)",
              boxShadow: "0 18px 40px rgba(48,22,53,.1)",
            }}
          >
            {restaurantProfile.coverImage && (
              <div
                style={{
                  height: 120,
                  borderRadius: 12,
                  background: `url(${restaurantProfile.coverImage}) center/cover`,
                  marginBottom: 20,
                }}
              />
            )}
            <div
              style={{
                display: "inline-block",
                marginBottom: 12,
                padding: "6px 14px",
                background: "rgba(90,39,87,.1)",
                border: "1px solid rgba(90,39,87,.3)",
                borderRadius: 999,
                color: "#4b2453",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              Mesa {String(tableNumber || routeTableId)}
            </div>
            <h1
              style={{
                fontFamily: "'DM Serif Display',serif",
                fontSize: "clamp(1.6rem,5vw,2.2rem)",
                fontWeight: 400,
                margin: "0 0 8px",
                color: "#211d1a",
              }}
            >
              {restaurantProfile.name}
            </h1>
            <p
              style={{
                color: "#756f69",
                fontSize: 14,
                lineHeight: 1.6,
                margin: "0 0 20px",
              }}
            >
              Digite o PIN informado pelo garçom para liberar o cardápio desta
              mesa.
            </p>
            <form
              onSubmit={handleValidatePin}
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
                  height: 52,
                  border: "1px solid rgba(90,39,87,.24)",
                  borderRadius: 12,
                  padding: "0 16px",
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
                  minHeight: 50,
                  background: "linear-gradient(135deg,#5a2757,#7d2f79)",
                  color: "white",
                  border: 0,
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                  opacity: isPinValidating ? 0.6 : 1,
                }}
              >
                {isPinValidating ? "Validando..." : "Liberar cardápio"}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  // ── Main menu ─────────────────────────────────────────────────────
  return (
    <main
      className="digital-menu"
      style={
        { "--menu-primary": restaurantProfile.primaryColor } as CSSProperties
      }
    >
      <MenuHeader
        restaurant={restaurantProfile}
        cartCount={cart.count}
        search={search}
        onSearch={setSearch}
        onOpenCart={() => setCartOpen(true)}
      />

      <div className="digital-menu__container">
        <RestaurantSummary restaurant={restaurantProfile} />
        <CategoryRail
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />

        <section className="digital-menu__products">
          <header>
            <div>
              <span>
                {search
                  ? `Resultados para "${search}"`
                  : activeCategory === "all"
                    ? "Cardápio completo"
                    : activeCategory}
              </span>
              <h2>
                {activeCategory === "all"
                  ? "Escolha seu próximo favorito"
                  : activeCategory}
              </h2>
            </div>
            <small>{filteredProducts.length} produtos</small>
          </header>

          {loadingProducts ? (
            <div className="digital-menu__empty">
              <span>◷</span>
              <strong>Carregando cardápio...</strong>
            </div>
          ) : filteredProducts.length ? (
            <div className="digital-menu__grid">
              {filteredProducts.map((product) => (
                <MenuProductCard
                  key={product.id}
                  product={product}
                  onSelect={setSelectedProduct}
                />
              ))}
            </div>
          ) : (
            <div className="digital-menu__empty">
              <span>⌕</span>
              <strong>Nenhum produto encontrado</strong>
              <p>Tente buscar outro nome ou escolha uma categoria.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("all");
                }}
              >
                Limpar filtros
              </button>
            </div>
          )}
        </section>
      </div>

      <button
        className={`floating-cart ${cart.count ? "visible" : ""}`}
        type="button"
        onClick={() => setCartOpen(true)}
      >
        <span>
          🛒 {cart.count} {cart.count === 1 ? "item" : "itens"}
        </span>
        <strong>
          {cart.subtotal.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </strong>
      </button>

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAdd={(
          product: MenuProduct,
          quantity: number,
          options: ProductOption[],
          notes: string,
        ) => {
          cart.addItem(product, quantity, options, notes);
          setSelectedProduct(null);
          setCartOpen(true);
        }}
      />

      <MenuCart
        open={cartOpen}
        restaurant={restaurantProfile}
        items={cart.items}
        subtotal={cart.subtotal}
        onClose={() => setCartOpen(false)}
        onQuantity={cart.updateQuantity}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      {/* ── Checkout overlay ── */}
      {checkoutOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(28,23,20,.6)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
          onClick={() => setCheckoutOpen(false)}
        >
          <div
            style={{
              width: "min(480px,100%)",
              background: "white",
              borderRadius: 18,
              padding: "clamp(20px,4vw,36px)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: "'DM Serif Display',serif",
                  fontSize: "1.6rem",
                  fontWeight: 400,
                }}
              >
                Finalizar pedido
              </h2>
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                style={{
                  background: "none",
                  border: "1px solid #ddd",
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  cursor: "pointer",
                  fontSize: 20,
                }}
              >
                ×
              </button>
            </div>

            <label
              style={{
                display: "grid",
                gap: 6,
                marginBottom: 14,
                fontSize: 11,
                fontWeight: 800,
                color: "#6b6460",
              }}
            >
              <span>Seu nome *</span>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex.: João Silva"
                style={{
                  height: 44,
                  border: "1px solid #ddd3cb",
                  borderRadius: 8,
                  padding: "0 13px",
                  fontFamily: "inherit",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 6,
                marginBottom: 14,
                fontSize: 11,
                fontWeight: 800,
                color: "#6b6460",
              }}
            >
              <span>CPF *</span>
              <input
                value={customerCpf}
                onChange={(e) => setCustomerCpf(formatCpfInput(e.target.value))}
                placeholder="000.000.000-00"
                style={{
                  height: 44,
                  border: "1px solid #ddd3cb",
                  borderRadius: 8,
                  padding: "0 13px",
                  fontFamily: "inherit",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 6,
                marginBottom: 14,
                fontSize: 11,
                fontWeight: 800,
                color: "#6b6460",
              }}
            >
              <span>Forma de pagamento *</span>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value as "PIX" | "CARTAO" | "DINHEIRO",
                  )
                }
                style={{
                  height: 44,
                  border: "1px solid #ddd3cb",
                  borderRadius: 8,
                  padding: "0 13px",
                  fontFamily: "inherit",
                  fontSize: 13,
                  outline: "none",
                  background: "white",
                }}
              >
                <option value="PIX">Pix</option>
                <option value="CARTAO">Cartão</option>
                <option value="DINHEIRO">Dinheiro na mesa</option>
              </select>
            </label>

            <label
              style={{
                display: "grid",
                gap: 6,
                marginBottom: 20,
                fontSize: 11,
                fontWeight: 800,
                color: "#6b6460",
              }}
            >
              <span>Observação (opcional)</span>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex.: sem cebola, alergia a amendoim..."
                rows={3}
                style={{
                  border: "1px solid #ddd3cb",
                  borderRadius: 8,
                  padding: "10px 13px",
                  fontFamily: "inherit",
                  fontSize: 13,
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </label>

            <div
              style={{
                padding: "14px 0",
                borderTop: "1px solid #ece4dd",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#211d1a",
                }}
              >
                <span>Total</span>
                <span>
                  {cart.subtotal.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>
            </div>

            <button
              className="checkout-button"
              type="button"
              disabled={submitting}
              onClick={handleFinishOrder}
              style={{ width: "100%", minHeight: 52, fontSize: 15 }}
            >
              {submitting
                ? "Enviando..."
                : paymentMethod === "PIX"
                  ? "Gerar QR Code PIX"
                  : "Confirmar pedido"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
