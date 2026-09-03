import { useMemo, useState } from 'react';
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
import {
  filterAdminOrders,
  getAdminOrdersSummary,
  getOrderPaymentPresentation,
  getOrderProgress,
  getOrderTypeLabel,
  getPaymentMethodLabel,
  ORDER_STATUSES,
} from '../domain/adminOrders';

type QueueView = 'ALL' | 'ACTIVE' | 'PAYMENT' | 'IN_PROGRESS' | 'DELIVERED';

type AdminOrdersProps = {
  orders: AdminOrder[];
  restaurantName: string;
  money: (value: number) => string;
  onConfirmPayment: (id: number) => Promise<void>;
  onCancelOrder: (id: number) => Promise<void>;
};

const statusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  PREPARANDO: 'Em preparo',
  PRONTO: 'Pronto',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

const LIST_BATCH_SIZE = 10;
const PROGRESS_STEPS = 5;
const TERMINAL_STATUSES = new Set(['ENTREGUE', 'CANCELADO']);
const IN_PROGRESS_STATUSES = new Set(['PREPARANDO', 'PRONTO', 'SAIU_PARA_ENTREGA']);
const progressLabels = ['Recebido', 'Preparo', 'Pronto', 'Em rota', 'Concluído'];

function getActionErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') return fallback;
  const response = (error as { response?: { data?: { error?: unknown; message?: unknown } } })
    .response;
  const message = response?.data?.error ?? response?.data?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
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

