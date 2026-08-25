import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bike,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CookingPot,
  CreditCard,
  LoaderCircle,
  PackageCheck,
  QrCode,
  Search,
  ShieldCheck,
  ShoppingBag,
  Undo2,
  Utensils,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAppDialog } from '../../../components/AppDialog/context';
import * as S from '../Admin.styles';
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

type AdminOrdersProps = {
  orders: AdminOrder[];
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

const PAGE_SIZE = 5;
const PROGRESS_STEPS = 5;

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

export function AdminOrders({ orders, money, onConfirmPayment, onCancelOrder }: AdminOrdersProps) {
  const { confirmDialog } = useAppDialog();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<number | null>(null);
  const visibleOrders = useMemo(
    () => filterAdminOrders(orders, search, status),
    [orders, search, status],
  );
  const summary = useMemo(() => getAdminOrdersSummary(orders), [orders]);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageOrders = visibleOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const updateStatus = (value: string) => {
    setStatus(value);
    setPage(1);
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
      <S.OrdersSummary aria-label="Resumo dos pedidos">
        <article>
          <span className="summary-icon active">
            <ShoppingBag aria-hidden="true" />
          </span>
          <div>
            <small>Pedidos ativos</small>
            <strong>{summary.active}</strong>
            <p>Precisam de acompanhamento</p>
          </div>
        </article>
        <article>
          <span className="summary-icon payment">
            <CircleDollarSign aria-hidden="true" />
          </span>
          <div>
            <small>Aguardando pagamento</small>
            <strong>{summary.awaitingPayment}</strong>
            <p>Confirme somente após receber</p>
          </div>
        </article>
        <article>
          <span className="summary-icon progress">
            <CookingPot aria-hidden="true" />
          </span>
          <div>
            <small>Em andamento</small>
            <strong>{summary.inProgress}</strong>
            <p>Preparo, pronto ou em rota</p>
          </div>
        </article>
        <article>
          <span className="summary-icon delivered">
            <PackageCheck aria-hidden="true" />
          </span>
          <div>
            <small>Entregues</small>
            <strong>{summary.delivered}</strong>
            <p>Pedidos concluídos</p>
          </div>
        </article>
      </S.OrdersSummary>

      <S.OrdersPanel>
        <S.OrdersPanelHeader>
          <div>
            <small>GESTÃO DE PEDIDOS</small>
            <h2>Fila de atendimento</h2>
            <p>Pagamento, modalidade, andamento e ações organizados em um só lugar.</p>
          </div>
          <span className="live-status">
            <Activity size={15} aria-hidden="true" />
            Sincronizado em tempo real
          </span>
        </S.OrdersPanelHeader>

        <S.OrdersToolbar>
          <label className="search-field">
            <span>Buscar</span>
            <div>
              <Search size={17} aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Número do pedido ou cliente"
                aria-label="Buscar pedido por número ou cliente"
              />
            </div>
          </label>
          <label className="status-filter">
            <span>Status</span>
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
              <ChevronDown size={16} aria-hidden="true" />
            </div>
          </label>
          <span className="results-count" role="status" aria-live="polite">
            {visibleOrders.length}{' '}
            {visibleOrders.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
          </span>
        </S.OrdersToolbar>

        {pageOrders.length ? (
          <S.OrdersList aria-busy={cancellingOrderId !== null || confirmingPaymentId !== null}>
            {pageOrders.map((order) => {
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
                <article className="order-card" key={order.numericId}>
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
                    <span className={`order-status status-${order.status.toLowerCase()}`}>
                      <i aria-hidden="true" />
                      {statusLabel}
                    </span>
                  </header>

                  <div className="order-details">
                    <div className={`detail payment-detail tone-${payment.tone}`}>
                      <span className="detail-icon">
                        <PaymentIcon method={order.payOnDeliveryMethod || order.paymentMethod} />
                      </span>
                      <div>
                        <span>Pagamento</span>
                        <b>{payment.title}</b>
                        <small>{payment.detail}</small>
                      </div>
                    </div>
                    <div className="detail">
                      <span className="detail-icon neutral">
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
                    <div>
                      <span>Andamento do pedido</span>
                      <b>{statusLabel}</b>
                    </div>
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
                          key={index}
                          data-active={!isCancelled && index < progress}
                          aria-hidden="true"
                        />
                      ))}
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
            <Search aria-hidden="true" />
            <h3>Nenhum pedido encontrado</h3>
            <p>Ajuste a busca ou escolha outro status para visualizar os pedidos.</p>
            {(search || status) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatus('');
                  setPage(1);
                }}
              >
                Limpar filtros
              </button>
            )}
          </S.OrdersEmpty>
        )}

        <S.OrdersPagination>
          <span>
            {visibleOrders.length === 0
              ? 'Nenhum pedido para exibir'
              : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, visibleOrders.length)} de ${visibleOrders.length}`}
          </span>
          <div>
            <button
              type="button"
              aria-label="Ir para a página anterior de pedidos"
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft size={16} aria-hidden="true" /> Anteriores
            </button>
            <b>
              Página {currentPage} de {totalPages}
            </b>
            <button
              type="button"
              aria-label="Ir para a próxima página de pedidos"
              disabled={currentPage === totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Próximos <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </S.OrdersPagination>
      </S.OrdersPanel>
    </S.OrdersWorkspace>
  );
}
