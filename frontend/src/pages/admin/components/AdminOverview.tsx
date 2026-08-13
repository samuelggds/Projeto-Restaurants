import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
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
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("ALL");
  const [orderPage, setOrderPage] = useState(0);
  const [productSearch, setProductSearch] = useState("");
  const [productStatus, setProductStatus] = useState("AVAILABLE");
  const [productPage, setProductPage] = useState(0);
  const pageSize = 5;
  const normalize = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const orderStatuses = useMemo(() => [...new Set(orders.map((order) => order.status))], [orders]);
  const filteredOrders = useMemo(() => {
    const query = normalize(orderSearch).replace(/^#/, "");
    return orders.filter((order) => {
      const matchesSearch = !query || normalize(order.numericId).includes(query) || normalize(order.id).replace(/^#/, "").includes(query) || normalize(order.customerName).includes(query);
      return matchesSearch && (orderStatus === "ALL" || order.status === orderStatus);
    });
  }, [orders, orderSearch, orderStatus]);
  const filteredProducts = useMemo(() => {
    const query = normalize(productSearch).replace(/^#/, "");
    return products.filter((product) => {
      const matchesSearch = !query || normalize(product.id).replace(/^#/, "").includes(query) || normalize(product.name).includes(query);
      const matchesStatus = productStatus === "ALL" || (productStatus === "AVAILABLE" ? product.active : !product.active);
      return matchesSearch && matchesStatus;
    });
  }, [products, productSearch, productStatus]);
  const orderPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const productPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const visibleOrders = filteredOrders.slice(orderPage * pageSize, orderPage * pageSize + pageSize);
  const visibleProducts = filteredProducts.slice(productPage * pageSize, productPage * pageSize + pageSize);

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
          <S.OverviewFilters>
            <label><Search /><input value={orderSearch} onChange={(event) => { setOrderSearch(event.target.value); setOrderPage(0); }} placeholder="Buscar por ID ou cliente" /></label>
            <select aria-label="Filtrar pedidos por status" value={orderStatus} onChange={(event) => { setOrderStatus(event.target.value); setOrderPage(0); }}>
              <option value="ALL">Todos os status</option>
              {orderStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
            </select>
          </S.OverviewFilters>
          <S.DataList>
            {visibleOrders.map((order) => (
              <div className="data-row" key={order.numericId}>
                <div><b>{order.id} • {order.customerName}</b><span>{order.status.replaceAll("_", " ")}</span></div>
                <strong>{money(order.total)}</strong>
              </div>
            ))}
            {!visibleOrders.length && <S.OverviewEmpty>Nenhum pedido encontrado.</S.OverviewEmpty>}
          </S.DataList>
          <S.OverviewPagination>
            <span>{filteredOrders.length ? `${orderPage * pageSize + 1}–${Math.min((orderPage + 1) * pageSize, filteredOrders.length)} de ${filteredOrders.length}` : "0 resultados"}</span>
            <div><button type="button" disabled={orderPage === 0} onClick={() => setOrderPage((page) => Math.max(0, page - 1))}><ChevronLeft /> Voltar 5</button><button type="button" disabled={orderPage + 1 >= orderPages} onClick={() => setOrderPage((page) => Math.min(orderPages - 1, page + 1))}>Próximos 5 <ChevronRight /></button></div>
          </S.OverviewPagination>
        </S.Card>
        <S.Card>
          <h2>Produtos disponíveis</h2>
          <S.OverviewFilters>
            <label><Search /><input value={productSearch} onChange={(event) => { setProductSearch(event.target.value); setProductPage(0); }} placeholder="Buscar por ID ou produto" /></label>
            <select aria-label="Filtrar produtos por disponibilidade" value={productStatus} onChange={(event) => { setProductStatus(event.target.value); setProductPage(0); }}>
              <option value="ALL">Todos</option><option value="AVAILABLE">Disponíveis</option><option value="UNAVAILABLE">Indisponíveis</option>
            </select>
          </S.OverviewFilters>
          <S.DataList>
            {visibleProducts.map((product) => (
              <div className="data-row" key={product.id}>
                {product.image && <img src={product.image} alt="" />}
                <div><b>{product.name}</b><span>{product.category}</span></div>
                <strong>{money(product.price)}</strong>
              </div>
            ))}
            {!visibleProducts.length && <S.OverviewEmpty>Nenhum produto encontrado.</S.OverviewEmpty>}
          </S.DataList>
          <S.OverviewPagination>
            <span>{filteredProducts.length ? `${productPage * pageSize + 1}–${Math.min((productPage + 1) * pageSize, filteredProducts.length)} de ${filteredProducts.length}` : "0 resultados"}</span>
            <div><button type="button" disabled={productPage === 0} onClick={() => setProductPage((page) => Math.max(0, page - 1))}><ChevronLeft /> Voltar 5</button><button type="button" disabled={productPage + 1 >= productPages} onClick={() => setProductPage((page) => Math.min(productPages - 1, page + 1))}>Próximos 5 <ChevronRight /></button></div>
          </S.OverviewPagination>
        </S.Card>
      </S.AdminGrid>
    </>
  );
}
