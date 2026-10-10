import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bike,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  CookingPot,
  CreditCard,
  FilterX,
  LoaderCircle,
  PackageCheck,
  QrCode,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Undo2,
  Utensils,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAppDialog } from '../../../components/AppDialog/context';
import * as S from './AdminOrders.styles';
import type { AdminOrder } from '../types';
import { LalamoveFreightQuote } from './LalamoveFreightQuote';
import ordersService, { type RestaurantOrdersQueue } from '../../../Services/ordersService';
import tableAccountService from '../../../Services/tableAccountService';
import {
  ADMIN_ORDERS_PAGE_SIZE,
  useAdminOrdersPage,
  type LoadAdminOrdersPage,
} from '../hooks/useAdminOrdersPage';
import { adminErrorMessage } from '../utils/adminErrorMessage';
import { useAdminOrderCancellation } from '../hooks/useAdminOrderCancellation';
import {
  canCancelAdminOrder,
  getOrderPaymentPresentation,
  getOrderProgress,
  getOrderTypeLabel,
  getPaymentMethodLabel,
  isOrderWaitingForCapacity,
  ORDER_STATUSES,
} from '../domain/adminOrders';

const PickupPaymentPanel = lazy(() => import('./PickupPaymentPanel'));

type QueueView = RestaurantOrdersQueue;

type PendingTableCash = {
  paymentPublicId: string;
  totalCents: number;
  payerDisplayName: string;
};

type PendingTableCashByOrderPublicId = Record<string, PendingTableCash>;

async function readPendingTableCashByOrderPublicId(): Promise<PendingTableCashByOrderPublicId> {
  const result = await tableAccountService.listAdminSessions();
  const next: PendingTableCashByOrderPublicId = {};

  for (const session of Array.isArray(result?.sessions) ? result.sessions : []) {
    for (const payment of Array.isArray(session?.pendingManualPayments)
      ? session.pendingManualPayments
      : []) {
      if (
        payment?.method !== 'CASH' ||
        payment?.staffReceiptRegistered !== true ||
        !payment?.publicId
      ) {
        continue;
      }

      for (const orderPublicId of Array.isArray(payment?.orderPublicIds)
        ? payment.orderPublicIds
        : []) {
        const normalizedOrderPublicId = String(orderPublicId || '').trim();
        if (!normalizedOrderPublicId) continue;
        next[normalizedOrderPublicId] = {
          paymentPublicId: String(payment.publicId),
          totalCents: Number(payment.totalCents || 0),
          payerDisplayName: String(payment.payerDisplayName || 'Cliente da mesa'),
        };
      }
    }
  }

  return next;
}

type AdminOrdersProps = {
  orders: AdminOrder[];
  restaurantName: string;
  money: (value: number) => string;
  onConfirmPayment: (id: number) => Promise<void>;
  onCancelOrder: (id: number) => Promise<void>;
  loadOrdersPage?: LoadAdminOrdersPage;
  renderPickupPayment?: (order: AdminOrder) => ReactNode;
};

const statusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  PREPARANDO: 'Em preparo',
  PRONTO: 'Pronto',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

const PROGRESS_STEPS = 5;
const progressLabels = ['Recebido', 'Preparo', 'Pronto', 'Em rota', 'Concluído'];

function getActionErrorMessage(error: unknown, fallback: string) {
  return adminErrorMessage(error, fallback);
}

