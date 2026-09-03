import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  CircleOff,
  Clock3,
  PackageCheck,
  ReceiptText,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  UtensilsCrossed,
  WalletCards,
} from 'lucide-react';
import * as S from './AdminOverview.styles';
import type { AdminOrder, AdminProduct } from '../types';
import { calculateOverviewMetrics } from '../domain/adminOverview';

type OverviewDestination = 'orders' | 'catalog' | 'customers';

type AdminOverviewProps = {
  orders: AdminOrder[];
  products: AdminProduct[];
  restaurantName: string;
  money: (value: number) => string;
  onNavigate: (destination: OverviewDestination) => void;
};

type StatusTone = 'warning' | 'info' | 'success' | 'danger' | 'neutral';

const LIST_BATCH_SIZE = 10;
const orderStatusCopy: Record<string, { label: string; tone: StatusTone }> = {
  PENDENTE: { label: 'Pendente', tone: 'warning' },
  CONFIRMADO: { label: 'Confirmado', tone: 'info' },
  PREPARANDO: { label: 'Em preparo', tone: 'info' },
  PRONTO: { label: 'Pronto', tone: 'success' },
  SAIU_PARA_ENTREGA: { label: 'Em entrega', tone: 'info' },
  ENTREGUE: { label: 'Entregue', tone: 'success' },
  CANCELADO: { label: 'Cancelado', tone: 'danger' },
};

const normalize = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

function formatStatus(status: string) {
  return (
    orderStatusCopy[status] ?? {
      label: status.replaceAll('_', ' ').toLocaleLowerCase('pt-BR'),
      tone: 'neutral' as const,
    }
  );
}

function formatOrderType(type?: string) {
  const normalized = String(type || '').toUpperCase();
  if (normalized === 'DELIVERY') return 'Delivery';
  if (normalized === 'MESA' || normalized === 'TABLE') return 'Mesa';
  if (normalized === 'RETIRADA' || normalized === 'PICKUP') return 'Retirada';
  return 'Pedido';
}

function getTodayLabel() {
  const value = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());
  return value.charAt(0).toLocaleUpperCase('pt-BR') + value.slice(1);
}

