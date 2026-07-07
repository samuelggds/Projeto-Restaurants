import {
  CheckCircle2,
  ChevronsDown,
  Clock,
  Package,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import * as S from "../styles";

type DateFilterOption = {
  value: string;
  label: string;
};

type OrderItemLike = {
  id: number;
  status?: string;
  createdAt?: string;
  type?: string;
  table?: {
    number?: number;
  };
  total?: number;
  items?: Array<{
    subtotal?: number;
    quantity?: number;
    price?: number;
  }>;
};

type MyOrdersContentProps = {
  scrollActionRef: React.RefObject<HTMLDivElement | null>;
  orderListRef: React.RefObject<HTMLDivElement | null>;
  isLoadingPedidos: boolean;
  isScrollMenuOpen: boolean;
  dateFilter: string;
  dateFilterLabel: string;
  dateFilterOptions: DateFilterOption[];
  activeFilter: string;
  filterCounts: Record<string, number>;
  archiveAgeFilter: string;
  filters: Record<string, string>;
  archiveAgeFilters: Record<string, string>;
  filteredPedidos: OrderItemLike[];
  deliveredVisibleOrderIds: number[];
  onToggleScrollMenu: () => void;
  onScrollWithDateFilter: (value: string) => void;
  onArchiveDeliveredOrders: () => void;
  onSetActiveFilter: (value: string) => void;
  onSetArchiveAgeFilter: (value: string) => void;
  onArchiveOrder: (orderId: number) => void;
  onUnarchiveOrder: (orderId: number) => void;
  formatOrderDate: (value: string) => string;
  formatOrderOrigin: (order: OrderItemLike) => string;
  resolveOrderTotal: (order: OrderItemLike) => number;
  formatOrderStatus: (status: string) => string;
  getOrderStatusClass: (status: string) => string;
};

function getOrderStatusIcon(status: string) {
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

export default function MyOrdersContent({
  scrollActionRef,
  orderListRef,
  isLoadingPedidos,
  isScrollMenuOpen,
  dateFilter,
  dateFilterLabel,
  dateFilterOptions,
  activeFilter,
  filterCounts,
  archiveAgeFilter,
  filters,
  archiveAgeFilters,
  filteredPedidos,
  deliveredVisibleOrderIds,
  onToggleScrollMenu,
  onScrollWithDateFilter,
  onArchiveDeliveredOrders,
  onSetActiveFilter,
  onSetArchiveAgeFilter,
  onArchiveOrder,
  onUnarchiveOrder,
  formatOrderDate,
  formatOrderOrigin,
  resolveOrderTotal,
  formatOrderStatus,
  getOrderStatusClass,
}: MyOrdersContentProps) {
  return (
    <S.OrdersCard>
      <S.SectionTitle>
        <ShoppingBag size={20} />
        <h2>Pedidos deste perfil</h2>
        <S.SectionTitleActions>
          <S.ScrollActionWrapper ref={scrollActionRef}>
            <S.BulkArchiveButton
              type="button"
              onClick={onToggleScrollMenu}
              disabled={isLoadingPedidos}
            >
              <ChevronsDown size={14} />
              Descer: {dateFilterLabel}
            </S.BulkArchiveButton>

            {isScrollMenuOpen && (
              <S.ScrollActionMenu>
                {dateFilterOptions.map((option) => (
                  <S.ScrollActionMenuItem
                    key={option.value}
                    type="button"
                    $active={dateFilter === option.value}
                    onClick={() => onScrollWithDateFilter(option.value)}
                  >
                    {option.label}
                  </S.ScrollActionMenuItem>
                ))}
              </S.ScrollActionMenu>
            )}
          </S.ScrollActionWrapper>
          <S.BulkArchiveButton
            type="button"
            onClick={onArchiveDeliveredOrders}
            disabled={isLoadingPedidos || deliveredVisibleOrderIds.length === 0}
          >
            Arquivar entregues
          </S.BulkArchiveButton>
        </S.SectionTitleActions>
      </S.SectionTitle>

      <S.FilterBar>
        <S.FilterButton
          type="button"
          $active={activeFilter === filters.ALL}
          onClick={() => onSetActiveFilter(filters.ALL)}
        >
          Todos ({filterCounts[filters.ALL]})
        </S.FilterButton>
        <S.FilterButton
          type="button"
          $active={activeFilter === filters.ACTIVE}
          onClick={() => onSetActiveFilter(filters.ACTIVE)}
        >
          Em andamento ({filterCounts[filters.ACTIVE]})
        </S.FilterButton>
        <S.FilterButton
          type="button"
          $active={activeFilter === filters.DELIVERED}
          onClick={() => onSetActiveFilter(filters.DELIVERED)}
        >
          Entregues ({filterCounts[filters.DELIVERED]})
        </S.FilterButton>
        <S.FilterButton
          type="button"
          $active={activeFilter === filters.CANCELED}
          onClick={() => onSetActiveFilter(filters.CANCELED)}
        >
          Cancelados ({filterCounts[filters.CANCELED]})
        </S.FilterButton>
        <S.FilterButton
          type="button"
          $active={activeFilter === filters.ARCHIVED}
          onClick={() => onSetActiveFilter(filters.ARCHIVED)}
        >
          Arquivados ({filterCounts[filters.ARCHIVED]})
        </S.FilterButton>
      </S.FilterBar>

      {activeFilter === filters.ARCHIVED && (
        <>
          <S.FilterSectionLabel>Tempo em arquivados</S.FilterSectionLabel>
          <S.FilterBar>
            <S.FilterButton
              type="button"
              $active={archiveAgeFilter === archiveAgeFilters.ALL}
              onClick={() => onSetArchiveAgeFilter(archiveAgeFilters.ALL)}
            >
              Todos arquivados
            </S.FilterButton>
            <S.FilterButton
              type="button"
              $active={archiveAgeFilter === archiveAgeFilters.UP_TO_1_MONTH}
              onClick={() =>
                onSetArchiveAgeFilter(archiveAgeFilters.UP_TO_1_MONTH)
              }
            >
              Ate 1 mes
            </S.FilterButton>
            <S.FilterButton
              type="button"
              $active={
                archiveAgeFilter === archiveAgeFilters.FROM_1_MONTH_TO_1_YEAR
              }
              onClick={() =>
                onSetArchiveAgeFilter(archiveAgeFilters.FROM_1_MONTH_TO_1_YEAR)
              }
            >
              1 mes a 1 ano
            </S.FilterButton>
            <S.FilterButton
              type="button"
              $active={
                archiveAgeFilter === archiveAgeFilters.FROM_1_TO_10_YEARS
              }
              onClick={() =>
                onSetArchiveAgeFilter(archiveAgeFilters.FROM_1_TO_10_YEARS)
              }
            >
              1 ano a 10 anos
            </S.FilterButton>
            <S.FilterButton
              type="button"
              $active={archiveAgeFilter === archiveAgeFilters.OVER_10_YEARS}
              onClick={() =>
                onSetArchiveAgeFilter(archiveAgeFilters.OVER_10_YEARS)
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
                {activeFilter === filters.ARCHIVED ? (
                  <button
                    type="button"
                    className="archive-btn"
                    onClick={() => onUnarchiveOrder(pedido.id)}
                  >
                    Desarquivar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="archive-btn"
                    onClick={() => onArchiveOrder(pedido.id)}
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
  );
}
