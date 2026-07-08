import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import {
  ClipboardList,
  User,
  Utensils,
  Bell,
  BellRing,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Truck,
  Clock,
  Package,
  X,
  Table2,
  DoorOpen,
} from "lucide-react";
import { toast } from "react-toastify";
import ordersService from "../../Services/ordersService";
import tablesService from "../../Services/tablesService";
import tableSessionService from "../../Services/tableSessionService";
import { connectSocket, disconnectSocket } from "../../Services/socketService";
import { useAuth } from "../../contexts/authContext";
import * as S from "./styles";

const TablesTab = lazy(() => import("./components/TablesTab"));
const ProfileTab = lazy(() => import("./components/ProfileTab"));
const OrdersTab = lazy(() => import("./components/OrdersTab"));

const GENERATED_PINS_STORAGE_KEY = "@PecaJaFood:generatedTablePins";
const NOTIFICATIONS_ENABLED_STORAGE_KEY =
  "@PecaJaFood:employeesNotificationsEnabled";
const DELIVERY_PENDING_DIGITAL_METHODS = new Set([
  "PIX",
  "CARTAO",
  "CARTAO_DEBITO",
  "CARTAO_CREDITO",
]);
const PAYMENT_PIN_TOOLS_ENABLED = false;
const ORDER_STATUS_META = {
  PENDENTE: { label: "Pendente", color: "#f97316" },
  PREPARANDO: { label: "Preparando", color: "#0ea5e9" },
  PRONTO: { label: "Pronto", color: "#f59e0b" },
  SAIU_PARA_ENTREGA: { label: "A caminho", color: "#3b82f6" },
  ENTREGUE: { label: "Entregue", color: "#22c55e" },
  CANCELADO: { label: "Cancelado", color: "#ef4444" },
};

const CLOSED_STATUS_SET = new Set(["ENTREGUE", "CANCELADO"]);

function getPaymentSummaryLabel(order?: unknown) {
  const paymentMethod = String(
    (order as { paymentMethod?: unknown } | undefined)?.paymentMethod || "",
  )
    .trim()
    .toUpperCase();

  if (paymentMethod === "DINHEIRO") {
    return "DINHEIRO";
  }

  if (
    paymentMethod === "CARTAO" ||
    paymentMethod === "CARTAO_DEBITO" ||
    paymentMethod === "CARTAO_CREDITO"
  ) {
    return "CARTAO";
  }

  if (paymentMethod === "PIX") {
    return "PIX";
  }

  return "NAO INFORMADO";
}

function getOrderTypeDisplayLabel(orderType) {
  const normalized = String(orderType || "").toUpperCase();
  if (normalized === "DELIVERY") {
    return "ENTREGA";
  }

  return String(orderType || "");
}

function getStatusValueIcon(status) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "PENDENTE" || normalized === "PREPARANDO") {
    return <Clock size={13} />;
  }

  if (normalized === "PRONTO") {
    return <Package size={13} />;
  }

  if (normalized === "SAIU_PARA_ENTREGA") {
    return <Truck size={13} />;
  }

  if (normalized === "ENTREGUE") {
    return <CheckCircle2 size={13} />;
  }

  if (normalized === "CANCELADO") {
    return <X size={13} />;
  }

  return <Clock size={13} />;
}

function getStatusChipStyle(status) {
  const normalized = String(status || "").toUpperCase();
  const isClosed = CLOSED_STATUS_SET.has(normalized);

  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    color: isClosed ? "#ef4444" : "#475569",
    background: isClosed ? "#fef2f2" : "#f8fafc",
    border: `1px solid ${isClosed ? "#fecaca" : "#e2e8f0"}`,
    borderRadius: 6,
    padding: "3px 8px",
  };
}

