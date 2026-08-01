import { useState, useEffect, useMemo, type CSSProperties } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import menuService from "../../../Services/menuService";
import restaurantSettingsService from "../../../Services/restaurantSettingsService";
import tableSessionService from "../../../Services/tableSessionService";
import { useAuth } from "../../../contexts/authContext";
import { useCart } from "../hooks/useCart";
import { Header } from "../components/Header";
import { Hero } from "../components/Hero";
import { MenuSection } from "../components/MenuSection";
import { CartDrawer } from "../components/CartDrawer";
import { LoginModal } from "../components/LoginModal";
import { AboutSection } from "../components/AboutSection";
import { Footer } from "../components/Footer";
import type { Category, Product, TenantConfig } from "../types/home.types";
import "../styles/home.css";

function toPositiveNumber(value: unknown): number | null {
  const parsed = Number(value || 0);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isProductUnavailable(product: Product): boolean {
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

// Maps a raw backend product to the module's Product type
function mapProduct(raw: Record<string, unknown>): Product {
  return {
    id: Number(raw.id),
    categoryId: String(
      (raw.category as Record<string, unknown>)?.name ?? raw.categoryId ?? "",
    ),
    name: String(raw.name || ""),
    description: String(raw.description || ""),
    price: Number(raw.price || 0),
    image: String(raw.image || ""),
    active: raw.active as boolean | undefined,
    stock: raw.stock as number | string | null | undefined,
    category: raw.category as Product["category"],
  };
}

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { tableNumber: routeTableNumber, restaurantSlug } = useParams();
  const [searchParams] = useSearchParams();
  const cart = useCart();

  const [cartOpen, setCartOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [tablePin, setTablePin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isPinValidating, setIsPinValidating] = useState(false);
  const [tableSession, setTableSession] = useState<Record<
    string,
    unknown
  > | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("tableSession") || "null");
    } catch {
      return null;
    }
  });
  const [tenant, setTenant] = useState<TenantConfig>({
    name: "Peça Já Food",
    primaryColor: "#c95d3d",
    phone: "",
    address: "",
    socialLinks: [],
  });

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
  const mesaLabel =
    routeTableNumberValue || tableSession?.tableNumber || routeTableId || "";

  const hasValidQrContext =
    !mesaMode || Boolean(routeTableNumberValue && routeTableId);
  const mesaSessionIsActive =
    !mesaMode ||
    Boolean(
      tableSession?.sessionToken &&
      Number(tableSession?.tableId) === Number(routeTableId) &&
      (!routeRestaurantId ||
        Number(tableSession?.restaurantId) === Number(routeRestaurantId)),
    );

  const [resolvedRestaurantId, setResolvedRestaurantId] = useState<
    number | null
  >(null);

  const restaurantId = mesaMode
    ? routeRestaurantId ||
      Number(tableSession?.restaurantId || 0) ||
      resolvedRestaurantId ||
      null
    : normalizedSlug
      ? resolvedRestaurantId
      : (user as Record<string, unknown>)?.restaurantId ||
        Number(localStorage.getItem("menuRestaurantId")) ||
        null;

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
      .catch((err) => {
        if (!mounted) return;
        toast.error(
          err?.response?.data?.error || "Restaurante não encontrado.",
        );
      });
    return () => {
      mounted = false;
    };
  }, [normalizedSlug]);

  // Load restaurant profile (name, primary color, etc.)
  useEffect(() => {
    if (!restaurantId) return;
    let mounted = true;
    restaurantSettingsService
      .getPublicSettings(Number(restaurantId))
      .then((data) => {
        if (!mounted) return;
        const r = (data?.restaurant as Record<string, unknown>) ?? data ?? {};
        const name = String(r?.name || data?.restaurantName || "");
        const color = String(data?.primaryColor || "#c95d3d");
        const phone = String(data?.whatsapp || data?.phone || "");
        const address = String(data?.address || "");
        const instagram = String(data?.instagram || "");
        setTenant({
          name: name || "Peça Já Food",
          primaryColor: color,
          phone,
          address,
          instagram,
          socialLinks: instagram
            ? [
                {
                  name: "Instagram",
                  url: `https://instagram.com/${instagram.replace("@", "")}`,
                  icon: "◎",
                },
              ]
            : [],
        });
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
          setProducts(
            Array.isArray(data)
              ? data.map((p) => mapProduct(p as Record<string, unknown>))
              : [],
          );
      })
      .catch((err) =>
        toast.error(err?.response?.data?.error || "Erro ao carregar cardápio"),
      );
    return () => {
      mounted = false;
    };
  }, [restaurantId, normalizedSlug]);

  // Sync restaurantId from mesa session
  useEffect(() => {
    if (mesaMode && mesaSessionIsActive && tableSession?.restaurantId)
      localStorage.setItem(
        "menuRestaurantId",
        String(tableSession.restaurantId),
      );
  }, [mesaMode, mesaSessionIsActive, tableSession]);

  async function handleValidatePin(event: React.FormEvent) {
    event.preventDefault();
    if (!routeTableId || !routeTableNumberValue) {
      toast.error("QR da mesa inválido. Tente escanear novamente.");
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

  const dynamicCategoryIds = useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.categoryId).filter(Boolean))),
    [products],
  );

  const categories: Category[] = useMemo(
    () => [
      { id: "all", name: "Todos" },
      ...dynamicCategoryIds.map((id) => ({ id, name: id })),
    ],
    [dynamicCategoryIds],
  );

  // ── PIN Gate: invalid QR ──────────────────────────────────────
  if (mesaMode && !hasValidQrContext) {
    return (
      <div style={{ "--tenant-primary": tenant.primaryColor } as CSSProperties}>
        <header className="header">
          <a className="brand" href="#inicio">
            {tenant.name}
          </a>
          <nav />
          <div className="header-actions" />
        </header>
        <div className="pin-gate">
          <div className="pin-gate-card">
            <div className="mesa-badge">Acesso por QR Code</div>
            <h1>Link inválido da mesa</h1>
            <p>
              Para abrir o cardápio digital, escaneie o QR oficial da mesa com
              todos os parâmetros corretos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── PIN Gate: awaiting PIN ────────────────────────────────────
  if (mesaMode && !mesaSessionIsActive) {
    return (
      <div style={{ "--tenant-primary": tenant.primaryColor } as CSSProperties}>
        <header className="header">
          <a className="brand" href="#inicio">
            {tenant.name}
          </a>
          <nav />
          <div className="header-actions" />
        </header>
        <div className="pin-gate">
          <div className="pin-gate-card">
            <div className="mesa-badge">Mesa {String(mesaLabel)}</div>
            <h1>Cardápio digital da mesa</h1>
            <p>
              Digite o PIN de 4 dígitos informado pelo garçom para liberar o
              pedido.
            </p>
            <form onSubmit={handleValidatePin}>
              <input
                className="pin-input"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="PIN da mesa"
                value={tablePin}
                onChange={(e) =>
                  setTablePin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
              />
              {pinError && <p className="pin-error">{pinError}</p>}
              <button
                className="pin-submit"
                type="submit"
                disabled={isPinValidating}
              >
                {isPinValidating ? "Validando..." : "Liberar cardápio"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────
  return (
    <main style={{ "--tenant-primary": tenant.primaryColor } as CSSProperties}>
      <Header
        name={tenant.name}
        cartCount={cart.count}
        user={
          user
            ? {
                name: (user as Record<string, unknown>).name as string,
                email: (user as Record<string, unknown>).email as string,
                role: (user as Record<string, unknown>).role as string,
              }
            : null
        }
        onCart={() => setCartOpen(true)}
        onLogin={() => setLoginOpen(true)}
        onLogout={() => {
          logout();
          navigate("/login");
        }}
        onNavigate={navigate}
      />

      {!mesaMode && (
        <Hero restaurantName={tenant.name} onLogin={() => setLoginOpen(true)} />
      )}

      {mesaMode && mesaSessionIsActive && (
        <div
          className="mesa-active-banner"
          style={{ margin: "1rem clamp(1rem,4vw,2rem)" }}
        >
          <div>
            <strong>Mesa {String(mesaLabel)}</strong>
            <div style={{ fontSize: 13, color: "#756f69", marginTop: 4 }}>
              Seu pedido será enviado com essa mesa.
            </div>
          </div>
          <div className="mesa-active-badge">Cardápio liberado</div>
        </div>
      )}

      <MenuSection
        categories={categories}
        products={products}
        onAdd={(product) => {
          if (isProductUnavailable(product)) {
            toast.error(`Produto indisponível: ${product.name}`);
            return;
          }
          cart.add(product);
          setCartOpen(true);
        }}
      />

      {!mesaMode && <AboutSection />}

      {!mesaMode && <Footer tenant={tenant} />}

      <CartDrawer
        open={cartOpen}
        items={cart.items}
        total={cart.total}
        onClose={() => setCartOpen(false)}
        onAdd={(item) => cart.add(item)}
        onDecrease={cart.decrease}
      />

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </main>
  );
}
