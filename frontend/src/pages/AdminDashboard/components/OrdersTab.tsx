import type { ReactElement } from "react";
import {
  Bike,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Package,
  Table2,
  User,
  X,
} from "lucide-react";
import * as S from "../styles";

type StatusMeta = Record<string, { label: string; color: string }>;

type ToneByStatus = Record<string, string>;

type OrderItem = {
  quantity?: number;
  product?: {
    name?: string;
  };
};

type Order = {
  id: number;
  type?: string;
  status?: string;
  total?: number;
  paid?: boolean;
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
  statusFilter: string;
  orderStatusFilters: string[];
  statusFilterToneByStatus: ToneByStatus;
  expandedOrderIds: Record<number, boolean>;
  closingOrderIds: number[];
  generatingPinOrderIds: number[];
  paymentPinByOrderId: Record<number, PinEntry | null>;
  pinRequestByOrderId: Record<number, PinRequestEntry | null>;
  paymentPinInputByOrderId: Record<number, string>;
  requestingPaymentPinOrderIds: number[];
  confirmingPaymentPinOrderIds: number[];
  paymentPinToolsEnabled: boolean;
  orderStatusMeta: StatusMeta;
  onSetOrderTypeFilter: (value: string) => void;
  onSetStatusFilter: (value: string) => void;
  onToggleOrderExpanded: (orderId: number) => void;
  onCloseDeliveredOrder: (orderId: number) => void;
  onGeneratePaymentPin: (order: Order) => void;
  onRequestPaymentPin: (order: Order) => void;
  onSetPaymentPinInputByOrderId: (
    updater: (prev: Record<number, string>) => Record<number, string>,
  ) => void;
  onConfirmPaymentWithPin: (order: Order) => void;
  onUpdateStatus: (orderId: number, status: string) => void;
  getStatusValueIcon: (status?: string) => ReactElement;
  getPaymentSummaryLabel: (order?: unknown) => string;
  getDeliveryAddressLabel: (order: Order) => string | null;
  isPendingDigitalPayment: (order: Order) => boolean;
  isDeliveryBlockedUntilPaid: (order: Order) => boolean;
  canGeneratePin: (order: Order) => boolean;
  formatRequestTime: (requestedAt?: string) => string;
  getOrderTableLabel: (order: Order) => string | null;
  getAvailableStatusesByOrderType: (orderType?: string) => string[];
  canCloseOrder: (order: Order) => boolean;
};

export default function OrdersTab({
  isDarkMode,
  visibleOrders,
  statusCounters,
  orderTypeFilter,
  orderTypeCounters,
  statusFilter,
  orderStatusFilters,
  statusFilterToneByStatus,
  expandedOrderIds,
  closingOrderIds,
  generatingPinOrderIds,
  paymentPinByOrderId,
  pinRequestByOrderId,
  paymentPinInputByOrderId,
  requestingPaymentPinOrderIds,
  confirmingPaymentPinOrderIds,
  paymentPinToolsEnabled,
  orderStatusMeta,
  onSetOrderTypeFilter,
  onSetStatusFilter,
  onToggleOrderExpanded,
  onCloseDeliveredOrder,
  onGeneratePaymentPin,
  onRequestPaymentPin,
  onSetPaymentPinInputByOrderId,
  onConfirmPaymentWithPin,
  onUpdateStatus,
  getStatusValueIcon,
  getPaymentSummaryLabel,
  getDeliveryAddressLabel,
  isPendingDigitalPayment,
  isDeliveryBlockedUntilPaid,
  canGeneratePin,
  formatRequestTime,
  getOrderTableLabel,
  getAvailableStatusesByOrderType,
  canCloseOrder,
}: OrdersTabProps) {
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
            {visibleOrders.length}
          </span>
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
          const label = isAll ? "Todos" : String(status).replace(/_/g, " ");
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

      <S.OrdersGrid>
        {visibleOrders.map((order) => {
          const isDelivery = String(order?.type || "")
            .toUpperCase()
            .includes("DELIVERY");
          const deliveryCustomerName = "Admin Pizza IA";
          const paymentSummaryLabel = getPaymentSummaryLabel(order);
          const deliveryAddressLabel = getDeliveryAddressLabel(order);
          const pendingDigitalPayment =
            paymentPinToolsEnabled && isPendingDigitalPayment(order);
          const deliveryBlockedUntilPaid = isDeliveryBlockedUntilPaid(order);
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
          const isRequestingPaymentPin = requestingPaymentPinOrderIds.includes(
            order.id,
          );
          const isConfirmingPaymentPin = confirmingPaymentPinOrderIds.includes(
            order.id,
          );
          const isExpanded = Boolean(expandedOrderIds[order.id]);
          const statusLabel =
            orderStatusMeta[String(order?.status || "")]?.label ||
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
                  tabIndex={0}
                  onClick={() => onToggleOrderExpanded(order.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onToggleOrderExpanded(order.id);
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
                  <button
                    type="button"
                    onClick={() => onToggleOrderExpanded(order.id)}
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
                      isExpanded ? "Recolher pedido" : "Expandir pedido"
                    }
                  >
                    {isExpanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>

                  {canCloseOrder(order) && (
                    <S.CloseDeliveredButton
                      type="button"
                      onClick={() => onCloseDeliveredOrder(order.id)}
                      aria-label={`Fechar pedido ${order.id}`}
                      title={`Fechar pedido ${String(order.status).toLowerCase()}`}
                    >
                      <X size={14} />
                    </S.CloseDeliveredButton>
                  )}
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
                }}
              >
                {(order.items || []).map((item, index) => (
                  <span
                    key={`${order.id}-${String(item?.product?.name || "item")}-${index}`}
                    style={infoChipStyle}
                  >
                    <Package size={13} />
                    {`${item.quantity}x ${item?.product?.name || "Produto"}`}
                  </span>
                ))}
              </div>

              {isExpanded && isDelivery ? (
                <div
                  style={{
                    marginTop: "0.25rem",
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
                        background: "linear-gradient(135deg, #f59e0b, #d97706)",
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
                    {getStatusValueIcon(order.status)}
                    {String(order.status).replace(/_/g, " ")}
                  </span>
                </h4>

                <S.ButtonGroup>
                  {getAvailableStatusesByOrderType(order.type).map((status) => (
                    <button
                      key={status}
                      className={`btn ${order.status === status ? `active-${String(status).toLowerCase()}` : ""}`}
                      disabled={
                        String(status).toUpperCase() === "ENTREGUE" &&
                        deliveryBlockedUntilPaid
                      }
                      title={
                        String(status).toUpperCase() === "ENTREGUE" &&
                        deliveryBlockedUntilPaid
                          ? "Confirme o pagamento antes de marcar como entregue"
                          : ""
                      }
                      onClick={() => onUpdateStatus(order.id, status)}
                    >
                      {String(status).replace(/_/g, " ")}
                    </button>
                  ))}
                </S.ButtonGroup>
              </S.StatusBox>
            </S.OrderCard>
          );
        })}
      </S.OrdersGrid>
    </div>
  );
}
