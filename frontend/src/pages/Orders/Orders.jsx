import { useEffect, useMemo, useRef, useState } from "react";
import { ThemeProvider } from "styled-components";
import { Moon, Sun, Utensils } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/authContext";
import ordersService from "../../Services/ordersService";
import { connectSocket, disconnectSocket } from "../../Services/socketService";
import * as S from "./styles";

const STEPS = [
  "PENDENTE",
  "PREPARANDO",
  "PRONTO",
  "SAIU_PARA_ENTREGA",
  "ENTREGUE",
];

const STEP_DETAILS = [
  { id: "PENDENTE", label: "Pendente", icon: "📥" },
  { id: "PREPARANDO", label: "No Fogao", icon: "🍳" },
  { id: "PRONTO", label: "Pronto", icon: "📦" },
  { id: "SAIU_PARA_ENTREGA", label: "Em Rota", icon: "🏍️" },
  { id: "ENTREGUE", label: "Entregue (Chegou)", icon: "🎉" },
];

const STATUS_OPTIONS = [
  { value: "TODOS", label: "Todos os status" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "PREPARANDO", label: "Preparando" },
  { value: "PRONTO", label: "Pronto" },
  { value: "SAIU_PARA_ENTREGA", label: "Saiu para entrega" },
  { value: "ENTREGUE", label: "Entregue" },
  { value: "CANCELADO", label: "Cancelado" },
];

const NEXT_STATUS_MAP = {
  PENDENTE: "PREPARANDO",
  PREPARANDO: "PRONTO",
  PRONTO: "SAIU_PARA_ENTREGA",
  SAIU_PARA_ENTREGA: "ENTREGUE",
};

const STATUS_LABELS = {
  PENDENTE: "Pendente",
  PREPARANDO: "Preparando",
  PRONTO: "Pronto",
  SAIU_PARA_ENTREGA: "Em rota",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function formatCurrency(value) {
  const amount = Number(value) || 0;
  return currencyFormatter.format(amount);
}

function formatDate(dateString) {
  if (!dateString) return "--";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeApiOrders(payload) {
  const list = Array.isArray(payload) ? payload : payload?.orders;
  return Array.isArray(list) ? list : [];
}

function getItemName(item) {
  return item?.product?.name || item?.name || "Item";
}

function getItemQty(item) {
  return Number(item?.quantity ?? item?.qty ?? 0);
}

function getItemPrice(item) {
  return Number(item?.price ?? 0);
}

function getOrderItems(order) {
  return Array.isArray(order?.items) ? order.items : [];
}

function getOrderTotal(order) {
  return Number(order?.total ?? 0);
}

function playDeliveredSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.045,
      audioContext.currentTime + 0.02,
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.32,
    );
    gainNode.connect(audioContext.destination);

    const oscillatorA = audioContext.createOscillator();
    oscillatorA.type = "sine";
    oscillatorA.frequency.setValueAtTime(830, audioContext.currentTime);
    oscillatorA.connect(gainNode);
    oscillatorA.start(audioContext.currentTime);
    oscillatorA.stop(audioContext.currentTime + 0.16);

    const oscillatorB = audioContext.createOscillator();
    oscillatorB.type = "triangle";
    oscillatorB.frequency.setValueAtTime(1244, audioContext.currentTime + 0.16);
    oscillatorB.connect(gainNode);
    oscillatorB.start(audioContext.currentTime + 0.16);
    oscillatorB.stop(audioContext.currentTime + 0.32);

    setTimeout(() => {
      audioContext.close().catch(() => {});
    }, 450);
  } catch {
    // Ignore audio failures (browser permissions/autoplay restrictions).
  }
}

