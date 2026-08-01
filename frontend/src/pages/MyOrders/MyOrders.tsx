import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  ClipboardList,
  LogOut,
  Moon,
  Sun,
  Utensils,
} from "lucide-react";
import { useAuth } from "../../contexts/authContext";
import ordersService from "../../Services/ordersService";
import { connectSocket, disconnectSocket } from "../../Services/socketService";
import * as S from "./styles";

const MyOrdersContent = lazy(() => import("./components/MyOrdersContent"));

const FILTERS = {
  ALL: "TODOS",
  ACTIVE: "EM_ANDAMENTO",
  DELIVERED: "ENTREGUES",
  CANCELED: "CANCELADOS",
  ARCHIVED: "ARQUIVADOS",
};

const ISSUE_REASON_OPTIONS = [
  "Pedido veio errado",
  "Faltou item no pedido",
  "Demora na entrega",
  "Qualidade do produto",
  "Problema com entregador",
  "Outro",
];

const ARCHIVE_AGE_FILTERS = {
  ALL: "TODOS_ARQUIVADOS",
  UP_TO_1_MONTH: "ATE_1_MES",
  FROM_1_MONTH_TO_1_YEAR: "DE_1_MES_A_1_ANO",
  FROM_1_TO_10_YEARS: "DE_1_A_10_ANOS",
  OVER_10_YEARS: "MAIS_DE_10_ANOS",
};

const DELIVERED_STATUS = "ENTREGUE";
const CANCELED_STATUS = "CANCELADO";
const ARCHIVED_ORDERS_STORAGE_PREFIX = "@PecaJaFood:myOrdersArchived";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

type IssueChatMessage = {
  id?: string;
  senderType?: string;
  senderName?: string;
  message?: string;
  sentAt?: string;
};

type IssueThread = {
  orderId?: number;
  isResolved?: boolean;
  resolvedAt?: string | null;
  resolvedByName?: string | null;
  messages?: IssueChatMessage[];
  [key: string]: unknown;
};

type DeliveryLocationSnapshot = {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  updatedAt: string;
};

function getArchivedStorageKey(userId) {
  const numericUserId = Number(userId || 0);
  return `${ARCHIVED_ORDERS_STORAGE_PREFIX}:${numericUserId || "anon"}`;
}

function getInitialArchivedOrdersMap(userId) {
  try {
    const key = getArchivedStorageKey(userId);
    const raw = localStorage.getItem(key);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    // Backward-compatible migration: old format was an array of ids.
    if (Array.isArray(parsed)) {
      const now = Date.now();
      return parsed.reduce((acc, value) => {
        const numericId = Number(value);

        if (Number.isInteger(numericId) && numericId > 0) {
          acc[numericId] = now;
        }

        return acc;
      }, {});
    }

    if (parsed && typeof parsed === "object") {
      const now = Date.now();
      return Object.entries(parsed).reduce((acc, [orderId, archivedAt]) => {
        const numericId = Number(orderId);
        const numericArchivedAt = Number(archivedAt);

        if (!Number.isInteger(numericId) || numericId <= 0) {
          return acc;
        }

        acc[numericId] =
          Number.isFinite(numericArchivedAt) && numericArchivedAt > 0
            ? numericArchivedAt
            : now;

        return acc;
      }, {});
    }

    return {};
  } catch {
    return {};
  }
}

function matchesArchiveAgeFilter(archivedAt, selectedFilter) {
  if (selectedFilter === ARCHIVE_AGE_FILTERS.ALL) {
    return true;
  }

  if (!archivedAt) {
    return false;
  }

  const days = (Date.now() - Number(archivedAt)) / DAY_IN_MS;

  if (!Number.isFinite(days)) {
    return false;
  }

  if (selectedFilter === ARCHIVE_AGE_FILTERS.UP_TO_1_MONTH) {
    return days <= 30;
  }

  if (selectedFilter === ARCHIVE_AGE_FILTERS.FROM_1_MONTH_TO_1_YEAR) {
    return days > 30 && days <= 365;
  }

  if (selectedFilter === ARCHIVE_AGE_FILTERS.FROM_1_TO_10_YEARS) {
    return days > 365 && days <= 3650;
  }

  if (selectedFilter === ARCHIVE_AGE_FILTERS.OVER_10_YEARS) {
    return days > 3650;
  }

  return true;
}

