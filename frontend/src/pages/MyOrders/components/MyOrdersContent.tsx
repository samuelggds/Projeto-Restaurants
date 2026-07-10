import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Package,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import * as S from "../styles";

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

const INITIAL_VISIBLE_ORDERS = 6;
const LOAD_MORE_STEP = 6;
const MAP_MODAL_EXIT_MS = 180;

type MyOrdersContentProps = {
  orderListRef: React.RefObject<HTMLDivElement | null>;
  isLoadingPedidos: boolean;
  activeFilter: string;
  filterCounts: Record<string, number>;
  archiveAgeFilter: string;
  filters: Record<string, string>;
  archiveAgeFilters: Record<string, string>;
  filteredPedidos: OrderItemLike[];
  deliveryLocationByOrderId: Record<
    number,
    {
      latitude: number;
      longitude: number;
      accuracy: number | null;
      updatedAt: string;
    }
  >;
  deliveredVisibleOrderIds: number[];
  reportingIssueOrderId: number | null;
  resolvedIssueOrderIds: number[];
  onArchiveDeliveredOrders: () => void;
  onReportIssue: (orderId: number) => void;
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

function buildOpenStreetMapEmbedUrl(latitude: number, longitude: number) {
  const delta = 0.0035;
  const left = longitude - delta;
  const right = longitude + delta;
  const top = latitude + delta;
  const bottom = latitude - delta;
  const bbox = `${left},${bottom},${right},${top}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function buildGoogleMapsLink(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

export default function MyOrdersContent({
  orderListRef,
  isLoadingPedidos,
  activeFilter,
  filterCounts,
  archiveAgeFilter,
  filters,
  archiveAgeFilters,
  filteredPedidos,
  deliveryLocationByOrderId,
  deliveredVisibleOrderIds,
  reportingIssueOrderId,
  resolvedIssueOrderIds,
  onArchiveDeliveredOrders,
  onReportIssue,
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
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_ORDERS);
  const [expandedMap, setExpandedMap] = useState<{
    orderId: number;
    mapUrl: string;
    externalUrl: string;
    isClosing: boolean;
  } | null>(null);
  const closeModalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const closeExpandedMap = () => {
    setExpandedMap((current) => {
      if (!current || current.isClosing) {
        return current;
      }

      return {
        ...current,
        isClosing: true,
      };
    });

    if (closeModalTimeoutRef.current) {
      clearTimeout(closeModalTimeoutRef.current);
    }

    closeModalTimeoutRef.current = setTimeout(() => {
      setExpandedMap(null);
      closeModalTimeoutRef.current = null;
    }, MAP_MODAL_EXIT_MS);
  };

  useEffect(() => {
    setVisibleLimit(INITIAL_VISIBLE_ORDERS);
  }, [activeFilter]);

  useEffect(() => {
    return () => {
      if (closeModalTimeoutRef.current) {
        clearTimeout(closeModalTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!expandedMap) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeExpandedMap();
      }
    };

    window.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [expandedMap]);

  const displayedOrders = useMemo(
    () => filteredPedidos.slice(0, visibleLimit),
    [filteredPedidos, visibleLimit],
  );
  const hiddenOrdersCount = Math.max(
    filteredPedidos.length - displayedOrders.length,
    0,
  );
  const canResetVisibleLimit =
    hiddenOrdersCount === 0 && displayedOrders.length > INITIAL_VISIBLE_ORDERS;

  return (
    <>
      <S.OrdersCard>
        <S.SectionTitle>
          <ShoppingBag size={20} />
          <h2>Pedidos deste perfil</h2>
          <S.SectionTitleActions>
            <S.BulkArchiveButton
              type="button"
              onClick={onArchiveDeliveredOrders}
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
                  onSetArchiveAgeFilter(
                    archiveAgeFilters.FROM_1_MONTH_TO_1_YEAR,
                  )
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
          ) : displayedOrders.length === 0 ? (
            <p className="empty-msg">
              Nenhum pedido encontrado para este filtro.
            </p>
          ) : (
            displayedOrders.map((pedido) => {
              const isResolvedIssue = resolvedIssueOrderIds.includes(
                Number(pedido.id),
              );
              const isOutForDelivery =
                String(pedido?.status || "").toUpperCase() ===
                "SAIU_PARA_ENTREGA";
              const liveLocation =
                deliveryLocationByOrderId[Number(pedido.id)] || null;
              const liveLocationUpdatedAt = liveLocation?.updatedAt
                ? new Date(liveLocation.updatedAt)
                : null;
              const liveLocationTimeLabel =
                liveLocationUpdatedAt &&
                !Number.isNaN(liveLocationUpdatedAt.getTime())
                  ? liveLocationUpdatedAt.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : null;
              const liveLocationMapUrl = liveLocation
                ? buildOpenStreetMapEmbedUrl(
                    liveLocation.latitude,
                    liveLocation.longitude,
                  )
                : null;
              const liveLocationExternalUrl = liveLocation
                ? buildGoogleMapsLink(
                    liveLocation.latitude,
                    liveLocation.longitude,
                  )
                : null;
              const canOpenRealtimeTracking =
                isOutForDelivery &&
                Boolean(liveLocationMapUrl) &&
                Boolean(liveLocationExternalUrl);

              return (
                <S.OrderItem key={pedido.id}>
                  <div className="order-info">
                    <h5>Pedido #{pedido.id}</h5>
                    <span>
                      {formatOrderDate(pedido.createdAt)} •{" "}
                      <strong>{formatOrderOrigin(pedido)}</strong>
                    </span>
                    {isOutForDelivery && !liveLocation ? (
                      <span className="delivery-waiting-location">
                        Aguardando GPS do entregador para iniciar o rastreio ao
                        vivo.
                      </span>
                    ) : null}
                    {liveLocation ? (
                      <>
                        <span className="delivery-live">
                          Motoqueiro em rota: atualizado{" "}
                          {liveLocationTimeLabel || "agora"}
                          {Number.isFinite(liveLocation?.accuracy)
                            ? ` (precisao ~${liveLocation.accuracy}m)`
                            : ""}
                        </span>
                        {liveLocationMapUrl ? (
                          <div className="delivery-live-map">
                            <iframe
                              title={`Mapa da entrega do pedido ${pedido.id}`}
                              src={liveLocationMapUrl}
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                            />
                            {liveLocationExternalUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedMap({
                                    orderId: Number(pedido.id),
                                    mapUrl: liveLocationMapUrl,
                                    externalUrl: liveLocationExternalUrl,
                                    isClosing: false,
                                  })
                                }
                              >
                                Abrir mapa grande
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    ) : null}
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
                    {isOutForDelivery ? (
                      <button
                        type="button"
                        className="track-btn"
                        disabled={!canOpenRealtimeTracking}
                        onClick={() => {
                          if (!canOpenRealtimeTracking) {
                            return;
                          }

                          setExpandedMap({
                            orderId: Number(pedido.id),
                            mapUrl: String(liveLocationMapUrl),
                            externalUrl: String(liveLocationExternalUrl),
                            isClosing: false,
                          });
                        }}
                      >
                        {canOpenRealtimeTracking
                          ? "Abrir rastreio em tempo real"
                          : "Rastreio: aguardando GPS"}
                      </button>
                    ) : null}
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
                    <button
                      type="button"
                      className="issue-btn"
                      onClick={() => onReportIssue(pedido.id)}
                      disabled={
                        reportingIssueOrderId === Number(pedido.id) ||
                        isResolvedIssue
                      }
                    >
                      {isResolvedIssue
                        ? "Problema resolvido"
                        : reportingIssueOrderId === Number(pedido.id)
                          ? "Enviando..."
                          : "Relatar problema"}
                    </button>
                  </div>
                </S.OrderItem>
              );
            })
          )}
        </S.OrderList>

        {!isLoadingPedidos &&
        filteredPedidos.length > INITIAL_VISIBLE_ORDERS ? (
          <div
            style={{
              marginTop: "0.9rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.6rem",
              flexWrap: "wrap",
            }}
          >
            <small style={{ opacity: 0.72, fontWeight: 600 }}>
              Exibindo {displayedOrders.length} de {filteredPedidos.length}{" "}
              pedidos
            </small>
            <S.BulkArchiveButton
              type="button"
              onClick={() => {
                if (hiddenOrdersCount > 0) {
                  setVisibleLimit((prev) =>
                    Math.min(prev + LOAD_MORE_STEP, filteredPedidos.length),
                  );
                  return;
                }

                setVisibleLimit(INITIAL_VISIBLE_ORDERS);
              }}
            >
              {hiddenOrdersCount > 0
                ? `Mostrar +${Math.min(LOAD_MORE_STEP, hiddenOrdersCount)}`
                : canResetVisibleLimit
                  ? "Voltar para 6"
                  : "Mostrar +6"}
            </S.BulkArchiveButton>
          </div>
        ) : null}
      </S.OrdersCard>

      {expandedMap ? (
        <S.MapTrackingOverlay
          $closing={expandedMap.isClosing}
          onClick={() => {
            closeExpandedMap();
          }}
        >
          <S.MapTrackingModal
            $closing={expandedMap.isClosing}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <S.MapTrackingHeader>
              <strong>Rastreio do pedido #{expandedMap.orderId}</strong>
              <button
                type="button"
                onClick={() => {
                  closeExpandedMap();
                }}
              >
                Fechar
              </button>
            </S.MapTrackingHeader>

            <S.MapTrackingBody>
              <iframe
                title={`Mapa grande da entrega do pedido ${expandedMap.orderId}`}
                src={expandedMap.mapUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a
                href={expandedMap.externalUrl}
                target="_blank"
                rel="noreferrer"
              >
                Abrir em app de mapa
              </a>
            </S.MapTrackingBody>
          </S.MapTrackingModal>
        </S.MapTrackingOverlay>
      ) : null}
    </>
  );
}