function getInitialGeneratedPins() {
  const raw = localStorage.getItem(GENERATED_PINS_STORAGE_KEY);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<
      Record<number, { pin: string; sessionId: number }>
    >((acc, [key, value]) => {
      const tableId = Number(key);
      if (!Number.isInteger(tableId) || tableId <= 0) {
        return acc;
      }

      if (!value || typeof value !== "object") {
        return acc;
      }

      const parsedValue = value as { pin?: unknown; sessionId?: unknown };

      acc[tableId] = {
        pin: String(parsedValue.pin || ""),
        sessionId: Number(parsedValue.sessionId || 0),
      };
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function getOrderTableLabel(order) {
  const tableNumber = Number(order?.table?.number || order?.tableNumber || 0);

  if (tableNumber > 0) {
    return `Mesa ${tableNumber}`;
  }

  if (order?.type === "MESA" && Number(order?.tableId || 0) > 0) {
    return `Mesa ${Number(order.tableId)}`;
  }

  return null;
}

function getDeliveryAddressLabel(order) {
  const parts = [
    String(order?.address || "").trim(),
    String(order?.number || "").trim(),
    String(order?.district || "").trim(),
    [String(order?.city || "").trim(), String(order?.state || "").trim()]
      .filter(Boolean)
      .join("/"),
    String(order?.zipCode || "").trim(),
  ].filter(Boolean);

  if (!parts.length) {
    return null;
  }

  const base = parts.join(" | ");
  const complement = String(order?.complement || "").trim();
  return complement ? `${base} | Compl.: ${complement}` : base;
}

function isPendingDigitalPayment(order) {
  const orderType = String(order?.type || "").toUpperCase();
  const paymentMethod = String(order?.paymentMethod || "").toUpperCase();
  const isDelivery = orderType === "DELIVERY";
  const isDigitalMethod = DELIVERY_PENDING_DIGITAL_METHODS.has(paymentMethod);

  return isDelivery && isDigitalMethod && order?.paid !== true;
}

function isDeliveryBlockedUntilPaid(order) {
  return isPendingDigitalPayment(order);
}

function playNotificationSound() {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  try {
    const context = new AudioContextClass();
    const masterGain = context.createGain();

    // Volume alto para ambiente operacional (pode variar por navegador/SO).
    masterGain.gain.value = 0.5;
    masterGain.connect(context.destination);

    const triggerBell = (startAt, frequency, duration = 0.42) => {
      const oscillator = context.createOscillator();
      const harmonic = context.createOscillator();
      const gain = context.createGain();
      const harmonicGain = context.createGain();

      oscillator.type = "sine";
      harmonic.type = "triangle";

      oscillator.frequency.setValueAtTime(frequency, startAt);
      harmonic.frequency.setValueAtTime(frequency * 2.01, startAt);

      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 0.92,
        startAt + duration,
      );

      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(1, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.14, startAt + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      harmonicGain.gain.setValueAtTime(0.0001, startAt);
      harmonicGain.gain.exponentialRampToValueAtTime(0.55, startAt + 0.02);
      harmonicGain.gain.exponentialRampToValueAtTime(
        0.0001,
        startAt + duration * 0.8,
      );

      oscillator.connect(gain);
      harmonic.connect(harmonicGain);
      gain.connect(masterGain);
      harmonicGain.connect(masterGain);

      oscillator.start(startAt);
      harmonic.start(startAt);
      oscillator.stop(startAt + duration + 0.02);
      harmonic.stop(startAt + duration * 0.82 + 0.02);
    };

    const t0 = context.currentTime + 0.01;
    triggerBell(t0, 1174.66, 0.45);
    triggerBell(t0 + 0.2, 1396.91, 0.5);

    setTimeout(() => {
      context.close().catch(() => {});
    }, 1200);
  } catch {
    // Se o navegador bloquear audio automático, o toast continua como fallback.
  }
}

async function showBrowserNotification(message, tableLabel) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  new Notification("Solicitação de PIN da mesa", {
    body: message,
    tag: `table-pin-request-${String(tableLabel)}`,
  });
}

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 768,
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [orderTypeFilter, setOrderTypeFilter] = useState("TODOS");
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [openSessions, setOpenSessions] = useState([]);
  const [closingOrderIds, _setClosingOrderIds] = useState([]);
  const [openingTableIds, setOpeningTableIds] = useState([]);
  const [closingSessionIds, setClosingSessionIds] = useState([]);
  const [requestingPinOrderIds, setRequestingPinOrderIds] = useState([]);
  const [confirmingPinOrderIds, setConfirmingPinOrderIds] = useState([]);
  const [pinInputByOrderId, setPinInputByOrderId] = useState({});
  const [expandedOrderIds, setExpandedOrderIds] = useState({});
  const [generatedPins, setGeneratedPins] = useState(getInitialGeneratedPins);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const raw = localStorage.getItem(NOTIFICATIONS_ENABLED_STORAGE_KEY);

    if (raw === null) {
      return true;
    }

    return raw === "true";
  });
  const [, setNotificationPermission] = useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }

    return Notification.permission;
  });
  const [pinRequestMessages, setPinRequestMessages] = useState([]);
  const [highlightedTableId, setHighlightedTableId] = useState(null);
  const [highlightedTableNumber, setHighlightedTableNumber] = useState(null);
  const [isHighlightBlinking, setIsHighlightBlinking] = useState(false);
  const [highlightPulseOn, setHighlightPulseOn] = useState(true);
  const [socketStatus, setSocketStatus] = useState("connecting");
  const [lastOrdersSyncAt, setLastOrdersSyncAt] = useState(null);

  useEffect(() => {
    function handleResize() {
      setIsMobileViewport(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMobileSidebarOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      try {
        const data = await ordersService.listRestaurantOrders();
        if (mounted) {
          setOrders(Array.isArray(data) ? data : []);
          setLastOrdersSyncAt(Date.now());
        }
      } catch (err) {
        toast.error(err?.response?.data?.error || "Erro ao carregar pedidos");
      }
    }

    loadOrders();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(
      GENERATED_PINS_STORAGE_KEY,
      JSON.stringify(generatedPins),
    );
  }, [generatedPins]);

  useEffect(() => {
    localStorage.setItem(
      NOTIFICATIONS_ENABLED_STORAGE_KEY,
      String(notificationsEnabled),
    );
  }, [notificationsEnabled]);

  useEffect(() => {
    let mounted = true;

    async function loadTablesPanel() {
      try {
        const [tablesData, sessionsData] = await Promise.all([
          tablesService.listTables(),
          tableSessionService.listOpenSessions(),
        ]);

        if (!mounted) {
          return;
        }

        setTables(Array.isArray(tablesData) ? tablesData : []);
        setOpenSessions(Array.isArray(sessionsData) ? sessionsData : []);
      } catch (err) {
        toast.error(err?.response?.data?.error || "Erro ao carregar mesas");
      }
    }

    loadTablesPanel();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setSocketStatus("disconnected");
      return undefined;
    }

    setSocketStatus("connecting");
    const socket = connectSocket(token, "employees-dashboard");

    const upsertOrder = (prevOrders, nextOrder) => {
      const nextOrderId = Number(nextOrder?.id || 0);

      if (!Number.isInteger(nextOrderId) || nextOrderId <= 0) {
        return prevOrders;
      }

      const existingIndex = prevOrders.findIndex(
        (item) => Number(item?.id || 0) === nextOrderId,
      );

      if (existingIndex < 0) {
        return [nextOrder, ...prevOrders];
      }

      return prevOrders.map((item, index) =>
        index === existingIndex ? { ...item, ...nextOrder } : item,
      );
    };

    const syncOrdersAfterConnect = async () => {
      try {
        const data = await ordersService.listRestaurantOrders();
        setOrders(Array.isArray(data) ? data : []);
        setLastOrdersSyncAt(Date.now());
      } catch {
        // Evita interromper o fluxo em caso de falha temporaria de rede.
      }
    };

    const onConnect = () => {
      setSocketStatus("connected");
      void syncOrdersAfterConnect();
    };

    const onDisconnect = () => {
      setSocketStatus("disconnected");
    };

    const onConnectError = () => {
      setSocketStatus("disconnected");
    };

    const onNewOrder = (order) => {
      setOrders((prev) => upsertOrder(prev, order));
      setLastOrdersSyncAt(Date.now());
    };

    const onStatusChanged = (order) => {
      if (order?.paid === true) {
        setPinInputByOrderId((prev) => {
          const next = { ...prev };
          delete next[order.id];
          return next;
        });
      }

      setOrders((prev) => upsertOrder(prev, order));
      setLastOrdersSyncAt(Date.now());
    };

    const onTablePinRequested = async (payload) => {
      if (!notificationsEnabled) {
        return;
      }

      const tableId = Number(payload?.tableId || 0);
      const tableNumber = Number(payload?.tableNumber || 0);
      const tableLabel = payload?.tableNumber || payload?.tableId || "?";
      const message = `Cliente na Mesa ${tableLabel} solicitou o PIN.`;
      const messageId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      setActiveTab("tables");
      setHighlightedTableId(tableId > 0 ? tableId : null);
      setHighlightedTableNumber(tableNumber > 0 ? tableNumber : null);
      setIsHighlightBlinking(true);
      setHighlightPulseOn(true);

      setPinRequestMessages((prev) =>
        [
          {
            id: messageId,
            text: message,
            tableLabel,
            createdAt: Date.now(),
          },
          ...prev,
        ].slice(0, 8),
      );

      toast.info(message);
      playNotificationSound();
      await showBrowserNotification(message, tableLabel);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("new-order", onNewOrder);
    socket.on("order:status-changed", onStatusChanged);
    socket.on("table:pin-requested", onTablePinRequested);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("new-order", onNewOrder);
      socket.off("order:status-changed", onStatusChanged);
      socket.off("table:pin-requested", onTablePinRequested);
      disconnectSocket();
    };
  }, [notificationsEnabled]);

  useEffect(() => {
    if (activeTab !== "orders") {
      return;
    }

    let mounted = true;

    async function refreshOrdersTab() {
      try {
        const data = await ordersService.listRestaurantOrders();

        if (!mounted) {
          return;
        }

        setOrders(Array.isArray(data) ? data : []);
        setLastOrdersSyncAt(Date.now());
      } catch {
        // Mantem o painel operando mesmo se a recarga falhar temporariamente.
      }
    }

    void refreshOrdersTab();

    return () => {
      mounted = false;
    };
  }, [activeTab]);

  useEffect(() => {
    if (!highlightedTableId && !highlightedTableNumber) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setHighlightedTableId(null);
      setHighlightedTableNumber(null);
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [highlightedTableId, highlightedTableNumber]);

  useEffect(() => {
    if (!isHighlightBlinking) {
      return undefined;
    }

    const pulseInterval = setInterval(() => {
      setHighlightPulseOn((prev) => !prev);
    }, 220);

    const stopBlinkTimeout = setTimeout(() => {
      setIsHighlightBlinking(false);
      setHighlightPulseOn(true);
    }, 2200);

    return () => {
      clearInterval(pulseInterval);
      clearTimeout(stopBlinkTimeout);
    };
  }, [isHighlightBlinking]);

  async function handleEnableNotifications() {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      toast.info("Notificações desativadas.");
      return;
    }

    setNotificationsEnabled(true);

    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.success("Notificações ativadas (alertas internos).", {
        autoClose: 2200,
      });
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationPermission("granted");
      toast.success("Notificações ativadas com sucesso.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === "granted") {
        toast.success("Notificações ativadas com sucesso.");
        return;
      }

      toast.info("Notificações ativadas, mas sem permissão desktop.");
    } catch {
      toast.error(
        "Notificações ativadas sem alerta desktop (erro de permissão).",
      );
    }
  }

  async function handleUpdateStatus(order, nextStatus) {
    const nextStatusNormalized = String(nextStatus || "").toUpperCase();
    const normalizedOrderType = String(order?.type || "").toUpperCase();
    const isMesaOrRetiradaOrder =
      normalizedOrderType === "MESA" || normalizedOrderType === "RETIRADA";
    const shouldAutoAdvanceFlow =
      nextStatusNormalized === "PRONTO" && isMesaOrRetiradaOrder;

    if (
      nextStatusNormalized === "ENTREGUE" &&
      order &&
      isDeliveryBlockedUntilPaid(order)
    ) {
      toast.error(
        "Pagamento pendente: a confirmação por PIN fica apenas no fluxo do motoqueiro.",
      );
      return;
    }

    try {
      const updated = await ordersService.updateStatus(order.id, nextStatus);
      const finalUpdated = shouldAutoAdvanceFlow
        ? await ordersService.updateStatus(order.id, "SAIU_PARA_ENTREGA")
        : updated;
      const nextStatusLabel = String(
        finalUpdated?.status ||
          (shouldAutoAdvanceFlow ? "SAIU_PARA_ENTREGA" : nextStatus),
      );

      setOrders((prev) =>
        prev.map((item) => (item.id === order.id ? finalUpdated : item)),
      );

      toast.info(
        `Pedido #${order.id} alterado para ${nextStatusLabel.replace(/_/g, " ")}`,
      );
    } catch (err) {
      const message =
        err?.response?.data?.error || "Erro ao alterar status do pedido";
      const shouldShowPaymentPendingHint =
        nextStatusNormalized === "ENTREGUE" &&
        order &&
        isDeliveryBlockedUntilPaid(order) &&
        (message.includes("pagamento PIX/CARTAO") ||
          message.includes("ainda não foi confirmado"));
      const friendlyMessage = shouldShowPaymentPendingHint
        ? "Pagamento pendente: a confirmação por PIN fica apenas no fluxo do motoqueiro."
        : message;
      toast.error(friendlyMessage);
    }
  }

  async function handleRequestPaymentPin(order) {
    const orderId = Number(order?.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return;
    }

    setRequestingPinOrderIds((prev) =>
      prev.includes(orderId) ? prev : [...prev, orderId],
    );

    try {
      await ordersService.requestPaymentConfirmationPin(orderId);
      toast.success(`PIN solicitado para o pedido #${orderId}`);
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Erro ao solicitar PIN",
      );
    } finally {
      setRequestingPinOrderIds((prev) => prev.filter((id) => id !== orderId));
    }
  }

  async function handleConfirmPaymentWithPin(order) {
    const orderId = Number(order?.id);
    const pinValue = String(pinInputByOrderId[orderId] || "").trim();

    if (!Number.isInteger(orderId) || orderId <= 0 || !pinValue) {
      return;
    }

    setConfirmingPinOrderIds((prev) =>
      prev.includes(orderId) ? prev : [...prev, orderId],
    );

    try {
      const updated = await ordersService.confirmPaymentWithPin(
        orderId,
        pinValue,
      );
      const updatedOrder = updated?.order || updated;

      setOrders((prev) =>
        prev.map((item) => (item.id === orderId ? updatedOrder : item)),
      );

      setPinInputByOrderId((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });

      toast.success(`Pagamento confirmado no pedido #${orderId}`);
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Erro ao confirmar pagamento com PIN",
      );
    } finally {
      setConfirmingPinOrderIds((prev) => prev.filter((id) => id !== orderId));
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function toggleOrderExpanded(orderId) {
    setExpandedOrderIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  }

  function removePinRequestMessage(messageId) {
    setPinRequestMessages((prev) =>
      prev.filter((message) => message.id !== messageId),
    );
  }

  function clearPinRequestMessages() {
    setPinRequestMessages([]);
  }

  const openSessionByTableId = useMemo(() => {
    return new Map(
      openSessions.map((session) => [Number(session.tableId), session]),
    );
  }, [openSessions]);

  async function refreshTablesPanel() {
    try {
      const [tablesData, sessionsData] = await Promise.all([
        tablesService.listTables(),
        tableSessionService.listOpenSessions(),
      ]);

      setTables(Array.isArray(tablesData) ? tablesData : []);
      setOpenSessions(Array.isArray(sessionsData) ? sessionsData : []);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao atualizar mesas");
    }
  }

  async function handleOpenTable(table) {
    if (!table?.id) {
      return;
    }

    setOpeningTableIds((prev) =>
      prev.includes(table.id) ? prev : [...prev, table.id],
    );

    try {
      const result = await tableSessionService.openSession(table.id);
      const session = result?.session;
      const pin = String(result?.pin || "");

      if (session?.tableId && pin) {
        setGeneratedPins((prev) => ({
          ...prev,
          [Number(session.tableId)]: {
            pin,
            sessionId: Number(session.id),
          },
        }));
      }

      toast.success(
        `Mesa ${table.number} aberta${pin ? ` | PIN: ${pin}` : ""}`,
      );

      await refreshTablesPanel();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao abrir mesa");
    } finally {
      setOpeningTableIds((prev) => prev.filter((id) => id !== table.id));
    }
  }

  async function handleCloseTableSession(session) {
    if (!session?.id) {
      return;
    }

    setClosingSessionIds((prev) =>
      prev.includes(session.id) ? prev : [...prev, session.id],
    );

    try {
      await tableSessionService.closeSession(session.id);

      setGeneratedPins((prev) => {
        const nextPins = { ...prev };
        delete nextPins[Number(session.tableId)];
        return nextPins;
      });

      toast.info(`Mesa ${session.table?.number || session.tableId} fechada.`);
      await refreshTablesPanel();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao fechar mesa");
    } finally {
      setClosingSessionIds((prev) => prev.filter((id) => id !== session.id));
    }
  }

  async function copyGeneratedPin(pin) {
    try {
      await navigator.clipboard.writeText(String(pin));
      toast.success("PIN copiado para a área de transferência");
    } catch {
      toast.info(`PIN: ${pin}`);
    }
  }

  const filteredOrders = useMemo(() => {
    const visibleOrders = orders;

    const visibleByType =
      orderTypeFilter === "TODOS"
        ? visibleOrders
        : visibleOrders.filter((order) => {
            const type = String(order?.type || "").toUpperCase();

            if (orderTypeFilter === "MESA") {
              return type === "MESA";
            }

            if (orderTypeFilter === "DELIVERY") {
              return type.includes("DELIVERY");
            }

            if (orderTypeFilter === "RETIRADA") {
              return type === "RETIRADA";
            }

            return true;
          });

    if (statusFilter === "TODOS") {
      return visibleByType;
    }

    return visibleByType.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter, orderTypeFilter]);

  const ordersByTypeForCounters = useMemo(() => {
    const visibleOrders = orders;

    if (orderTypeFilter === "TODOS") {
      return visibleOrders;
    }

    return visibleOrders.filter((order) => {
      const type = String(order?.type || "").toUpperCase();

      if (orderTypeFilter === "MESA") {
        return type === "MESA";
      }

      if (orderTypeFilter === "DELIVERY") {
        return type.includes("DELIVERY");
      }

      if (orderTypeFilter === "RETIRADA") {
        return type === "RETIRADA";
      }

      return true;
    });
  }, [orders, orderTypeFilter]);

  const statusCounters = useMemo(() => {
    const base = {
      TODOS: ordersByTypeForCounters.length,
      PENDENTE: 0,
      PREPARANDO: 0,
      PRONTO: 0,
      SAIU_PARA_ENTREGA: 0,
      ENTREGUE: 0,
      CANCELADO: 0,
    };

    ordersByTypeForCounters.forEach((order) => {
      const key = String(order?.status || "").toUpperCase();
      if (Object.prototype.hasOwnProperty.call(base, key)) {
        base[key] += 1;
      }
    });

    return base;
  }, [ordersByTypeForCounters]);

  const tableCards = useMemo(() => {
    return tables.map((table) => {
      const openSession = openSessionByTableId.get(Number(table.id)) || null;
      const generatedPin = generatedPins[Number(table.id)] || null;

      return {
        table,
        openSession,
        generatedPin,
      };
    });
  }, [tables, openSessionByTableId, generatedPins]);

  const managerInfo = {
    name: String(user?.name || "Gerência"),
    email: String(user?.email || ""),
    phone: String(user?.phone || ""),
    restaurantName: user?.restaurantId
      ? `Filial #${user.restaurantId}`
      : "Filial atual",
  };

  return (
    <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
      <S.AdminLayout>
        {isMobileViewport && !isMobileSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            style={{
              position: "fixed",
              top: "max(12px, env(safe-area-inset-top))",
              left: "max(10px, env(safe-area-inset-left))",
              zIndex: 45,
              width: "clamp(36px, 10vw, 40px)",
              height: "clamp(36px, 10vw, 40px)",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.32)",
              background: "linear-gradient(160deg, #ea1d2c 0%, #b8141f 100%)",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.28)",
            }}
            aria-label="Abrir menu lateral"
            title="Abrir menu"
          >
            <Menu size={18} />
          </button>
        )}

        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2, 6, 23, 0.45)",
              zIndex: 35,
            }}
          />
        )}

        <S.Sidebar
          $collapsed={isSidebarCollapsed}
          $mobileOpen={isMobileSidebarOpen}
        >
          <S.Brand $collapsed={isSidebarCollapsed}>
            <div className="brand-logo">
              <Utensils size={22} strokeWidth={2.5} />
              {!isSidebarCollapsed && (
                <div className="brand-text">
                  <h1>Peça Já food</h1>
                  <span>Painel Operacional</span>
                </div>
              )}
            </div>
            <button
              className="toggle-btn"
              onClick={() => {
                if (isMobileViewport) {
                  setIsMobileSidebarOpen(false);
                  return;
                }

                setIsSidebarCollapsed(!isSidebarCollapsed);
              }}
            >
              {isMobileViewport ? (
                <X size={16} />
              ) : isSidebarCollapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>
          </S.Brand>

          {!isSidebarCollapsed && (
            <div
              style={{
                margin: "0 0.25rem",
                display: "grid",
                gap: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  color: "#ffffff",
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: "rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                  }}
                >
                  <User size={26} />
                </div>
                <div>
                  <div
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    Olá, {String(user?.name || "Equipe").split(" ")[0]}
                  </div>
                  <small
                    style={{
                      fontSize: 12,
                      opacity: 0.75,
                      marginTop: 2,
                      display: "block",
                    }}
                  >
                    Painel operacional
                  </small>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 14,
                  padding: 14,
                  color: "#ffffff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: 11,
                      opacity: 0.75,
                    }}
                  >
                    <Package size={18} style={{ opacity: 0.85 }} /> Prontos
                  </span>
                  <strong
                    style={{
                      marginLeft: "auto",
                      fontSize: 20,
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {statusCounters.PRONTO || 0}
                  </strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: 11,
                      opacity: 0.75,
                    }}
                  >
                    <Clock size={18} style={{ opacity: 0.85 }} /> Em rota
                  </span>
                  <strong
                    style={{
                      marginLeft: "auto",
                      fontSize: 20,
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {statusCounters.SAIU_PARA_ENTREGA || 0}
                  </strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: 11,
                      opacity: 0.75,
                    }}
                  >
                    <CheckCircle2 size={18} style={{ opacity: 0.85 }} />
                    Entregues
                  </span>
                  <strong
                    style={{
                      marginLeft: "auto",
                      fontSize: 20,
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {statusCounters.ENTREGUE || 0}
                  </strong>
                </div>
              </div>
            </div>
          )}

          <S.NavigationList>
            <S.NavButton
              $active={activeTab === "orders"}
              onClick={() => setActiveTab("orders")}
            >
              <ClipboardList size={20} />
              {!isSidebarCollapsed && <span>Painel de Pedidos</span>}
            </S.NavButton>

            {activeTab === "orders" ? (
              <>
                <div
                  style={{
                    height: 1,
                    background: isDarkMode ? "#2d2d3d" : "#e2e8f0",
                    margin: "0.55rem 0.25rem 0.4rem",
                    opacity: 0.9,
                  }}
                />

                <S.NavButton
                  $active={orderTypeFilter === "TODOS"}
                  onClick={() => {
                    setActiveTab("orders");
                    setOrderTypeFilter("TODOS");
                  }}
                >
                  <ClipboardList size={18} />
                  {!isSidebarCollapsed && <span>Todos os Pedidos</span>}
                </S.NavButton>

                <S.NavButton
                  $active={orderTypeFilter === "MESA"}
                  onClick={() => {
                    setActiveTab("orders");
                    setOrderTypeFilter("MESA");
                  }}
                >
                  <Table2 size={18} />
                  {!isSidebarCollapsed && <span>Somente Mesa</span>}
                </S.NavButton>

                <S.NavButton
                  $active={orderTypeFilter === "DELIVERY"}
                  onClick={() => {
                    setActiveTab("orders");
                    setOrderTypeFilter("DELIVERY");
                  }}
                >
                  <Truck size={18} />
                  {!isSidebarCollapsed && <span>Somente Entrega</span>}
                </S.NavButton>

                <S.NavButton
                  $active={orderTypeFilter === "RETIRADA"}
                  onClick={() => {
                    setActiveTab("orders");
                    setOrderTypeFilter("RETIRADA");
                  }}
                >
                  <DoorOpen size={18} />
                  {!isSidebarCollapsed && <span>Somente Retirada</span>}
                </S.NavButton>

                <div
                  style={{
                    height: 1,
                    background: isDarkMode ? "#2d2d3d" : "#e2e8f0",
                    margin: "0.45rem 0.25rem 0.6rem",
                    opacity: 0.9,
                  }}
                />
              </>
            ) : null}

            <S.NavButton
              $active={activeTab === "tables"}
              onClick={() => setActiveTab("tables")}
            >
              <Table2 size={20} />
              {!isSidebarCollapsed && <span>Mesas / PINs</span>}
            </S.NavButton>

            <S.NavButton
              $active={activeTab === "profile"}
              onClick={() => setActiveTab("profile")}
            >
              <User size={20} />
              {!isSidebarCollapsed && <span>Meu Perfil</span>}
            </S.NavButton>
          </S.NavigationList>

          <S.SidebarFooter>
            {user?.role === "ADMIN" && (
              <S.NavButton
                style={{ marginBottom: "0.25rem", color: "#ffffff" }}
                onClick={() => navigate("/admin")}
              >
                <ShieldAlert size={20} />
                {!isSidebarCollapsed && <span>Entrar na tela de admin</span>}
              </S.NavButton>
            )}

            <S.ThemeToggle
              onClick={handleEnableNotifications}
              title={
                notificationsEnabled
                  ? "Desativar notificações"
                  : "Ativar notificações"
              }
            >
              {notificationsEnabled ? (
                <BellRing size={18} />
              ) : (
                <Bell size={18} />
              )}
              {!isSidebarCollapsed && (
                <span>
                  {notificationsEnabled
                    ? "Notificações Ativas"
                    : "Ativar Notificações"}
                </span>
              )}
            </S.ThemeToggle>

            <S.NavButton
              style={{ marginTop: "0.5rem", color: "#ef4444" }}
              onClick={handleLogout}
            >
              <LogOut size={20} />
              {!isSidebarCollapsed && <span>Sair</span>}
            </S.NavButton>
          </S.SidebarFooter>
        </S.Sidebar>

        <S.MainContent>
          {activeTab === "orders" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.85rem",
                flexWrap: "wrap",
                borderRadius: 14,
                padding: "0.8rem 0.95rem",
                marginBottom: "1rem",
                border: isDarkMode
                  ? "1px solid rgba(71, 85, 105, 0.4)"
                  : "1px solid rgba(148, 163, 184, 0.35)",
                background: isDarkMode
                  ? "rgba(15, 23, 42, 0.45)"
                  : "rgba(255, 255, 255, 0.92)",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  fontWeight: 700,
                  color: isDarkMode ? "#e2e8f0" : "#0f172a",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background:
                      socketStatus === "connected" ? "#22c55e" : "#f59e0b",
                    boxShadow:
                      socketStatus === "connected"
                        ? "0 0 0 4px rgba(34,197,94,0.15)"
                        : "0 0 0 4px rgba(245,158,11,0.16)",
                    flexShrink: 0,
                  }}
                />
                <span>
                  {socketStatus === "connected"
                    ? "Tempo real conectado"
                    : "Reconectando tempo real"}
                </span>
              </div>

              <small
                style={{
                  color: isDarkMode ? "#94a3b8" : "#475569",
                  fontSize: 12,
                }}
              >
                {lastOrdersSyncAt
                  ? `Pedidos sincronizados as ${new Date(lastOrdersSyncAt).toLocaleTimeString("pt-BR")}`
                  : "Sincronizando pedidos..."}
              </small>
            </div>
          )}

          {pinRequestMessages.length > 0 && (
            <div
              style={{
                border: isDarkMode
                  ? "1px solid rgba(251, 191, 36, 0.34)"
                  : "1px solid rgba(180, 83, 9, 0.28)",
                background: isDarkMode
                  ? "linear-gradient(135deg, rgba(120,53,15,0.3), rgba(17,24,39,0.5))"
                  : "linear-gradient(135deg, rgba(253,230,138,0.86), rgba(207,217,228,0.94))",
                borderRadius: 14,
                padding: "0.95rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.8rem",
                  marginBottom: "0.7rem",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    fontWeight: 700,
                    color: isDarkMode ? "#fde68a" : "#92400e",
                  }}
                >
                  <AlertCircle size={16} />
                  <span>
                    Mensagens de Notificação ({pinRequestMessages.length})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={clearPinRequestMessages}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    padding: "0.35rem 0.75rem",
                    cursor: "pointer",
                    fontWeight: 700,
                    background: isDarkMode ? "#1f2937" : "#d8e2ed",
                    color: isDarkMode ? "#f8fafc" : "#0f172a",
                  }}
                >
                  Limpar
                </button>
              </div>

              <div style={{ display: "grid", gap: "0.5rem" }}>
                {pinRequestMessages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      borderRadius: 10,
                      padding: "0.62rem 0.7rem",
                      background: isDarkMode
                        ? "rgba(15, 23, 42, 0.55)"
                        : "rgba(216, 226, 237, 0.9)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{message.text}</div>
                      <small style={{ opacity: 0.75 }}>
                        {new Date(message.createdAt).toLocaleTimeString(
                          "pt-BR",
                        )}
                      </small>
                    </div>

                    <button
                      type="button"
                      onClick={() => removePinRequestMessage(message.id)}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: isDarkMode ? "#e2e8f0" : "#334155",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      aria-label="Fechar mensagem"
                      title="Fechar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <Suspense fallback={null}>
              <OrdersTab
                filteredOrders={filteredOrders}
                statusCounters={statusCounters}
                orderTypeFilter={orderTypeFilter}
                orders={orders}
                statusFilter={statusFilter}
                isDarkMode={isDarkMode}
                closingOrderIds={closingOrderIds}
                expandedOrderIds={expandedOrderIds}
                pinInputByOrderId={pinInputByOrderId}
                requestingPinOrderIds={requestingPinOrderIds}
                confirmingPinOrderIds={confirmingPinOrderIds}
                paymentPinToolsEnabled={PAYMENT_PIN_TOOLS_ENABLED}
                orderStatusMeta={ORDER_STATUS_META}
                onSetOrderTypeFilter={setOrderTypeFilter}
                onSetStatusFilter={setStatusFilter}
                onToggleOrderExpanded={toggleOrderExpanded}
                onSetPinInputByOrderId={setPinInputByOrderId}
                onRequestPaymentPin={handleRequestPaymentPin}
                onConfirmPaymentWithPin={handleConfirmPaymentWithPin}
                onUpdateStatus={handleUpdateStatus}
                getPaymentSummaryLabel={getPaymentSummaryLabel}
                getDeliveryAddressLabel={getDeliveryAddressLabel}
                isPendingDigitalPayment={isPendingDigitalPayment}
                isDeliveryBlockedUntilPaid={isDeliveryBlockedUntilPaid}
                getOrderTableLabel={getOrderTableLabel}
                getStatusChipStyle={getStatusChipStyle}
                getStatusValueIcon={getStatusValueIcon}
                getOrderTypeDisplayLabel={getOrderTypeDisplayLabel}
              />
            </Suspense>
          )}

          {activeTab === "tables" && (
            <Suspense fallback={null}>
              <TablesTab
                tables={tables}
                openSessions={openSessions}
                tableCards={tableCards}
                openingTableIds={openingTableIds}
                closingSessionIds={closingSessionIds}
                highlightedTableId={highlightedTableId}
                highlightedTableNumber={highlightedTableNumber}
                isHighlightBlinking={isHighlightBlinking}
                highlightPulseOn={highlightPulseOn}
                isDarkMode={isDarkMode}
                refreshTablesPanel={refreshTablesPanel}
                copyGeneratedPin={copyGeneratedPin}
                handleOpenTable={handleOpenTable}
                handleCloseTableSession={handleCloseTableSession}
              />
            </Suspense>
          )}

          {activeTab === "profile" && (
            <Suspense fallback={null}>
              <ProfileTab
                user={user}
                managerInfo={managerInfo}
                isDarkMode={isDarkMode}
              />
            </Suspense>
          )}
        </S.MainContent>
      </S.AdminLayout>
    </ThemeProvider>
  );
}
