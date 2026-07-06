import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { toast } from "react-toastify";
import {
  Bike,
  Moon,
  Sun,
  LogOut,
  RefreshCw,
  CheckCircle2,
  MapPin,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
} from "lucide-react";
import ordersService from "../../Services/ordersService";
import { connectSocket, disconnectSocket } from "../../Services/socketService";
import { useAuth } from "../../contexts/authContext";
import * as S from "./styles";

const CLOSABLE_ORDER_STATUSES = ["ENTREGUE"];
const COURIER_VISIBLE_STATUSES = ["SAIU_PARA_ENTREGA", "ENTREGUE"];
const CLOSED_DELIVERED_ORDERS_STORAGE_KEY =
  "@PecaJaFood:courierClosedDeliveredOrders";

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toUpperCase();
}

function hasOrderStatus(order, status) {
  return normalizeStatus(order?.status) === normalizeStatus(status);
}

function getInitialClosedDeliveredOrders() {
  const raw = localStorage.getItem(CLOSED_DELIVERED_ORDERS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((value) => Number(value))
      .filter((value, index, array) =>
        Number.isInteger(value) && value > 0
          ? array.indexOf(value) === index
          : false,
      );
  } catch {
    return [];
  }
}

function formatStatus(status) {
  return String(status || "").replace(/_/g, " ");
}

function getAddressText(order) {
  const lineOne = [order?.address, order?.number].filter(Boolean).join(", ");
  const lineTwo = [order?.district, order?.city, order?.state]
    .filter(Boolean)
    .join(" - ");

  return [lineOne, lineTwo, order?.zipCode].filter(Boolean);
}

function isDeliveryOrder(order) {
  return String(order?.type || "").toUpperCase() === "DELIVERY";
}

function isCourierVisibleOrder(order) {
  return (
    isDeliveryOrder(order) &&
    COURIER_VISIBLE_STATUSES.includes(normalizeStatus(order?.status))
  );
}