function formatCreatedAt(value?: string) {
  if (!value) return 'Horário não informado';
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) return 'Horário não informado';

  const today = new Date();
  const isToday =
    createdAt.getFullYear() === today.getFullYear() &&
    createdAt.getMonth() === today.getMonth() &&
    createdAt.getDate() === today.getDate();
  const time = createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Hoje, ${time}`;
  return `${createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}, ${time}`;
}

function PaymentIcon({ method }: { method?: string }) {
  const normalized = String(method || '').toUpperCase();
  if (normalized.includes('PIX')) return <QrCode aria-hidden="true" />;
  if (normalized.includes('CART') || normalized.includes('CARD')) {
    return <CreditCard aria-hidden="true" />;
  }
  return <CircleDollarSign aria-hidden="true" />;
}

function OrderTypeIcon({ type }: { type?: string }) {
  const normalized = String(type || '').toUpperCase();
  if (normalized === 'DELIVERY') return <Bike aria-hidden="true" />;
  if (['MESA', 'TABLE', 'TABLE_SESSION'].includes(normalized)) {
    return <Utensils aria-hidden="true" />;
  }
  return <ShoppingBag aria-hidden="true" />;
}

export function AdminOrders({
  orders,
  restaurantName,
  money,
  onConfirmPayment,
  onCancelOrder,
  loadOrdersPage,
  renderPickupPayment,
}: AdminOrdersProps) {
  const { confirmDialog } = useAppDialog();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [queueView, setQueueView] = useState<QueueView>('ALL');
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<number | null>(null);
  const [confirmingTableCashId, setConfirmingTableCashId] = useState('');
  const [tableCashByOrderPublicId, setTableCashByOrderPublicId] =
    useState<PendingTableCashByOrderPublicId>({});
  const [checkingRefundId, setCheckingRefundId] = useState<number | null>(null);
  const page = useAdminOrdersPage({
    search,
    status,
    queue: queueView,
    refreshSignal: orders,
    loadOrdersPage,
  });
  const { summary, orders: displayedOrders } = page;

  const refreshPendingTableCash = async () => {
    try {
      setTableCashByOrderPublicId(await readPendingTableCashByOrderPublicId());
    } catch {
      // A fila de pedidos continua utilizável mesmo se o painel financeiro da mesa
      // estiver temporariamente indisponível. Nenhum pagamento é confirmado por fallback.
      setTableCashByOrderPublicId({});
    }
  };

  useEffect(() => {
    let active = true;

    void readPendingTableCashByOrderPublicId()
      .then((next) => {
        if (active) setTableCashByOrderPublicId(next);
      })
      .catch(() => {
        if (active) setTableCashByOrderPublicId({});
      });

    return () => {
      active = false;
    };
  }, [orders]);

  const { cancelOrder, cancellingOrderId } = useAdminOrderCancellation({
    money,
    onCancelOrder,
    onCancelled: page.refresh,
  });
  const hasFilters = Boolean(search || status || queueView !== 'ALL');
  const priorityView: QueueView = summary.awaitingPayment
    ? 'PAYMENT'
    : summary.inProgress
      ? 'IN_PROGRESS'
      : summary.active
        ? 'ACTIVE'
        : 'ALL';
  const priorityTitle = summary.awaitingPayment
    ? `${summary.awaitingPayment} ${summary.awaitingPayment === 1 ? 'pagamento aguarda' : 'pagamentos aguardam'} confirmação`
    : summary.inProgress
      ? `${summary.inProgress} ${summary.inProgress === 1 ? 'pedido está' : 'pedidos estão'} em andamento`
      : summary.active
        ? `${summary.active} ${summary.active === 1 ? 'pedido precisa' : 'pedidos precisam'} de acompanhamento`
        : 'Nenhuma pendência operacional';

  const updateSearch = (value: string) => {
    setSearch(value);
  };

  const updateStatus = (value: string) => {
    setStatus(value);
    setQueueView('ALL');
  };

  const selectQueueView = (view: QueueView) => {
    setQueueView(view);
    setStatus('');
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setQueueView('ALL');
  };

  const confirmPayment = async (order: AdminOrder) => {
    const method = getPaymentMethodLabel(order.payOnDeliveryMethod || order.paymentMethod);
    const confirmed = await confirmDialog({
      title: `Confirmar recebimento do pedido ${order.id}?`,
      description: `Confirme somente se você já recebeu ${money(order.total)} via ${method} na entrega. Esta ação marcará o pedido como pago.`,
      confirmLabel: 'Confirmar recebimento',
      cancelLabel: 'Voltar',
    });
    if (!confirmed) return;

    setConfirmingPaymentId(order.numericId);
    try {
      await onConfirmPayment(order.numericId);
      await page.refresh();
      toast.success(`Pagamento do pedido ${order.id} confirmado.`);
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Não foi possível confirmar o pagamento.'));
    } finally {
      setConfirmingPaymentId(null);
    }
  };

  const confirmTableCashPayment = async (
    order: AdminOrder,
    payment: {
      paymentPublicId: string;
      totalCents: number;
      payerDisplayName: string;
    },
  ) => {
    const confirmed = await confirmDialog({
      title: `Confirmar dinheiro recebido do pedido ${order.id}?`,
      description: `${payment.payerDisplayName} · ${money(payment.totalCents / 100)}. O garçom já registrou o recebimento. Confirme somente depois de conferir o caixa; esta ação marca o pagamento da mesa como PAGO.`,
      confirmLabel: 'Confirmar dinheiro recebido',
      cancelLabel: 'Voltar e conferir',
    });
    if (!confirmed) return;

    setConfirmingTableCashId(payment.paymentPublicId);
    try {
      await tableAccountService.confirmManualPayment(payment.paymentPublicId);
      await Promise.all([page.refresh(), refreshPendingTableCash()]);
      toast.success(`Pagamento em dinheiro do pedido ${order.id} confirmado.`);
    } catch (error) {
      toast.error(
        getActionErrorMessage(
          error,
          'Não foi possível confirmar o pagamento em dinheiro da mesa.',
        ),
      );
    } finally {
      setConfirmingTableCashId('');
    }
  };

  const checkRefund = async (order: AdminOrder) => {
    setCheckingRefundId(order.numericId);
    try {
      const result = await ordersService.reconcileOrderRefund(order.numericId);
      await page.refresh();
      toast.success(
        result.refunded
          ? 'Estorno confirmado pelo provedor.'
          : 'Consulta concluída; nenhuma nova devolução foi solicitada.',
      );
    } catch (error) {
      toast.error(
        getActionErrorMessage(error, 'Não foi possível consultar o estorno. Tente novamente.'),
      );
    } finally {
      setCheckingRefundId(null);
    }
  };

  return (
    <S.OrdersWorkspace>
      <S.OrdersHero aria-labelledby="orders-command-title">
        <S.HeroCopy>
          <span className="eyebrow">
            <Sparkles aria-hidden="true" /> Central de pedidos
          </span>
          <h2 id="orders-command-title">
            {summary.active
              ? 'Acompanhe cada pedido sem perder o ritmo'
              : 'Sua fila está sob controle'}
          </h2>
          <p>
            Pagamentos, preparo e entregas organizados para sua equipe agir com segurança e rapidez.
          </p>
          <div className="hero-pulse" aria-label="Situação atual da fila">
            <span>
              <ShoppingBag aria-hidden="true" /> {summary.active} ativos
            </span>
            <span>
              <Clock3 aria-hidden="true" /> {summary.inProgress} em andamento
            </span>
            <span>
              <PackageCheck aria-hidden="true" /> {summary.delivered} entregues
            </span>
          </div>
        </S.HeroCopy>
        <S.PriorityCard>
          <span className="priority-label">
            <Activity aria-hidden="true" /> Prioridade agora
          </span>
          <strong>{priorityTitle}</strong>
          <p>
            {summary.awaitingPayment
              ? 'Confirme apenas os valores que já foram recebidos.'
              : summary.active
                ? 'Abra a fila prioritária para acompanhar os próximos passos.'
                : 'Continue acompanhando o histórico e aguarde novos pedidos.'}
          </p>
          <button type="button" onClick={() => selectQueueView(priorityView)}>
            {summary.active ? 'Ver prioridade' : 'Ver todos os pedidos'}
            <ArrowRight aria-hidden="true" />
          </button>
          <small>{restaurantName}</small>
        </S.PriorityCard>
      </S.OrdersHero>

      <S.OrdersSummary aria-label="Resumo dos pedidos">
        <button
          type="button"
          className="summary-card active"
          aria-label="Mostrar pedidos ativos"
          aria-pressed={queueView === 'ACTIVE'}
          onClick={() => selectQueueView('ACTIVE')}
        >
          <span className="summary-icon active" aria-hidden="true">
            <ShoppingBag />
          </span>
          <span className="summary-copy">
            <small>Pedidos ativos</small>
            <strong>{summary.active}</strong>
            <em>Precisam de acompanhamento</em>
          </span>
          <ArrowRight className="summary-arrow" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="summary-card payment"
          aria-label="Mostrar pedidos aguardando pagamento"
          aria-pressed={queueView === 'PAYMENT'}
          onClick={() => selectQueueView('PAYMENT')}
        >
          <span className="summary-icon payment" aria-hidden="true">
            <CircleDollarSign />
          </span>
          <span className="summary-copy">
            <small>Aguardando pagamento</small>
            <strong>{summary.awaitingPayment}</strong>
            <em>Confirme somente após receber</em>
          </span>
          <ArrowRight className="summary-arrow" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="summary-card progress"
          aria-label="Mostrar pedidos em andamento"
          aria-pressed={queueView === 'IN_PROGRESS'}
          onClick={() => selectQueueView('IN_PROGRESS')}
        >
          <span className="summary-icon progress" aria-hidden="true">
            <CookingPot />
          </span>
          <span className="summary-copy">
            <small>Em andamento</small>
            <strong>{summary.inProgress}</strong>
            <em>Preparo, pronto ou em rota</em>
          </span>
          <ArrowRight className="summary-arrow" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="summary-card delivered"
          aria-label="Mostrar pedidos entregues"
          aria-pressed={queueView === 'DELIVERED'}
          onClick={() => selectQueueView('DELIVERED')}
        >
          <span className="summary-icon delivered" aria-hidden="true">
            <PackageCheck />
          </span>
          <span className="summary-copy">
            <small>Entregues</small>
            <strong>{summary.delivered}</strong>
            <em>Pedidos concluídos</em>
          </span>
          <ArrowRight className="summary-arrow" aria-hidden="true" />
        </button>
      </S.OrdersSummary>

      <S.OrdersPanel>
        <S.OrdersPanelHeader>
          <div>
            <span className="section-icon" aria-hidden="true">
              <ShoppingBag />
            </span>
            <span>
              <small>OPERAÇÃO EM TEMPO REAL</small>
              <h2>Fila de atendimento</h2>
              <p>Encontre o pedido certo e veja exatamente qual ação precisa ser tomada.</p>
            </span>
          </div>
          <span className="live-status">
            <Activity aria-hidden="true" />
            {page.loading
              ? 'Atualizando pedidos...'
              : page.error
                ? 'A atualização está pendente'
                : 'Pedidos atualizados'}
          </span>
        </S.OrdersPanelHeader>

        <S.QueueTabs aria-label="Visualizações rápidas da fila">
          <button
            type="button"
            aria-pressed={queueView === 'ALL'}
            onClick={() => selectQueueView('ALL')}
          >
            Todos <span>{summary.total}</span>
          </button>
          <button
            type="button"
            aria-pressed={queueView === 'ACTIVE'}
            onClick={() => selectQueueView('ACTIVE')}
          >
            Ativos <span>{summary.active}</span>
          </button>
          <button
            type="button"
            aria-pressed={queueView === 'PAYMENT'}
            onClick={() => selectQueueView('PAYMENT')}
          >
            Pagamento <span>{summary.awaitingPayment}</span>
          </button>
          <button
            type="button"
            aria-pressed={queueView === 'IN_PROGRESS'}
            onClick={() => selectQueueView('IN_PROGRESS')}
          >
            Em andamento <span>{summary.inProgress}</span>
          </button>
          <button
            type="button"
            aria-pressed={queueView === 'DELIVERED'}
            onClick={() => selectQueueView('DELIVERED')}
          >
            Entregues <span>{summary.delivered}</span>
          </button>
        </S.QueueTabs>

        <S.OrdersToolbar>
          <label className="search-field">
            <span>Buscar pedido</span>
            <div>
              <Search aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Número do pedido ou nome do cliente"
                aria-label="Buscar pedido por número ou cliente"
              />
            </div>
          </label>
          <label className="status-filter">
            <span>Status específico</span>
            <div>
              <select
                value={status}
                onChange={(event) => updateStatus(event.target.value)}
                aria-label="Filtrar pedidos por status"
              >
                <option value="">Todos os status</option>
                {ORDER_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {statusLabels[item]}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" />
            </div>
          </label>
          <div className="toolbar-result">
            <span role="status" aria-live="polite">
              {page.loading ? (
                'Carregando pedidos...'
              ) : (
                <>
                  <strong>{page.total}</strong>
                  {page.total === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
                </>
              )}
            </span>
            {hasFilters && (
              <button type="button" onClick={clearFilters}>
                <FilterX aria-hidden="true" /> Limpar filtros
              </button>
            )}
          </div>
        </S.OrdersToolbar>

        {page.error && (
          <S.OrdersEmpty role="alert">
            <p>{page.error}</p>
            <button type="button" disabled={page.loading} onClick={() => void page.retry()}>
              Tentar novamente
            </button>
          </S.OrdersEmpty>
        )}

        {displayedOrders.length ? (
          <S.OrdersList
            aria-busy={page.loading || cancellingOrderId !== null || confirmingPaymentId !== null}
          >
            {displayedOrders.map((order) => {
              const payment = getOrderPaymentPresentation(order);
              const progress = getOrderProgress(order.status);
              const waitingForCapacity = isOrderWaitingForCapacity(order);
              const statusLabel = waitingForCapacity
                ? 'Aguardando vaga'
                : (statusLabels[order.status] ??
                  order.status.replaceAll('_', ' ').toLocaleLowerCase('pt-BR'));
              const isCancelled = order.status === 'CANCELADO';
              const isFinished = isCancelled || order.status === 'ENTREGUE';
              const isRefundProcessing = order.refundStatus === 'PROCESSING';
              const isCancelling = cancellingOrderId === order.numericId;
              const isConfirmingPayment = confirmingPaymentId === order.numericId;
              const isPickupPayAtStore =
                String(order.type || '').toUpperCase() === 'RETIRADA' &&
                !order.paid &&
                !order.paymentMethod &&
                !order.payOnDelivery;
              const payOnDeliveryMethod = String(
                order.payOnDeliveryMethod || order.paymentMethod || '',
              )
                .trim()
                .toUpperCase();
              const canConfirmCashPayment =
                !order.paid && order.payOnDelivery === true && payOnDeliveryMethod === 'DINHEIRO';
              const pendingTableCash =
                order.publicId && !order.paid
                  ? tableCashByOrderPublicId[order.publicId] || null
                  : null;
              const isConfirmingTableCash =
                pendingTableCash?.paymentPublicId === confirmingTableCashId;

              return (
                <article
                  className={`order-card status-${order.status.toLowerCase()}`}
                  key={order.numericId}
                >
                  <header className="order-header">
                    <div className="order-identity">
                      <div>
                        <span className="order-number">{order.id}</span>
                        <h3>{order.customerName}</h3>
                      </div>
                      <span className="order-created">
                        <Clock3 aria-hidden="true" />
                        {formatCreatedAt(order.createdAt)}
                      </span>
                    </div>
                    <span className="order-status">
                      <i aria-hidden="true" />
                      {statusLabel}
                    </span>
                  </header>

                  <div className="order-details">
                    <div className={`detail payment-detail tone-${payment.tone}`}>
                      <span className="detail-icon" aria-hidden="true">
                        <PaymentIcon method={order.payOnDeliveryMethod || order.paymentMethod} />
                      </span>
                      <div>
                        <span>Pagamento</span>
                        <b>
                          {pendingTableCash
                            ? 'Dinheiro recebido pelo garçom'
                            : isPickupPayAtStore
                              ? 'Pagamento no balcão'
                              : payment.title}
                        </b>
                        <small>
                          {pendingTableCash
                            ? 'Aguardando confirmação final do administrador'
                            : isPickupPayAtStore
                              ? `Cliente escolheu ${String(
                                  order.payOnDeliveryMethod || 'pagamento presencial',
                                )
                                  .replace('PIX', 'Pix')
                                  .replace('CARTAO', 'cartão na maquininha')
                                  .replace('DINHEIRO', 'dinheiro')}`
                              : payment.detail}
                        </small>
                      </div>
                    </div>
                    <div className="detail">
                      <span className="detail-icon neutral" aria-hidden="true">
                        <OrderTypeIcon type={order.type} />
                      </span>
                      <div>
                        <span>Modalidade</span>
                        <b>{getOrderTypeLabel(order.type)}</b>
                        <small>Forma de atendimento</small>
                      </div>
                    </div>
                    <div className="order-total">
                      <span>Total do pedido</span>
                      <strong>{money(order.total)}</strong>
                    </div>
                  </div>

                  {waitingForCapacity ? (
                    <div className="operation-note processing-note" role="status">
                      <Clock3 aria-hidden="true" />
                      Limite simultâneo atingido. O pedido foi recebido e entrará automaticamente na
                      operação assim que uma vaga for liberada.
                    </div>
                  ) : null}

                  <div className="order-progress">
                    <div className="progress-heading">
                      <span>Andamento do pedido</span>
                      <b>{statusLabel}</b>
                    </div>
                    <div className="progress-content">
                      <div
                        className={`progress-track${isCancelled ? ' cancelled' : ''}`}
                        role="progressbar"
                        aria-label={`Andamento do pedido ${order.id}`}
                        aria-valuemin={0}
                        aria-valuemax={PROGRESS_STEPS}
                        aria-valuenow={progress}
                        aria-valuetext={statusLabel}
                      >
                        {Array.from({ length: PROGRESS_STEPS }, (_, index) => (
                          <i
                            key={progressLabels[index]}
                            data-active={!isCancelled && index < progress}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                      <div className="progress-labels" aria-hidden="true">
                        {progressLabels.map((label) => (
                          <span key={label}>{label}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {isPickupPayAtStore && !isFinished ? (
                    renderPickupPayment ? (
                      renderPickupPayment(order)
                    ) : (
                      <Suspense fallback={null}>
                        <PickupPaymentPanel
                          orderId={order.numericId}
                          total={order.total}
                          preferredMethod={order.payOnDeliveryMethod}
                          onPaid={() => void page.refresh()}
                        />
                      </Suspense>
                    )
                  ) : null}

                  {order.type === 'DELIVERY' && order.paid &&
                  !order.payOnDelivery && ['PENDENTE','PREPARANDO','PRONTO'].includes(order.status) &&
                  <LalamoveFreightQuote orderId={order.numericId} />}

                  <footer className="order-actions">
                    {order.refundStatus === 'SUCCEEDED' ? (
                      <span className="operation-note refund-note">
                        <CheckCircle2 aria-hidden="true" />
                        Estorno concluído no mesmo meio de pagamento
                      </span>
                    ) : isRefundProcessing ? (
                      <span className="operation-note processing-note">
                        <LoaderCircle className="loading-icon" aria-hidden="true" />
                        Cancelamento em conciliação. Consulte o estorno antes de tentar novamente.
                      </span>
                    ) : order.refundStatus === 'FAILED' ? (
                      <span className="operation-note failed-note">
                        <AlertTriangle aria-hidden="true" />O estorno não foi concluído; tente
                        novamente
                      </span>
                    ) : !isFinished && payment.automaticRefund ? (
                      <span className="operation-note refund-note">
                        <ShieldCheck aria-hidden="true" />
                        Ao cancelar, o estorno online será solicitado automaticamente
                      </span>
                    ) : !isFinished && order.paid && order.payOnDelivery ? (
                      <span className="operation-note manual-note">
                        <CircleDollarSign aria-hidden="true" />
                        Pagamento na entrega exige devolução manual
                      </span>
                    ) : !isFinished && order.paid ? (
                      <span className="operation-note manual-note">
                        <AlertTriangle aria-hidden="true" />
                        Pagamento sem estorno online automático
                      </span>
                    ) : canConfirmCashPayment && order.status === 'ENTREGUE' ? (
                      <span className="operation-note manual-note">
                        <CircleDollarSign aria-hidden="true" />
                        Entrega concluída · aguardando confirmação do dinheiro
                      </span>
                    ) : (
                      <span className="operation-note finished-note">
                        {isFinished ? (
                          <>
                            <CheckCircle2 aria-hidden="true" /> Pedido finalizado
                          </>
                        ) : isPickupPayAtStore ? (
                          'Aguardando pagamento no balcão'
                        ) : (
                          'Sem cobrança online confirmada'
                        )}
                      </span>
                    )}

                    {isRefundProcessing && (
                      <div className="action-buttons">
                        <button
                          type="button"
                          onClick={() => void checkRefund(order)}
                          disabled={checkingRefundId !== null}
                          aria-label={`Consultar estorno do pedido ${order.id}`}
                        >
                          {checkingRefundId === order.numericId
                            ? 'Consultando…'
                            : 'Consultar estorno'}
                        </button>
                      </div>
                    )}
                    {pendingTableCash && (
                      <div className="action-buttons">
                        <button
                          className="confirm-payment"
                          type="button"
                          onClick={() => void confirmTableCashPayment(order, pendingTableCash)}
                          disabled={
                            Boolean(confirmingTableCashId) ||
                            confirmingPaymentId !== null ||
                            cancellingOrderId !== null
                          }
                          aria-label={`Confirmar dinheiro recebido do pedido ${order.id}`}
                        >
                          {isConfirmingTableCash ? (
                            <LoaderCircle className="loading-icon" aria-hidden="true" />
                          ) : (
                            <CheckCircle2 aria-hidden="true" />
                          )}
                          {isConfirmingTableCash
                            ? 'Confirmando...'
                            : 'Confirmar dinheiro recebido'}
                        </button>
                      </div>
                    )}
                    {canConfirmCashPayment && (
                      <div className="action-buttons">
                        <button
                          className="confirm-payment"
                          type="button"
                          onClick={() => void confirmPayment(order)}
                          disabled={confirmingPaymentId !== null || cancellingOrderId !== null}
                          aria-label={`Confirmar pagamento do pedido ${order.id}`}
                        >
                          {isConfirmingPayment ? (
                            <LoaderCircle className="loading-icon" aria-hidden="true" />
                          ) : (
                            <CheckCircle2 aria-hidden="true" />
                          )}
                          {isConfirmingPayment ? 'Confirmando...' : 'Confirmar pagamento'}
                        </button>
                      </div>
                    )}
                    {canCancelAdminOrder(order) && (
                      <div className="action-buttons">
                        <button
                          className="cancel-order"
                          type="button"
                          onClick={() => void cancelOrder(order)}
                          disabled={cancellingOrderId !== null || confirmingPaymentId !== null}
                          aria-label={`${payment.automaticRefund ? 'Cancelar e estornar' : 'Cancelar'} o pedido ${order.id}`}
                        >
                          {isCancelling ? (
                            <LoaderCircle className="loading-icon" aria-hidden="true" />
                          ) : (
                            <Undo2 aria-hidden="true" />
                          )}
                          {isCancelling
                            ? 'Processando...'
                            : payment.automaticRefund
                              ? 'Cancelar e estornar'
                              : 'Cancelar pedido'}
                        </button>
                      </div>
                    )}
                  </footer>
                </article>
              );
            })}
          </S.OrdersList>
        ) : page.loading ? (
          <S.OrdersEmpty role="status">
            <p>Carregando pedidos...</p>
          </S.OrdersEmpty>
        ) : !page.error ? (
          <S.OrdersEmpty>
            <span aria-hidden="true">{summary.total ? <Search /> : <ShoppingBag />}</span>
            <h3>{summary.total ? 'Nenhum pedido encontrado' : 'Sua fila está vazia'}</h3>
            <p>
              {summary.total
                ? 'Ajuste a busca ou escolha outra visualização para encontrar o pedido.'
                : 'Os novos pedidos aparecerão aqui automaticamente, sem precisar atualizar a página.'}
            </p>
            {hasFilters && (
              <button type="button" onClick={clearFilters}>
                <FilterX aria-hidden="true" /> Limpar filtros
              </button>
            )}
          </S.OrdersEmpty>
        ) : null}

        <S.OrdersPagination>
          <span>
            {page.loading && !displayedOrders.length
              ? 'Carregando pedidos...'
              : page.total === 0
                ? 'Nenhum pedido para exibir'
                : `Exibindo ${displayedOrders.length} de ${page.total} pedidos`}
          </span>
          <div>
            {displayedOrders.length > ADMIN_ORDERS_PAGE_SIZE ? (
              <button
                type="button"
                aria-label="Voltar aos 10 pedidos iniciais"
                disabled={page.loading}
                onClick={() => void page.reset()}
              >
                <ChevronLeft aria-hidden="true" /> Voltar aos 10 iniciais
              </button>
            ) : null}
            {page.hasMore ? (
              <button
                type="button"
                aria-label="Mostrar mais 10 pedidos"
                disabled={page.loading}
                onClick={() => void page.loadMore()}
              >
                {page.loading ? 'Carregando...' : 'Mostrar mais 10'}{' '}
                <ChevronDown aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </S.OrdersPagination>
      </S.OrdersPanel>
    </S.OrdersWorkspace>
  );
}
