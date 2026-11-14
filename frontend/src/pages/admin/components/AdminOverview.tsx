import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  CircleOff,
  Clock3,
  ExternalLink,
  Headphones,
  Settings2,
  TicketPercent,
  ReceiptText,
  Search,
  ShoppingBag,
  TrendingUp,
  Users,
  UtensilsCrossed,
  WalletCards,
  CheckCircle2,
  CircleAlert,
  RefreshCw,
  Undo2,
} from 'lucide-react';
import * as S from './AdminOverview.styles';
import type {
  AdminOrder,
  AdminProduct,
  AdminSettings,
  AdminSection,
  SettingsSection,
} from '../types';
import AdminSetupGuide from './AdminSetupGuide';
import { getRestaurantAvailability } from '../domain/businessHours';
import { useRestaurantAvailabilityClock } from '../../Home/hooks/useHomePageRuntime';
import ordersService, { type OrderOverview } from '../../../Services/ordersService';
import { useAdminOrdersPage, type LoadAdminOrdersPage } from '../hooks/useAdminOrdersPage';
import { useAdminOrderCancellation } from '../hooks/useAdminOrderCancellation';
import {
  canCancelAdminOrder,
  getPaymentMethodLabel,
  isOrderWaitingForCapacity,
} from '../domain/adminOrders';

type AdminOverviewProps = {
  orders: AdminOrder[];
  products: AdminProduct[];
  restaurantName: string;
  operationalSettings?: Pick<
    AdminSettings,
    'businessHours' | 'businessHoursConfigured' | 'isOpenForOrders'
  >;
  money: (value: number) => string;
  onNavigate: (destination: AdminSection) => void;
  onOpenSettings?: (section: SettingsSection) => void;
  onViewStore?: () => void;
  onCancelOrder?: (id: number) => Promise<void>;
  loadOrdersPage?: LoadAdminOrdersPage;
  loadOverview?: () => Promise<OrderOverview>;
};
const loadLiveOverview = () => ordersService.getOverview();

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

function paymentMethodForOverview(order: AdminOrder) {
  const method = order.payOnDeliveryMethod || order.paymentMethod;
  if (!method) {
    return order.type === 'RETIRADA' && !order.paid && !order.payOnDelivery
      ? 'Pagamento no balcão'
      : 'Não informado';
  }
  return getPaymentMethodLabel(method);
}

function getTodayLabel(timeZone: string) {
  const value = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone,
  }).format(new Date());
  return value.charAt(0).toLocaleUpperCase('pt-BR') + value.slice(1);
}

