import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import {
  Utensils,
  User,
  LogOut,
  ShoppingBag,
  ShoppingCart,
  Sun,
  Moon,
  Layers,
  Shield,
} from "lucide-react";
import { toast } from "react-toastify";
import menuService from "../../Services/menuService";
import tableSessionService from "../../Services/tableSessionService";
import { resolveCategoryIcon } from "../../config/categoryIconMap";
import { useAuth } from "../../contexts/authContext";
import * as S from "./styles";

const HomeAddressPicker = lazy(() => import("./components/HomeAddressPicker"));
const HomeFooter = lazy(() => import("./components/HomeFooter"));

const ADDRESS_STORAGE_KEY = "@PecaJaFood:enderecos";
const ADDRESS_SELECTED_KEY = "@PecaJaFood:enderecoSelecionadoId";

function toPositiveNumber(value) {
  const parsed = Number(value || 0);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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

function normalizeAddress(address) {
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
  };
}

function getInitialAddresses(user) {
  const storedAddresses = readJsonStorage(ADDRESS_STORAGE_KEY, null);

  if (Array.isArray(storedAddresses) && storedAddresses.length > 0) {
    return storedAddresses.map(normalizeAddress);
  }

  if (user?.address || user?.district || user?.city) {
    return [
      normalizeAddress({
        id: user?.defaultAddressId || 1,
        rotulo: user?.defaultAddressLabel || "Principal",
        rua: user?.address || "",
        numero: user?.number || "",
        bairro: user?.district || "",
        cidade: user?.city || "",
        estado: user?.state || "",
        cep: user?.zipCode || "",
        complemento: user?.complement || "",
      }),
    ];
  }

  return [];
}

function getInitialSelectedAddressId(addresses) {
  const storedSelected = Number(
    localStorage.getItem(ADDRESS_SELECTED_KEY) || 0,
  );

  if (
    storedSelected &&
    addresses.some((address) => address.id === storedSelected)
  ) {
    return storedSelected;
  }

  return addresses[0]?.id || null;
}