export default function TrackingDelivery() {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(
    () => readJsonStorage("isDarkMode", false) === true,
  );
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [pulseDelivered, setPulseDelivered] = useState(false);
  const previousStatusRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("isDarkMode", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      setIsLoading(true);
      setError("");

      try {
        const statusParam = statusFilter === "TODOS" ? undefined : statusFilter;
        const response = await ordersService.listRestaurantOrders(statusParam);
        const apiOrders = normalizeApiOrders(response);

        if (!isMounted) {
          return;
        }

        setOrders(apiOrders);
        setSelectedOrderId((current) => {
          if (current && apiOrders.some((order) => order.id === current)) {
            return current;
          }

          return apiOrders[0]?.id ?? null;
        });
      } catch (err) {
        if (!isMounted) {
          return;
        }

        const message =
          err?.response?.data?.error ||
          err?.message ||
          "Erro ao carregar pedidos";
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [statusFilter]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return undefined;

    const socket = connectSocket(token);

    const onOrderStatusChanged = (updatedOrder) => {
      if (!updatedOrder?.id) return;

      setOrders((prev) => {
        const exists = prev.some((order) => order.id === updatedOrder.id);

        if (!exists) {
          if (
            statusFilter === "TODOS" ||
            statusFilter === updatedOrder.status
          ) {
            return [updatedOrder, ...prev];
          }
          return prev;
        }

        const merged = prev.map((order) =>
          order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order,
        );

        if (statusFilter !== "TODOS" && updatedOrder.status !== statusFilter) {
          return merged.filter((order) => order.id !== updatedOrder.id);
        }

        return merged;
      });

      if (updatedOrder.status === "ENTREGUE") {
        toast.success(
          `Pedido #${updatedOrder.id} marcado como Entregue (Chegou).`,
        );
      }
    };

    socket.on("order:status-changed", onOrderStatusChanged);

    return () => {
      socket.off("order:status-changed", onOrderStatusChanged);
      disconnectSocket();
    };
  }, [statusFilter]);

  const activeOrder = useMemo(() => {
    if (!orders.length) return null;
    return orders.find((order) => order.id === selectedOrderId) || orders[0];
  }, [orders, selectedOrderId]);

  const orderMetrics = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((order) => order.status === "PENDENTE").length,
      inRoute: orders.filter((order) => order.status === "SAIU_PARA_ENTREGA")
        .length,
      delivered: orders.filter((order) => order.status === "ENTREGUE").length,
    };
  }, [orders]);

  const currentStatus = activeOrder?.status || "PENDENTE";
  const currentStepIndex = STEPS.indexOf(currentStatus);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    if (previousStatus !== "ENTREGUE" && currentStatus === "ENTREGUE") {
      setPulseDelivered(true);
      playDeliveredSound();
      const timeoutId = setTimeout(() => {
        setPulseDelivered(false);
      }, 700);

      previousStatusRef.current = currentStatus;
      return () => clearTimeout(timeoutId);
    }

    previousStatusRef.current = currentStatus;
    return undefined;
  }, [currentStatus]);

  const progressRatio = useMemo(() => {
    if (currentStatus === "CANCELADO") return 0;
    const index = STEPS.indexOf(currentStatus);
    if (index < 0) return 0;
    return index / (STEPS.length - 1);
  }, [currentStatus]);

  const canCancel =
    activeOrder &&
    activeOrder.status === "PENDENTE" &&
    Number(activeOrder.userId) === Number(user?.id);

  const nextStatus = NEXT_STATUS_MAP[currentStatus];

  const handleUpdateStatus = async () => {
    if (!activeOrder || !nextStatus || isUpdating) return;

    setIsUpdating(true);
    try {
      const updated = await ordersService.updateStatus(
        activeOrder.id,
        nextStatus,
      );
      setOrders((prev) =>
        prev.map((order) => (order.id === activeOrder.id ? updated : order)),
      );
      toast.success(
        `Pedido #${activeOrder.id} atualizado para ${STATUS_LABELS[nextStatus]}.`,
      );
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Erro ao atualizar status do pedido";
      const friendlyMessage =
        message.includes("pagamento PIX/CARTAO") ||
        message.includes("ainda não foi confirmado")
          ? "Confirme o pagamento (PIX ou cartão) antes de concluir como entregue."
          : message;
      toast.error(friendlyMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!activeOrder || !canCancel || isUpdating) return;

    setIsUpdating(true);
    try {
      const updated = await ordersService.cancelOrder(activeOrder.id);
      setOrders((prev) =>
        prev.map((order) => (order.id === activeOrder.id ? updated : order)),
      );
      toast.info(`Pedido #${activeOrder.id} cancelado.`);
    } catch (err) {
      const message =
        err?.response?.data?.error || err?.message || "Erro ao cancelar pedido";
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const orderItems = getOrderItems(activeOrder);
  const subtotal = orderItems.reduce(
    (acc, item) => acc + getItemQty(item) * getItemPrice(item),
    0,
  );

  return (
    <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
      <S.AppContainer>
        <S.TopNavbar>
          <S.BrandLogo>
            <Utensils size={24} strokeWidth={2.5} />
            <span>Peça já food</span>
          </S.BrandLogo>

          <S.NavActions>
            <S.ThemeToggleButton
              type="button"
              onClick={() => setIsDarkMode((prev) => !prev)}
              aria-label="Alternar tema"
              title="Alternar tema"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </S.ThemeToggleButton>
          </S.NavActions>
        </S.TopNavbar>

        <S.TrackingCard>
          <S.CardHeader>
            <div>
              <h2>Acompanhar pedidos</h2>
              <p>
                {isLoading
                  ? "Carregando pedidos..."
                  : activeOrder
                    ? `Pedido #${activeOrder.id} • ${formatDate(activeOrder.createdAt)}`
                    : "Nenhum pedido encontrado"}
              </p>
            </div>
            <S.HeaderStatusArea>
              <S.LiveStatus>
                Status atual: {STATUS_LABELS[currentStatus] || currentStatus}
              </S.LiveStatus>
              {currentStatus === "ENTREGUE" ? (
                <S.DeliveredBadge $pulse={pulseDelivered}>
                  ENTREGUE • CHEGOU
                </S.DeliveredBadge>
              ) : null}
            </S.HeaderStatusArea>
          </S.CardHeader>

          <S.MetricsRow>
            <S.MetricCard>
              <span>Total</span>
              <strong>{orderMetrics.total}</strong>
            </S.MetricCard>
            <S.MetricCard>
              <span>Pendentes</span>
              <strong>{orderMetrics.pending}</strong>
            </S.MetricCard>
            <S.MetricCard>
              <span>Em rota</span>
              <strong>{orderMetrics.inRoute}</strong>
            </S.MetricCard>
            <S.MetricCard>
              <span>Entregues</span>
              <strong>{orderMetrics.delivered}</strong>
            </S.MetricCard>
          </S.MetricsRow>

          <S.FiltersRow>
            <S.StatusChips>
              {STATUS_OPTIONS.map((option) => (
                <S.StatusChip
                  key={option.value}
                  type="button"
                  $active={statusFilter === option.value}
                  onClick={() => setStatusFilter(option.value)}
                  disabled={isLoading}
                >
                  {option.label}
                </S.StatusChip>
              ))}
            </S.StatusChips>
          </S.FiltersRow>

          <S.MainGrid>
            <S.PrimaryPanel>
              {error ? <S.ErrorMessage>{error}</S.ErrorMessage> : null}

              {!isLoading && !activeOrder ? (
                <S.EmptyState>
                  Nenhum pedido disponível para este filtro.
                </S.EmptyState>
              ) : currentStatus === "CANCELADO" ? (
                <S.CancelledTimeline>
                  <div className="cross-icon">✕</div>
                  <div>
                    <div style={{ fontSize: "1.1rem" }}>Pedido Cancelado</div>
                    <div className="subtext">
                      O pedido foi cancelado e não segue no fluxo de entrega.
                    </div>
                  </div>
                </S.CancelledTimeline>
              ) : (
                <S.ProgressTimeline>
                  <S.ActiveProgressBar
                    $ratio={progressRatio}
                    $isFinal={progressRatio === 1}
                  />

                  {STEP_DETAILS.map((step, idx) => {
                    const isCompleted = currentStepIndex >= idx;
                    const isCurrent = currentStatus === step.id;

                    return (
                      <S.TimelineStep
                        key={step.id}
                        $completed={isCompleted}
                        $current={isCurrent}
                      >
                        <div className="circle-node">
                          {isCurrent ? step.icon : idx + 1}
                        </div>
                        <span className="step-label">{step.label}</span>
                      </S.TimelineStep>
                    );
                  })}
                </S.ProgressTimeline>
              )}

              <S.OrderSummary>
                {!activeOrder ? (
                  <div className="empty-items">Sem itens para exibir.</div>
                ) : (
                  <>
                    {orderItems.map((item, idx) => (
                      <div
                        className="item-row"
                        key={`${item.id || idx}-${getItemName(item)}`}
                      >
                        <div>
                          <span className="qty">{getItemQty(item)}x</span>
                          <span className="name">{getItemName(item)}</span>
                        </div>
                        <span className="price">
                          {formatCurrency(
                            getItemQty(item) * getItemPrice(item),
                          )}
                        </span>
                      </div>
                    ))}

                    <div className="total-row">
                      <span>Total</span>
                      <span className="total-price">
                        {formatCurrency(getOrderTotal(activeOrder))}
                      </span>
                    </div>
                    <S.TotalHint>
                      Subtotal itens: {formatCurrency(subtotal)}
                    </S.TotalHint>
                  </>
                )}
              </S.OrderSummary>

              <S.ControlPanel>
                {canCancel ? (
                  <button
                    type="button"
                    className="ghost"
                    onClick={handleCancelOrder}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Cancelando..." : "Cancelar pedido"}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={!nextStatus || isUpdating || !activeOrder}
                >
                  {!activeOrder
                    ? "Sem pedido selecionado"
                    : isUpdating
                      ? "Atualizando..."
                      : nextStatus
                        ? `Avancar para ${STATUS_LABELS[nextStatus]}`
                        : "Fluxo finalizado"}
                </button>
              </S.ControlPanel>
            </S.PrimaryPanel>

            <S.SidePanel>
              <S.SidePanelHeader>
                <h3>Pedidos</h3>
                <span>{orders.length}</span>
              </S.SidePanelHeader>

              <S.OrderList>
                {orders.length === 0 ? (
                  <S.EmptyState>Sem pedidos no filtro atual.</S.EmptyState>
                ) : (
                  orders.map((order) => (
                    <S.OrderListItem
                      key={order.id}
                      type="button"
                      $active={order.id === activeOrder?.id}
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <div className="top-row">
                        <strong>#{order.id}</strong>
                        <span>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </div>
                      <p>{order.user?.name || "Cliente"}</p>
                      <div className="bottom-row">
                        <small>{formatDate(order.createdAt)}</small>
                        <b>{formatCurrency(getOrderTotal(order))}</b>
                      </div>
                    </S.OrderListItem>
                  ))
                )}
              </S.OrderList>
            </S.SidePanel>
          </S.MainGrid>
        </S.TrackingCard>
      </S.AppContainer>
    </ThemeProvider>
  );
}
