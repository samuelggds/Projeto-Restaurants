import { useMemo, useState } from "react";
import * as S from "../Admin.styles";
import type { AdminOrder } from "../types";
import { filterAdminOrders, getNextOrderStatuses, ORDER_STATUSES } from "../domain/adminOrders";

type AdminOrdersProps = {
  orders: AdminOrder[];
  money: (value: number) => string;
  onUpdateStatus: (id: number, status: string) => Promise<void>;
  onConfirmPayment: (id: number) => Promise<void>;
};

export function AdminOrders({ orders, money, onUpdateStatus, onConfirmPayment }: AdminOrdersProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const visibleOrders = useMemo(() => filterAdminOrders(orders, search, status), [orders, search, status]);

  return (
    <S.Card>
      <S.Toolbar>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pedido ou cliente" />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos os status</option>
          {ORDER_STATUSES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select>
      </S.Toolbar>
      <S.DataList>
        {visibleOrders.map((order) => (
          <div className="data-row" key={order.numericId}>
            <div>
              <b>{order.id} • {order.customerName}</b>
              <span>
                {order.status.replaceAll("_", " ")} • {order.paid ? "Pago" : "Não pago"}
                {order.payOnDelivery ? ` • Pagar na entrega (${order.payOnDeliveryMethod || order.paymentMethod})` : ""}
              </span>
            </div>
            <strong>{money(order.total)}</strong>
            {!order.paid && order.payOnDelivery && (
              <button type="button" onClick={() => void onConfirmPayment(order.numericId)}>Confirmar pagamento</button>
            )}
            <select value={order.status} aria-label={`Status do pedido ${order.id}`} onChange={(event) => void onUpdateStatus(order.numericId, event.target.value)}>
              <option value={order.status}>{order.status.replaceAll("_", " ")}</option>
              {getNextOrderStatuses(order.status).map((nextStatus) => <option key={nextStatus} value={nextStatus}>{nextStatus.replaceAll("_", " ")}</option>)}
            </select>
          </div>
        ))}
      </S.DataList>
    </S.Card>
  );
}
