import { useMemo, useState, type ReactElement } from "react";
import {
  Bike,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Package,
  RotateCcw,
  Table2,
  User,
  X,
} from "lucide-react";
import * as S from "../styles";

type StatusMeta = Record<string, { label: string; color: string }>;

type ToneByStatus = Record<string, string>;

type OrderItem = {
  quantity?: number;
  name?: string;
  productName?: string;
  product?: {
    name?: string;
  };
};

type Order = {
  id: number;
  createdAt?: string;
  pixPaymentId?: string;
  type?: string;
  status?: string;
  total?: number;
  paid?: boolean;
  paymentMethod?: string;
  payOnDelivery?: boolean;
  observation?: string;
  issueThread?: {
    orderId?: number;
    isResolved?: boolean;
    messages?: Array<{
      senderType?: string;
      message?: string;
    }>;
  } | null;
  items?: OrderItem[];
};

type PinEntry = {
  pin?: string;
  expiresAt?: string;
};

type PinRequestEntry = {
  requestedAt?: string;
};

type OrdersTabProps = {
  isDarkMode: boolean;
  visibleOrders: Order[];
  statusCounters: Record<string, number>;
  orderTypeFilter: string;
  orderTypeCounters: Record<string, number>;
  quickFilterCounts: {
    refundRequested: number;
    payOnDelivery: number;
  };
  statusFilter: string;
  orderStatusFilters: string[];
  statusFilterToneByStatus: ToneByStatus;
  refundRequestedOnly: boolean;
  payOnDeliveryOnly: boolean;
  expandedOrderIds: Record<number, boolean>;
  closingOrderIds: number[];
  generatingPinOrderIds: number[];
  paymentPinByOrderId: Record<number, PinEntry | null>;
  pinRequestByOrderId: Record<number, PinRequestEntry | null>;
  paymentPinInputByOrderId: Record<number, string>;
  requestingPaymentPinOrderIds: number[];
  confirmingPaymentPinOrderIds: number[];
  retryingPixCheckOrderIds: number[];
  refundingOrderIds: number[];
  paymentPinToolsEnabled: boolean;
  orderStatusMeta: StatusMeta;
  onSetOrderTypeFilter: (value: string) => void;
  onSetStatusFilter: (value: string) => void;
  onSetRefundRequestedOnly: (value: boolean) => void;
  onSetPayOnDeliveryOnly: (value: boolean) => void;
  onToggleOrderExpanded: (orderId: number) => void;
  onGeneratePaymentPin: (order: Order) => void;
  onRequestPaymentPin: (order: Order) => void;
  onSetPaymentPinInputByOrderId: (
    updater: (prev: Record<number, string>) => Record<number, string>,
  ) => void;
  onConfirmPaymentWithPin: (order: Order) => void;
  onConfirmPaymentByAdmin: (order: Order) => void;
  onRetryPixPaymentStatus: (order: Order) => void;
  onRefundOrder: (order: Order) => void;
  getStatusValueIcon: (status?: string) => ReactElement;
  getPaymentSummaryLabel: (order?: unknown) => string;
  getDeliveryAddressLabel: (order: Order) => string | null;
  isPendingDigitalPayment: (order: Order) => boolean;
  canGeneratePin: (order: Order) => boolean;
  canRefundOrder: (order: Order) => boolean;
  hasRefundRequest: (order: Order) => boolean;
  isPayOnDeliveryOrder: (order: Order) => boolean;
  formatRequestTime: (requestedAt?: string) => string;
  getOrderTableLabel: (order: Order) => string | null;
};

const PIX_PENDING_ALERT_DELAY_MS = 2 * 60 * 1000;

function isPixPendingDelayed(order: Order) {
  const createdAtRaw = String(order?.createdAt || "").trim();
  if (!createdAtRaw) {
    return false;
  }

  const createdAtMs = Date.parse(createdAtRaw);
  if (!Number.isFinite(createdAtMs)) {
    return false;
  }

  return Date.now() - createdAtMs >= PIX_PENDING_ALERT_DELAY_MS;
}

