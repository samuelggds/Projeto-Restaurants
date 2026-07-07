import type { ReactElement } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  CreditCard,
  DoorOpen,
  Package,
  Table2,
  Truck,
  User,
  X,
  ChefHat,
} from "lucide-react";
import * as S from "../styles";

type OrderItem = {
  quantity?: number;
  product?: {
    name?: string;
  };
};

type Order = {
  id: number;
  type?: string;
  total?: number;
  status?: string;
  paid?: boolean;
  observation?: string;
  items?: OrderItem[];
  address?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  complement?: string;
  table?: { number?: number };
  tableId?: number;
};

type OrdersTabProps = {
  filteredOrders: Order[];
  statusCounters: Record<string, number>;
  orderTypeFilter: string;
  orders: Order[];
  statusFilter: string;
  isDarkMode: boolean;
  closingOrderIds: number[];
  expandedOrderIds: Record<number, boolean>;
  pinInputByOrderId: Record<number, string>;
  requestingPinOrderIds: number[];
  confirmingPinOrderIds: number[];
  paymentPinToolsEnabled: boolean;
  closableOrderStatuses: string[];
  orderStatusMeta: Record<string, { label: string; color: string }>;
  onSetOrderTypeFilter: (value: string) => void;
  onSetStatusFilter: (value: string) => void;
  onToggleOrderExpanded: (orderId: number) => void;
  onCloseCompletedOrder: (orderId: number) => void;
  onSetPinInputByOrderId: (
    updater: (prev: Record<number, string>) => Record<number, string>,
  ) => void;
  onRequestPaymentPin: (order: Order) => void;
  onConfirmPaymentWithPin: (order: Order) => void;
  onUpdateStatus: (order: Order, nextStatus: string) => void;
  getPaymentSummaryLabel: (order?: unknown) => string;
  getDeliveryAddressLabel: (order: Order) => string | null;
  isPendingDigitalPayment: (order: Order) => boolean;
  isDeliveryBlockedUntilPaid: (order: Order) => boolean;
  getOrderTableLabel: (order: Order) => string | null;
  getStatusChipStyle: (status?: string) => {
    display: string;
    alignItems: string;
    gap: number;
    fontSize: number;
    color: string;
    background: string;
    border: string;
    borderRadius: number;
    padding: string;
  };
  getStatusValueIcon: (status?: string) => ReactElement;
  getOrderTypeDisplayLabel: (orderType?: string) => string;
};

export default function OrdersTab({
  filteredOrders,
  statusCounters,
  orderTypeFilter,
  orders,
  statusFilter,
  isDarkMode,
  closingOrderIds,
  expandedOrderIds,
  pinInputByOrderId,
  requestingPinOrderIds,
  confirmingPinOrderIds,
  paymentPinToolsEnabled,
  closableOrderStatuses,
  orderStatusMeta,
  onSetOrderTypeFilter,
  onSetStatusFilter,
  onToggleOrderExpanded,
  onCloseCompletedOrder,
  onSetPinInputByOrderId,
  onRequestPaymentPin,
  onConfirmPaymentWithPin,
  onUpdateStatus,
  getPaymentSummaryLabel,
  getDeliveryAddressLabel,
  isPendingDigitalPayment,
  isDeliveryBlockedUntilPaid,
  getOrderTableLabel,
  getStatusChipStyle,
  getStatusValueIcon,
  getOrderTypeDisplayLabel,
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
            {filteredOrders.length}
          </span>
        </h2>
        <p>Painel operacional no estilo motoqueiro com fluxo completo.</p>
      </S.PageHeader>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "0.65rem",
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
            <Package size={18} /> {statusCounters.PRONTO}
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
            <Truck size={18} /> {statusCounters.SAIU_PARA_ENTREGA}
          </div>
        </S.FormCard>
        <S.FormCard style={{ padding: "0.9rem 1rem", maxWidth: "none" }}>
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
                  if (item.key === "DELIVERY") return type.includes("DELIVERY");
                  if (item.key === "RETIRADA") return type === "RETIRADA";
                  return true;
                }).length;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSetOrderTypeFilter(item.key)}
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
                color: active ? "#ffffff" : isDarkMode ? "#e2e8f0" : "#0f172a",
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
            onClick={() => onSetStatusFilter(status.key)}
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
              paymentPinToolsEnabled && isPendingDigitalPayment(order);
            const deliveryBlockedUntilPaid = isDeliveryBlockedUntilPaid(order);
            const pinInput = String(pinInputByOrderId[order.id] || "");
            const isRequestingPin = requestingPinOrderIds.includes(order.id);
            const isConfirmingPin = confirmingPinOrderIds.includes(order.id);
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

                    {closableOrderStatuses.includes(String(order.status)) && (
                      <S.CloseCompletedButton
                        type="button"
                        onClick={() => onCloseCompletedOrder(order.id)}
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
                    opacity: isExpanded ? 1 : 0.82,
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
                      Pagamento digital pendente. Solicite e confirme o PIN
                      antes de concluir a entrega.
                    </small>

                    <button
                      type="button"
                      className="btn active-entrega"
                      style={{ width: "100%", padding: "0.56rem" }}
                      onClick={() => onRequestPaymentPin(order)}
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
                          onSetPinInputByOrderId((prev) => ({
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
                        className="btn active-pronto"
                        style={{
                          minHeight: 38,
                          padding: "0 0.9rem",
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => onConfirmPaymentWithPin(order)}
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
                        onClick={() => onUpdateStatus(order, "PREPARANDO")}
                      >
                        <ChefHat size={18} style={{ marginRight: 6 }} /> Aceitar
                        & Preparar
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
                        onClick={() => onUpdateStatus(order, "PRONTO")}
                      >
                        <CheckCircle2 size={18} style={{ marginRight: 6 }} />{" "}
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
                          onUpdateStatus(
                            order,
                            isDelivery ? "SAIU_PARA_ENTREGA" : "ENTREGUE",
                          )
                        }
                      >
                        {isDelivery ? (
                          <>
                            <Truck size={18} style={{ marginRight: 6 }} />{" "}
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
                        onClick={() => onUpdateStatus(order, "ENTREGUE")}
                        disabled={deliveryBlockedUntilPaid}
                        title={
                          deliveryBlockedUntilPaid
                            ? "Confirme o pagamento antes de entregar"
                            : ""
                        }
                      >
                        <CheckCircle2 size={18} style={{ marginRight: 6 }} />{" "}
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
  );
}
