import * as S from "../Admin.styles";
import type { AdminOrder, AdminProduct } from "../types";
import { calculateOverviewMetrics } from "../domain/adminOverview";

type AdminOverviewProps = {
  orders: AdminOrder[];
  products: AdminProduct[];
  money: (value: number) => string;
};

export function AdminOverview({ orders, products, money }: AdminOverviewProps) {
  const metrics = calculateOverviewMetrics(orders);

  return (
    <>
      <S.Metrics>
        <S.Metric><span>Vendas de hoje</span><b>{money(metrics.sales)}</b><small>Dados reais de hoje</small></S.Metric>
        <S.Metric><span>Pedidos</span><b>{metrics.todayOrders.length}</b><small>{metrics.preparingOrders} em preparo</small></S.Metric>
        <S.Metric><span>Ticket médio</span><b>{money(metrics.averageTicket)}</b><small>Hoje</small></S.Metric>
        <S.Metric><span>Clientes ativos</span><b>{metrics.customers.length}</b><small>Com pedidos registrados</small></S.Metric>
      </S.Metrics>
      <S.AdminGrid>
        <S.Card>
          <h2>Pedidos recentes</h2>
          <S.DataList>
            {orders.slice(0, 5).map((order) => (
              <div className="data-row" key={order.numericId}>
                <div><b>{order.id} • {order.customerName}</b><span>{order.status.replaceAll("_", " ")}</span></div>
                <strong>{money(order.total)}</strong>
              </div>
            ))}
          </S.DataList>
        </S.Card>
        <S.Card>
          <h2>Produtos disponíveis</h2>
          <S.DataList>
            {products.filter((product) => product.active).slice(0, 5).map((product) => (
              <div className="data-row" key={product.id}>
                {product.image && <img src={product.image} alt="" />}
                <div><b>{product.name}</b><span>{product.category}</span></div>
                <strong>{money(product.price)}</strong>
              </div>
            ))}
          </S.DataList>
        </S.Card>
      </S.AdminGrid>
    </>
  );
}