export default function CourierDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [closingOrderIds, setClosingOrderIds] = useState([]);
  const [closedDeliveredOrderIds, setClosedDeliveredOrderIds] = useState(
    getInitialClosedDeliveredOrders,
  );

  const deliveryOrders = useMemo(() => orders, [orders]);

  const filteredDeliveryOrders = useMemo(() => {
    const visibleOrders = deliveryOrders.filter(
      (order) =>
        !(
          CLOSABLE_ORDER_STATUSES.includes(normalizeStatus(order?.status)) &&
          closedDeliveredOrderIds.includes(order.id)
        ),
    );

    if (statusFilter === "TODOS") {
      return visibleOrders;
    }

    if (statusFilter === "EM_ROTA") {
      return visibleOrders.filter((order) =>
        hasOrderStatus(order, "SAIU_PARA_ENTREGA"),
      );
    }

    if (statusFilter === "ENTREGUES") {
      return visibleOrders.filter((order) => hasOrderStatus(order, "ENTREGUE"));
    }

    return visibleOrders;
  }, [deliveryOrders, statusFilter, closedDeliveredOrderIds]);

  const statusCounters = useMemo(
    () => ({
      TODOS: deliveryOrders.length,
      EM_ROTA: deliveryOrders.filter((order) =>
        hasOrderStatus(order, "SAIU_PARA_ENTREGA"),
      ).length,
      ENTREGUES: deliveryOrders.filter((order) =>
        hasOrderStatus(order, "ENTREGUE"),
      ).length,
    }),
    [deliveryOrders],
  );

  async function loadOrders(showLoading = true) {
    try {
      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const data = await ordersService.listRestaurantOrders();
      setOrders(Array.isArray(data) ? data.filter(isCourierVisibleOrder) : []);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao carregar pedidos");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadInitialOrders() {
      try {
        const data = await ordersService.listRestaurantOrders();
        if (mounted) {
          setOrders(
            Array.isArray(data) ? data.filter(isCourierVisibleOrder) : [],
          );
        }
      } catch (err) {
        toast.error(err?.response?.data?.error || "Erro ao carregar pedidos");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialOrders();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(
      CLOSED_DELIVERED_ORDERS_STORAGE_KEY,
      JSON.stringify(closedDeliveredOrderIds),
    );
  }, [closedDeliveredOrderIds]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      return undefined;
    }

    const socket = connectSocket(token);

    const onReconnect = () => {
      // Re-sync after reconnect to avoid missing orders while offline.
      loadOrders(false);
    };

    const onNewOrder = (order) => {
      if (!isCourierVisibleOrder(order)) {
        return;
      }

      setOrders((prev) => {
        const exists = prev.some((item) => item.id === order.id);
        if (exists) {
          return prev;
        }

        toast.info(`Novo pedido delivery #${order.id}`);
        return [order, ...prev];
      });
    };

    const onStatusChanged = (order) => {
      if (!isCourierVisibleOrder(order)) {
        setOrders((prev) => prev.filter((item) => item.id !== order.id));
        return;
      }

      if (!CLOSABLE_ORDER_STATUSES.includes(normalizeStatus(order?.status))) {
        setClosedDeliveredOrderIds((prev) =>
          prev.filter((id) => id !== order.id),
        );
      }

      setOrders((prev) => {
        const exists = prev.some((item) => item.id === order.id);

        if (!exists) {
          return [order, ...prev];
        }

        return prev.map((item) => (item.id === order.id ? order : item));
      });
    };

    socket.on("connect", onReconnect);
    socket.on("new-order", onNewOrder);
    socket.on("order:status-changed", onStatusChanged);

    return () => {
      socket.off("connect", onReconnect);
      socket.off("new-order", onNewOrder);
      socket.off("order:status-changed", onStatusChanged);
      disconnectSocket();
    };
  }, []);

  async function handleMarkDelivered(order) {
    if (!hasOrderStatus(order, "SAIU_PARA_ENTREGA")) {
      return;
    }

    try {
      const updated = await ordersService.updateStatus(order.id, "ENTREGUE");
      setOrders((prev) =>
        prev.map((item) => (item.id === order.id ? updated : item)),
      );
      toast.success(`Pedido #${order.id} entregue com sucesso`);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao confirmar entrega");
    }
  }

  function handleCloseDeliveredOrder(orderId) {
    const targetOrder = orders.find((order) => order.id === orderId);

    if (
      !targetOrder ||
      !CLOSABLE_ORDER_STATUSES.includes(normalizeStatus(targetOrder.status))
    ) {
      return;
    }

    setClosingOrderIds((prev) =>
      prev.includes(orderId) ? prev : [...prev, orderId],
    );

    setTimeout(() => {
      setClosedDeliveredOrderIds((prev) =>
        prev.includes(orderId) ? prev : [...prev, orderId],
      );
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      setClosingOrderIds((prev) => prev.filter((id) => id !== orderId));
    }, 320);
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
      <S.Layout>
        <S.AppShell>
          <S.Sidebar $collapsed={isSidebarCollapsed}>
            <S.SidebarTop>
              <S.SidebarBrand $collapsed={isSidebarCollapsed}>
                <Bike size={20} />
                {!isSidebarCollapsed && <span>Painel Motoqueiro</span>}
              </S.SidebarBrand>

              <S.CollapseButton
                type="button"
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                title={isSidebarCollapsed ? "Abrir menu" : "Fechar menu"}
              >
                {isSidebarCollapsed ? (
                  <ChevronRight size={16} />
                ) : (
                  <ChevronLeft size={16} />
                )}
              </S.CollapseButton>
            </S.SidebarTop>

            <S.ProfileCard $collapsed={isSidebarCollapsed}>
              <S.ProfileBadge>
                <User size={14} />
                {!isSidebarCollapsed && <span>Perfil: MOTOQUEIRO</span>}
              </S.ProfileBadge>

              {!isSidebarCollapsed && (
                <>
                  <S.ProfileName>{user?.name || "Motoqueiro"}</S.ProfileName>
                  <S.ProfileEmail>
                    <Mail size={14} />
                    <span>{user?.email || "email nao informado"}</span>
                  </S.ProfileEmail>
                </>
              )}
            </S.ProfileCard>

            <S.SidebarActions>
              <S.SidebarActionButton
                type="button"
                onClick={() => loadOrders(false)}
                title="Atualizar pedidos"
                $collapsed={isSidebarCollapsed}
              >
                <RefreshCw size={16} />
                {!isSidebarCollapsed && <span>Atualizar</span>}
              </S.SidebarActionButton>

              <S.SidebarActionButton
                type="button"
                onClick={() => setIsDarkMode((prev) => !prev)}
                title="Alternar tema"
                $collapsed={isSidebarCollapsed}
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                {!isSidebarCollapsed && (
                  <span>{isDarkMode ? "Modo claro" : "Modo escuro"}</span>
                )}
              </S.SidebarActionButton>

              <S.SidebarActionButton
                type="button"
                onClick={handleLogout}
                title="Sair"
                $collapsed={isSidebarCollapsed}
              >
                <LogOut size={16} />
                {!isSidebarCollapsed && <span>Sair</span>}
              </S.SidebarActionButton>
            </S.SidebarActions>
          </S.Sidebar>

          <S.MainArea>
            <S.Header>
              <S.HeaderTitle>
                <Bike size={20} />
                <h1>Entregas de Delivery</h1>
              </S.HeaderTitle>
            </S.Header>

            <S.Content>
              <S.Intro>
                <h2>Pedidos de Delivery</h2>
                <p>
                  Veja apenas pedidos de delivery e marque como entregue quando
                  finalizar.
                </p>
              </S.Intro>

              <S.FilterBar>
                <S.FilterButton
                  type="button"
                  $active={statusFilter === "TODOS"}
                  onClick={() => setStatusFilter("TODOS")}
                >
                  Todos ({statusCounters.TODOS})
                </S.FilterButton>
                <S.FilterButton
                  type="button"
                  $active={statusFilter === "EM_ROTA"}
                  onClick={() => setStatusFilter("EM_ROTA")}
                >
                  Em rota ({statusCounters.EM_ROTA})
                </S.FilterButton>
                <S.FilterButton
                  type="button"
                  $active={statusFilter === "ENTREGUES"}
                  onClick={() => setStatusFilter("ENTREGUES")}
                >
                  Entregues ({statusCounters.ENTREGUES})
                </S.FilterButton>
              </S.FilterBar>

              {isLoading ? (
                <S.EmptyState>Carregando pedidos...</S.EmptyState>
              ) : filteredDeliveryOrders.length === 0 ? (
                <S.EmptyState>
                  Nenhum pedido de delivery encontrado.
                </S.EmptyState>
              ) : (
                <S.OrdersGrid>
                  {filteredDeliveryOrders.map((order) => {
                    const addressLines = getAddressText(order);
                    const canDeliver = hasOrderStatus(
                      order,
                      "SAIU_PARA_ENTREGA",
                    );
                    const canClose = hasOrderStatus(order, "ENTREGUE");

                    return (
                      <S.OrderCard
                        key={order.id}
                        $isClosing={closingOrderIds.includes(order.id)}
                      >
                        <S.TopRow>
                          <span className="id">Pedido #{order.id}</span>
                          <S.TopRowRight>
                            <span className="status">
                              {formatStatus(order.status)}
                            </span>

                            {canClose && (
                              <S.CloseDeliveredButton
                                type="button"
                                onClick={() =>
                                  handleCloseDeliveredOrder(order.id)
                                }
                                aria-label={`Fechar pedido ${order.id}`}
                                title="Fechar pedido entregue"
                              >
                                <X size={14} />
                              </S.CloseDeliveredButton>
                            )}
                          </S.TopRowRight>
                        </S.TopRow>

                        <S.DeliveryAlert>
                          <AlertTriangle size={14} /> Pedido DELIVERY
                        </S.DeliveryAlert>

                        <S.Price>
                          R$ {Number(order.total || 0).toFixed(2)}
                        </S.Price>

                        <S.AddressBox>
                          <div className="label">
                            <MapPin size={13} style={{ marginRight: 6 }} />{" "}
                            Endereco
                          </div>
                          {addressLines.length ? (
                            addressLines.map((line, index) => (
                              <div
                                className="line"
                                key={`${order.id}-${index}`}
                              >
                                {line}
                              </div>
                            ))
                          ) : (
                            <div className="line">Endereco nao informado</div>
                          )}
                        </S.AddressBox>

                        <S.Items>
                          {(order.items || []).map((item) => (
                            <li
                              key={
                                item.id || `${item.productId}-${item.quantity}`
                              }
                            >
                              {item.quantity}x{" "}
                              {item?.product?.name || "Produto"}
                            </li>
                          ))}
                        </S.Items>

                        <S.DeliverButton
                          type="button"
                          onClick={() => handleMarkDelivered(order)}
                          disabled={!canDeliver || isRefreshing}
                        >
                          <CheckCircle2 size={16} style={{ marginRight: 6 }} />
                          Marcar como Entregue
                        </S.DeliverButton>

                        {!canDeliver && (
                          <S.MetaText>
                            Aguardando status "SAIU PARA ENTREGA" para concluir.
                          </S.MetaText>
                        )}
                      </S.OrderCard>
                    );
                  })}
                </S.OrdersGrid>
              )}
            </S.Content>
          </S.MainArea>
        </S.AppShell>
      </S.Layout>
    </ThemeProvider>
  );
}
