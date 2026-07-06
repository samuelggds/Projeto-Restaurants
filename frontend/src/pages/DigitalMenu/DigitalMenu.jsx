import { useEffect, useMemo, useRef, useState } from "react";
import {
  ShoppingBag,
  X,
  Sparkles,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { useParams, useSearchParams } from "react-router-dom";
import menuService from "../../Services/menuService";
import ordersService from "../../Services/ordersService";
import tableSessionService from "../../Services/tableSessionService";
import {
  connectTableSessionSocket,
  disconnectTableSessionSocket,
} from "../../Services/socketService";
import * as S from "./styles";

const MENU_RESTAURANT_KEY = "menuRestaurantId";
const MIN_CONFIRMATION_DELAY_MS = 5000;
const CONFIRMED_STATE_DELAY_MS = 2000;

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
  const [tableSession, setTableSession] = useState(() => readTableSession());
  const pinRequestKeyRef = useRef("");
  const sessionClosedToastShownRef = useRef(false);

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
  }, [isMesaContext, routeTableId, routeRestaurantId]);

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

  const categories = useMemo(() => {
    const names = Array.from(
      new Set(products.map((item) => item?.category?.name).filter(Boolean)),
    );

    return [
      { id: "all", label: "Todos" },
      ...names.map((name) => ({ id: name, label: name })),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") {
      return products;
    }

    return products.filter((item) => item?.category?.name === activeCategory);
  }, [products, activeCategory]);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    );
  }, [cart]);

  const cartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
  }, [cart]);

  const averageTicket = cartCount > 0 ? cartTotal / cartCount : 0;

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
            <S.Hero>
              <S.HeroCard>
                <S.HeroTop>
                  <S.BrandPill>
                    <Sparkles size={14} /> Menu Digital
                  </S.BrandPill>

                  <S.LivePill>
                    Atendimento em tempo real
                    <span />
                  </S.LivePill>

                  <S.StepDots>
                    <span className="on" />
                    <span className={drawerStep === "finalizar" ? "on" : ""} />
                    <span className={cartCount > 0 ? "on" : ""} />
                  </S.StepDots>
                </S.HeroTop>

                <S.HeroTitle>
                  Cardápio inteligente, pedido em segundos.
                </S.HeroTitle>
                <S.HeroText>
                  Escolha os produtos por categoria, monte seu pedido e finalize
                  sem login com nome e CPF. O pedido cai direto para o painel da
                  equipe.
                </S.HeroText>

                {tableNumber ? (
                  <S.TableCallout>
                    Mesa <strong>{tableNumber}</strong>
                  </S.TableCallout>
                ) : null}

                <S.HeroStats>
                  <S.HeroStatCard>
                    <strong>{cartCount}</strong>
                    <span>Itens no pedido</span>
                  </S.HeroStatCard>
                  <S.HeroStatCard>
                    <strong>R$ {toPrice(averageTicket)}</strong>
                    <span>Ticket médio do carrinho</span>
                  </S.HeroStatCard>
                </S.HeroStats>
              </S.HeroCard>

              <S.SectionHead>
                <h2>Produtos e Categorias</h2>
                {isMesaContext ? (
                  <p>{`Pedido da Mesa ${tableNumber}`}</p>
                ) : null}
              </S.SectionHead>

              {restaurantId ? (
                <S.CategoryBar>
                  {categories.map((category) => (
                    <S.CategoryChip
                      type="button"
                      key={category.id}
                      $active={activeCategory === category.id}
                      onClick={() => setActiveCategory(category.id)}
                    >
                      {category.label}
                    </S.CategoryChip>
                  ))}
                </S.CategoryBar>
              ) : null}
            </S.Hero>

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
                <S.Grid>
                  {filteredProducts.map((product) => (
                    <S.ProductCard key={product.id}>
                      <S.ProductImage $image={product.image} />

                      <S.ProductBody>
                        <S.ProductCategory>
                          {product?.category?.name || "Categoria"}
                        </S.ProductCategory>
                        <h3>{product.name}</h3>
                        <p>
                          {product.description || "Sem descrição disponível."}
                        </p>

                        <S.ProductMeta>
                          <S.Price>R$ {toPrice(product.price)}</S.Price>
                          <S.AddButton
                            type="button"
                            onClick={() => addToCart(product)}
                          >
                            Adicionar
                          </S.AddButton>
                        </S.ProductMeta>
                      </S.ProductBody>
                    </S.ProductCard>
                  ))}
                </S.Grid>
              )}
            </S.Section>

            <S.FloatingCart type="button" onClick={() => setDrawerOpen(true)}>
              <ShoppingBag size={18} /> Pedido ({cartCount})
              <b>R$ {toPrice(cartTotal)}</b>
            </S.FloatingCart>

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
