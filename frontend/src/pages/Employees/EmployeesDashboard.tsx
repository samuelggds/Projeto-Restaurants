import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import {
  ClipboardList,
  User,
  Utensils,
  Bell,
  BellRing,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu,
  ChevronDown,
  ChevronUp,
  LogOut,
  ShieldAlert,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  ChefHat,
  Truck,
  Clock,
  CreditCard,
  Package,
  X,
  Table2,
  KeyRound,
  DoorOpen,
  Copy,
  RefreshCcw,
} from "lucide-react";
import { toast } from "react-toastify";
import ordersService from "../../Services/ordersService";
import tablesService from "../../Services/tablesService";
import tableSessionService from "../../Services/tableSessionService";
import { connectSocket, disconnectSocket } from "../../Services/socketService";
import { useAuth } from "../../contexts/authContext";
import * as S from "./styles";

const CLOSABLE_ORDER_STATUSES = ["ENTREGUE", "CANCELADO"];
const CLOSED_COMPLETED_ORDERS_STORAGE_KEY =
  "@PecaJaFood:employeesClosedCompletedOrders";
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
  SAIU_PARA_ENTREGA: { label: "Em entrega", color: "#3b82f6" },
  ENTREGUE: { label: "Entregue", color: "#22c55e" },
  CANCELADO: { label: "Cancelado", color: "#ef4444" },
};

const CLOSED_STATUS_SET = new Set(["ENTREGUE", "CANCELADO"]);