export function AdminOverview({
  orders,
  products,
  restaurantName,
  money,
  onNavigate,
}: AdminOverviewProps) {
  const metrics = calculateOverviewMetrics(orders);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('ALL');
  const [visibleOrderLimit, setVisibleOrderLimit] = useState(LIST_BATCH_SIZE);
  const [productSearch, setProductSearch] = useState('');
  const [productStatus, setProductStatus] = useState('AVAILABLE');
  const [visibleProductLimit, setVisibleProductLimit] = useState(LIST_BATCH_SIZE);
  const orderStatuses = useMemo(() => [...new Set(orders.map((order) => order.status))], [orders]);
  const availableProducts = useMemo(
    () => products.filter((product) => product.active !== false),
    [products],
  );
  const unavailableProducts = products.length - availableProducts.length;
  const productAvailability = products.length
    ? Math.round((availableProducts.length / products.length) * 100)
    : 0;
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
      const available = product.active !== false;
      const matchesSearch =
        !query ||
        normalize(product.id).replace(/^#/, '').includes(query) ||
        normalize(product.name).includes(query);
      const matchesStatus =
        productStatus === 'ALL' || (productStatus === 'AVAILABLE' ? available : !available);
      return matchesSearch && matchesStatus;
    });
  }, [products, productSearch, productStatus]);
  const visibleOrders = filteredOrders.slice(0, visibleOrderLimit);
  const visibleProducts = filteredProducts.slice(0, visibleProductLimit);
  const hasActiveOperation = metrics.todayOrders.length > 0 || metrics.preparingOrders > 0;

  const clearOrderFilters = () => {
    setOrderSearch('');
    setOrderStatus('ALL');
    setVisibleOrderLimit(LIST_BATCH_SIZE);
  };
  const clearProductFilters = () => {
    setProductSearch('');
    setProductStatus('AVAILABLE');
    setVisibleProductLimit(LIST_BATCH_SIZE);
  };

  return (
    <S.OverviewRoot>
      <S.Hero aria-labelledby="overview-summary-title">
        <S.HeroCopy>
          <span className="eyebrow">
            <Sparkles aria-hidden="true" /> Resumo de hoje
          </span>
          <h2 id="overview-summary-title">
            {hasActiveOperation
              ? 'Sua operação, em um só olhar'
              : 'Tudo pronto para os próximos pedidos'}
          </h2>
          <p>
            {hasActiveOperation
              ? 'Acompanhe o movimento do restaurante e vá direto ao que precisa de atenção.'
              : 'Assim que um novo pedido chegar, os principais números aparecerão aqui.'}
          </p>
          <div className="hero-status" aria-label="Situação atual da operação">
            <span>
              <ShoppingBag aria-hidden="true" /> {metrics.todayOrders.length}{' '}
              {metrics.todayOrders.length === 1 ? 'pedido hoje' : 'pedidos hoje'}
            </span>
            <span>
              <Clock3 aria-hidden="true" /> {metrics.preparingOrders} em preparo
            </span>
            <span>
              <PackageCheck aria-hidden="true" /> {availableProducts.length} disponíveis
            </span>
          </div>
        </S.HeroCopy>
        <S.HeroAside>
          <small>{getTodayLabel()}</small>
          <strong>{restaurantName}</strong>
          <div>
            <button type="button" className="primary" onClick={() => onNavigate('orders')}>
              Acompanhar pedidos <ArrowRight aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onNavigate('catalog')}>
              Gerenciar cardápio
            </button>
          </div>
        </S.HeroAside>
      </S.Hero>

      <S.Metrics aria-label="Indicadores de hoje">
        <S.Metric>
          <span className="metric-icon sales" aria-hidden="true">
            <WalletCards />
          </span>
          <span className="metric-copy">
            <small>Vendas de hoje</small>
            <strong>{money(metrics.sales)}</strong>
            <em>Pedidos não cancelados</em>
          </span>
        </S.Metric>
        <S.Metric>
          <span className="metric-icon orders" aria-hidden="true">
            <ShoppingBag />
          </span>
          <span className="metric-copy">
            <small>Pedidos hoje</small>
            <strong>{metrics.todayOrders.length}</strong>
            <em>{metrics.preparingOrders} em preparo agora</em>
          </span>
        </S.Metric>
        <S.Metric>
          <span className="metric-icon ticket" aria-hidden="true">
            <ReceiptText />
          </span>
          <span className="metric-copy">
            <small>Ticket médio</small>
            <strong>{money(metrics.averageTicket)}</strong>
            <em>{metrics.todayOrders.length ? 'Média das vendas de hoje' : 'Aguardando vendas'}</em>
          </span>
        </S.Metric>
        <S.Metric>
          <span className="metric-icon customers" aria-hidden="true">
            <Users />
          </span>
          <span className="metric-copy">
            <small>Clientes ativos</small>
            <strong>{metrics.customers.length}</strong>
            <button type="button" onClick={() => onNavigate('customers')}>
              Ver clientes <ArrowRight aria-hidden="true" />
            </button>
          </span>
        </S.Metric>
      </S.Metrics>

      <S.AdminGrid>
        <S.Panel>
          <S.PanelHeader>
            <div>
              <span className="section-icon orders" aria-hidden="true">
                <ShoppingBag />
              </span>
              <span>
                <small>Movimento recente</small>
                <h2>Pedidos</h2>
              </span>
            </div>
            <button type="button" onClick={() => onNavigate('orders')}>
              Ver todos <ArrowRight aria-hidden="true" />
            </button>
          </S.PanelHeader>
          <S.PanelDescription>
            Consulte rapidamente os pedidos mais recentes e o andamento de cada um.
          </S.PanelDescription>
          <S.OverviewFilters>
            <label>
              <span className="sr-only">Buscar pedido</span>
              <Search aria-hidden="true" />
              <input
                aria-label="Buscar por ID ou cliente"
                value={orderSearch}
                onChange={(event) => {
                  setOrderSearch(event.target.value);
                  setVisibleOrderLimit(LIST_BATCH_SIZE);
                }}
                placeholder="Buscar por ID ou cliente"
              />
            </label>
            <label className="select-field">
              <span className="sr-only">Status do pedido</span>
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
                    {formatStatus(status).label}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" />
            </label>
          </S.OverviewFilters>
          <S.DataList aria-live="polite">
            {visibleOrders.map((order) => {
              const status = formatStatus(order.status);
              return (
                <div className="data-row order-row" key={order.numericId}>
                  <span className={`order-mark ${status.tone}`} aria-hidden="true">
                    <ShoppingBag />
                  </span>
                  <div className="row-copy">
                    <b>
                      {order.id} <span>•</span> {order.customerName}
                    </b>
                    <small>
                      {formatOrderType(order.type)}
                      {order.paymentMethod ? ` • ${order.paymentMethod.replaceAll('_', ' ')}` : ''}
                    </small>
                  </div>
                  <div className="row-result">
                    <strong>{money(order.total)}</strong>
                    <S.StatusBadge $tone={status.tone}>{status.label}</S.StatusBadge>
                  </div>
                </div>
              );
            })}
            {!visibleOrders.length && (
              <S.OverviewEmpty>
                <span aria-hidden="true">
                  <Search />
                </span>
                <strong>Nenhum pedido encontrado</strong>
                <p>Tente outro termo ou limpe os filtros aplicados.</p>
                {(orderSearch || orderStatus !== 'ALL') && (
                  <button type="button" onClick={clearOrderFilters}>
                    Limpar filtros
                  </button>
                )}
              </S.OverviewEmpty>
            )}
          </S.DataList>
          <S.OverviewPagination>
            <span>
              {filteredOrders.length
                ? `${visibleOrders.length} de ${filteredOrders.length} pedidos`
                : '0 resultados'}
            </span>
            <div>
              {visibleOrderLimit > LIST_BATCH_SIZE ? (
                <button
                  type="button"
                  aria-label="Voltar aos 10 pedidos recentes iniciais"
                  onClick={() => setVisibleOrderLimit(LIST_BATCH_SIZE)}
                >
                  <ChevronLeft aria-hidden="true" /> Voltar aos 10
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
                  Mostrar mais 10 <ChevronDown aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </S.OverviewPagination>
        </S.Panel>

        <S.Panel>
          <S.PanelHeader>
            <div>
              <span className="section-icon catalog" aria-hidden="true">
                <UtensilsCrossed />
              </span>
              <span>
                <small>Saúde do cardápio</small>
                <h2>Produtos</h2>
              </span>
            </div>
            <button type="button" onClick={() => onNavigate('catalog')}>
              Gerenciar <ArrowRight aria-hidden="true" />
            </button>
          </S.PanelHeader>
          <S.CatalogHealth>
            <div>
              <span>
                <strong>{availableProducts.length}</strong> disponíveis
              </span>
              <span>
                <strong>{unavailableProducts}</strong> indisponíveis
              </span>
            </div>
            <S.HealthTrack
              role="progressbar"
              aria-label="Produtos disponíveis no cardápio"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={productAvailability}
            >
              <span style={{ width: `${productAvailability}%` }} />
            </S.HealthTrack>
            <small>{productAvailability}% do cardápio disponível para venda</small>
          </S.CatalogHealth>
          <S.OverviewFilters>
            <label>
              <span className="sr-only">Buscar produto</span>
              <Search aria-hidden="true" />
              <input
                aria-label="Buscar por ID ou produto"
                value={productSearch}
                onChange={(event) => {
                  setProductSearch(event.target.value);
                  setVisibleProductLimit(LIST_BATCH_SIZE);
                }}
                placeholder="Buscar produto"
              />
            </label>
            <label className="select-field compact">
              <span className="sr-only">Disponibilidade do produto</span>
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
              <ChevronDown aria-hidden="true" />
            </label>
          </S.OverviewFilters>
          <S.DataList aria-live="polite">
            {visibleProducts.map((product) => {
              const available = product.active !== false;
              return (
                <div className="data-row product-row" key={product.id}>
                  {product.image ? (
                    <img src={product.image} alt={`Foto de ${product.name}`} />
                  ) : (
                    <span className="product-placeholder" aria-hidden="true">
                      <UtensilsCrossed />
                    </span>
                  )}
                  <div className="row-copy">
                    <b>{product.name}</b>
                    <small>{product.category}</small>
                  </div>
                  <div className="row-result">
                    <strong>{money(product.price)}</strong>
                    <S.StatusBadge $tone={available ? 'success' : 'neutral'}>
                      {available ? 'Disponível' : 'Indisponível'}
                    </S.StatusBadge>
                  </div>
                </div>
              );
            })}
            {!visibleProducts.length && (
              <S.OverviewEmpty>
                <span aria-hidden="true">{products.length ? <Search /> : <CircleOff />}</span>
                <strong>{products.length ? 'Nenhum produto encontrado' : 'Cardápio vazio'}</strong>
                <p>
                  {products.length
                    ? 'Tente outro termo ou altere a disponibilidade.'
                    : 'Cadastre seu primeiro produto para começar a vender.'}
                </p>
                {products.length ? (
                  <button type="button" onClick={clearProductFilters}>
                    Limpar filtros
                  </button>
                ) : (
                  <button type="button" onClick={() => onNavigate('catalog')}>
                    Abrir cardápio <ArrowRight aria-hidden="true" />
                  </button>
                )}
              </S.OverviewEmpty>
            )}
          </S.DataList>
          <S.OverviewPagination>
            <span>
              {filteredProducts.length
                ? `${visibleProducts.length} de ${filteredProducts.length} produtos`
                : '0 resultados'}
            </span>
            <div>
              {visibleProductLimit > LIST_BATCH_SIZE ? (
                <button
                  type="button"
                  aria-label="Voltar aos 10 produtos iniciais"
                  onClick={() => setVisibleProductLimit(LIST_BATCH_SIZE)}
                >
                  <ChevronLeft aria-hidden="true" /> Voltar aos 10
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
                  Mostrar mais 10 <ChevronDown aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </S.OverviewPagination>
        </S.Panel>
      </S.AdminGrid>

      <S.BottomInsight>
        <span aria-hidden="true">
          <TrendingUp />
        </span>
        <div>
          <small>Próximo passo recomendado</small>
          <strong>
            {unavailableProducts > 0
              ? `Revise ${unavailableProducts} ${unavailableProducts === 1 ? 'produto indisponível' : 'produtos indisponíveis'}`
              : 'Seu cardápio está totalmente disponível'}
          </strong>
          <p>
            {unavailableProducts > 0
              ? 'Confirme estoque e disponibilidade para não perder oportunidades de venda.'
              : 'Continue acompanhando pedidos e estoque para manter a operação fluindo.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate(unavailableProducts ? 'catalog' : 'orders')}
        >
          {unavailableProducts ? 'Revisar cardápio' : 'Ver pedidos'}
          <ArrowRight aria-hidden="true" />
        </button>
      </S.BottomInsight>
    </S.OverviewRoot>
  );
}