export default function Home() {
  const navigate = useNavigate();
  const { tableNumber: routeTableNumber } = useParams();
  const [searchParams] = useSearchParams();
  const { user, logout, login } = useAuth();

  const routeTableNumberValue = toPositiveNumber(routeTableNumber);
  const routeRestaurantId = toPositiveNumber(
    searchParams.get("restaurantId") ||
      searchParams.get("restauranteId") ||
      searchParams.get("rid"),
  );
  const routeTableId =
    toPositiveNumber(
      searchParams.get("tableId") ||
        searchParams.get("mesaId") ||
        searchParams.get("tid"),
    ) || routeTableNumberValue;
  const mesaMode = Boolean(routeTableNumberValue || routeTableId);
  const hasRouteRestaurantId = Boolean(routeRestaurantId);

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() =>
    readJsonStorage("cartItems", []).map((item) => ({
      ...item,
      price: Number(item?.price || 0),
      quantity: Number(item?.quantity || 1),
    })),
  );
  const [activeCategory, setActiveCategory] = useState("todos");
  const [isDarkMode, setIsDarkMode] = useState(
    () => readJsonStorage("isDarkMode", false) === true,
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddressMenuOpen, setIsAddressMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 640 : false,
  );
  const [tablePin, setTablePin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isPinValidating, setIsPinValidating] = useState(false);
  const [tableSession, setTableSession] = useState(() =>
    readJsonStorage("tableSession", null),
  );
  const [addresses] = useState(() => getInitialAddresses(user));
  const [selectedAddressId, setSelectedAddressId] = useState(() =>
    getInitialSelectedAddressId(getInitialAddresses(user)),
  );

  const dropdownRef = useRef(null);

  const selectedAddress =
    addresses.find((address) => address.id === selectedAddressId) ||
    addresses[0] ||
    null;
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

  useEffect(() => {
    localStorage.setItem("isDarkMode", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(addresses));
  }, [addresses]);

  useEffect(() => {
    if (!mesaMode || !tableSession?.sessionToken) {
      return;
    }

    const isSameTable = Number(tableSession?.tableId) === Number(routeTableId);
    const isSameRestaurant =
      !hasRouteRestaurantId ||
      Number(tableSession?.restaurantId) === Number(routeRestaurantId);

    if (!isSameTable || !isSameRestaurant) {
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

  const restaurantId = mesaMode
    ? routeRestaurantId ||
      Number(
        JSON.parse(localStorage.getItem("tableSession") || "null")
          ?.restaurantId,
      ) ||
      null
    : user?.restaurantId ||
      routeRestaurantId ||
      Number(localStorage.getItem("menuRestaurantId")) ||
      Number(
        JSON.parse(localStorage.getItem("tableSession") || "null")
          ?.restaurantId,
      ) ||
      null;

  const dynamicCategories = Array.from(
    new Set(products.map((item) => item?.category?.name).filter(Boolean)),
  ).map((name) => {
    const Icon = resolveCategoryIcon(name);

    return {
      id: name,
      label: name,
      icon: <Icon size={16} />,
    };
  });

  const allCategories = [
    { id: "todos", label: "Todos", icon: <Layers size={16} /> },
    ...dynamicCategories,
  ];

  useEffect(() => {
    if (!restaurantId) {
      return;
    }

    let mounted = true;

    async function loadProducts() {
      try {
        localStorage.setItem("menuRestaurantId", String(restaurantId));
        const data = await menuService.listProducts(Number(restaurantId));
        if (mounted) {
          setProducts(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        toast.error(err?.response?.data?.error || "Erro ao carregar cardápio");
      }
    }

    loadProducts();

    return () => {
      mounted = false;
    };
  }, [restaurantId]);

  useEffect(() => {
    if (!mesaMode || !mesaSessionIsActive) {
      return;
    }

    if (tableSession?.restaurantId) {
      localStorage.setItem(
        "menuRestaurantId",
        String(tableSession.restaurantId),
      );
    }
  }, [mesaMode, mesaSessionIsActive, tableSession]);

  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    function handleResize() {
      setIsMobileViewport(window.innerWidth <= 640);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }

      if (
        !event.target.closest?.("[data-address-picker]") &&
        !event.target.closest?.("[data-address-menu]")
      ) {
        setIsAddressMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelectAddress(address) {
    setSelectedAddressId(address.id);
    localStorage.setItem(ADDRESS_SELECTED_KEY, String(address.id));

    const token = localStorage.getItem("token");
    const currentUser = readJsonStorage("user", user || {});

    const nextUser = {
      ...currentUser,
      address: address.rua,
      number: address.numero,
      district: address.bairro,
      city: address.cidade,
      state: address.estado,
      zipCode: address.cep,
      complement: address.complemento,
      defaultAddressId: address.id,
      defaultAddressLabel: address.rotulo,
    };

    if (token) {
      login(nextUser, token);
    } else {
      localStorage.setItem("user", JSON.stringify(nextUser));
    }

    setIsAddressMenuOpen(false);
  }

  function addToCart(product) {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.productId === product.id);

      if (existing) {
        return prevCart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...prevCart,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: 1,
        },
      ];
    });
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  async function handleValidateTablePin(event) {
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

      const nextTableSession = {
        sessionToken: result.sessionToken,
        sessionId: result.sessionId,
        tableId: Number(result.tableId || routeTableId),
        tableNumber:
          Number(
            result.tableNumber ||
              mesaLabel ||
              routeTableNumberValue ||
              routeTableId,
          ) || null,
        restaurantId:
          Number(result.restaurantId || routeRestaurantId || 0) || null,
      };

      if (
        Number(nextTableSession.tableId) !== Number(routeTableId) ||
        (hasRouteRestaurantId &&
          Number(nextTableSession.restaurantId) !== Number(routeRestaurantId))
      ) {
        throw new Error("Sessão da mesa inválida para este QR.");
      }

      localStorage.setItem("tableSession", JSON.stringify(nextTableSession));
      localStorage.setItem("tableSessionToken", result.sessionToken);

      if (nextTableSession.restaurantId) {
        localStorage.setItem(
          "menuRestaurantId",
          String(nextTableSession.restaurantId),
        );
      }

      setTableSession(nextTableSession);
      setTablePin("");
      toast.success(`Mesa ${nextTableSession.tableNumber} liberada!`);
    } catch (error) {
      const message =
        error?.response?.data?.error || error?.message || "Erro ao validar PIN";
      setPinError(message);
      toast.error(message);
    } finally {
      setIsPinValidating(false);
    }
  }

  if (mesaMode && !hasValidQrContext) {
    return (
      <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
        <S.HomeLayout>
          <S.Navbar>
            <S.Brand>
              <Utensils size={24} strokeWidth={2.5} />
              <span>Peça já food</span>
            </S.Brand>

            <S.ThemeToggleButton onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </S.ThemeToggleButton>
          </S.Navbar>

          <div
            style={{
              minHeight: "calc(100vh - 72px)",
              display: "grid",
              placeItems: "center",
              padding: "1.25rem",
              background: isDarkMode
                ? "radial-gradient(circle at top, rgba(249,115,22,0.18), transparent 30%), linear-gradient(180deg, #0f172a 0%, #111827 100%)"
                : "radial-gradient(circle at top, rgba(234,179,8,0.18), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 560,
                background: isDarkMode ? "#111827" : "#ffffff",
                border: `1px solid ${isDarkMode ? "#243041" : "#e2e8f0"}`,
                borderRadius: 28,
                padding: "1.5rem",
                boxShadow: isDarkMode
                  ? "0 22px 70px rgba(0,0,0,0.32)"
                  : "0 22px 70px rgba(15,23,42,0.12)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: isDarkMode ? "#fdba74" : "#c2410c",
                  marginBottom: 10,
                }}
              >
                Acesso por QR Code
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(1.6rem, 6vw, 2.2rem)",
                  lineHeight: 1.1,
                  color: isDarkMode ? "#f8fafc" : "#0f172a",
                }}
              >
                Link inválido da mesa
              </h1>
              <p
                style={{
                  margin: "0.8rem 0 0",
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: isDarkMode ? "#cbd5e1" : "#475569",
                }}
              >
                Para abrir o cardápio digital, escaneie o QR oficial da mesa. O
                link precisa conter a identificação completa da mesa e do
                restaurante.
              </p>
              <button
                type="button"
                onClick={() =>
                  toast.info(
                    `Peça ao funcionário para escanear o QR oficial${mesaLabel ? ` da Mesa ${mesaLabel}` : " da sua mesa"}.`,
                  )
                }
                style={{
                  marginTop: "1rem",
                  border: "none",
                  borderRadius: 999,
                  padding: "0.6rem 0.95rem",
                  background: isDarkMode
                    ? "linear-gradient(135deg, #f59e0b, #fb7185)"
                    : "linear-gradient(135deg, #f59e0b, #facc15)",
                  color: "#0f172a",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 8px 18px rgba(217, 119, 6, 0.22)",
                }}
              >
                Como acessar com QR oficial
              </button>
            </div>
          </div>
        </S.HomeLayout>
      </ThemeProvider>
    );
  }

  if (mesaMode && !mesaSessionIsActive) {
    return (
      <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
        <S.HomeLayout>
          <S.Navbar>
            <S.Brand>
              <Utensils size={24} strokeWidth={2.5} />
              <span>Peça já food</span>
            </S.Brand>

            <S.ThemeToggleButton onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </S.ThemeToggleButton>
          </S.Navbar>

          <div
            style={{
              minHeight: "calc(100vh - 72px)",
              display: "grid",
              placeItems: "center",
              padding: "1.25rem",
              background: isDarkMode
                ? "radial-gradient(circle at top, rgba(249,115,22,0.18), transparent 30%), linear-gradient(180deg, #0f172a 0%, #111827 100%)"
                : "radial-gradient(circle at top, rgba(234,179,8,0.18), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 560,
                background: isDarkMode ? "#111827" : "#ffffff",
                border: `1px solid ${isDarkMode ? "#243041" : "#e2e8f0"}`,
                borderRadius: 28,
                padding: "1.4rem",
                boxShadow: isDarkMode
                  ? "0 22px 70px rgba(0,0,0,0.32)"
                  : "0 22px 70px rgba(15,23,42,0.12)",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0.6rem 0.9rem",
                  borderRadius: 999,
                  background: isDarkMode
                    ? "rgba(249,115,22,0.12)"
                    : "rgba(249,115,22,0.10)",
                  color: isDarkMode ? "#fdba74" : "#c2410c",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontSize: 12,
                  marginBottom: 18,
                }}
              >
                Mesa {mesaLabel || ""}
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(2rem, 7vw, 2.7rem)",
                  lineHeight: 1.05,
                  color: isDarkMode ? "#f8fafc" : "#0f172a",
                }}
              >
                Cardápio digital da mesa
              </h1>
              <p
                style={{
                  margin: "0.75rem 0 0",
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: isDarkMode ? "#cbd5e1" : "#475569",
                }}
              >
                O QR da Mesa {mesaLabel || ""} foi reconhecido. Agora digite o
                PIN que o funcionário informou para liberar os pedidos desta
                mesa.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                  gap: 10,
                  marginTop: 18,
                }}
              >
                {["Escaneie o QR", "Digite o PIN", "Faça o pedido"].map(
                  (step) => (
                    <div
                      key={step}
                      style={{
                        borderRadius: 18,
                        padding: "0.8rem",
                        background: isDarkMode ? "#1f2937" : "#f8fafc",
                        color: isDarkMode ? "#e2e8f0" : "#0f172a",
                        border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
                        fontSize: 12,
                        fontWeight: 700,
                        textAlign: "center",
                      }}
                    >
                      {step}
                    </div>
                  ),
                )}
              </div>

              <form onSubmit={handleValidateTablePin}>
                <div style={{ marginTop: "1.5rem" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 700,
                      color: isDarkMode ? "#e2e8f0" : "#334155",
                    }}
                  >
                    PIN da Mesa {mesaLabel || ""}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Ex: 1234"
                    value={tablePin}
                    onChange={(event) => setTablePin(event.target.value)}
                    style={{ width: "100%", borderRadius: 16 }}
                  />
                </div>

                {pinError && (
                  <p style={{ color: "#ef4444", marginTop: "0.75rem" }}>
                    {pinError}
                  </p>
                )}

                <S.AddToCartButton
                  as="button"
                  type="submit"
                  style={{ marginTop: "1.25rem", width: "100%" }}
                  disabled={isPinValidating}
                >
                  {isPinValidating ? "Validando..." : "Liberar cardápio"}
                </S.AddToCartButton>
              </form>
            </div>
          </div>
        </S.HomeLayout>
      </ThemeProvider>
    );
  }

  const totalItens = cart.reduce(
    (acc, item) => acc + Number(item.quantity || 0),
    0,
  );

  const filteredProducts =
    activeCategory === "todos"
      ? products
      : products.filter((item) => item?.category?.name === activeCategory);

  const addressPanelBackground = isDarkMode
    ? "linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.96))"
    : "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(241, 245, 249, 0.96))";
  const addressPanelText = isDarkMode ? "#f8fafc" : "#0f172a";
  const addressPanelMuted = isDarkMode ? "#cbd5e1" : "#475569";
  const addressPanelBorder = isDarkMode
    ? "rgba(148, 163, 184, 0.25)"
    : "rgba(148, 163, 184, 0.22)";
  const addressDropdownBackground = isDarkMode
    ? "linear-gradient(180deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98))"
    : "linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(248, 250, 252, 0.98))";

  return (
    <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
      <S.HomeLayout>
        <S.Navbar>
          <S.Brand>
            <Utensils size={24} strokeWidth={2.5} />
            <span>Peça já food</span>
          </S.Brand>

          <S.NavRight>
            {user?.role === "ADMIN" ? (
              <S.AdminQuickButton onClick={() => navigate("/admin")}>
                <Shield size={16} /> Admin
              </S.AdminQuickButton>
            ) : null}

            <S.CartButtonContainer onClick={() => navigate("/cart")}>
              <ShoppingCart size={20} />
              {totalItens > 0 && <S.Badge>{totalItens}</S.Badge>}
            </S.CartButtonContainer>

            <S.ThemeToggleButton onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </S.ThemeToggleButton>

            {user && (
              <S.UserMenuContainer ref={dropdownRef}>
                <S.AvatarButton
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isDarkMode ? "#2d2d3a" : "#f3f4f6",
                    color: isDarkMode ? "#fff" : "#1f2937",
                    border: "2px solid var(--primary, #eab308)",
                  }}
                >
                  <User size={25} />
                </S.AvatarButton>

                {isDropdownOpen && (
                  <S.DropdownMenu>
                    <S.DropdownHeader>
                      <span className="name">{user?.name || "Usuário"}</span>
                      <span className="email">{user?.email || "-"}</span>
                    </S.DropdownHeader>
                    <S.DropdownItem onClick={() => navigate("/profile")}>
                      <User size={18} /> Meu Perfil
                    </S.DropdownItem>
                    <S.DropdownItem onClick={() => navigate("/profile/orders")}>
                      <ShoppingBag size={18} /> Meus Pedidos
                    </S.DropdownItem>
                    <S.DropdownItem $danger onClick={handleLogout}>
                      <LogOut size={18} /> Fazer Logout
                    </S.DropdownItem>
                  </S.DropdownMenu>
                )}
              </S.UserMenuContainer>
            )}
          </S.NavRight>
        </S.Navbar>

        <div
          style={{
            maxWidth: 1200,
            margin: "1rem auto 0 auto",
            padding: "0 clamp(0.85rem, 4vw, 2rem)",
          }}
        >
          {mesaMode && mesaSessionIsActive && (
            <div
              style={{
                marginBottom: 16,
                padding: "0.95rem 1rem",
                borderRadius: 20,
                background: isDarkMode
                  ? "linear-gradient(135deg, rgba(249,115,22,0.18), rgba(15,23,42,0.9))"
                  : "linear-gradient(135deg, rgba(249,115,22,0.10), rgba(255,255,255,0.98))",
                border: `1px solid ${isDarkMode ? "rgba(249,115,22,0.25)" : "rgba(249,115,22,0.20)"}`,
                boxShadow: isDarkMode
                  ? "0 18px 40px rgba(0,0,0,0.20)"
                  : "0 18px 40px rgba(15,23,42,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: isDarkMode ? "#fdba74" : "#c2410c",
                      marginBottom: 4,
                    }}
                  >
                    Mesa ativa
                  </div>
                  <strong style={{ fontSize: 18 }}>
                    Mesa {mesaLabel || ""}
                  </strong>
                  <div
                    style={{
                      fontSize: 13,
                      color: isDarkMode ? "#cbd5e1" : "#475569",
                      marginTop: 2,
                    }}
                  >
                    Seu pedido será enviado com essa mesa.
                  </div>
                </div>
                <div
                  style={{
                    padding: "0.55rem 0.85rem",
                    borderRadius: 999,
                    background: isDarkMode ? "#1f2937" : "#ffffff",
                    border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Cardápio liberado
                </div>
              </div>
            </div>
          )}

          {!mesaMode && (
            <Suspense fallback={null}>
              <HomeAddressPicker
                isDarkMode={isDarkMode}
                isMobileViewport={isMobileViewport}
                isAddressMenuOpen={isAddressMenuOpen}
                addresses={addresses}
                selectedAddress={selectedAddress}
                selectedAddressId={selectedAddressId}
                addressPanelBackground={addressPanelBackground}
                addressPanelText={addressPanelText}
                addressPanelMuted={addressPanelMuted}
                addressPanelBorder={addressPanelBorder}
                addressDropdownBackground={addressDropdownBackground}
                onToggleAddressMenu={() =>
                  setIsAddressMenuOpen((current) => !current)
                }
                onSelectAddress={handleSelectAddress}
                onNavigateProfile={() => navigate("/profile")}
              />
            </Suspense>
          )}
        </div>

        <S.MenuSection id="vitrine">
          <h2>Explore Nosso Cardápio</h2>

          <S.CategoriesContainer>
            {allCategories.map((cat) => (
              <S.CategoryButton
                key={cat.id}
                $active={activeCategory === cat.id}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.icon}
                {cat.label}
              </S.CategoryButton>
            ))}
          </S.CategoriesContainer>

          <S.ProductsGrid>
            {filteredProducts.map((item) => (
              <S.ProductCard key={item.id}>
                <S.ProductImage>
                  <img
                    src={
                      item.image ||
                      "https://via.placeholder.com/400x260?text=Produto"
                    }
                    alt={item.name}
                  />
                </S.ProductImage>
                <S.ProductInfo>
                  <div className="title-row">
                    <h4>{item.name}</h4>
                    <span className="price">
                      R$ {Number(item.price || 0).toFixed(2)}
                    </span>
                  </div>
                  <p>{item.description || "Sem descrição"}</p>
                  <S.AddToCartButton onClick={() => addToCart(item)}>
                    <ShoppingCart size={18} /> Adicionar ao Pedido
                  </S.AddToCartButton>
                </S.ProductInfo>
              </S.ProductCard>
            ))}
          </S.ProductsGrid>

          {restaurantId == null && (
            <p style={{ marginTop: "1rem", opacity: 0.7 }}>
              Nenhum restaurante vinculado para carregar o cardápio.
            </p>
          )}
        </S.MenuSection>

        <Suspense fallback={null}>
          <HomeFooter
            onScrollMenu={() =>
              document
                .getElementById("vitrine")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            onNavigateCart={() => navigate("/cart")}
          />
        </Suspense>
      </S.HomeLayout>
    </ThemeProvider>
  );
}
