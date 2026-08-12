import { useMemo, useState } from "react";
import { Activity, ChevronDown, ChevronLeft, ChevronRight, Search, Undo2 } from "lucide-react";
import { useAppDialog } from "../../../components/AppDialog/context";
import * as S from "../Admin.styles";
import type { AdminOrder } from "../types";
import { filterAdminOrders, ORDER_STATUSES } from "../domain/adminOrders";

type AdminOrdersProps = {
  orders: AdminOrder[];
  money: (value: number) => string;
  onConfirmPayment: (id: number) => Promise<void>;
  onCancelOrder: (id: number) => Promise<void>;
};

const statusLabels: Record<string, string> = {
  PENDENTE: "Pendente",
  PREPARANDO: "Em preparo",
  PRONTO: "Pronto",
  SAIU_PARA_ENTREGA: "Saiu para entrega",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

const PAGE_SIZE = 5;

export function AdminOrders({ orders, money, onConfirmPayment, onCancelOrder }: AdminOrdersProps) {
  const { confirmDialog } = useAppDialog();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const visibleOrders = useMemo(
    () => filterAdminOrders(orders, search, status),
    [orders, search, status],
  );
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageOrders = visibleOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const updateStatus = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  return (
    <S.Card>
      <S.OrdersToolbar>
        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Buscar pedido ou cliente"
          />
        </label>
        <label className="status-filter">
          <select
            value={status}
            onChange={(event) => updateStatus(event.target.value)}
            aria-label="Filtrar pedidos por status"
          >
            <option value="">Todos os status</option>
            {ORDER_STATUSES.map((item) => (
              <option key={item} value={item}>{statusLabels[item]}</option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>
        <span className="live-status">
          <Activity size={15} aria-hidden="true" />
          Tempo real
        </span>
      </S.OrdersToolbar>
      <S.OrdersList>
        {pageOrders.map((order) => (
          <div className="data-row" key={order.numericId}>
            <div className="order-identity">
              <b>{order.id} • {order.customerName}</b>
              <span>
                {order.paid ? "Pago" : "Não pago"}
                {order.payOnDelivery
                  ? ` • Pagar na entrega (${order.payOnDeliveryMethod || order.paymentMethod})`
                  : ""}
              </span>
            </div>
            <strong>{money(order.total)}</strong>
            {!order.paid && order.payOnDelivery && (
              <button type="button" onClick={() => void onConfirmPayment(order.numericId)}>
                Confirmar pagamento
              </button>
            )}
            {order.status !== "CANCELADO" && order.status !== "ENTREGUE" && (
              <button
                className="cancel-order"
                type="button"
                onClick={async () => {
                  const hasOnlinePaymentToRefund = order.paid && !order.payOnDelivery;
                  const paidMessage = hasOnlinePaymentToRefund
                    ? "O pagamento será estornado automaticamente antes do cancelamento."
                    : order.paid
                      ? "Este pagamento foi confirmado na entrega e não possui transação online para estorno automático. O pedido será cancelado."
                      : "Como este pedido ainda não foi pago, ele será apenas cancelado.";
                  const confirmed = await confirmDialog({
                    title: hasOnlinePaymentToRefund
                      ? `Cancelar e estornar ${order.id}?`
                      : `Cancelar ${order.id}?`,
                    description: paidMessage,
                    confirmLabel: hasOnlinePaymentToRefund
                      ? "Cancelar e estornar"
                      : "Cancelar pedido",
                    cancelLabel: "Manter pedido",
                    tone: "danger",
                  });
                  if (!confirmed) return;
                  setCancellingOrderId(order.numericId);
                  try {
                    await onCancelOrder(order.numericId);
                  } finally {
                    setCancellingOrderId(null);
                  }
                }}
                disabled={cancellingOrderId === order.numericId}
              >
                <Undo2 size={14} aria-hidden="true" />
                {cancellingOrderId === order.numericId
                  ? "Processando..."
                  : order.paid && !order.payOnDelivery
                    ? "Cancelar e estornar"
                    : "Cancelar pedido"}
              </button>
            )}
            <span className={`order-status status-${order.status.toLowerCase()}`}>
              <i aria-hidden="true" />
              {statusLabels[order.status] ?? order.status.replaceAll("_", " ")}
            </span>
          </div>
        ))}
      </S.OrdersList>
      <S.OrdersPagination>
        <span>
          {visibleOrders.length === 0
            ? "Nenhum pedido encontrado"
            : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, visibleOrders.length)} de ${visibleOrders.length}`}
        </span>
        <div>
          <button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            <ChevronLeft size={16} /> Voltar 5
          </button>
          <b>Página {currentPage} de {totalPages}</b>
          <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
            Próximos 5 <ChevronRight size={16} />
          </button>
        </div>
      </S.OrdersPagination>
    </S.Card>
  );
}
