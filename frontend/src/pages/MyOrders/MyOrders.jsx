import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  ChevronsDown,
  ClipboardList,
  Clock,
  Package,
  Truck,
  CheckCircle2,
  X,
  LogOut,
  Moon,
  ShoppingBag,
  Sun,
  Utensils,
} from "lucide-react";
import { useAuth } from "../../contexts/authContext";
import ordersService from "../../Services/ordersService";
import { connectSocket, disconnectSocket } from "../../Services/socketService";
import * as S from "./styles";

const FILTERS = {
  ALL: "TODOS",
  ACTIVE: "EM_ANDAMENTO",
  DELIVERED: "ENTREGUES",
  CANCELED: "CANCELADOS",
  ARCHIVED: "ARQUIVADOS",
};

const DATE_FILTERS = {
  ALL: "TODOS_PERIODOS",
  LAST_30_DAYS: "ULTIMOS_30_DIAS",
  LAST_YEAR: "ULTIMO_ANO",
  OLDER_THAN_1_YEAR: "MAIS_DE_1_ANO",
  OLDER_THAN_10_YEARS: "MAIS_DE_10_ANOS",
};

const DATE_FILTER_OPTIONS = [
  { value: DATE_FILTERS.ALL, label: "Todos periodos" },
  { value: DATE_FILTERS.LAST_30_DAYS, label: "Ultimos 30 dias" },
  { value: DATE_FILTERS.LAST_YEAR, label: "Ultimo ano" },
  { value: DATE_FILTERS.OLDER_THAN_1_YEAR, label: "Mais de 1 ano" },
  { value: DATE_FILTERS.OLDER_THAN_10_YEARS, label: "Mais de 10 anos" },
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

function getDaysSinceDate(value) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  const diffMs = Date.now() - parsedDate.getTime();
  return diffMs / DAY_IN_MS;
}