function matchesQueueView(order: AdminOrder, view: QueueView) {
  const orderStatus = String(order.status || '').toUpperCase();
  if (view === 'ACTIVE') return !TERMINAL_STATUSES.has(orderStatus);
  if (view === 'PAYMENT') return !order.paid && orderStatus !== 'CANCELADO';
  if (view === 'IN_PROGRESS') return IN_PROGRESS_STATUSES.has(orderStatus);
  if (view === 'DELIVERED') return orderStatus === 'ENTREGUE';
  return true;
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
}: AdminOrdersProps) {
  const { confirmDialog } = useAppDialog();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [queueView, setQueueView] = useState<QueueView>('ALL');
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<number | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(LIST_BATCH_SIZE);
  const summary = useMemo(() => getAdminOrdersSummary(orders), [orders]);
  const visibleOrders = useMemo(
    () =>
      filterAdminOrders(orders, search, status).filter((order) =>
        matchesQueueView(order, queueView),
      ),
    [orders, queueView, search, status],
  );
  const displayedOrders = visibleOrders.slice(0, visibleLimit);
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
    setVisibleLimit(LIST_BATCH_SIZE);
  };

  const updateStatus = (value: string) => {
    setStatus(value);
    setQueueView('ALL');
    setVisibleLimit(LIST_BATCH_SIZE);
  };

  const selectQueueView = (view: QueueView) => {
    setQueueView(view);
    setStatus('');
    setVisibleLimit(LIST_BATCH_SIZE);
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setQueueView('ALL');
    setVisibleLimit(LIST_BATCH_SIZE);
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
      toast.success(`Pagamento do pedido ${order.id} confirmado.`);
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Não foi possível confirmar o pagamento.'));
    } finally {
      setConfirmingPaymentId(null);
    }
  };

  const cancelOrder = async (order: AdminOrder) => {
    const hasOnlinePaymentToRefund = getOrderPaymentPresentation(order).automaticRefund;
    const method = getPaymentMethodLabel(order.paymentMethod);
    const description = hasOnlinePaymentToRefund
      ? `O pedido ${order.id} de ${order.customerName} será cancelado e o estorno de ${money(order.total)} será solicitado automaticamente no ${method}. O prazo para o crédito depende da instituição financeira.`
      : order.paid && order.payOnDelivery
        ? `O pagamento de ${money(order.total)} foi recebido na entrega e não possui transação online. O pedido será cancelado, mas qualquer devolução ao cliente deve ser feita manualmente.`
        : order.paid
          ? `O pagamento de ${money(order.total)} não está identificado como Pix ou cartão online. O pedido será cancelado, mas a devolução ao cliente deve ser feita manualmente.`
          : `O pedido ${order.id} de ${order.customerName} não possui pagamento confirmado. Ele será cancelado sem gerar cobrança ou estorno.`;
    const confirmed = await confirmDialog({
      title: hasOnlinePaymentToRefund ? 'Cancelar pedido e solicitar estorno?' : 'Cancelar pedido?',
      description,
      confirmLabel: hasOnlinePaymentToRefund ? 'Cancelar e estornar' : 'Cancelar pedido',
      cancelLabel: 'Manter pedido',
      tone: 'danger',
    });
    if (!confirmed) return;

    setCancellingOrderId(order.numericId);
    try {
      await onCancelOrder(order.numericId);
      toast.success(
        hasOnlinePaymentToRefund
          ? `Pedido ${order.id} cancelado e estorno solicitado.`
          : `Pedido ${order.id} cancelado.`,
      );
    } catch (error) {
      toast.error(
        getActionErrorMessage(
          error,
          hasOnlinePaymentToRefund
            ? 'Não foi possível cancelar e solicitar o estorno.'
            : 'Não foi possível cancelar o pedido.',
        ),
      );
    } finally {
      setCancellingOrderId(null);
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
            Sincronizado em tempo real
          </span>
        </S.OrdersPanelHeader>

        <S.QueueTabs aria-label="Visualizações rápidas da fila">
          <button
            type="button"
            aria-pressed={queueView === 'ALL'}
            onClick={() => selectQueueView('ALL')}
          >
            Todos <span>{orders.length}</span>
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
              <strong>{visibleOrders.length}</strong>
              {visibleOrders.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
            </span>
            {hasFilters && (
              <button type="button" onClick={clearFilters}>
                <FilterX aria-hidden="true" /> Limpar filtros
              </button>
            )}
          </div>
        </S.OrdersToolbar>

        {displayedOrders.length ? (
          <S.OrdersList aria-busy={cancellingOrderId !== null || confirmingPaymentId !== null}>
            {displayedOrders.map((order) => {
              const payment = getOrderPaymentPresentation(order);
              const progress = getOrderProgress(order.status);
              const statusLabel =
                statusLabels[order.status] ??
                order.status.replaceAll('_', ' ').toLocaleLowerCase('pt-BR');
              const isCancelled = order.status === 'CANCELADO';
              const isFinished = isCancelled || order.status === 'ENTREGUE';
              const isRefundProcessing = order.refundStatus === 'PROCESSING';
              const isCancelling = cancellingOrderId === order.numericId;
              const isConfirmingPayment = confirmingPaymentId === order.numericId;

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
                        <b>{payment.title}</b>
                        <small>{payment.detail}</small>
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

                  <footer className="order-actions">
                    {order.refundStatus === 'SUCCEEDED' ? (
                      <span className="operation-note refund-note">
                        <CheckCircle2 aria-hidden="true" />
                        Estorno concluído no mesmo meio de pagamento
                      </span>
                    ) : isRefundProcessing ? (
                      <span className="operation-note processing-note">
                        <LoaderCircle className="loading-icon" aria-hidden="true" />
                        Estorno em processamento; aguarde a confirmação
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
                    ) : (
                      <span className="operation-note finished-note">
                        {isFinished ? (
                          <>
                            <CheckCircle2 aria-hidden="true" /> Pedido finalizado
                          </>
                        ) : (
                          'Sem cobrança online confirmada'
                        )}
                      </span>
                    )}

                    {!isFinished && !isRefundProcessing && (
                      <div className="action-buttons">
                        {!order.paid && order.payOnDelivery && (
                          <button
                            className="confirm-payment"
                            type="button"
                            onClick={() => void confirmPayment(order)}
                            disabled={isConfirmingPayment || isCancelling}
                            aria-label={`Confirmar pagamento do pedido ${order.id}`}
                          >
                            {isConfirmingPayment ? (
                              <LoaderCircle className="loading-icon" aria-hidden="true" />
                            ) : (
                              <CheckCircle2 aria-hidden="true" />
                            )}
                            {isConfirmingPayment ? 'Confirmando...' : 'Confirmar pagamento'}
                          </button>
                        )}
                        <button
                          className="cancel-order"
                          type="button"
                          onClick={() => void cancelOrder(order)}
                          disabled={isCancelling || isConfirmingPayment}
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
        ) : (
          <S.OrdersEmpty>
            <span aria-hidden="true">{orders.length ? <Search /> : <ShoppingBag />}</span>
            <h3>{orders.length ? 'Nenhum pedido encontrado' : 'Sua fila está vazia'}</h3>
            <p>
              {orders.length
                ? 'Ajuste a busca ou escolha outra visualização para encontrar o pedido.'
                : 'Os novos pedidos aparecerão aqui automaticamente, sem precisar atualizar a página.'}
            </p>
            {hasFilters && (
              <button type="button" onClick={clearFilters}>
                <FilterX aria-hidden="true" /> Limpar filtros
              </button>
            )}
          </S.OrdersEmpty>
        )}

        <S.OrdersPagination>
          <span>
            {visibleOrders.length === 0
              ? 'Nenhum pedido para exibir'
              : `Exibindo ${displayedOrders.length} de ${visibleOrders.length} pedidos`}
          </span>
          <div>
            {visibleLimit > LIST_BATCH_SIZE ? (
              <button
                type="button"
                aria-label="Voltar aos 10 pedidos iniciais"
                onClick={() => setVisibleLimit(LIST_BATCH_SIZE)}
              >
                <ChevronLeft aria-hidden="true" /> Voltar aos 10 iniciais
              </button>
            ) : null}
            {displayedOrders.length < visibleOrders.length ? (
              <button
                type="button"
                aria-label="Mostrar mais 10 pedidos"
                onClick={() =>
                  setVisibleLimit((current) =>
                    Math.min(current + LIST_BATCH_SIZE, visibleOrders.length),
                  )
                }
              >
                Mostrar mais 10 <ChevronDown aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </S.OrdersPagination>
      </S.OrdersPanel>
    </S.OrdersWorkspace>
  );
}