export function AdminOverview({
  orders,
  products,
  restaurantName,
  operationalSettings,
  money,
  onNavigate,
  onOpenSettings,
  onViewStore,
  onCancelOrder,
  loadOrdersPage,
  loadOverview = loadLiveOverview,
}: AdminOverviewProps) {
  const availabilityClock = useRestaurantAvailabilityClock();
  const availability = operationalSettings
    ? getRestaurantAvailability(
        operationalSettings.businessHoursConfigured ? operationalSettings.businessHours : undefined,
        operationalSettings.isOpenForOrders,
        availabilityClock,
      )
    : null;
  const [metricsStatus, setMetricsStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [metrics, setMetrics] = useState<OrderOverview>({
    todayOrders: 0,
    sales: 0,
    averageTicket: 0,
    preparingOrders: 0,
    customers: 0,
    timezone: 'America/Sao_Paulo',
  });
  const [metricsError, setMetricsError] = useState('');
  useEffect(() => {
    let active = true;
    loadOverview()
      .then((result) => {
        if (active) {
          setMetrics(result);
          setMetricsError('');
          setMetricsStatus('ready');
        }
      })
      .catch(() => {
        if (active) {
          setMetricsStatus('error');
          setMetricsError('Indicadores indisponíveis. Atualize a página para tentar novamente.');
        }
      });
    return () => {
      active = false;
    };
  }, [orders, loadOverview]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('ALL');
  const orderPage = useAdminOrdersPage({
    search: orderSearch,
    status: orderStatus === 'ALL' ? '' : orderStatus,
    queue: 'ALL',
    refreshSignal: orders,
    loadOrdersPage,
  });
  const { cancelOrder, cancellingOrderId } = useAdminOrderCancellation({
    money,
    onCancelOrder,
    onCancelled: orderPage.refresh,
  });
  const [productSearch, setProductSearch] = useState('');
  const [productStatus, setProductStatus] = useState('AVAILABLE');
  const [visibleProductLimit, setVisibleProductLimit] = useState(LIST_BATCH_SIZE);
  const orderStatuses = Object.keys(orderStatusCopy);
  const availableProducts = useMemo(
    () => products.filter((product) => product.active !== false),
    [products],
  );
  const unavailableProducts = products.length - availableProducts.length;
  const productAvailability = products.length
    ? Math.round((availableProducts.length / products.length) * 100)
    : 0;
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
  const visibleOrders = orderPage.orders;
  const visibleProducts = filteredProducts.slice(0, visibleProductLimit);
  const metricText = (value: number | string) => (metricsStatus === 'ready' ? value : '—');

  const clearOrderFilters = () => {
    setOrderSearch('');
    setOrderStatus('ALL');
  };
  const clearProductFilters = () => {
    setProductSearch('');
    setProductStatus('AVAILABLE');
    setVisibleProductLimit(LIST_BATCH_SIZE);
  };

  return (
    <S.OverviewRoot>
      {metricsError && <p role="alert">{metricsError}</p>}
      <S.Hero aria-labelledby="overview-summary-title">
        <S.HeroCopy>
          <span className="eyebrow">
            <CalendarDays aria-hidden="true" /> {getTodayLabel(metrics.timezone)}
          </span>
          <h2 id="overview-summary-title">Vamos cuidar do seu restaurante?</h2>
          <p>
            {availability
              ? `O restaurante ${restaurantName} está ${availability.isOpen ? 'aberto' : 'fechado'} para novos pedidos. ${availability.detail}.`
              : `Acompanhe pedidos e disponibilidade do cardápio do ${restaurantName}.`}
          </p>
          <div className="hero-buttons">
            <button type="button" className="primary" onClick={() => onNavigate('orders')}>
              <ShoppingBag aria-hidden="true" /> Acompanhar pedidos{' '}
              <ArrowRight aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onNavigate('catalog')}>
              <UtensilsCrossed aria-hidden="true" /> Gerenciar cardápio
            </button>
          </div>
        </S.HeroCopy>
        <S.HeroAside>
          <span className="hero-operating-state">
            <span className={availability?.isOpen ? 'status-dot open' : 'status-dot'} />
            {availability ? availability.label : 'Situação a confirmar'}
          </span>
          <span className="daily-count">
            {metricText(metrics.todayOrders)} pedidos hoje · {metricText(metrics.preparingOrders)}{' '}
            em preparo
          </span>
          {onViewStore && (
            <button type="button" onClick={onViewStore}>
              <ExternalLink aria-hidden="true" /> Ver minha loja
            </button>
          )}
        </S.HeroAside>
      </S.Hero>

      <S.Metrics aria-label="Indicadores de hoje">
        <S.Metric>
          <span className="metric-icon sales" aria-hidden="true">
            <WalletCards />
          </span>
          <span className="metric-copy">
            <small>Vendas de hoje</small>
            <strong>{metricText(money(metrics.sales))}</strong>
            <em>Pagamentos confirmados hoje</em>
          </span>
        </S.Metric>
        <S.Metric>
          <span className="metric-icon orders" aria-hidden="true">
            <ShoppingBag />
          </span>
          <span className="metric-copy">
            <small>Pedidos hoje</small>
            <strong>{metricText(metrics.todayOrders)}</strong>
            <em>{metricText(metrics.preparingOrders)} em preparo agora</em>
          </span>
        </S.Metric>
        <S.Metric>
          <span className="metric-icon ticket" aria-hidden="true">
            <ReceiptText />
          </span>
          <span className="metric-copy">
            <small>Ticket médio</small>
            <strong>{metricText(money(metrics.averageTicket))}</strong>
            <em>
              {metricsStatus !== 'ready'
                ? 'Média dos pedidos pagos hoje'
                : metrics.sales > 0
                  ? 'Média dos pedidos pagos hoje'
                  : 'Aguardando pagamentos'}
            </em>
          </span>
        </S.Metric>
        <S.Metric>
          <span className="metric-icon customers" aria-hidden="true">
            <Users />
          </span>
          <span className="metric-copy">
            <small>Clientes ativos</small>
            <strong>{metricText(metrics.customers)}</strong>
            <button type="button" onClick={() => onNavigate('customers')}>
              Ver clientes <ArrowRight aria-hidden="true" />
            </button>
          </span>
        </S.Metric>
      </S.Metrics>

      {onOpenSettings && (
        <AdminSetupGuide
          onNavigate={onNavigate}
          onOpenSettings={onOpenSettings}
          onViewStore={onViewStore}
        />
      )}

      <S.QuickAccess aria-labelledby="overview-routines-title">
        <div className="routines-heading">
          <div>
            <h2 id="overview-routines-title">No dia a dia</h2>
            <p>Encontre o que você precisa para administrar seu restaurante.</p>
          </div>
          <button type="button" className="all-settings" onClick={() => onNavigate('settings')}>
            Todas as configurações <ArrowRight aria-hidden="true" />
          </button>
        </div>
        <div className="routine-links">
          {[
            {
              area: 'employees' as const,
              Icon: Users,
              title: 'Equipe',
              description: 'Funcionários e acessos',
            },
            {
              area: 'coupons' as const,
              Icon: TicketPercent,
              title: 'Cupons',
              description: 'Promoções para clientes',
            },
            {
              area: 'reservations' as const,
              Icon: CalendarDays,
              title: 'Reservas',
              description: 'Agenda do seu salão',
            },
            {
              area: 'support' as const,
              Icon: Headphones,
              title: 'Atendimento',
              description: 'Conversas sobre pedidos',
            },
            {
              area: 'subscriptions' as const,
              Icon: WalletCards,
              title: 'Meu plano',
              description: 'Assinatura e mensalidades',
            },
            {
              area: 'help' as const,
              Icon: Settings2,
              title: 'Preciso de ajuda',
              description: 'Orientações e suporte',
            },
          ].map(({ area, Icon, title, description }) => (
            <button type="button" key={area} onClick={() => onNavigate(area)}>
              <Icon aria-hidden="true" />
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <ArrowRight className="routine-arrow" aria-hidden="true" />
            </button>
          ))}
        </div>
      </S.QuickAccess>

      <section className="overview-assistant-strip" aria-label="Resumo operacional">
        <div className="assistant-intro">
          <span className="assistant-title">
            <Clock3 aria-hidden="true" /> Acompanhe a operação
          </span>
          <strong>O que precisa de atenção</strong>
          <p>
            {orderPage.summary?.awaitingPayment
              ? `${orderPage.summary.awaitingPayment} pedido(s) aguardando pagamento. Verifique os recebimentos antes de avançar o preparo.`
              : metricsStatus === 'ready' && metrics.preparingOrders > 0
                ? `${metrics.preparingOrders} pedido(s) em preparo. Acompanhe a fila operacional.`
                : 'Consulte os indicadores e acompanhe os próximos pedidos.'}
          </p>
          <small>
            <RefreshCw aria-hidden="true" /> Resumo com dados atuais do restaurante
          </small>
        </div>
        <div className="assistant-summary">
          <div className="assistant-summary-heading">
            <strong>Detalhes dos recebimentos</strong>
            <span>Hoje</span>
          </div>
          <div className="assistant-summary-cards">
            <div>
              <WalletCards aria-hidden="true" />
              <span>
                Vendas registradas<small>Pedidos criados hoje</small>
              </span>
              <b>
                {metricsStatus === 'ready' && metrics.registeredSalesTotal !== undefined
                  ? money(metrics.registeredSalesTotal)
                  : '—'}
              </b>
            </div>
            <div>
              <CheckCircle2 aria-hidden="true" />
              <span>
                Pagamentos confirmados<small>Hoje</small>
              </span>
              <b>{metricText(metrics.confirmedPaymentsToday ?? '—')}</b>
            </div>
            <div>
              <CircleAlert aria-hidden="true" />
              <span>
                Cancelamentos / estornos<small>Criados hoje / devolvidos hoje</small>
              </span>
              <b>
                {metricsStatus === 'ready' &&
                metrics.cancelledOrdersCreatedToday !== undefined &&
                metrics.refundedOrdersToday !== undefined
                  ? `${metrics.cancelledOrdersCreatedToday} / ${metrics.refundedOrdersToday}`
                  : '—'}
              </b>
            </div>
          </div>
        </div>
      </section>

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
          {orderPage.error && <p role="alert">{orderPage.error}</p>}
          <S.DataList aria-live="polite" aria-busy={orderPage.loading}>
            {visibleOrders.map((order) => {
              const status = isOrderWaitingForCapacity(order)
                ? { label: 'Aguardando vaga', tone: 'warning' as const }
                : formatStatus(order.status);
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
                      {formatOrderType(order.type)} <span aria-hidden="true">·</span>{' '}
                      <span
                        className="payment-method"
                        aria-label={`Pagamento: ${paymentMethodForOverview(order)}`}
                      >
                        {paymentMethodForOverview(order)}
                      </span>
                    </small>
                  </div>
                  <div className="row-result">
                    <strong>{money(order.total)}</strong>
                    <S.StatusBadge $tone={status.tone}>{status.label}</S.StatusBadge>
                  </div>
                  {onCancelOrder && canCancelAdminOrder(order) ? (
                    <div className="row-actions">
                      <button
                        type="button"
                        disabled={cancellingOrderId !== null}
                        aria-label={`Cancelar o pedido ${order.id}`}
                        onClick={() => void cancelOrder(order)}
                      >
                        <Undo2 aria-hidden="true" />
                        {cancellingOrderId === order.numericId
                          ? 'Processando...'
                          : 'Cancelar pedido'}
                      </button>
                    </div>
                  ) : order.refundStatus === 'PROCESSING' ? (
                    <div className="row-actions">
                      <button type="button" onClick={() => onNavigate('orders')}>
                        Consultar estorno <ArrowRight aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {!visibleOrders.length && !orderPage.error && (
              <S.OverviewEmpty>
                <span aria-hidden="true">
                  <Search />
                </span>
                <strong>
                  {orderPage.loading ? 'Carregando pedidos...' : 'Nenhum pedido encontrado'}
                </strong>
                <p>
                  {orderPage.loading
                    ? 'Buscando os pedidos do restaurante.'
                    : orderSearch || orderStatus !== 'ALL'
                      ? 'Tente outro termo ou limpe os filtros aplicados.'
                      : 'Os novos pedidos do restaurante aparecerão aqui.'}
                </p>
                {!orderPage.loading && (orderSearch || orderStatus !== 'ALL') && (
                  <button type="button" onClick={clearOrderFilters}>
                    Limpar filtros
                  </button>
                )}
              </S.OverviewEmpty>
            )}
          </S.DataList>
          <S.OverviewPagination>
            <span>
              {orderPage.loading
                ? 'Carregando...'
                : orderPage.error
                  ? 'Lista indisponível'
                  : orderPage.total
                    ? `${visibleOrders.length} de ${orderPage.total} pedidos`
                    : '0 resultados'}
            </span>
            <div>
              {visibleOrders.length > LIST_BATCH_SIZE && (
                <button
                  type="button"
                  disabled={orderPage.loading}
                  aria-label="Voltar aos 10 pedidos recentes iniciais"
                  onClick={() => void orderPage.reset()}
                >
                  <ChevronLeft aria-hidden="true" /> Voltar aos 10
                </button>
              )}
              {(orderPage.hasMore || orderPage.error) && (
                <button
                  type="button"
                  disabled={orderPage.loading}
                  aria-label="Mostrar mais 10 pedidos recentes"
                  onClick={() => void (orderPage.error ? orderPage.retry() : orderPage.loadMore())}
                >
                  {orderPage.loading
                    ? 'Carregando...'
                    : orderPage.error
                      ? 'Tentar novamente'
                      : 'Mostrar mais 10'}{' '}
                  <ChevronDown aria-hidden="true" />
                </button>
              )}
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
            {!products.length
              ? 'Comece pelo seu primeiro produto'
              : unavailableProducts > 0
                ? `Revise ${unavailableProducts} ${unavailableProducts === 1 ? 'produto indisponível' : 'produtos indisponíveis'}`
                : 'Seu cardápio está totalmente disponível'}
          </strong>
          <p>
            {!products.length
              ? 'Adicione os produtos, as fotos e os preços que seus clientes vão encontrar no cardápio.'
              : unavailableProducts > 0
                ? 'Confirme estoque e disponibilidade para não perder oportunidades de venda.'
                : 'Continue acompanhando pedidos e estoque para manter a operação fluindo.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate(!products.length || unavailableProducts ? 'catalog' : 'orders')}
        >
          {!products.length
            ? 'Montar cardápio'
            : unavailableProducts
              ? 'Revisar cardápio'
              : 'Ver pedidos'}
          <ArrowRight aria-hidden="true" />
        </button>
      </S.BottomInsight>
    </S.OverviewRoot>
  );
}