function matchesCreatedAtFilter(createdAt, selectedFilter) {
  if (selectedFilter === DATE_FILTERS.ALL) {
    return true;
  }

  const days = getDaysSinceDate(createdAt);

  if (selectedFilter === DATE_FILTERS.LAST_30_DAYS) {
    return days <= 30;
  }

  if (selectedFilter === DATE_FILTERS.LAST_YEAR) {
    return days <= 365;
  }

  if (selectedFilter === DATE_FILTERS.OLDER_THAN_1_YEAR) {
    return days > 365;
  }

  if (selectedFilter === DATE_FILTERS.OLDER_THAN_10_YEARS) {
    return days > 3650;
  }

  return true;
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

function getDateFilterLabel(filterValue) {
  return (
    DATE_FILTER_OPTIONS.find((option) => option.value === filterValue)?.label ||
    "Todos periodos"
  );
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

function getOrderStatusIcon(status) {
  const normalizedStatus = String(status || "").toUpperCase();

  if (normalizedStatus === "PENDENTE" || normalizedStatus === "PREPARANDO") {
    return <Clock size={13} />;
  }

  if (normalizedStatus === "PRONTO") {
    return <Package size={13} />;
  }

  if (normalizedStatus === "SAIU_PARA_ENTREGA") {
    return <Truck size={13} />;
  }

  if (normalizedStatus === "ENTREGUE") {
    return <CheckCircle2 size={13} />;
  }

  if (normalizedStatus === "CANCELADO") {
    return <X size={13} />;
  }

  return <Clock size={13} />;
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
  const scrollActionRef = useRef(null);
  const lastStatusEventRef = useRef({
    orderId: null,
    status: null,
    at: 0,
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [isLoadingPedidos, setIsLoadingPedidos] = useState(true);
  const [activeFilter, setActiveFilter] = useState(FILTERS.ALL);
  const [dateFilter, setDateFilter] = useState(DATE_FILTERS.ALL);
  const [isScrollMenuOpen, setIsScrollMenuOpen] = useState(false);
  const [archiveAgeFilter, setArchiveAgeFilter] = useState(
    ARCHIVE_AGE_FILTERS.ALL,
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

    const socket = connectSocket(token);

    const onNewOrder = (newOrder) => {
      const currentUserId = Number(user?.id || 0);
      const orderUserId = Number(newOrder?.userId || 0);

      if (!newOrder?.id || !currentUserId || orderUserId !== currentUserId) {
        return;
      }

      setPedidos((prev) => {
        if (prev.some((item) => item.id === newOrder.id)) {
          return prev;
        }

        return [newOrder, ...prev];
      });
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

          return prev.map((item) =>
            item.id === updatedOrder.id ? { ...item, ...updatedOrder } : item,
          );
        }

        toast.info(
          `Pedido #${updatedOrder.id} atualizado para ${formatOrderStatus(nextStatus)}.`,
        );

        return [updatedOrder, ...prev];
      });
    };

    socket.on("new-order", onNewOrder);
    socket.on("order:status-changed", onStatusChanged);

    return () => {
      socket.off("new-order", onNewOrder);
      socket.off("order:status-changed", onStatusChanged);
      disconnectSocket();
    };
  }, [user?.id]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!scrollActionRef.current) {
        return;
      }

      if (!scrollActionRef.current.contains(event.target)) {
        setIsScrollMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.info("Voce saiu da sua conta.");
    navigate("/login");
  };

  const handleScrollToOrdersWithDateFilter = (nextDateFilter) => {
    setDateFilter(nextDateFilter);
    setArchiveAgeFilter(ARCHIVE_AGE_FILTERS.ALL);
    setIsScrollMenuOpen(false);

    orderListRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
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

  const dateFilteredPedidos = useMemo(
    () =>
      statusFilteredPedidos.filter((pedido) =>
        matchesCreatedAtFilter(pedido?.createdAt, dateFilter),
      ),
    [statusFilteredPedidos, dateFilter],
  );

  const filteredPedidos = useMemo(() => {
    if (activeFilter !== FILTERS.ARCHIVED) {
      return dateFilteredPedidos;
    }

    return dateFilteredPedidos.filter((pedido) => {
      const archivedAt = archivedOrdersMap[Number(pedido?.id)];
      return matchesArchiveAgeFilter(archivedAt, archiveAgeFilter);
    });
  }, [activeFilter, dateFilteredPedidos, archivedOrdersMap, archiveAgeFilter]);

  return (
    <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
      <S.PageLayout>
        <S.Navbar>
          <S.Brand onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            <Utensils size={22} strokeWidth={2.5} />
            <span>Peca ja food</span>
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
          <S.OrdersCard>
            <S.SectionTitle>
              <ShoppingBag size={20} />
              <h2>Pedidos deste perfil</h2>
              <S.SectionTitleActions>
                <S.ScrollActionWrapper ref={scrollActionRef}>
                  <S.BulkArchiveButton
                    type="button"
                    onClick={() => setIsScrollMenuOpen((prev) => !prev)}
                    disabled={isLoadingPedidos}
                  >
                    <ChevronsDown size={14} />
                    Descer: {getDateFilterLabel(dateFilter)}
                  </S.BulkArchiveButton>

                  {isScrollMenuOpen && (
                    <S.ScrollActionMenu>
                      {DATE_FILTER_OPTIONS.map((option) => (
                        <S.ScrollActionMenuItem
                          key={option.value}
                          type="button"
                          $active={dateFilter === option.value}
                          onClick={() =>
                            handleScrollToOrdersWithDateFilter(option.value)
                          }
                        >
                          {option.label}
                        </S.ScrollActionMenuItem>
                      ))}
                    </S.ScrollActionMenu>
                  )}
                </S.ScrollActionWrapper>
                <S.BulkArchiveButton
                  type="button"
                  onClick={handleArchiveDeliveredOrders}
                  disabled={
                    isLoadingPedidos || deliveredVisibleOrderIds.length === 0
                  }
                >
                  Arquivar entregues
                </S.BulkArchiveButton>
              </S.SectionTitleActions>
            </S.SectionTitle>

            <S.FilterBar>
              <S.FilterButton
                type="button"
                $active={activeFilter === FILTERS.ALL}
                onClick={() => setActiveFilter(FILTERS.ALL)}
              >
                Todos ({filterCounts[FILTERS.ALL]})
              </S.FilterButton>
              <S.FilterButton
                type="button"
                $active={activeFilter === FILTERS.ACTIVE}
                onClick={() => setActiveFilter(FILTERS.ACTIVE)}
              >
                Em andamento ({filterCounts[FILTERS.ACTIVE]})
              </S.FilterButton>
              <S.FilterButton
                type="button"
                $active={activeFilter === FILTERS.DELIVERED}
                onClick={() => setActiveFilter(FILTERS.DELIVERED)}
              >
                Entregues ({filterCounts[FILTERS.DELIVERED]})
              </S.FilterButton>
              <S.FilterButton
                type="button"
                $active={activeFilter === FILTERS.CANCELED}
                onClick={() => setActiveFilter(FILTERS.CANCELED)}
              >
                Cancelados ({filterCounts[FILTERS.CANCELED]})
              </S.FilterButton>
              <S.FilterButton
                type="button"
                $active={activeFilter === FILTERS.ARCHIVED}
                onClick={() => setActiveFilter(FILTERS.ARCHIVED)}
              >
                Arquivados ({filterCounts[FILTERS.ARCHIVED]})
              </S.FilterButton>
            </S.FilterBar>

            {activeFilter === FILTERS.ARCHIVED && (
              <>
                <S.FilterSectionLabel>Tempo em arquivados</S.FilterSectionLabel>
                <S.FilterBar>
                  <S.FilterButton
                    type="button"
                    $active={archiveAgeFilter === ARCHIVE_AGE_FILTERS.ALL}
                    onClick={() => setArchiveAgeFilter(ARCHIVE_AGE_FILTERS.ALL)}
                  >
                    Todos arquivados
                  </S.FilterButton>
                  <S.FilterButton
                    type="button"
                    $active={
                      archiveAgeFilter === ARCHIVE_AGE_FILTERS.UP_TO_1_MONTH
                    }
                    onClick={() =>
                      setArchiveAgeFilter(ARCHIVE_AGE_FILTERS.UP_TO_1_MONTH)
                    }
                  >
                    Ate 1 mes
                  </S.FilterButton>
                  <S.FilterButton
                    type="button"
                    $active={
                      archiveAgeFilter ===
                      ARCHIVE_AGE_FILTERS.FROM_1_MONTH_TO_1_YEAR
                    }
                    onClick={() =>
                      setArchiveAgeFilter(
                        ARCHIVE_AGE_FILTERS.FROM_1_MONTH_TO_1_YEAR,
                      )
                    }
                  >
                    1 mes a 1 ano
                  </S.FilterButton>
                  <S.FilterButton
                    type="button"
                    $active={
                      archiveAgeFilter ===
                      ARCHIVE_AGE_FILTERS.FROM_1_TO_10_YEARS
                    }
                    onClick={() =>
                      setArchiveAgeFilter(
                        ARCHIVE_AGE_FILTERS.FROM_1_TO_10_YEARS,
                      )
                    }
                  >
                    1 ano a 10 anos
                  </S.FilterButton>
                  <S.FilterButton
                    type="button"
                    $active={
                      archiveAgeFilter === ARCHIVE_AGE_FILTERS.OVER_10_YEARS
                    }
                    onClick={() =>
                      setArchiveAgeFilter(ARCHIVE_AGE_FILTERS.OVER_10_YEARS)
                    }
                  >
                    Mais de 10 anos
                  </S.FilterButton>
                </S.FilterBar>
              </>
            )}

            <S.OrderList ref={orderListRef}>
              {isLoadingPedidos ? (
                <p className="empty-msg">Carregando pedidos...</p>
              ) : filteredPedidos.length === 0 ? (
                <p className="empty-msg">
                  Nenhum pedido encontrado para este filtro.
                </p>
              ) : (
                filteredPedidos.map((pedido) => (
                  <S.OrderItem key={pedido.id}>
                    <div className="order-info">
                      <h5>Pedido #{pedido.id}</h5>
                      <span>
                        {formatOrderDate(pedido.createdAt)} •{" "}
                        <strong>{formatOrderOrigin(pedido)}</strong>
                      </span>
                    </div>
                    <div className="order-meta">
                      <span className="price">
                        R$ {resolveOrderTotal(pedido).toFixed(2)}
                      </span>
                      <span
                        className={`status-badge ${getOrderStatusClass(pedido.status)}`}
                      >
                        {getOrderStatusIcon(pedido.status)}
                        Status: {formatOrderStatus(pedido.status)}
                      </span>
                      {activeFilter === FILTERS.ARCHIVED ? (
                        <button
                          type="button"
                          className="archive-btn"
                          onClick={() => handleUnarchiveOrder(pedido.id)}
                        >
                          Desarquivar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="archive-btn"
                          onClick={() => handleArchiveOrder(pedido.id)}
                        >
                          Arquivar
                        </button>
                      )}
                    </div>
                  </S.OrderItem>
                ))
              )}
            </S.OrderList>
          </S.OrdersCard>
        </S.MainContainer>
      </S.PageLayout>
    </ThemeProvider>
  );
}
