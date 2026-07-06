import { useEffect, useMemo, useRef, useState } from "react";
import {
  ShoppingBag,
  X,
  ArrowLeft,
  House,
  AtSign,
  Search,
  Menu,
  Grid2x2,
  Square,
  ChevronUp,
  Star,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { useParams, useSearchParams } from "react-router-dom";
import menuService from "../../Services/menuService";
import ordersService from "../../Services/ordersService";
import tableSessionService from "../../Services/tableSessionService";
import restaurantSettingsService from "../../Services/restaurantSettingsService";
import {
  connectTableSessionSocket,
  disconnectTableSessionSocket,
} from "../../Services/socketService";
import * as S from "./styles";

const MENU_RESTAURANT_KEY = "menuRestaurantId";
const MIN_CONFIRMATION_DELAY_MS = 5000;
const CONFIRMED_STATE_DELAY_MS = 2000;
const PRODUCT_DETAIL_CLOSE_MS = 240;

function toInt(value) {
  const parsed = Number(value || 0);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toPrice(value) {
  return Number(value || 0)
    .toFixed(2)
    .replace(".", ",");
}

function formatCpfInput(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 11);

  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function readTableSession() {
  try {
    return JSON.parse(localStorage.getItem("tableSession") || "null");
  } catch {
    return null;
  }
}

function normalizeInstagramUrl(value) {
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

export default function DigitalMenu() {
  const { tableNumber: tableNumberParam } = useParams();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState("pedido");
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [observation, setObservation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [tablePin, setTablePin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isPinValidating, setIsPinValidating] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isClosingProductDetail, setIsClosingProductDetail] = useState(false);
  const [restaurantProfile, setRestaurantProfile] = useState({
    name: "Restaurante",
    logo: "",
    coverImage: "",
    instagram: "",
  });
  const [tableSession, setTableSession] = useState(() => readTableSession());
  const pinRequestKeyRef = useRef("");
  const sessionClosedToastShownRef = useRef(false);
  const closeProductDetailTimeoutRef = useRef(null);

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
  const restaurantId = useMemo(() => {
    if (!isMesaContext) {
      return null;
    }

    if (mesaSessionIsActive) {
      return Number(tableSession?.restaurantId || 0) || null;
    }

    return routeRestaurantId || null;
  }, [
    isMesaContext,
    mesaSessionIsActive,
    tableSession?.restaurantId,
    routeRestaurantId,
  ]);

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
        toast.error(
          error?.response?.data?.error || "Erro ao carregar cardápio",
        );
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

        const fallbackImage = products.find((item) => item?.image)?.image || "";

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

        const fallbackImage = products.find((item) => item?.image)?.image || "";

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

    const socket = connectTableSessionSocket(tableSession.sessionToken);

    if (!socket) {
      return;
    }

    const onSessionClosed = () => {
      clearMesaSession(true);
    };

    socket.on("table:session-closed", onSessionClosed);

    return () => {
      socket.off("table:session-closed", onSessionClosed);
      disconnectTableSessionSocket();
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

  const categories = useMemo(() => {
    const categoryMap = new Map();

    products.forEach((item) => {
      const categoryName = String(item?.category?.name || "").trim();

      if (!categoryName) {
        return;
      }

      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          id: categoryName,
          label: categoryName,
          coverImage: item?.image || "",
        });
      }
    });

    return [
      {
        id: "all",
        label: "Categorias",
        coverImage: products.find((item) => item?.image)?.image || "",
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

    return source.reduce((acc, product) => {
      const categoryName = String(product?.category?.name || "Outros").trim();
      const key = categoryName || "Outros";

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(product);
      return acc;
    }, {});
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

  function addToCart(product) {
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

    const trimmedName = customerName.trim();
    const cpfDigits = customerCpf.replace(/\D/g, "");

    if (trimmedName.length < 2) {
      toast.error("Digite seu nome para concluir o pedido.");
      return;
    }

    if (cpfDigits.length !== 11) {
      toast.error("Digite um CPF válido com 11 dígitos.");
      return;
    }

    const startedAt = Date.now();

    try {
      setSubmitting(true);

      await ordersService.createOrder({
        restaurantId,
        type: "MESA",
        tableId: Number(tableSession.tableId),
        paymentMethod,
        customerName: trimmedName,
        customerCpf: cpfDigits,
        observation: observation.trim() || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
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
      setDrawerOpen(false);
      setDrawerStep("pedido");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Erro ao finalizar pedido");
      setIsConfirmed(false);
      setSubmitting(false);
    }
  }

  function handleScrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleOpenProductDetail(product) {
    setIsClosingProductDetail(false);
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

    closeProductDetailTimeoutRef.current = setTimeout(() => {
      setSelectedProduct(null);
      setIsClosingProductDetail(false);
      closeProductDetailTimeoutRef.current = null;
    }, PRODUCT_DETAIL_CLOSE_MS);
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
                        {groupItems.map((product) => (
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

                              <S.MenuItemBottom>
                                <S.Price>R$ {toPrice(product.price)}</S.Price>

                                <S.AddButton
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    addToCart(product);
                                  }}
                                >
                                  Adicionar
                                </S.AddButton>
                              </S.MenuItemBottom>
                            </S.MenuItemText>

                            <S.MenuItemImageWrap>
                              <S.MenuItemImage $image={product.image} />
                            </S.MenuItemImageWrap>
                          </S.MenuItemCard>
                        ))}
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
              <S.ProductDetailOverlay
                $closing={isClosingProductDetail}
                onClick={handleCloseProductDetail}
              >
                <S.ProductDetailImage
                  $image={selectedProduct.image}
                  $closing={isClosingProductDetail}
                  onClick={(event) => event.stopPropagation()}
                >
                  <S.ProductDetailBackButton
                    type="button"
                    onClick={handleCloseProductDetail}
                  >
                    <ArrowLeft size={20} />
                  </S.ProductDetailBackButton>
                </S.ProductDetailImage>

                <S.ProductDetailBody
                  $closing={isClosingProductDetail}
                  onClick={(event) => event.stopPropagation()}
                >
                  <h2>{selectedProduct.name}</h2>
                  <p>
                    {selectedProduct.description ||
                      "Sem descrição disponível para este item."}
                  </p>

                  <S.ProductDetailPrice>
                    R$ {toPrice(selectedProduct.price)}
                  </S.ProductDetailPrice>

                  <S.ProductDetailRatingText>
                    Deixe sua avaliação para este item
                  </S.ProductDetailRatingText>

                  <S.ProductDetailStars>
                    <Star size={34} />
                    <Star size={34} />
                    <Star size={34} />
                    <Star size={34} />
                    <Star size={34} />
                  </S.ProductDetailStars>

                  <S.ProductDetailActions>
                    <S.AddButton
                      type="button"
                      onClick={() => addToCart(selectedProduct)}
                    >
                      Adicionar ao pedido
                    </S.AddButton>
                  </S.ProductDetailActions>
                </S.ProductDetailBody>
              </S.ProductDetailOverlay>
            ) : null}

            <S.Overlay
              $open={drawerOpen}
              onClick={() => setDrawerOpen(false)}
            />

            <S.Drawer $open={drawerOpen}>
              <S.DrawerHeader>
                <h2>Seu Pedido</h2>
                <S.DrawerTotal>R$ {toPrice(cartTotal)}</S.DrawerTotal>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </S.DrawerHeader>

              <S.DrawerTabs>
                <S.DrawerTab
                  type="button"
                  $active={drawerStep === "pedido"}
                  onClick={() => setDrawerStep("pedido")}
                >
                  Pedido
                </S.DrawerTab>
                <S.DrawerTab
                  type="button"
                  $active={drawerStep === "finalizar"}
                  onClick={() => setDrawerStep("finalizar")}
                >
                  Finalizar
                </S.DrawerTab>
              </S.DrawerTabs>

              <S.DrawerContent>
                {drawerStep === "pedido" ? (
                  <>
                    {cart.length === 0 ? (
                      <S.EmptyHint>
                        Seu pedido está vazio. Adicione itens no cardápio.
                      </S.EmptyHint>
                    ) : (
                      cart.map((item) => (
                        <S.CartLine key={item.productId}>
                          <div>
                            <strong>{item.name}</strong>
                            <S.Tiny>
                              {item.quantity} x R$ {toPrice(item.price)}
                            </S.Tiny>
                          </div>

                          <S.QtyWrap>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, -1)}
                            >
                              -
                            </button>
                            <strong>{item.quantity}</strong>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, 1)}
                            >
                              +
                            </button>
                          </S.QtyWrap>
                        </S.CartLine>
                      ))
                    )}

                    <S.Summary>
                      <span>Total</span>
                      <strong>R$ {toPrice(cartTotal)}</strong>
                    </S.Summary>

                    <S.ActionButton
                      type="button"
                      style={{ marginTop: "0.9rem", width: "100%" }}
                      onClick={() => setDrawerStep("finalizar")}
                      disabled={cart.length === 0}
                    >
                      Ir para finalizar
                    </S.ActionButton>
                  </>
                ) : (
                  <>
                    <S.InputGrid>
                      <S.Label>
                        Nome completo
                        <input
                          type="text"
                          placeholder="Seu nome"
                          value={customerName}
                          onChange={(event) =>
                            setCustomerName(event.target.value)
                          }
                        />
                      </S.Label>

                      <S.Label>
                        CPF
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="000.000.000-00"
                          value={customerCpf}
                          onChange={(event) =>
                            setCustomerCpf(formatCpfInput(event.target.value))
                          }
                        />
                      </S.Label>

                      <S.Label>
                        Forma de pagamento
                        <select
                          value={paymentMethod}
                          onChange={(event) =>
                            setPaymentMethod(event.target.value)
                          }
                        >
                          <option value="PIX">PIX</option>
                          <option value="CARTAO">Cartão</option>
                          <option value="DINHEIRO">Dinheiro</option>
                        </select>
                      </S.Label>

                      <S.Label>
                        Observação (opcional)
                        <textarea
                          placeholder="Ex.: sem cebola, embalagem separada..."
                          value={observation}
                          onChange={(event) =>
                            setObservation(event.target.value)
                          }
                        />
                      </S.Label>
                    </S.InputGrid>

                    <S.Summary>
                      <span>
                        <CreditCard size={15} style={{ marginRight: 6 }} />{" "}
                        Total
                      </span>
                      <strong>R$ {toPrice(cartTotal)}</strong>
                    </S.Summary>

                    <S.CheckoutButton
                      type="button"
                      onClick={handleFinishOrder}
                      disabled={cart.length === 0 || submitting || isConfirmed}
                      style={
                        isConfirmed
                          ? {
                              background:
                                "linear-gradient(135deg, #0f172a, #1d4ed8)",
                              color: "#ffffff",
                              border: "1px solid rgba(148, 163, 184, 0.32)",
                              boxShadow: "0 14px 28px rgba(29, 78, 216, 0.32)",
                              letterSpacing: "0.01em",
                            }
                          : undefined
                      }
                    >
                      {isConfirmed ? (
                        <>
                          <CheckCircle size={18} style={{ marginRight: 6 }} />
                          Confirmado
                        </>
                      ) : submitting ? (
                        "Confirmando pedido..."
                      ) : (
                        <>
                          <CheckCircle size={18} style={{ marginRight: 6 }} />
                          Confirmar e Fazer Pedido
                        </>
                      )}
                    </S.CheckoutButton>

                    <S.InlineInfo>
                      Nome e CPF são usados para identificar seu pedido no
                      painel dos funcionários.
                    </S.InlineInfo>
                  </>
                )}
              </S.DrawerContent>
            </S.Drawer>
          </>
        )}
      </S.Page>
    </>
  );
}