function getPaymentSummaryLabel(_order?: any) {
  return "PIX";
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

function getInitialClosedCompletedOrders() {
  const raw = localStorage.getItem(CLOSED_COMPLETED_ORDERS_STORAGE_KEY);

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
  const [isDarkMode, setIsDarkMode] = useState(true);
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
  const [closingOrderIds, setClosingOrderIds] = useState([]);
  const [openingTableIds, setOpeningTableIds] = useState([]);
  const [closingSessionIds, setClosingSessionIds] = useState([]);
  const [closedCompletedOrderIds, setClosedCompletedOrderIds] = useState(
    getInitialClosedCompletedOrders,
  );
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
      CLOSED_COMPLETED_ORDERS_STORAGE_KEY,
      JSON.stringify(closedCompletedOrderIds),
    );
  }, [closedCompletedOrderIds]);

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
      return undefined;
    }

    const socket = connectSocket(token);

    const onNewOrder = (order) => {
      setOrders((prev) => {
        const exists = prev.some((item) => item.id === order.id);
        if (exists) {
          return prev;
        }
        return [order, ...prev];
      });
    };

    const onStatusChanged = (order) => {
      if (!CLOSABLE_ORDER_STATUSES.includes(order?.status)) {
        setClosedCompletedOrderIds((prev) =>
          prev.filter((id) => id !== order.id),
        );
      }

      if (order?.paid === true) {
        setPinInputByOrderId((prev) => {
          const next = { ...prev };
          delete next[order.id];
          return next;
        });
      }

      setOrders((prev) =>
        prev.map((item) => (item.id === order.id ? order : item)),
      );
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

    socket.on("new-order", onNewOrder);
    socket.on("order:status-changed", onStatusChanged);
    socket.on("table:pin-requested", onTablePinRequested);

    return () => {
      socket.off("new-order", onNewOrder);
      socket.off("order:status-changed", onStatusChanged);
      socket.off("table:pin-requested", onTablePinRequested);
      disconnectSocket();
    };
  }, [notificationsEnabled]);

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
    try {
      const updated = await ordersService.updateStatus(order.id, nextStatus);
      setOrders((prev) =>
        prev.map((item) => (item.id === order.id ? updated : item)),
      );

      if (!CLOSABLE_ORDER_STATUSES.includes(nextStatus)) {
        setClosedCompletedOrderIds((prev) =>
          prev.filter((id) => id !== order.id),
        );
      }

      toast.info(
        `Pedido #${order.id} alterado para ${nextStatus.replace(/_/g, " ")}`,
      );
    } catch (err) {
      const message =
        err?.response?.data?.error || "Erro ao alterar status do pedido";
      const friendlyMessage =
        message.includes("pagamento PIX/CARTAO") ||
        message.includes("ainda não foi confirmado")
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

  function handleCloseCompletedOrder(orderId) {
    const targetOrder = orders.find((order) => order.id === orderId);

    if (!targetOrder || !CLOSABLE_ORDER_STATUSES.includes(targetOrder.status)) {
      return;
    }

    setClosingOrderIds((prev) =>
      prev.includes(orderId) ? prev : [...prev, orderId],
    );

    setTimeout(() => {
      setClosedCompletedOrderIds((prev) =>
        prev.includes(orderId) ? prev : [...prev, orderId],
      );
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      setClosingOrderIds((prev) => prev.filter((id) => id !== orderId));
    }, 320);
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
    const visibleOrders = orders.filter(
      (order) =>
        !(
          CLOSABLE_ORDER_STATUSES.includes(order.status) &&
          closedCompletedOrderIds.includes(order.id)
        ),
    );

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
  }, [orders, statusFilter, orderTypeFilter, closedCompletedOrderIds]);

  const ordersByTypeForCounters = useMemo(() => {
    const visibleOrders = orders.filter(
      (order) =>
        !(
          CLOSABLE_ORDER_STATUSES.includes(order.status) &&
          closedCompletedOrderIds.includes(order.id)
        ),
    );

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
  }, [orders, orderTypeFilter, closedCompletedOrderIds]);

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

            <S.ThemeToggle onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              {!isSidebarCollapsed && (
                <span>{isDarkMode ? "Modo Claro" : "Modo Escuro"}</span>
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
            <div>
              <S.PageHeader>
                <h2
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.55rem",
                  }}
                >
                  Pedidos em Tempo Real
                  <span
                    style={{
                      fontSize: "0.76rem",
                      fontWeight: 800,
                      padding: "0.22rem 0.55rem",
                      borderRadius: 999,
                      background: "rgba(234, 29, 44, 0.16)",
                      color: isDarkMode ? "#fecdd3" : "#9f1239",
                    }}
                  >
                    {filteredOrders.length}
                  </span>
                </h2>
                <p>
                  Painel operacional no estilo motoqueiro com fluxo completo.
                </p>
              </S.PageHeader>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "0.65rem",
                  marginBottom: "1rem",
                }}
              >
                <S.FormCard
                  style={{ padding: "0.9rem 1rem", maxWidth: "none" }}
                >
                  <small style={{ opacity: 0.72 }}>Prontos</small>
                  <div
                    style={{
                      marginTop: "0.2rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      fontSize: "1.28rem",
                      fontWeight: 800,
                      color: "#ea1d2c",
                    }}
                  >
                    <Package size={18} /> {statusCounters.PRONTO}
                  </div>
                </S.FormCard>
                <S.FormCard
                  style={{ padding: "0.9rem 1rem", maxWidth: "none" }}
                >
                  <small style={{ opacity: 0.72 }}>Em rota</small>
                  <div
                    style={{
                      marginTop: "0.2rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      fontSize: "1.28rem",
                      fontWeight: 800,
                      color: "#ea1d2c",
                    }}
                  >
                    <Truck size={18} /> {statusCounters.SAIU_PARA_ENTREGA}
                  </div>
                </S.FormCard>
                <S.FormCard
                  style={{ padding: "0.9rem 1rem", maxWidth: "none" }}
                >
                  <small style={{ opacity: 0.72 }}>Concluídos</small>
                  <div
                    style={{
                      marginTop: "0.2rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      fontSize: "1.28rem",
                      fontWeight: 800,
                      color: "#22c55e",
                    }}
                  >
                    <CheckCircle2 size={18} /> {statusCounters.ENTREGUE}
                  </div>
                </S.FormCard>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                {[
                  { key: "TODOS", label: "Todos", icon: ClipboardList },
                  { key: "MESA", label: "Mesa", icon: Table2 },
                  { key: "DELIVERY", label: "Entrega", icon: Truck },
                  { key: "RETIRADA", label: "Retirada", icon: DoorOpen },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = orderTypeFilter === item.key;
                  const count =
                    item.key === "TODOS"
                      ? statusCounters.TODOS
                      : orders.filter((order) => {
                          const type = String(order?.type || "").toUpperCase();
                          if (item.key === "MESA") return type === "MESA";
                          if (item.key === "DELIVERY")
                            return type.includes("DELIVERY");
                          if (item.key === "RETIRADA")
                            return type === "RETIRADA";
                          return true;
                        }).length;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setOrderTypeFilter(item.key)}
                      style={{
                        border: "none",
                        borderRadius: 999,
                        padding: "0.46rem 0.88rem",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        fontWeight: 700,
                        background: active
                          ? "linear-gradient(135deg, #ea1d2c, #b8141f)"
                          : isDarkMode
                            ? "#1f2937"
                            : "#d8e2ed",
                        color: active
                          ? "#ffffff"
                          : isDarkMode
                            ? "#e2e8f0"
                            : "#0f172a",
                      }}
                    >
                      <Icon size={15} />
                      {item.label}
                      <span style={{ opacity: 0.85 }}>({count})</span>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginBottom: "1.2rem",
                  flexWrap: "wrap",
                }}
              >
                {[
                  { key: "TODOS", label: "Todos" },
                  { key: "PENDENTE", label: "Pendente" },
                  { key: "PREPARANDO", label: "Preparando" },
                  { key: "PRONTO", label: "Pronto" },
                  { key: "SAIU_PARA_ENTREGA", label: "Em entrega" },
                  { key: "ENTREGUE", label: "Entregue" },
                  { key: "CANCELADO", label: "Cancelado" },
                ].map((status) => (
                  <button
                    key={status.key}
                    onClick={() => setStatusFilter(status.key)}
                    style={{
                      padding: "0.44rem 0.86rem",
                      borderRadius: "999px",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: "700",
                      fontSize: "0.82rem",
                      background:
                        statusFilter === status.key
                          ? "linear-gradient(135deg, #ea1d2c, #b8141f)"
                          : isDarkMode
                            ? "#27364a"
                            : "#dbe6f3",
                      color:
                        statusFilter === status.key
                          ? "#ffffff"
                          : isDarkMode
                            ? "#e2e8f0"
                            : "#0f172a",
                    }}
                  >
                    {status.label} ({statusCounters[status.key] || 0})
                  </button>
                ))}
              </div>

              <S.OrdersGrid>
                {filteredOrders.length === 0 ? (
                  <p
                    style={{
                      gridColumn: "1/-1",
                      textAlign: "center",
                      opacity: 0.5,
                      padding: "2rem",
                    }}
                  >
                    Nenhum pedido encontrado neste status.
                  </p>
                ) : (
                  filteredOrders.map((order) => {
                    const isDelivery = String(order.type).includes("DELIVERY");
                    const deliveryCustomerName = "Admin Pizza IA";
                    const paymentSummaryLabel = getPaymentSummaryLabel(order);
                    const deliveryAddressLabel = getDeliveryAddressLabel(order);
                    const pendingDigitalPayment =
                      PAYMENT_PIN_TOOLS_ENABLED &&
                      isPendingDigitalPayment(order);
                    const deliveryBlockedUntilPaid =
                      isDeliveryBlockedUntilPaid(order);
                    const pinInput = String(pinInputByOrderId[order.id] || "");
                    const isRequestingPin = requestingPinOrderIds.includes(
                      order.id,
                    );
                    const isConfirmingPin = confirmingPinOrderIds.includes(
                      order.id,
                    );
                    const isExpanded = Boolean(expandedOrderIds[order.id]);
                    const statusLabel =
                      ORDER_STATUS_META[String(order?.status || "")]?.label ||
                      String(order.status).replace(/_/g, " ");
                    const tableLabel = getOrderTableLabel(order);
                    const infoChipStyle = {
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      color: "#475569",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 6,
                      padding: "3px 8px",
                    };

                    return (
                      <S.OrderCard
                        key={order.id}
                        $isClosing={closingOrderIds.includes(order.id)}
                      >
                        <div className="card-header">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleOrderExpanded(order.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                toggleOrderExpanded(order.id);
                              }
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            <h3>Pedido #{order.id}</h3>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "0.5rem",
                                marginTop: "0.35rem",
                              }}
                            >
                              <span style={getStatusChipStyle(order.status)}>
                                {getStatusValueIcon(order.status)}
                                Status: {statusLabel}
                              </span>
                              <span style={infoChipStyle}>
                                {String(order.type || "")
                                  .toUpperCase()
                                  .includes("DELIVERY") ? (
                                  <Truck size={13} />
                                ) : String(order.type || "")
                                    .toUpperCase()
                                    .includes("MESA") ? (
                                  <Table2 size={13} />
                                ) : (
                                  <DoorOpen size={13} />
                                )}
                                {getOrderTypeDisplayLabel(order.type)}
                              </span>
                              {tableLabel ? (
                                <span style={infoChipStyle}>
                                  <Table2 size={13} />
                                  {tableLabel}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <S.CardHeaderActions>
                            <span className="price">
                              R$ {Number(order.total || 0).toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleOrderExpanded(order.id)}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: isDarkMode ? "#cbd5e1" : "#334155",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: "0.1rem",
                              }}
                              title={isExpanded ? "Recolher" : "Expandir"}
                              aria-label={
                                isExpanded
                                  ? "Recolher pedido"
                                  : "Expandir pedido"
                              }
                            >
                              {isExpanded ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </button>

                            {CLOSABLE_ORDER_STATUSES.includes(order.status) && (
                              <S.CloseCompletedButton
                                type="button"
                                onClick={() =>
                                  handleCloseCompletedOrder(order.id)
                                }
                                aria-label={`Fechar pedido ${order.id}`}
                                title="Fechar pedido concluído"
                              >
                                <X size={14} />
                              </S.CloseCompletedButton>
                            )}
                          </S.CardHeaderActions>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                            marginBottom: "0.6rem",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 12,
                              color: "#475569",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: 6,
                              padding: "3px 8px",
                            }}
                          >
                            <User size={13} />
                            {deliveryCustomerName}
                          </span>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 12,
                              color: "#475569",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: 6,
                              padding: "3px 8px",
                            }}
                          >
                            <CreditCard size={13} />
                            {paymentSummaryLabel}
                            {order.paid ? " | Confirmado" : ""}
                          </span>
                        </div>

                        <div
                          className="items-list"
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                            marginBottom: "0.55rem",
                            opacity: isExpanded ? 1 : 0.82,
                          }}
                        >
                          {(order.items || []).map((item, index) => (
                            <span
                              key={`${order.id}-${String(item?.product?.name || "item")}-${index}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 12,
                                color: "#475569",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: 6,
                                padding: "3px 8px",
                              }}
                            >
                              <Package size={13} />
                              {`${item.quantity}x ${item?.product?.name || "Produto"}`}
                            </span>
                          ))}
                        </div>

                        {isExpanded && isDelivery ? (
                          <div
                            style={{
                              marginTop: "0.4rem",
                              marginBottom: "0.55rem",
                              fontSize: "0.88rem",
                              color: isDarkMode ? "#cbd5e1" : "#334155",
                              lineHeight: 1.45,
                            }}
                          >
                            <div>
                              <strong>Cliente:</strong> {deliveryCustomerName}
                            </div>
                            <div>
                              <strong>Entrega:</strong>{" "}
                              {deliveryAddressLabel ||
                                "Endereço não informado no pedido."}
                            </div>
                          </div>
                        ) : null}

                        {isDelivery &&
                        order.status === "SAIU_PARA_ENTREGA" &&
                        pendingDigitalPayment ? (
                          <div
                            style={{
                              marginTop: "0.55rem",
                              display: "grid",
                              gap: "0.45rem",
                              padding: "0.55rem",
                              borderRadius: 10,
                              border: "1px solid rgba(251, 191, 36, 0.3)",
                              background: isDarkMode
                                ? "rgba(15, 23, 42, 0.48)"
                                : "rgba(254, 249, 195, 0.55)",
                            }}
                          >
                            <small
                              style={{
                                fontWeight: 700,
                                color: isDarkMode ? "#fef3c7" : "#78350f",
                              }}
                            >
                              Pagamento digital pendente. Solicite e confirme o
                              PIN antes de concluir a entrega.
                            </small>

                            <button
                              type="button"
                              className="btn active-entrega"
                              style={{ width: "100%", padding: "0.56rem" }}
                              onClick={() => handleRequestPaymentPin(order)}
                              disabled={isRequestingPin || isConfirmingPin}
                            >
                              {isRequestingPin
                                ? "Solicitando PIN..."
                                : "Solicitar PIN de Pagamento"}
                            </button>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr auto",
                                gap: "0.45rem",
                              }}
                            >
                              <input
                                type="text"
                                value={pinInput}
                                placeholder="Digite o PIN"
                                maxLength={8}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setPinInputByOrderId((prev) => ({
                                    ...prev,
                                    [order.id]: value,
                                  }));
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    handleConfirmPaymentWithPin(order);
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  minHeight: 38,
                                  borderRadius: 8,
                                  border: "1px solid rgba(148, 163, 184, 0.5)",
                                  padding: "0 0.65rem",
                                  background: isDarkMode
                                    ? "#0f172a"
                                    : "#ffffff",
                                  color: isDarkMode ? "#f8fafc" : "#0f172a",
                                }}
                              />
                              <button
                                type="button"
                                className="btn active-pronto"
                                style={{
                                  minHeight: 38,
                                  padding: "0 0.9rem",
                                  whiteSpace: "nowrap",
                                }}
                                onClick={() =>
                                  handleConfirmPaymentWithPin(order)
                                }
                                disabled={
                                  isConfirmingPin ||
                                  isRequestingPin ||
                                  pinInput.trim().length === 0
                                }
                              >
                                {isConfirmingPin ? "..." : "Confirmar PIN"}
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {isExpanded && !!order.observation && (
                          <div
                            style={{
                              background: "rgba(239, 68, 68, 0.1)",
                              borderLeft: "3px solid #ef4444",
                              padding: "0.5rem",
                              borderRadius: "4px",
                              margin: "0.5rem 0",
                              fontSize: "0.9rem",
                            }}
                          >
                            <strong>Obs:</strong> {order.observation}
                          </div>
                        )}

                        <S.StatusBox style={{ marginTop: "1rem" }}>
                          <h4>
                            Status:{" "}
                            <span
                              style={{
                                ...getStatusChipStyle(order.status),
                                textTransform: "none",
                                marginLeft: 4,
                              }}
                            >
                              {getStatusValueIcon(order.status)}
                              {String(order.status).replace(/_/g, " ")}
                            </span>
                          </h4>

                          <S.ButtonGroup
                            style={{ marginTop: "0.75rem", display: "block" }}
                          >
                            {order.status === "PENDENTE" && (
                              <button
                                className="btn active-preparando"
                                style={{
                                  width: "100%",
                                  padding: "0.65rem",
                                  fontSize: "0.9rem",
                                }}
                                onClick={() =>
                                  handleUpdateStatus(order, "PREPARANDO")
                                }
                              >
                                <ChefHat size={18} style={{ marginRight: 6 }} />{" "}
                                Aceitar & Preparar
                              </button>
                            )}

                            {order.status === "PREPARANDO" && (
                              <button
                                className="btn active-pronto"
                                style={{
                                  width: "100%",
                                  padding: "0.65rem",
                                  fontSize: "0.9rem",
                                }}
                                onClick={() =>
                                  handleUpdateStatus(order, "PRONTO")
                                }
                              >
                                <CheckCircle2
                                  size={18}
                                  style={{ marginRight: 6 }}
                                />{" "}
                                Prato Pronto!
                              </button>
                            )}

                            {order.status === "PRONTO" && (
                              <button
                                className={
                                  isDelivery
                                    ? "btn active-entrega"
                                    : "btn active-entregue"
                                }
                                style={{
                                  width: "100%",
                                  padding: "0.65rem",
                                  fontSize: "0.9rem",
                                }}
                                onClick={() =>
                                  handleUpdateStatus(
                                    order,
                                    isDelivery
                                      ? "SAIU_PARA_ENTREGA"
                                      : "ENTREGUE",
                                  )
                                }
                              >
                                {isDelivery ? (
                                  <>
                                    <Truck
                                      size={18}
                                      style={{ marginRight: 6 }}
                                    />{" "}
                                    Despachar Pedido
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2
                                      size={18}
                                      style={{ marginRight: 6 }}
                                    />{" "}
                                    Entregar na Mesa / Balcão
                                  </>
                                )}
                              </button>
                            )}

                            {order.status === "SAIU_PARA_ENTREGA" && (
                              <button
                                className="btn active-entregue"
                                style={{
                                  width: "100%",
                                  padding: "0.65rem",
                                  fontSize: "0.9rem",
                                }}
                                onClick={() =>
                                  handleUpdateStatus(order, "ENTREGUE")
                                }
                                disabled={deliveryBlockedUntilPaid}
                                title={
                                  deliveryBlockedUntilPaid
                                    ? "Confirme o pagamento antes de entregar"
                                    : ""
                                }
                              >
                                <CheckCircle2
                                  size={18}
                                  style={{ marginRight: 6 }}
                                />{" "}
                                Confirmar Entrega
                              </button>
                            )}

                            {(order.status === "ENTREGUE" ||
                              order.status === "CANCELADO") && (
                              <div
                                style={{
                                  textAlign: "center",
                                  fontSize: "0.85rem",
                                  opacity: 0.5,
                                  padding: "0.5rem 0",
                                }}
                              >
                                Fluxo concluído com sucesso.
                              </div>
                            )}
                          </S.ButtonGroup>
                        </S.StatusBox>
                      </S.OrderCard>
                    );
                  })
                )}
              </S.OrdersGrid>
            </div>
          )}

          {activeTab === "tables" && (
            <div>
              <S.PageHeader>
                <h2>Gerador de PIN por Mesa</h2>
                <p>
                  Abra uma mesa para gerar um PIN novo, acompanhe as sessões
                  ativas e feche a mesa para invalidar o acesso.
                </p>
              </S.PageHeader>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.85rem",
                  marginBottom: "1.25rem",
                }}
              >
                {[
                  {
                    label: "Mesas cadastradas",
                    value: tables.length,
                    color: "var(--primary, #eab308)",
                  },
                  {
                    label: "Mesas abertas",
                    value: openSessions.length,
                    color: "#10b981",
                  },
                  {
                    label: "Mesas fechadas",
                    value: Math.max(tables.length - openSessions.length, 0),
                    color: "#6366f1",
                  },
                ].map((item) => (
                  <S.FormCard
                    key={item.label}
                    style={{ padding: "1rem 1.1rem", maxWidth: "none" }}
                  >
                    <small style={{ opacity: 0.65 }}>{item.label}</small>
                    <div
                      style={{
                        fontSize: "1.8rem",
                        fontWeight: 800,
                        color: item.color,
                        marginTop: "0.2rem",
                      }}
                    >
                      {item.value}
                    </div>
                  </S.FormCard>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={refreshTablesPanel}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    padding: "0.6rem 1rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    background: "var(--primary, #eab308)",
                    color: "#111827",
                    fontWeight: 800,
                    marginBottom: "1rem",
                  }}
                >
                  <RefreshCcw size={16} /> Atualizar mesas
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "1rem",
                }}
              >
                {tableCards.map(({ table, openSession, generatedPin }) => {
                  const isOpen = Boolean(openSession);
                  const isOpening = openingTableIds.includes(table.id);
                  const isClosing = closingSessionIds.includes(openSession?.id);
                  const pinValue = generatedPin?.pin || "";
                  const isHighlighted =
                    (highlightedTableId &&
                      Number(table.id) === highlightedTableId) ||
                    (highlightedTableNumber &&
                      Number(table.number) === highlightedTableNumber);
                  const highlightBorder =
                    isHighlighted && isHighlightBlinking && !highlightPulseOn
                      ? "2px solid transparent"
                      : isHighlighted
                        ? "2px solid #ef4444"
                        : "1px solid transparent";
                  const highlightShadow =
                    isHighlighted && isHighlightBlinking && !highlightPulseOn
                      ? "0 0 0 1px rgba(245, 158, 11, 0.08)"
                      : isHighlighted
                        ? "0 0 0 4px rgba(245, 158, 11, 0.2), 0 18px 36px rgba(2, 6, 23, 0.18)"
                        : undefined;

                  return (
                    <S.FormCard
                      key={table.id}
                      style={{
                        maxWidth: "none",
                        borderTop: `4px solid ${isOpen ? "#10b981" : "#ef4444"}`,
                        border: highlightBorder,
                        boxShadow: highlightShadow,
                        transform: isHighlighted
                          ? "translateY(-2px)"
                          : undefined,
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.9rem",
                        transition:
                          "box-shadow 0.2s ease, transform 0.25s ease, border-color 0.2s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                        }}
                      >
                        <div>
                          <div style={{ opacity: 0.65, fontSize: "0.8rem" }}>
                            Mesa
                          </div>
                          <h3 style={{ fontSize: "1.35rem", marginTop: 2 }}>
                            #{table.number}
                          </h3>
                        </div>
                        <span
                          style={{
                            borderRadius: 999,
                            padding: "0.35rem 0.7rem",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            background: isOpen ? "#10b98122" : "#ef444422",
                            color: isOpen ? "#10b981" : "#ef4444",
                          }}
                        >
                          {isOpen ? "Aberta" : "Fechada"}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gap: "0.45rem",
                          fontSize: "0.9rem",
                          opacity: 0.9,
                        }}
                      >
                        <div>
                          <strong>Capacidade:</strong> {table.capacity || "-"}
                        </div>
                        <div>
                          <strong>Pedidos abertos:</strong>{" "}
                          {table?._count?.orders || 0}
                        </div>
                        <div>
                          <strong>Sessões:</strong>{" "}
                          {table?._count?.tableSessions || 0}
                        </div>
                      </div>

                      {isOpen ? (
                        <div
                          style={{
                            borderRadius: 12,
                            padding: "0.9rem",
                            background: isDarkMode
                              ? "rgba(16, 185, 129, 0.12)"
                              : "rgba(16, 185, 129, 0.08)",
                            border: "1px solid rgba(16, 185, 129, 0.2)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.45rem",
                              marginBottom: "0.5rem",
                              fontWeight: 800,
                            }}
                          >
                            <KeyRound size={16} /> PIN ativo da mesa
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "0.75rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "1.3rem",
                                fontWeight: 900,
                                letterSpacing: "0.18em",
                              }}
                            >
                              {pinValue || "PIN salvo nesta sessão"}
                            </div>

                            {pinValue && (
                              <button
                                type="button"
                                onClick={() => copyGeneratedPin(pinValue)}
                                style={{
                                  border: "none",
                                  borderRadius: 999,
                                  padding: "0.45rem 0.8rem",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.4rem",
                                  background: "#111827",
                                  color: "#fff",
                                  fontWeight: 700,
                                }}
                              >
                                <Copy size={14} /> Copiar
                              </button>
                            )}
                          </div>

                          <div
                            style={{
                              marginTop: "0.65rem",
                              fontSize: "0.85rem",
                            }}
                          >
                            {openSession?.openedBy?.name || "Equipe"} abriu esta
                            mesa.
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            borderRadius: 12,
                            padding: "0.9rem",
                            background: isDarkMode
                              ? "rgba(239, 68, 68, 0.12)"
                              : "rgba(239, 68, 68, 0.08)",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            fontSize: "0.9rem",
                          }}
                        >
                          Mesa fechada. Abra para gerar um novo PIN.
                        </div>
                      )}

                      <div
                        style={{
                          display: "flex",
                          gap: "0.65rem",
                          flexWrap: "wrap",
                        }}
                      >
                        {isOpen ? (
                          <button
                            type="button"
                            onClick={() => handleCloseTableSession(openSession)}
                            disabled={isClosing}
                            style={{
                              border: "none",
                              borderRadius: 999,
                              padding: "0.65rem 1rem",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              background: isClosing ? "#94a3b8" : "#ef4444",
                              color: "#fff",
                              fontWeight: 800,
                            }}
                          >
                            <DoorOpen size={16} />
                            {isClosing ? "Fechando..." : "Fechar mesa"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenTable(table)}
                            disabled={isOpening}
                            style={{
                              border: "none",
                              borderRadius: 999,
                              padding: "0.65rem 1rem",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              background: isOpening ? "#94a3b8" : "#10b981",
                              color: "#fff",
                              fontWeight: 800,
                            }}
                          >
                            <KeyRound size={16} />
                            {isOpening ? "Gerando PIN..." : "Abrir e gerar PIN"}
                          </button>
                        )}
                      </div>
                    </S.FormCard>
                  );
                })}
              </div>

              <S.FormCard style={{ marginTop: "1.25rem", maxWidth: "none" }}>
                <S.PageHeader style={{ marginBottom: "1rem" }}>
                  <h2>Sessões abertas agora</h2>
                  <p>Feche uma sessão quando a mesa sair de atendimento.</p>
                </S.PageHeader>

                {openSessions.length === 0 ? (
                  <div
                    style={{
                      opacity: 0.7,
                      fontSize: "0.95rem",
                      padding: "0.75rem 0",
                    }}
                  >
                    Nenhuma mesa aberta no momento.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: "0.75rem",
                    }}
                  >
                    {openSessions.map((session) => (
                      <div
                        key={session.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.85rem 1rem",
                          borderRadius: 12,
                          border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
                          background: isDarkMode ? "#172033" : "#f8fafc",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <strong>
                            Mesa #{session.table?.number || session.tableId}
                          </strong>
                          <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                            Aberta por {session.openedBy?.name || "Equipe"}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCloseTableSession(session)}
                          disabled={closingSessionIds.includes(session.id)}
                          style={{
                            border: "none",
                            borderRadius: 999,
                            padding: "0.55rem 0.85rem",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            background: closingSessionIds.includes(session.id)
                              ? "#94a3b8"
                              : "#ef4444",
                            color: "#fff",
                            fontWeight: 800,
                          }}
                        >
                          <DoorOpen size={15} />
                          {closingSessionIds.includes(session.id)
                            ? "Fechando..."
                            : "Fechar"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </S.FormCard>
            </div>
          )}

          {activeTab === "profile" && (
            <S.FlexDashboardLayout>
              <S.FormCard style={{ flex: 1 }}>
                <S.PageHeader style={{ marginBottom: "1.5rem" }}>
                  <h2>Meu Perfil</h2>
                  <p>
                    Suas credenciais e informações profissionais no Peça Já.
                  </p>
                </S.PageHeader>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <S.FormGroup>
                    <label>Nome do Colaborador</label>
                    <input
                      type="text"
                      value={user?.name || "-"}
                      disabled
                      style={{ cursor: "not-allowed", opacity: 0.8 }}
                    />
                  </S.FormGroup>

                  <S.FormGroup>
                    <label>E-mail de Acesso</label>
                    <input
                      type="email"
                      value={user?.email || "-"}
                      disabled
                      style={{ cursor: "not-allowed", opacity: 0.8 }}
                    />
                  </S.FormGroup>

                  <S.FormRow>
                    <S.FormGroup>
                      <label>Telefone</label>
                      <input
                        type="text"
                        value={user?.phone || "-"}
                        disabled
                        style={{ cursor: "not-allowed", opacity: 0.8 }}
                      />
                    </S.FormGroup>
                    <S.FormGroup>
                      <label>Cargo / Função (Role)</label>
                      <div style={{ marginTop: "0.25rem" }}>
                        <S.SlugBadge
                          style={{ fontSize: "1rem", padding: "0.5rem 1rem" }}
                        >
                          {user?.role || "-"}
                        </S.SlugBadge>
                      </div>
                    </S.FormGroup>
                  </S.FormRow>
                </div>
              </S.FormCard>

              <S.FormCard
                style={{
                  flex: 1,
                  borderTop: "4px solid var(--primary, #eab308)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <S.FormSectionTitle
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: "var(--primary, #eab308)",
                    }}
                  >
                    <ShieldAlert size={20} /> Plantão da Gerência
                  </S.FormSectionTitle>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      opacity: 0.7,
                      marginBottom: "1.5rem",
                    }}
                  >
                    Precisa cancelar um pedido, dar desconto ou relatar um
                    problema? Entre em contato com a gerência responsável.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <User size={18} style={{ opacity: 0.6 }} />
                      <div>
                        <small style={{ display: "block", opacity: 0.5 }}>
                          Gerência
                        </small>
                        <strong>{managerInfo.name}</strong>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <Mail size={18} style={{ opacity: 0.6 }} />
                      <div>
                        <small style={{ display: "block", opacity: 0.5 }}>
                          E-mail de Contato
                        </small>
                        <span>{managerInfo.email}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <Phone size={18} style={{ opacity: 0.6 }} />
                      <div>
                        <small style={{ display: "block", opacity: 0.5 }}>
                          Telefone / WhatsApp
                        </small>
                        <span style={{ color: "#22c55e", fontWeight: "600" }}>
                          {managerInfo.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: isDarkMode ? "#2d2d3a" : "#f3f4f6",
                    padding: "1rem",
                    borderRadius: "8px",
                    marginTop: "1.5rem",
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  <AlertCircle
                    size={16}
                    style={{ flexShrink: 0, color: "var(--primary, #eab308)" }}
                  />
                  <span
                    style={{
                      fontSize: "0.8rem",
                      opacity: 0.92,
                      color: isDarkMode ? "#f8fafc" : "#111827",
                    }}
                  >
                    Você está conectado à filial:{" "}
                    <strong
                      style={{ color: isDarkMode ? "#ffffff" : "#111827" }}
                    >
                      {managerInfo.restaurantName}
                    </strong>
                  </span>
                </div>
              </S.FormCard>
            </S.FlexDashboardLayout>
          )}
        </S.MainContent>
      </S.AdminLayout>
    </ThemeProvider>
  );
}