function isActiveStatus(status) {
  const normalizedStatus = String(status || "").toUpperCase();
  return (
    normalizedStatus !== DELIVERED_STATUS &&
    normalizedStatus !== CANCELED_STATUS
  );
}

function formatOrderDate(value) {
  if (!value) {
    return "Data indisponivel";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Data indisponivel";
  }

  return parsedDate.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatOrderStatus(status) {
  const normalizedStatus = String(status || "").toUpperCase();
  const labels = {
    PENDENTE: "Pendente",
    PREPARANDO: "Preparando",
    EM_PREPARO: "Em preparo",
    PRONTO: "Pronto",
    SAIU_PARA_ENTREGA: "Saiu para entrega",
    ENTREGUE: "Entregue",
    CANCELADO: "Cancelado",
  };

  return labels[normalizedStatus] || "Em andamento";
}

function getOrderStatusClass(status) {
  const normalizedStatus = String(status || "").toUpperCase();
  const classByStatus = {
    PENDENTE: "status-pendente",
    PREPARANDO: "status-preparando",
    EM_PREPARO: "status-preparando",
    PRONTO: "status-pronto",
    SAIU_PARA_ENTREGA: "status-saiu_para_entrega",
    ENTREGUE: "status-entregue",
    CANCELADO: "status-cancelado",
  };

  return classByStatus[normalizedStatus] || "status-pendente";
}

function formatOrderOrigin(order) {
  if (order?.type === "DELIVERY") {
    return "Delivery";
  }

  if (order?.table?.number) {
    return `Mesa ${order.table.number}`;
  }

  return "Retirada";
}

function resolveOrderTotal(order) {
  const directTotal = Number(order?.total);

  if (Number.isFinite(directTotal)) {
    return directTotal;
  }

  if (!Array.isArray(order?.items)) {
    return 0;
  }

  return order.items.reduce((acc, item) => {
    const itemSubtotal = Number(item?.subtotal);

    if (Number.isFinite(itemSubtotal)) {
      return acc + itemSubtotal;
    }

    const quantity = Number(item?.quantity) || 0;
    const unitPrice = Number(item?.price) || 0;
    return acc + quantity * unitPrice;
  }, 0);
}

export default function MyOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orderListRef = useRef(null);
  const lastStatusEventRef = useRef({
    orderId: null,
    status: null,
    at: 0,
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [deliveryLocationByOrderId, setDeliveryLocationByOrderId] = useState<
    Record<number, DeliveryLocationSnapshot>
  >({});
  const [isLoadingPedidos, setIsLoadingPedidos] = useState(true);
  const [reportingIssueOrderId, _setReportingIssueOrderId] = useState<
    number | null
  >(null);
  const [activeFilter, setActiveFilter] = useState(FILTERS.ALL);
  const [archiveAgeFilter, setArchiveAgeFilter] = useState(
    ARCHIVE_AGE_FILTERS.ALL,
  );
  const [issueThreadsByOrderId, setIssueThreadsByOrderId] = useState<
    Record<number, IssueThread>
  >({});
  const [activeIssueChatOrderId, setActiveIssueChatOrderId] = useState<
    number | null
  >(null);
  const issueChatScrollRef = useRef<HTMLDivElement | null>(null);
  const [issueChatInput, setIssueChatInput] = useState("");
  const [isSendingIssueChatMessage, setIsSendingIssueChatMessage] =
    useState(false);
  const [selectedIssueReason, setSelectedIssueReason] = useState(
    ISSUE_REASON_OPTIONS[0],
  );
  const archivedStorageKey = useMemo(
    () => getArchivedStorageKey(user?.id),
    [user?.id],
  );
  const [archivedOrdersByUser, setArchivedOrdersByUser] = useState(() => {
    const initialKey = getArchivedStorageKey(user?.id);
    return {
      [initialKey]: getInitialArchivedOrdersMap(user?.id),
    };
  });
  const archivedOrdersMap =
    archivedOrdersByUser[archivedStorageKey] ||
    getInitialArchivedOrdersMap(user?.id);
  const archivedOrderIds = Object.keys(archivedOrdersMap)
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);

  const isAdmin = user?.role === "ADMIN";

  const upsertIssueThread = (payload) => {
    const orderId = Number(payload?.orderId || 0);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return;
    }

    const incomingMessages = Array.isArray(payload?.messages)
      ? payload.messages
      : [];
    const lastMessage = payload?.message || payload?.lastMessage || null;

    setIssueThreadsByOrderId((prev) => {
      const current = prev[orderId] || {
        orderId,
        isResolved: false,
        messages: [],
      };

      const mergedMessages = [...current.messages];

      incomingMessages.forEach((messageItem) => {
        const messageId = String(messageItem?.id || "").trim();

        if (!messageId) {
          return;
        }

        if (
          !mergedMessages.some((item) => String(item?.id || "") === messageId)
        ) {
          mergedMessages.push(messageItem);
        }
      });

      if (lastMessage?.id) {
        const lastMessageId = String(lastMessage.id);
        if (
          !mergedMessages.some(
            (item) => String(item?.id || "") === lastMessageId,
          )
        ) {
          mergedMessages.push(lastMessage);
        }
      }

      mergedMessages.sort((a, b) => {
        const aTime = new Date(a?.sentAt || 0).getTime();
        const bTime = new Date(b?.sentAt || 0).getTime();
        return aTime - bTime;
      });

      return {
        ...prev,
        [orderId]: {
          ...current,
          ...payload,
          orderId,
          messages: mergedMessages,
          isResolved: Boolean(payload?.isResolved ?? current.isResolved),
          resolvedAt: payload?.resolvedAt || current.resolvedAt || null,
          resolvedByName:
            payload?.resolvedByName || current.resolvedByName || null,
        },
      };
    });
  };

  useEffect(() => {
    let isMounted = true;

    async function loadMyOrders() {
      try {
        setIsLoadingPedidos(true);
        const response = await ordersService.listMyOrders();

        if (!isMounted) {
          return;
        }

        setPedidos(Array.isArray(response) ? response : []);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPedidos([]);
        toast.error(
          error?.response?.data?.error ||
            "Nao foi possivel carregar seus pedidos.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingPedidos(false);
        }
      }
    }

    loadMyOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const key = archivedStorageKey;
    localStorage.setItem(key, JSON.stringify(archivedOrdersMap));
  }, [archivedOrdersMap, archivedStorageKey]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      return undefined;
    }

    const socket = connectSocket(token, "my-orders");

    const upsertMyOrder = (prevOrders, incomingOrder) => {
      const incomingId = Number(incomingOrder?.id || 0);

      if (!Number.isInteger(incomingId) || incomingId <= 0) {
        return prevOrders;
      }

      const existingIndex = prevOrders.findIndex(
        (item) => Number(item?.id || 0) === incomingId,
      );

      if (existingIndex < 0) {
        return [incomingOrder, ...prevOrders];
      }

      return prevOrders.map((item, index) =>
        index === existingIndex ? { ...item, ...incomingOrder } : item,
      );
    };

    const syncMyOrdersAfterConnect = async () => {
      try {
        const response = await ordersService.listMyOrders();
        setPedidos(Array.isArray(response) ? response : []);
      } catch {
        // Mantem os dados atuais caso a sincronizacao inicial falhe.
      }
    };

    const onConnect = () => {
      void syncMyOrdersAfterConnect();
    };

    const onNewOrder = (newOrder) => {
      const currentUserId = Number(user?.id || 0);
      const orderUserId = Number(newOrder?.userId || 0);

      if (!newOrder?.id || !currentUserId || orderUserId !== currentUserId) {
        return;
      }

      setPedidos((prev) => upsertMyOrder(prev, newOrder));
    };

    const onStatusChanged = (updatedOrder) => {
      const currentUserId = Number(user?.id || 0);
      const orderUserId = Number(updatedOrder?.userId || 0);

      if (
        !updatedOrder?.id ||
        !currentUserId ||
        orderUserId !== currentUserId
      ) {
        return;
      }

      setPedidos((prev) => {
        const nextStatus = String(updatedOrder?.status || "").toUpperCase();
        const now = Date.now();
        const lastEvent = lastStatusEventRef.current;
        const isDuplicated =
          lastEvent.orderId === updatedOrder.id &&
          lastEvent.status === nextStatus &&
          now - lastEvent.at < 1000;

        if (isDuplicated) {
          return prev;
        }

        const existingOrder = prev.find((item) => item.id === updatedOrder.id);

        lastStatusEventRef.current = {
          orderId: updatedOrder.id,
          status: nextStatus,
          at: now,
        };

        if (existingOrder) {
          const previousStatus = String(
            existingOrder?.status || "",
          ).toUpperCase();

          if (previousStatus !== nextStatus) {
            toast.info(
              `Pedido #${updatedOrder.id} atualizado para ${formatOrderStatus(nextStatus)}.`,
            );
          }

          return upsertMyOrder(prev, updatedOrder);
        }

        toast.info(
          `Pedido #${updatedOrder.id} atualizado para ${formatOrderStatus(nextStatus)}.`,
        );

        return upsertMyOrder(prev, updatedOrder);
      });

      const normalizedStatus = String(updatedOrder?.status || "").toUpperCase();
      if (
        normalizedStatus === DELIVERED_STATUS ||
        normalizedStatus === CANCELED_STATUS
      ) {
        const numericOrderId = Number(updatedOrder?.id || 0);

        if (Number.isInteger(numericOrderId) && numericOrderId > 0) {
          setDeliveryLocationByOrderId((prev) => {
            if (!prev[numericOrderId]) {
              return prev;
            }

            const next = { ...prev };
            delete next[numericOrderId];
            return next;
          });
        }
      }
    };

    const onDeliveryLocation = (payload) => {
      const orderId = Number(payload?.orderId || 0);
      const latitude = Number(payload?.latitude);
      const longitude = Number(payload?.longitude);

      if (!Number.isInteger(orderId) || orderId <= 0) {
        return;
      }

      const hasValidCoordinates =
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180;

      if (!hasValidCoordinates) {
        return;
      }

      setDeliveryLocationByOrderId((prev) => ({
        ...prev,
        [orderId]: {
          latitude,
          longitude,
          heading: Number.isFinite(Number(payload?.heading))
            ? Number(payload.heading)
            : null,
          speed: Number.isFinite(Number(payload?.speed))
            ? Number(payload.speed)
            : null,
          accuracy:
            Number.isFinite(Number(payload?.accuracy)) &&
            Number(payload.accuracy) >= 0
              ? Math.round(Number(payload.accuracy))
              : null,
          updatedAt:
            typeof payload?.updatedAt === "string" && payload.updatedAt
              ? payload.updatedAt
              : new Date().toISOString(),
        },
      }));
    };

    const onIssueMessage = (payload) => {
      const orderId = Number(payload?.orderId || 0);

      if (!Number.isInteger(orderId) || orderId <= 0) {
        return;
      }

      upsertIssueThread(payload);

      const lastMessage = payload?.message;
      const senderType = String(lastMessage?.senderType || "").toUpperCase();
      if (senderType === "ADMIN") {
        toast.info(`Nova mensagem do admin no pedido #${orderId}.`);
      }
    };

    const onIssueResolved = (payload) => {
      const orderId = Number(payload?.orderId || 0);

      if (!Number.isInteger(orderId) || orderId <= 0) {
        return;
      }

      upsertIssueThread({
        orderId,
        isResolved: true,
        resolvedAt: payload?.resolvedAt || new Date().toISOString(),
        resolvedByName: payload?.resolvedByName || "Admin",
      });

      setActiveIssueChatOrderId((prev) => (prev === orderId ? null : prev));
      toast.success(
        `Problema do pedido #${orderId} foi marcado como resolvido.`,
      );
    };

    socket.on("connect", onConnect);
    socket.on("new-order", onNewOrder);
    socket.on("order:status-changed", onStatusChanged);
    socket.on("order:delivery-location", onDeliveryLocation);
    socket.on("order:issue-message", onIssueMessage);
    socket.on("order:issue-resolved", onIssueResolved);

    return () => {
      socket.off("connect", onConnect);
      socket.off("new-order", onNewOrder);
      socket.off("order:status-changed", onStatusChanged);
      socket.off("order:delivery-location", onDeliveryLocation);
      socket.off("order:issue-message", onIssueMessage);
      socket.off("order:issue-resolved", onIssueResolved);
      disconnectSocket();
    };
  }, [user?.id]);

  useEffect(() => {
    const activeThread =
      activeIssueChatOrderId && issueThreadsByOrderId[activeIssueChatOrderId]
        ? issueThreadsByOrderId[activeIssueChatOrderId]
        : null;

    if (!activeThread) {
      return;
    }

    const host = issueChatScrollRef.current;
    if (!host) {
      return;
    }

    host.scrollTop = host.scrollHeight;
  }, [activeIssueChatOrderId, issueThreadsByOrderId]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.info("Voce saiu da sua conta.");
    navigate("/login");
  };

  const handleArchiveOrder = (orderId) => {
    const numericOrderId = Number(orderId);
    if (!Number.isInteger(numericOrderId) || numericOrderId <= 0) {
      return;
    }

    setArchivedOrdersByUser((prev) => {
      const current = prev[archivedStorageKey] || {};

      if (current[numericOrderId]) {
        return prev;
      }

      return {
        ...prev,
        [archivedStorageKey]: {
          ...current,
          [numericOrderId]: Date.now(),
        },
      };
    });
    toast.info(`Pedido #${numericOrderId} arquivado.`);
  };

  const handleUnarchiveOrder = (orderId) => {
    const numericOrderId = Number(orderId);
    if (!Number.isInteger(numericOrderId) || numericOrderId <= 0) {
      return;
    }

    setArchivedOrdersByUser((prev) => {
      const current = prev[archivedStorageKey] || {};
      const nextCurrent = { ...current };
      delete nextCurrent[numericOrderId];

      return {
        ...prev,
        [archivedStorageKey]: nextCurrent,
      };
    });
    toast.info(`Pedido #${numericOrderId} desarquivado.`);
  };

  const handleArchiveDeliveredOrders = () => {
    if (deliveredVisibleOrderIds.length === 0) {
      toast.info("Nao ha pedidos entregues para arquivar.");
      return;
    }

    setArchivedOrdersByUser((prev) => {
      const current = prev[archivedStorageKey] || {};
      const nextCurrent = { ...current };
      const now = Date.now();

      deliveredVisibleOrderIds.forEach((id) => {
        const numericId = Number(id);
        if (
          Number.isInteger(numericId) &&
          numericId > 0 &&
          !nextCurrent[numericId]
        ) {
          nextCurrent[numericId] = now;
        }
      });

      return {
        ...prev,
        [archivedStorageKey]: nextCurrent,
      };
    });

    toast.success(
      `${deliveredVisibleOrderIds.length} pedido(s) entregue(s) arquivado(s).`,
    );
  };

  const handleReportIssue = async (orderId) => {
    const numericOrderId = Number(orderId);

    if (!Number.isInteger(numericOrderId) || numericOrderId <= 0) {
      toast.error("Pedido inválido para relatar problema.");
      return;
    }

    const knownThread = issueThreadsByOrderId[numericOrderId];
    if (knownThread?.isResolved) {
      toast.info("Este problema já foi resolvido e o chat foi encerrado.");
      return;
    }

    try {
      const thread = await ordersService.getIssueThread(numericOrderId);

      if (thread?.orderId) {
        upsertIssueThread(thread);
      }

      if (thread?.isResolved) {
        toast.info("Este problema já foi resolvido e o chat foi encerrado.");
        return;
      }
    } catch {
      // Se falhar carregar histórico, segue para abertura do primeiro relato.
    }

    setIssueThreadsByOrderId((prev) => ({
      ...prev,
      [numericOrderId]: prev[numericOrderId] || {
        orderId: numericOrderId,
        isResolved: false,
        messages: [],
      },
    }));

    setActiveIssueChatOrderId(numericOrderId);
    setSelectedIssueReason(ISSUE_REASON_OPTIONS[0]);
    setIssueChatInput("");
  };

  const handleSendIssueChatMessage = async () => {
    const numericOrderId = Number(activeIssueChatOrderId || 0);
    const normalizedInput = String(issueChatInput || "")
      .replace(/\s+/g, " ")
      .trim();
    const thread = issueThreadsByOrderId[numericOrderId];
    const hasExistingMessages =
      Array.isArray(thread?.messages) && thread.messages.length > 0;
    let messageToSend = normalizedInput;

    if (!Number.isInteger(numericOrderId) || numericOrderId <= 0) {
      toast.error("Pedido inválido para enviar mensagem.");
      return;
    }

    if (issueThreadsByOrderId[numericOrderId]?.isResolved) {
      toast.info("Este problema já foi resolvido e o chat foi encerrado.");
      setActiveIssueChatOrderId(null);
      return;
    }

    if (!hasExistingMessages) {
      const normalizedReason = String(selectedIssueReason || "").trim();

      if (!normalizedReason) {
        toast.error("Escolha um motivo para iniciar o chat.");
        return;
      }

      if (normalizedReason === "Outro" && normalizedInput.length < 10) {
        toast.error("Descreva o problema com pelo menos 10 caracteres.");
        return;
      }

      if (!normalizedInput) {
        messageToSend = `Motivo: ${normalizedReason}.`;
      } else if (normalizedReason === "Outro") {
        messageToSend = normalizedInput;
      } else {
        messageToSend = `Motivo: ${normalizedReason}. Detalhes: ${normalizedInput}`;
      }
    }

    if (messageToSend.length < 2) {
      toast.error("Digite uma mensagem para continuar o chat.");
      return;
    }

    try {
      setIsSendingIssueChatMessage(true);
      const response = await ordersService.reportIssue(
        numericOrderId,
        messageToSend,
      );

      if (response?.orderId) {
        upsertIssueThread(response);
      }

      setIssueChatInput("");
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          "Nao foi possivel enviar sua mensagem no chat.",
      );
    } finally {
      setIsSendingIssueChatMessage(false);
    }
  };

  const visiblePedidos = useMemo(
    () =>
      pedidos.filter((pedido) => !archivedOrderIds.includes(Number(pedido.id))),
    [pedidos, archivedOrderIds],
  );

  const archivedPedidos = useMemo(
    () =>
      pedidos.filter((pedido) => archivedOrderIds.includes(Number(pedido.id))),
    [pedidos, archivedOrderIds],
  );

  const deliveredVisibleOrderIds = visiblePedidos
    .filter(
      (pedido) =>
        String(pedido?.status || "").toUpperCase() === DELIVERED_STATUS,
    )
    .map((pedido) => Number(pedido.id))
    .filter((id) => Number.isInteger(id) && id > 0);

  const filterCounts = useMemo(() => {
    const deliveredCount = visiblePedidos.filter(
      (pedido) =>
        String(pedido?.status || "").toUpperCase() === DELIVERED_STATUS,
    ).length;

    const canceledCount = visiblePedidos.filter(
      (pedido) =>
        String(pedido?.status || "").toUpperCase() === CANCELED_STATUS,
    ).length;

    const activeCount = visiblePedidos.filter((pedido) =>
      isActiveStatus(pedido?.status),
    ).length;

    return {
      [FILTERS.ALL]: visiblePedidos.length,
      [FILTERS.ACTIVE]: activeCount,
      [FILTERS.DELIVERED]: deliveredCount,
      [FILTERS.CANCELED]: canceledCount,
      [FILTERS.ARCHIVED]: archivedPedidos.length,
    };
  }, [visiblePedidos, archivedPedidos]);

  const statusFilteredPedidos = useMemo(() => {
    if (activeFilter === FILTERS.ARCHIVED) {
      return archivedPedidos;
    }

    if (activeFilter === FILTERS.ALL) {
      return visiblePedidos;
    }

    if (activeFilter === FILTERS.ACTIVE) {
      return visiblePedidos.filter((pedido) => isActiveStatus(pedido?.status));
    }

    if (activeFilter === FILTERS.DELIVERED) {
      return visiblePedidos.filter(
        (pedido) =>
          String(pedido?.status || "").toUpperCase() === DELIVERED_STATUS,
      );
    }

    if (activeFilter === FILTERS.CANCELED) {
      return visiblePedidos.filter(
        (pedido) =>
          String(pedido?.status || "").toUpperCase() === CANCELED_STATUS,
      );
    }

    return visiblePedidos;
  }, [activeFilter, visiblePedidos, archivedPedidos]);

  const filteredPedidos = useMemo(() => {
    if (activeFilter !== FILTERS.ARCHIVED) {
      return statusFilteredPedidos;
    }

    return statusFilteredPedidos.filter((pedido) => {
      const archivedAt = archivedOrdersMap[Number(pedido?.id)];
      return matchesArchiveAgeFilter(archivedAt, archiveAgeFilter);
    });
  }, [
    activeFilter,
    statusFilteredPedidos,
    archivedOrdersMap,
    archiveAgeFilter,
  ]);

  const resolvedIssueOrderIds = useMemo(() => {
    const idsFromThreads = Object.values(issueThreadsByOrderId)
      .filter((thread) => thread?.isResolved)
      .map((thread) => Number(thread?.orderId || 0))
      .filter((orderId) => Number.isInteger(orderId) && orderId > 0);

    const idsFromOrders = pedidos
      .filter((pedido) => Boolean(pedido?.issueThread?.isResolved))
      .map((pedido) => Number(pedido?.id || 0))
      .filter((orderId) => Number.isInteger(orderId) && orderId > 0);

    return Array.from(new Set([...idsFromThreads, ...idsFromOrders]));
  }, [issueThreadsByOrderId, pedidos]);

  const activeIssueThread =
    activeIssueChatOrderId && issueThreadsByOrderId[activeIssueChatOrderId]
      ? issueThreadsByOrderId[activeIssueChatOrderId]
      : null;
  const activeIssueHasMessages =
    Array.isArray(activeIssueThread?.messages) &&
    activeIssueThread.messages.length > 0;

  return (
    <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
      <S.PageLayout>
        <S.Navbar>
          <S.Brand onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            <Utensils size={22} strokeWidth={2.5} />
            <span>Peça Já Food</span>
          </S.Brand>

          <S.NavRight>
            <S.BackButton onClick={() => navigate("/profile")}>
              <ArrowLeft size={18} />
              <span>Voltar ao perfil</span>
            </S.BackButton>

            {isAdmin && (
              <S.AdminButton onClick={() => navigate("/admin")}>
                <ClipboardList size={18} />
                <span>Painel Admin</span>
              </S.AdminButton>
            )}

            <S.ThemeToggleButton onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </S.ThemeToggleButton>

            <S.LogoutButton onClick={handleLogout}>
              <LogOut size={18} />
              <span>Sair</span>
            </S.LogoutButton>
          </S.NavRight>
        </S.Navbar>

        <S.MainContainer>
          <Suspense fallback={null}>
            <MyOrdersContent
              orderListRef={orderListRef}
              isLoadingPedidos={isLoadingPedidos}
              activeFilter={activeFilter}
              filterCounts={filterCounts}
              archiveAgeFilter={archiveAgeFilter}
              filters={FILTERS}
              archiveAgeFilters={ARCHIVE_AGE_FILTERS}
              filteredPedidos={filteredPedidos}
              deliveryLocationByOrderId={deliveryLocationByOrderId}
              deliveredVisibleOrderIds={deliveredVisibleOrderIds}
              reportingIssueOrderId={reportingIssueOrderId}
              resolvedIssueOrderIds={resolvedIssueOrderIds}
              onArchiveDeliveredOrders={handleArchiveDeliveredOrders}
              onReportIssue={handleReportIssue}
              onSetActiveFilter={setActiveFilter}
              onSetArchiveAgeFilter={setArchiveAgeFilter}
              onArchiveOrder={handleArchiveOrder}
              onUnarchiveOrder={handleUnarchiveOrder}
              formatOrderDate={formatOrderDate}
              formatOrderOrigin={formatOrderOrigin}
              resolveOrderTotal={resolveOrderTotal}
              formatOrderStatus={formatOrderStatus}
              getOrderStatusClass={getOrderStatusClass}
            />
          </Suspense>
        </S.MainContainer>

        {activeIssueThread && (
          <S.IssueChatPopup>
            <div className="header">
              <strong>Chat do pedido #{activeIssueThread.orderId}</strong>
              <small className="header-subtitle">
                Atendimento em tempo real
              </small>
              <div className="header-actions">
                {activeIssueThread.isResolved ? (
                  <span className="resolved-pill">Problema resolvido</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setActiveIssueChatOrderId(null)}
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="chat-scroll" ref={issueChatScrollRef}>
              {(activeIssueThread.messages || []).length === 0 ? (
                <div className="chat-tip">
                  <p>
                    Oi! Vamos resolver isso juntos. Me conta o que aconteceu.
                  </p>
                  <small>
                    Escolha um motivo abaixo e envie sua primeira mensagem.
                  </small>
                </div>
              ) : (
                (activeIssueThread.messages || []).map((messageItem, index) => {
                  const senderType = String(
                    messageItem?.senderType || "CLIENT",
                  ).toUpperCase();
                  const isAdminMessage = senderType === "ADMIN";
                  const sentAtLabel = messageItem?.sentAt
                    ? new Date(messageItem.sentAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Agora";

                  return (
                    <div
                      key={String(messageItem?.id || `msg-${index}`)}
                      className={`chat-message ${
                        isAdminMessage ? "admin" : "client"
                      }`}
                    >
                      <small>
                        {String(messageItem?.senderName || "").trim() ||
                          (isAdminMessage ? "Admin" : "Voce")}{" "}
                        • {sentAtLabel}
                      </small>
                      <p>{String(messageItem?.message || "").trim()}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="composer">
              {activeIssueThread.isResolved ? (
                <small className="resolved-note">
                  Este problema foi resolvido por{" "}
                  {activeIssueThread.resolvedByName || "Admin"}.
                </small>
              ) : null}

              {!activeIssueHasMessages && !activeIssueThread.isResolved ? (
                <div className="suggestions">
                  {ISSUE_REASON_OPTIONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      className={`suggestion-chip ${
                        selectedIssueReason === reason ? "active" : ""
                      }`}
                      onClick={() => setSelectedIssueReason(reason)}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              ) : null}

              <textarea
                value={issueChatInput}
                onChange={(event) => setIssueChatInput(event.target.value)}
                rows={2}
                placeholder={
                  activeIssueThread.isResolved
                    ? "Chat encerrado"
                    : !activeIssueHasMessages
                      ? selectedIssueReason === "Outro"
                        ? "Descreva seu problema..."
                        : "Adicione um detalhe (opcional)..."
                      : "Escreva sua mensagem para o admin..."
                }
                disabled={
                  activeIssueThread.isResolved || isSendingIssueChatMessage
                }
              />
              <button
                type="button"
                onClick={handleSendIssueChatMessage}
                disabled={
                  activeIssueThread.isResolved || isSendingIssueChatMessage
                }
              >
                {isSendingIssueChatMessage ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </S.IssueChatPopup>
        )}
      </S.PageLayout>
    </ThemeProvider>
  );
}
