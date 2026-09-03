import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, Search } from 'lucide-react';
import * as S from '../Admin.styles';
import type { AdminOrder, AdminProduct } from '../types';
import { calculateOverviewMetrics } from '../domain/adminOverview';

type AdminOverviewProps = {
  orders: AdminOrder[];
  products: AdminProduct[];
  money: (value: number) => string;
};

const LIST_BATCH_SIZE = 10;

export function AdminOverview({ orders, products, money }: AdminOverviewProps) {
  const metrics = calculateOverviewMetrics(orders);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('ALL');
  const [visibleOrderLimit, setVisibleOrderLimit] = useState(LIST_BATCH_SIZE);
  const [productSearch, setProductSearch] = useState('');
  const [productStatus, setProductStatus] = useState('AVAILABLE');
  const [visibleProductLimit, setVisibleProductLimit] = useState(LIST_BATCH_SIZE);
  const normalize = (value: unknown) =>
    String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  const orderStatuses = useMemo(() => [...new Set(orders.map((order) => order.status))], [orders]);
  const filteredOrders = useMemo(() => {
    const query = normalize(orderSearch).replace(/^#/, '');
    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        normalize(order.numericId).includes(query) ||
        normalize(order.id).replace(/^#/, '').includes(query) ||
        normalize(order.customerName).includes(query);
      return matchesSearch && (orderStatus === 'ALL' || order.status === orderStatus);
    });
  }, [orders, orderSearch, orderStatus]);
  const filteredProducts = useMemo(() => {
    const query = normalize(productSearch).replace(/^#/, '');
    return products.filter((product) => {
      const matchesSearch =
        !query ||
        normalize(product.id).replace(/^#/, '').includes(query) ||
        normalize(product.name).includes(query);
      const matchesStatus =
        productStatus === 'ALL' ||
        (productStatus === 'AVAILABLE' ? product.active : !product.active);
      return matchesSearch && matchesStatus;
    });
  }, [products, productSearch, productStatus]);
  const visibleOrders = filteredOrders.slice(0, visibleOrderLimit);
  const visibleProducts = filteredProducts.slice(0, visibleProductLimit);

  return (
    <>
      <S.Metrics>
        <S.Metric>
          <span>Vendas de hoje</span>
          <b>{money(metrics.sales)}</b>
          <small>Dados reais de hoje</small>
        </S.Metric>
        <S.Metric>
          <span>Pedidos</span>
          <b>{metrics.todayOrders.length}</b>
          <small>{metrics.preparingOrders} em preparo</small>
        </S.Metric>
        <S.Metric>
          <span>Ticket médio</span>
          <b>{money(metrics.averageTicket)}</b>
          <small>Hoje</small>
        </S.Metric>
        <S.Metric>
          <span>Clientes ativos</span>
          <b>{metrics.customers.length}</b>
          <small>Com pedidos registrados</small>
        </S.Metric>
      </S.Metrics>
      <S.AdminGrid>
        <S.Card>
          <h2>Pedidos recentes</h2>
          <S.OverviewFilters>
            <label>
              <Search />
              <input
                value={orderSearch}
                onChange={(event) => {
                  setOrderSearch(event.target.value);
                  setVisibleOrderLimit(LIST_BATCH_SIZE);
                }}
                placeholder="Buscar por ID ou cliente"
              />
            </label>
            <select
              aria-label="Filtrar pedidos por status"
              value={orderStatus}
              onChange={(event) => {
                setOrderStatus(event.target.value);
                setVisibleOrderLimit(LIST_BATCH_SIZE);
              }}
            >
              <option value="ALL">Todos os status</option>
              {orderStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </S.OverviewFilters>
          <S.DataList>
            {visibleOrders.map((order) => (
              <div className="data-row" key={order.numericId}>
                <div>
                  <b>
                    {order.id} • {order.customerName}
                  </b>
                  <span>{order.status.replaceAll('_', ' ')}</span>
                </div>
                <strong>{money(order.total)}</strong>
              </div>
            ))}
            {!visibleOrders.length && <S.OverviewEmpty>Nenhum pedido encontrado.</S.OverviewEmpty>}
          </S.DataList>
          <S.OverviewPagination>
            <span>
              {filteredOrders.length
                ? `Exibindo ${visibleOrders.length} de ${filteredOrders.length}`
                : '0 resultados'}
            </span>
            <div>
              {visibleOrderLimit > LIST_BATCH_SIZE ? (
                <button
                  type="button"
                  aria-label="Voltar aos 10 pedidos recentes iniciais"
                  onClick={() => setVisibleOrderLimit(LIST_BATCH_SIZE)}
                >
                  <ChevronLeft /> Voltar aos 10
                </button>
              ) : null}
              {visibleOrders.length < filteredOrders.length ? (
                <button
                  type="button"
                  aria-label="Mostrar mais 10 pedidos recentes"
                  onClick={() =>
                    setVisibleOrderLimit((current) =>
                      Math.min(current + LIST_BATCH_SIZE, filteredOrders.length),
                    )
                  }
                >
                  Mostrar mais 10 <ChevronDown />
                </button>
              ) : null}
            </div>
          </S.OverviewPagination>
        </S.Card>
        <S.Card>
          <h2>Produtos disponíveis</h2>
          <S.OverviewFilters>
            <label>
              <Search />
              <input
                value={productSearch}
                onChange={(event) => {
                  setProductSearch(event.target.value);
                  setVisibleProductLimit(LIST_BATCH_SIZE);
                }}
                placeholder="Buscar por ID ou produto"
              />
            </label>
            <select
              aria-label="Filtrar produtos por disponibilidade"
              value={productStatus}
              onChange={(event) => {
                setProductStatus(event.target.value);
                setVisibleProductLimit(LIST_BATCH_SIZE);
              }}
            >
              <option value="ALL">Todos</option>
              <option value="AVAILABLE">Disponíveis</option>
              <option value="UNAVAILABLE">Indisponíveis</option>
            </select>
          </S.OverviewFilters>
          <S.DataList>
            {visibleProducts.map((product) => (
              <div className="data-row" key={product.id}>
                {product.image && <img src={product.image} alt="" />}
                <div>
                  <b>{product.name}</b>
                  <span>{product.category}</span>
                </div>
                <strong>{money(product.price)}</strong>
              </div>
            ))}
            {!visibleProducts.length && (
              <S.OverviewEmpty>Nenhum produto encontrado.</S.OverviewEmpty>
            )}
          </S.DataList>
          <S.OverviewPagination>
            <span>
              {filteredProducts.length
                ? `Exibindo ${visibleProducts.length} de ${filteredProducts.length}`
                : '0 resultados'}
            </span>
            <div>
              {visibleProductLimit > LIST_BATCH_SIZE ? (
                <button
                  type="button"
                  aria-label="Voltar aos 10 produtos iniciais"
                  onClick={() => setVisibleProductLimit(LIST_BATCH_SIZE)}
                >
                  <ChevronLeft /> Voltar aos 10
                </button>
              ) : null}
              {visibleProducts.length < filteredProducts.length ? (
                <button
                  type="button"
                  aria-label="Mostrar mais 10 produtos"
                  onClick={() =>
                    setVisibleProductLimit((current) =>
                      Math.min(current + LIST_BATCH_SIZE, filteredProducts.length),
                    )
                  }
                >
                  Mostrar mais 10 <ChevronDown />
                </button>
              ) : null}
            </div>
          </S.OverviewPagination>
        </S.Card>
      </S.AdminGrid>
    </>
  );
}