export default function OrdersTab({
  isDarkMode,
  visibleOrders,
  statusCounters,
  orderTypeFilter,
  orderTypeCounters,
  quickFilterCounts,
  statusFilter,
  orderStatusFilters,
  statusFilterToneByStatus,
  refundRequestedOnly,
  payOnDeliveryOnly,
  expandedOrderIds,
  closingOrderIds,
  generatingPinOrderIds,
  paymentPinByOrderId,
  pinRequestByOrderId,
  paymentPinInputByOrderId,
  requestingPaymentPinOrderIds,
  confirmingPaymentPinOrderIds,
  retryingPixCheckOrderIds,
  refundingOrderIds,
  paymentPinToolsEnabled,
  orderStatusMeta,
  onSetOrderTypeFilter,
  onSetStatusFilter,
  onSetRefundRequestedOnly,
  onSetPayOnDeliveryOnly,
  onToggleOrderExpanded,
  onGeneratePaymentPin,
  onRequestPaymentPin,
  onSetPaymentPinInputByOrderId,
  onConfirmPaymentWithPin,
  onConfirmPaymentByAdmin,
  onRetryPixPaymentStatus,
  onRefundOrder,
  getStatusValueIcon,
  getPaymentSummaryLabel,
  getDeliveryAddressLabel,
  isPendingDigitalPayment,
  canGeneratePin,
  canRefundOrder,
  hasRefundRequest,
  isPayOnDeliveryOrder,
  formatRequestTime,
  getOrderTableLabel,
}: OrdersTabProps) {
  const INITIAL_VISIBLE_ORDERS = 12;
  const LOAD_MORE_STEP = 12;
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_ORDERS);
  const [orderIdSearch, setOrderIdSearch] = useState("");

  const searchedOrders = useMemo(() => {
    const normalizedSearch = orderIdSearch.trim();

    if (!normalizedSearch) {
      return visibleOrders;
    }

    return visibleOrders.filter((order) =>
      String(order?.id ?? "").includes(normalizedSearch),
    );
  }, [orderIdSearch, visibleOrders]);

  const displayedOrders = useMemo(
    () => searchedOrders.slice(0, visibleLimit),
    [searchedOrders, visibleLimit],
  );
  const hiddenOrdersCount = Math.max(
    searchedOrders.length - displayedOrders.length,
    0,
  );

  return (
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
        </h2>
        <p>Painel no estilo motoqueiro com filtros avancados do admin.</p>
      </S.PageHeader>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "0.7rem",
          marginBottom: "1rem",
        }}
      >
        <S.FormCard style={{ padding: "0.9rem 1rem", maxWidth: "none" }}>
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
            <Package size={18} /> {statusCounters.PRONTO || 0}
          </div>
        </S.FormCard>
        <S.FormCard style={{ padding: "0.9rem 1rem", maxWidth: "none" }}>
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
            <Bike size={18} /> {statusCounters.SAIU_PARA_ENTREGA || 0}
          </div>
        </S.FormCard>
        <S.FormCard style={{ padding: "0.9rem 1rem", maxWidth: "none" }}>
          <small style={{ opacity: 0.72 }}>Concluidos</small>
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
            <Check size={18} /> {statusCounters.ENTREGUE || 0}
          </div>
        </S.FormCard>
      </div>

      <S.OrdersFilterBar>
        <S.OrderTypeFilterButton
          type="button"
          $active={orderTypeFilter === "TODOS"}
          onClick={() => onSetOrderTypeFilter("TODOS")}
        >
          Todos ({orderTypeCounters.TODOS})
        </S.OrderTypeFilterButton>

        <S.OrderTypeFilterButton
          type="button"
          $active={orderTypeFilter === "DELIVERY"}
          onClick={() => onSetOrderTypeFilter("DELIVERY")}
        >
          Delivery ({orderTypeCounters.DELIVERY})
        </S.OrderTypeFilterButton>

        <S.OrderTypeFilterButton
          type="button"
          $active={orderTypeFilter === "MESA"}
          onClick={() => onSetOrderTypeFilter("MESA")}
        >
          Mesa ({orderTypeCounters.MESA})
        </S.OrderTypeFilterButton>

        <S.OrderTypeFilterButton
          type="button"
          $active={orderTypeFilter === "RETIRADA"}
          onClick={() => onSetOrderTypeFilter("RETIRADA")}
        >
          Retirada ({orderTypeCounters.RETIRADA})
        </S.OrderTypeFilterButton>
      </S.OrdersFilterBar>

      <S.OrdersFilterBar>
        {orderStatusFilters.map((status) => {
          const isAll = status === "TODOS";
          const label = isAll
            ? "Todos"
            : status === "SAIU_PARA_ENTREGA"
              ? "EM ENTREGA / A CAMINHO"
              : String(status).replace(/_/g, " ");
          const tone = statusFilterToneByStatus[status] || "default";

          return (
            <S.OrderTypeFilterButton
              key={status}
              type="button"
              $tone={tone}
              $active={statusFilter === status}
              onClick={() => onSetStatusFilter(status)}
            >
              {label} ({statusCounters[status] || 0})
            </S.OrderTypeFilterButton>
          );
        })}
      </S.OrdersFilterBar>

      <S.OrdersFilterBar>
        <S.OrderTypeFilterButton
          type="button"
          $active={refundRequestedOnly}
          onClick={() => onSetRefundRequestedOnly(!refundRequestedOnly)}
          title="Mostrar somente pedidos com solicitação de estorno no chat"
        >
          Solicitação de estorno ({quickFilterCounts.refundRequested || 0})
        </S.OrderTypeFilterButton>

        <S.OrderTypeFilterButton
          type="button"
          $active={payOnDeliveryOnly}
          onClick={() => onSetPayOnDeliveryOnly(!payOnDeliveryOnly)}
          title="Mostrar somente pedidos com pagamento na entrega"
        >
          Pagamento na entrega ({quickFilterCounts.payOnDelivery || 0})
        </S.OrderTypeFilterButton>
      </S.OrdersFilterBar>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.65rem",
          marginBottom: "0.9rem",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: "min(320px, 100%)",
            position: "relative",
          }}
        >
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={orderIdSearch}
            onChange={(event) => {
              setOrderIdSearch(
                event.target.value.replace(/\D/g, "").slice(0, 10),
              );
              setVisibleLimit(INITIAL_VISIBLE_ORDERS);
            }}
            placeholder="Buscar por ID do pedido"
            style={{
              width: "100%",
              minHeight: 38,
              borderRadius: 10,
              border: "1px solid rgba(148, 163, 184, 0.45)",
              padding: "0 2.2rem 0 0.75rem",
              background: "#ffffff",
              color: "#0f172a",
              fontWeight: 600,
            }}
          />

          {orderIdSearch ? (
            <button
              type="button"
              aria-label="Limpar busca por ID"
              title="Limpar"
              onClick={() => {
                setOrderIdSearch("");
                setVisibleLimit(INITIAL_VISIBLE_ORDERS);
              }}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                width: 24,
                height: 24,
                borderRadius: 999,
                border: "1px solid rgba(148, 163, 184, 0.45)",
                background: "#ffffff",
                color: "#475569",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <small style={{ opacity: 0.72, fontWeight: 600 }}>
          Exibindo {displayedOrders.length} de {searchedOrders.length} pedidos
        </small>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {hiddenOrdersCount > 0 ? (
            <button
              type="button"
              onClick={() =>
                setVisibleLimit((prev) =>
                  Math.min(prev + LOAD_MORE_STEP, searchedOrders.length),
                )
              }
              style={{
                border: "1px solid rgba(148, 163, 184, 0.45)",
                background: "#eef2f7",
                color: "#0f172a",
                borderRadius: 999,
                padding: "0.38rem 0.78rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Mostrar +{Math.min(LOAD_MORE_STEP, hiddenOrdersCount)}
            </button>
          ) : null}

          {displayedOrders.length > INITIAL_VISIBLE_ORDERS ? (
            <button
              type="button"
              onClick={() => setVisibleLimit(INITIAL_VISIBLE_ORDERS)}
              style={{
                border: "1px solid rgba(148, 163, 184, 0.45)",
                background: "#ffffff",
                color: "#334155",
                borderRadius: 999,
                padding: "0.38rem 0.78rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Mostrar menos
            </button>
          ) : null}
        </div>
      </div>

      <S.OrdersGrid>
        {displayedOrders.length === 0 ? (
          <p
            style={{
              gridColumn: "1/-1",
              textAlign: "center",
              opacity: 0.55,
              padding: "2rem",
            }}
          >
            Nenhum pedido encontrado para esse ID.
          </p>
        ) : (
          displayedOrders.map((order) => {
            const normalizedOrderType = String(order?.type || "").toUpperCase();
            const isDelivery = normalizedOrderType.includes("DELIVERY");
            const hasExpandableInfo = isDelivery;
            const deliveryCustomerName = "Admin Pizza IA";
            const paymentSummaryLabel = getPaymentSummaryLabel(order);
            const paymentStatusLabel = order.paid ? "Pago" : "Nao pago";
            const deliveryAddressLabel = getDeliveryAddressLabel(order);
            const pendingDigitalPayment =
              paymentPinToolsEnabled && isPendingDigitalPayment(order);
            const normalizedPixPaymentId = String(
              order?.pixPaymentId || "",
            ).trim();
            const pendingManualPixClaim =
              !order.paid &&
              String(order?.paymentMethod || "").toUpperCase() === "PIX" &&
              (normalizedPixPaymentId.startsWith("manual:") ||
                (normalizedPixPaymentId.length === 0 &&
                  String(order?.type || "").toUpperCase() === "DELIVERY" &&
                  order?.payOnDelivery !== true));
            const pendingPixDelayed =
              pendingDigitalPayment && isPixPendingDelayed(order);
            const canGenerateOrderPin = canGeneratePin(order);
            const isGeneratingPin = generatingPinOrderIds.includes(order.id);
            const pinEntry = paymentPinByOrderId[order.id] || null;
            const pinRequestEntry = pinRequestByOrderId[order.id] || null;
            const hasPinRequest = Boolean(pinRequestEntry);
            const pinRequestedAtLabel = formatRequestTime(
              pinRequestEntry?.requestedAt,
            );
            const paymentPinInput = String(
              paymentPinInputByOrderId[order.id] || "",
            );
            const isRequestingPaymentPin =
              requestingPaymentPinOrderIds.includes(order.id);
            const isConfirmingPaymentPin =
              confirmingPaymentPinOrderIds.includes(order.id);
            const isRetryingPixCheck = retryingPixCheckOrderIds.includes(
              order.id,
            );
            const isRefundingOrder = refundingOrderIds.includes(order.id);
            const canRefundCurrentOrder = canRefundOrder(order);
            const hasRequestedRefund = hasRefundRequest(order);
            const isPayOnDelivery = isPayOnDeliveryOrder(order);
            const isExpanded = Boolean(expandedOrderIds[order.id]);
            const normalizedStatus = String(order?.status || "").toUpperCase();
            const isRefundedOrder =
              normalizedStatus === "CANCELADO" && order?.paid === true;
            const statusLabel = isRefundedOrder
              ? "ESTORNADO"
              : normalizedStatus === "SAIU_PARA_ENTREGA"
                ? isDelivery
                  ? "EM ENTREGA"
                  : "A CAMINHO"
                : orderStatusMeta[String(order?.status || "")]?.label ||
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
            const paymentStatusChipStyle = {
              ...infoChipStyle,
              color: order.paid ? "#166534" : "#991b1b",
              background: order.paid ? "#dcfce7" : "#fee2e2",
              border: order.paid
                ? "1px solid rgba(34, 197, 94, 0.35)"
                : "1px solid rgba(239, 68, 68, 0.35)",
              fontWeight: 800,
            };
            const orderItems = Array.isArray(order?.items) ? order.items : [];

            return (
              <S.OrderCard
                key={order.id}
                $isClosing={closingOrderIds.includes(order.id)}
                $hasPinSection={
                  paymentPinToolsEnabled &&
                  (pendingDigitalPayment ||
                    hasPinRequest ||
                    Boolean(pinEntry?.pin))
                }
              >
                <div className="card-header">
                  <div
                    role="button"
                    tabIndex={hasExpandableInfo ? 0 : -1}
                    onClick={() => {
                      if (hasExpandableInfo) {
                        onToggleOrderExpanded(order.id);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (
                        hasExpandableInfo &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        onToggleOrderExpanded(order.id);
                      }
                    }}
                    style={{
                      cursor: hasExpandableInfo ? "pointer" : "default",
                    }}
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
                      <span style={infoChipStyle}>
                        {getStatusValueIcon(order.status)}
                        Status: {statusLabel}
                      </span>
                      <span style={infoChipStyle}>
                        {String(order.type || "")
                          .toUpperCase()
                          .includes("DELIVERY") ? (
                          <Bike size={13} />
                        ) : String(order.type || "")
                            .toUpperCase()
                            .includes("MESA") ? (
                          <Table2 size={13} />
                        ) : (
                          <Package size={13} />
                        )}
                        {String(order.type || "").toUpperCase() === "DELIVERY"
                          ? "ENTREGA"
                          : order.type}
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
                    {hasExpandableInfo ? (
                      <button
                        type="button"
                        onClick={() => onToggleOrderExpanded(order.id)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 999,
                          border: "1px solid rgba(148, 163, 184, 0.45)",
                          background: isDarkMode
                            ? "rgba(148, 163, 184, 0.18)"
                            : "rgba(15, 23, 42, 0.06)",
                          color: isDarkMode ? "#f8fafc" : "#0f172a",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: "0.1rem",
                          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.12)",
                        }}
                        title={isExpanded ? "Recolher" : "Expandir"}
                        aria-label={
                          isExpanded ? "Recolher pedido" : "Expandir pedido"
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                    ) : null}
                  </S.CardHeaderActions>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span style={infoChipStyle}>
                    <User size={13} />
                    {deliveryCustomerName}
                  </span>
                  <span style={infoChipStyle}>
                    <CreditCard size={13} />
                    {paymentSummaryLabel}
                  </span>
                  <span style={paymentStatusChipStyle}>
                    <CreditCard size={13} />
                    {paymentStatusLabel}
                  </span>
                  {pendingDigitalPayment ? (
                    <S.PixPendingRealtimeBadge
                      $isDelayed={pendingPixDelayed}
                      title={
                        pendingPixDelayed
                          ? "PIX pendente há mais de 2 minutos. Verifique webhook/provedor."
                          : "Assim que o provedor confirmar, o pedido muda para pago automaticamente."
                      }
                    >
                      <CreditCard size={13} />
                      {pendingPixDelayed
                        ? "PIX pendente há mais de 2 minutos"
                        : "Aguardando confirmação do PIX em tempo real"}
                    </S.PixPendingRealtimeBadge>
                  ) : null}
                  {pendingPixDelayed ? (
                    <button
                      type="button"
                      onClick={() => onRetryPixPaymentStatus(order)}
                      disabled={isRetryingPixCheck}
                      style={{
                        ...infoChipStyle,
                        color: "#7f1d1d",
                        background: "#fee2e2",
                        border: "1px solid rgba(220, 38, 38, 0.45)",
                        fontWeight: 800,
                        cursor: isRetryingPixCheck ? "not-allowed" : "pointer",
                        opacity: isRetryingPixCheck ? 0.7 : 1,
                      }}
                      title="Consultar agora no provedor e confirmar automaticamente se já estiver aprovado."
                    >
                      <CreditCard size={13} />
                      {isRetryingPixCheck
                        ? "Reconsultando PIX..."
                        : "Reconsultar status PIX agora"}
                    </button>
                  ) : null}
                  {pendingManualPixClaim ? (
                    <button
                      type="button"
                      onClick={() => onConfirmPaymentByAdmin(order)}
                      disabled={isConfirmingPaymentPin}
                      style={{
                        minHeight: 34,
                        padding: "0.36rem 0.85rem",
                        borderRadius: 999,
                        border: "1px solid rgba(21, 128, 61, 0.55)",
                        background:
                          "linear-gradient(135deg, #22c55e 0%, #16a34a 55%, #15803d 100%)",
                        color: "#ffffff",
                        fontSize: 12,
                        fontWeight: 800,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: isConfirmingPaymentPin
                          ? "not-allowed"
                          : "pointer",
                        opacity: isConfirmingPaymentPin ? 0.7 : 1,
                        boxShadow: "0 8px 18px rgba(21, 128, 61, 0.28)",
                        letterSpacing: "0.01em",
                      }}
                      title="Confirme somente após validar no extrato do banco."
                    >
                      <Check size={13} />
                      {isConfirmingPaymentPin
                        ? "Confirmando..."
                        : "Confirmar pagamento"}
                    </button>
                  ) : null}
                  {hasRequestedRefund ? (
                    <span
                      style={{
                        ...infoChipStyle,
                        color: "#7c2d12",
                        background: "#ffedd5",
                        border: "1px solid rgba(249, 115, 22, 0.45)",
                        fontWeight: 800,
                      }}
                    >
                      <RotateCcw size={13} />
                      Cliente solicitou estorno
                    </span>
                  ) : null}
                  {isPayOnDelivery ? (
                    <span
                      style={{
                        ...infoChipStyle,
                        color: "#0f172a",
                        background: "#fef3c7",
                        border: "1px solid rgba(245, 158, 11, 0.45)",
                        fontWeight: 800,
                      }}
                    >
                      <CreditCard size={13} />
                      Pagamento na entrega
                    </span>
                  ) : null}
                </div>

                <div
                  className="items-list"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    marginBottom: "0.55rem",
                  }}
                >
                  {orderItems.length > 0 ? (
                    orderItems.map((item, index) => {
                      const itemName =
                        item?.product?.name ||
                        item?.productName ||
                        item?.name ||
                        "Produto";
                      const quantity = Number(item?.quantity || 0) || 1;

                      return (
                        <span
                          key={`${order.id}-${String(itemName)}-${index}`}
                          style={infoChipStyle}
                        >
                          <Package size={13} />
                          {`${quantity}x ${itemName}`}
                        </span>
                      );
                    })
                  ) : (
                    <span style={infoChipStyle}>
                      <Package size={13} />
                      Sem itens no pedido
                    </span>
                  )}
                </div>

                {isExpanded && hasExpandableInfo ? (
                  <div
                    style={{
                      marginTop: "0.25rem",
                      marginBottom: "0.55rem",
                      fontSize: "0.88rem",
                      color: isDarkMode ? "#f1f5f9" : "#1e293b",
                      lineHeight: 1.45,
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                      background: isDarkMode
                        ? "rgba(15, 23, 42, 0.4)"
                        : "rgba(248, 250, 252, 0.9)",
                      border: isDarkMode
                        ? "1px solid rgba(148, 163, 184, 0.28)"
                        : "1px solid rgba(203, 213, 225, 0.9)",
                      borderRadius: 10,
                      padding: "0.6rem 0.7rem",
                    }}
                  >
                    <div>
                      <strong>Cliente:</strong> {deliveryCustomerName}
                    </div>
                    <div>
                      <strong>Entrega:</strong>{" "}
                      {deliveryAddressLabel ||
                        "Endereco nao informado no pedido."}
                    </div>
                  </div>
                ) : null}

                {pendingDigitalPayment ? (
                  <div
                    style={{
                      display: "grid",
                      gap: "0.45rem",
                      marginTop: "-0.2rem",
                    }}
                  >
                    {hasPinRequest ? (
                      <div
                        style={{
                          border: "1px solid rgba(251, 191, 36, 0.45)",
                          borderRadius: 10,
                          background: "rgba(251, 191, 36, 0.13)",
                          padding: "0.5rem 0.65rem",
                          color: isDarkMode ? "#fef3c7" : "#78350f",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.03em",
                        }}
                      >
                        PIN solicitado para este pedido
                        {pinRequestedAtLabel
                          ? ` em ${pinRequestedAtLabel}`
                          : " agora"}
                      </div>
                    ) : null}

                    {canGenerateOrderPin ? (
                      <button
                        type="button"
                        onClick={() => onGeneratePaymentPin(order)}
                        disabled={isGeneratingPin}
                        style={{
                          width: "100%",
                          minHeight: 40,
                          borderRadius: 10,
                          border: "1px solid rgba(217, 119, 6, 0.45)",
                          background:
                            "linear-gradient(135deg, #f59e0b, #d97706)",
                          color: "#111827",
                          fontWeight: 800,
                          cursor: isGeneratingPin ? "not-allowed" : "pointer",
                          opacity: isGeneratingPin ? 0.65 : 1,
                        }}
                      >
                        {isGeneratingPin
                          ? "Gerando PIN..."
                          : "Gerar PIN (4 digitos) para motoqueiro"}
                      </button>
                    ) : null}

                    {canGenerateOrderPin ? (
                      <button
                        type="button"
                        onClick={() => onRequestPaymentPin(order)}
                        disabled={
                          isRequestingPaymentPin || isConfirmingPaymentPin
                        }
                        style={{
                          width: "100%",
                          minHeight: 38,
                          borderRadius: 10,
                          border: "1px solid rgba(234, 29, 44, 0.45)",
                          background: "rgba(234, 29, 44, 0.18)",
                          color: isDarkMode ? "#fecdd3" : "#9f1239",
                          fontWeight: 700,
                          cursor:
                            isRequestingPaymentPin || isConfirmingPaymentPin
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            isRequestingPaymentPin || isConfirmingPaymentPin
                              ? 0.7
                              : 1,
                        }}
                      >
                        {isRequestingPaymentPin
                          ? "Solicitando PIN..."
                          : "Solicitar PIN de Pagamento"}
                      </button>
                    ) : null}

                    {canGenerateOrderPin ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: "0.45rem",
                        }}
                      >
                        <input
                          type="text"
                          value={paymentPinInput}
                          placeholder="Digite o PIN"
                          maxLength={8}
                          onChange={(event) => {
                            const value = event.target.value;
                            onSetPaymentPinInputByOrderId((prev) => ({
                              ...prev,
                              [order.id]: value,
                            }));
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              onConfirmPaymentWithPin(order);
                            }
                          }}
                          style={{
                            width: "100%",
                            minHeight: 38,
                            borderRadius: 8,
                            border: "1px solid rgba(148, 163, 184, 0.5)",
                            padding: "0 0.65rem",
                            background: isDarkMode ? "#0f172a" : "#ffffff",
                            color: isDarkMode ? "#f8fafc" : "#0f172a",
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => onConfirmPaymentWithPin(order)}
                          disabled={
                            isConfirmingPaymentPin ||
                            isRequestingPaymentPin ||
                            paymentPinInput.trim().length === 0
                          }
                          style={{
                            minHeight: 38,
                            borderRadius: 8,
                            border: "1px solid rgba(34, 197, 94, 0.45)",
                            background: "rgba(34, 197, 94, 0.2)",
                            color: isDarkMode ? "#dcfce7" : "#166534",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            padding: "0 0.82rem",
                            cursor:
                              isConfirmingPaymentPin ||
                              isRequestingPaymentPin ||
                              paymentPinInput.trim().length === 0
                                ? "not-allowed"
                                : "pointer",
                            opacity:
                              isConfirmingPaymentPin ||
                              isRequestingPaymentPin ||
                              paymentPinInput.trim().length === 0
                                ? 0.7
                                : 1,
                          }}
                        >
                          {isConfirmingPaymentPin ? "..." : "Confirmar PIN"}
                        </button>
                      </div>
                    ) : null}

                    {pinEntry?.pin ? (
                      <div
                        style={{
                          border: "1px solid rgba(14, 165, 233, 0.35)",
                          borderRadius: 10,
                          background: "rgba(234, 29, 44, 0.12)",
                          padding: "0.55rem 0.65rem",
                          color: isDarkMode ? "#e2e8f0" : "#0f172a",
                          display: "grid",
                          gap: "0.2rem",
                        }}
                      >
                        <strong style={{ letterSpacing: "0.12em" }}>
                          PIN: {pinEntry.pin}
                        </strong>
                        <small>
                          {pinEntry.expiresAt
                            ? `Expira em ${new Date(
                                pinEntry.expiresAt,
                              ).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`
                            : "Compartilhe este PIN com o motoqueiro."}
                        </small>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <S.StatusBox>
                  <h4>
                    Status Atual:{" "}
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
                        textTransform: "none",
                        marginLeft: 4,
                      }}
                    >
                      {getStatusValueIcon(
                        isRefundedOrder ? "ESTORNADOS" : order.status,
                      )}
                      {isRefundedOrder
                        ? "ESTORNADO"
                        : normalizedStatus === "SAIU_PARA_ENTREGA"
                          ? isDelivery
                            ? "SAIU PARA ENTREGA"
                            : "A CAMINHO"
                          : String(order.status).replace(/_/g, " ")}
                    </span>
                  </h4>

                  <button
                    type="button"
                    onClick={() => onRefundOrder(order)}
                    disabled={!canRefundCurrentOrder || isRefundingOrder}
                    style={{
                      marginTop: "0.5rem",
                      minHeight: 34,
                      width: "100%",
                      borderRadius: 10,
                      border: "1px solid rgba(220, 38, 38, 0.45)",
                      background: canRefundCurrentOrder
                        ? "linear-gradient(135deg, #ef4444, #dc2626)"
                        : "rgba(248, 113, 113, 0.2)",
                      color: canRefundCurrentOrder ? "#ffffff" : "#7f1d1d",
                      fontWeight: 800,
                      cursor:
                        !canRefundCurrentOrder || isRefundingOrder
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        !canRefundCurrentOrder || isRefundingOrder ? 0.72 : 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                    }}
                    title={
                      canRefundCurrentOrder
                        ? "Estornar pedido"
                        : "Disponível para pedidos pagos via PIX/CARTAO com solicitação de estorno no chat"
                    }
                  >
                    <RotateCcw size={14} />
                    {isRefundingOrder ? "Estornando..." : "Estornar pedido"}
                  </button>
                </S.StatusBox>
              </S.OrderCard>
            );
          })
        )}
      </S.OrdersGrid>
    </div>
  );
}
