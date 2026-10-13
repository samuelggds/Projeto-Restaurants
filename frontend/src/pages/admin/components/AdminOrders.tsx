import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  Activity, AlertTriangle, Bike, ChevronDown, ChevronLeft, CookingPot,
  FilterX, PackageCheck, RefreshCw, Search, ShoppingBag, Sparkles,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAppDialog } from '../../../components/AppDialog/context';
import * as S from './AdminOrders.styles';
import { SplitLayout } from './AdminOrderDetail.styles';
import { AdminOrderDetail, type PendingTableCash } from './AdminOrderDetail';
import {
  ADMIN_ORDER_STATUS_LABELS, formatOrderCreatedAt,
} from '../domain/adminOrderDetailPresentation';
import type { AdminOrder } from '../types';
import ordersService, { type RestaurantOrdersQueue } from '../../../Services/ordersService';
import tableAccountService from '../../../Services/tableAccountService';
import {
  ADMIN_ORDERS_PAGE_SIZE, useAdminOrdersPage, type LoadAdminOrdersPage,
} from '../hooks/useAdminOrdersPage';
import { adminErrorMessage } from '../utils/adminErrorMessage';
import { useAdminOrderCancellation } from '../hooks/useAdminOrderCancellation';
import { getOrderTypeLabel, getPaymentMethodLabel } from '../domain/adminOrders';

type QueueView = RestaurantOrdersQueue;
type PendingTableCashByOrderPublicId = Record<string, PendingTableCash>;

async function readPendingTableCashByOrderPublicId(): Promise<PendingTableCashByOrderPublicId> {
  const result = await tableAccountService.listAdminSessions();
  const next: PendingTableCashByOrderPublicId = {};
  for (const session of Array.isArray(result?.sessions) ? result.sessions : []) {
    for (const payment of Array.isArray(session?.pendingManualPayments) ? session.pendingManualPayments : []) {
      if (payment?.method !== 'CASH' || payment?.staffReceiptRegistered !== true || !payment?.publicId) continue;
      for (const orderPublicId of Array.isArray(payment?.orderPublicIds) ? payment.orderPublicIds : []) {
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
  onUpdateOrderStatus?: (id: number, status: string) => Promise<void>;
  loadOrdersPage?: LoadAdminOrdersPage;
  renderPickupPayment?: (order: AdminOrder) => ReactNode;
};

export function AdminOrders({
  orders, restaurantName, money, onConfirmPayment, onCancelOrder,
  onUpdateOrderStatus, loadOrdersPage, renderPickupPayment,
}: AdminOrdersProps) {
  const { confirmDialog } = useAppDialog();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | 'DELIVERY' | 'RETIRADA' | 'MESA'>('');
  const [paymentFilter, setPaymentFilter] = useState<'' | 'PIX' | 'CARTAO' | 'DINHEIRO'>('');
  const [periodFilter, setPeriodFilter] = useState<'ALL' | 'TODAY'>('ALL');
  const [changingStatusId, setChangingStatusId] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(true);
  const detailId = useId();
  const queueRef = useRef<HTMLElement>(null);
  const [status, setStatus] = useState('');
  const [queueView, setQueueView] = useState<QueueView>('ALL');
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<number | null>(null);
  const [confirmingTableCashId, setConfirmingTableCashId] = useState('');
  const [tableCashByOrderPublicId, setTableCashByOrderPublicId] = useState<PendingTableCashByOrderPublicId>({});
  const [checkingRefundId, setCheckingRefundId] = useState<number | null>(null);
  const [printingOrderId, setPrintingOrderId] = useState<number | null>(null);
  const printInFlight = useRef(false);
  const page = useAdminOrdersPage({
    search, status, queue: queueView, typeFilter, paymentFilter, periodFilter,
    refreshSignal: orders, loadOrdersPage,
  });
  const { summary, orders: displayedOrders } = page;
  const selectedOrder = displayedOrders.find((order) => order.numericId === selectedOrderId) ?? displayedOrders[0];
  const pendingTableCash = selectedOrder?.publicId && !selectedOrder.paid
    ? tableCashByOrderPublicId[selectedOrder.publicId] ?? null : null;

  const refreshPendingTableCash = async () => {
    try {
      setTableCashByOrderPublicId(await readPendingTableCashByOrderPublicId());
    } catch {
      // A failed financial read must never enable a fallback payment confirmation.
      setTableCashByOrderPublicId({});
    }
  };

  useEffect(() => {
    let active = true;
    void readPendingTableCashByOrderPublicId().then((next) => {
      if (active) setTableCashByOrderPublicId(next);
    }).catch(() => {
      if (active) setTableCashByOrderPublicId({});
    });
    return () => { active = false; };
  }, [orders]);

  const { cancelOrder, cancellingOrderId } = useAdminOrderCancellation({
    money, onCancelOrder, onCancelled: page.refresh,
  });
  const hasFilters = Boolean(search || status || queueView !== 'ALL' || typeFilter || paymentFilter || periodFilter !== 'ALL');

  const updateStatus = (value: string) => { setStatus(value); setQueueView('ALL'); };
  const selectQueueView = (view: QueueView) => { setQueueView(view); setStatus(''); };
  const clearFilters = () => {
    setSearch(''); setStatus(''); setQueueView('ALL'); setTypeFilter(''); setPaymentFilter(''); setPeriodFilter('ALL');
  };
  const selectOrder = (id: number) => { setSelectedOrderId(id); setDetailOpen(true); };
  const closeDetail = () => {
    setDetailOpen(false);
    // Closing is presentation-only: keep filters, pagination and payment state.
    queueRef.current?.querySelector<HTMLButtonElement>(`[data-order-id="${selectedOrder?.numericId}"]`)?.focus({ preventScroll: true });
  };

  const changeOrderStatus = async (order: AdminOrder, nextStatus: string) => {
    if (!onUpdateOrderStatus || changingStatusId !== null) return;
    const confirmed = await confirmDialog({
      title: `Atualizar andamento do pedido ${order.id}?`,
      description: 'A atualização será validada pelo servidor e pelas regras operacionais.',
      confirmLabel: 'Confirmar alteração', cancelLabel: 'Voltar',
    });
    if (!confirmed) return;
    setChangingStatusId(order.numericId);
    try {
      await onUpdateOrderStatus(order.numericId, nextStatus);
      await page.refresh();
      toast.success(`Pedido ${order.id} atualizado.`);
    } catch (error) {
      toast.error(adminErrorMessage(error, 'Não foi possível atualizar o pedido.'));
    } finally { setChangingStatusId(null); }
  };

  const confirmPayment = async (order: AdminOrder) => {
    const method = getPaymentMethodLabel(order.payOnDeliveryMethod || order.paymentMethod);
    const confirmed = await confirmDialog({
      title: `Confirmar recebimento do pedido ${order.id}?`,
      description: `Confirme somente se você já recebeu ${money(order.total)} via ${method} na entrega. Esta ação marcará o pedido como pago.`,
      confirmLabel: 'Confirmar recebimento', cancelLabel: 'Voltar',
    });
    if (!confirmed) return;
    setConfirmingPaymentId(order.numericId);
    try {
      await onConfirmPayment(order.numericId);
      await page.refresh();
      toast.success(`Pagamento do pedido ${order.id} confirmado.`);
    } catch (error) {
      toast.error(adminErrorMessage(error, 'Não foi possível confirmar o pagamento.'));
    } finally { setConfirmingPaymentId(null); }
  };

  const confirmTableCashPayment = async (order: AdminOrder, payment: PendingTableCash) => {
    const confirmed = await confirmDialog({
      title: `Confirmar dinheiro recebido do pedido ${order.id}?`,
      description: `${payment.payerDisplayName} · ${money(payment.totalCents / 100)}. O garçom já registrou o recebimento. Confirme somente depois de conferir o caixa; esta ação marca o pagamento da mesa como PAGO.`,
      confirmLabel: 'Confirmar dinheiro recebido', cancelLabel: 'Voltar e conferir',
    });
    if (!confirmed) return;
    setConfirmingTableCashId(payment.paymentPublicId);
    try {
      await tableAccountService.confirmManualPayment(payment.paymentPublicId);
      await Promise.all([page.refresh(), refreshPendingTableCash()]);
      toast.success(`Pagamento em dinheiro do pedido ${order.id} confirmado.`);
    } catch (error) {
      toast.error(adminErrorMessage(error, 'Não foi possível confirmar o pagamento em dinheiro da mesa.'));
    } finally { setConfirmingTableCashId(''); }
  };

  const checkRefund = async (order: AdminOrder) => {
    setCheckingRefundId(order.numericId);
    try {
      const result = await ordersService.reconcileOrderRefund(order.numericId);
      await page.refresh();
      toast.success(result.refunded ? 'Estorno confirmado pelo provedor.' : 'Consulta concluída; nenhuma nova devolução foi solicitada.');
    } catch (error) {
      toast.error(adminErrorMessage(error, 'Não foi possível consultar o estorno. Tente novamente.'));
    } finally { setCheckingRefundId(null); }
  };

  const printOrder = async (order: AdminOrder) => {
    if (printInFlight.current) return;
    printInFlight.current = true;
    try {
      const confirmed = await confirmDialog({
        title: `Imprimir pedido ${order.id}?`,
        description: 'A comanda será enviada à fila de impressão deste restaurante. Isso não altera o pagamento nem o andamento do pedido.',
        confirmLabel: 'Enviar para impressão', cancelLabel: 'Voltar',
      });
      if (!confirmed) return;
      setPrintingOrderId(order.numericId);
      await ordersService.reprintKitchenOrder(order.numericId);
      toast.success(`Comanda do pedido ${order.id} enviada à fila de impressão.`);
    } catch (error) {
      toast.error(adminErrorMessage(error, 'Não foi possível enviar a comanda para impressão.'));
    } finally {
      printInFlight.current = false;
      setPrintingOrderId(null);
    }
  };

  return (
    <S.OrdersWorkspace>
      <header className="orders-command-header">
        <div><h1>Gestão de pedidos</h1><p>Acompanhe a operação em tempo real e mantenha o salão fluindo.</p></div>
        <div className="command-context"><span><Activity aria-hidden="true" />Operação em acompanhamento</span><span><ShoppingBag aria-hidden="true" />{restaurantName}</span></div>
      </header>
      <section className="orders-metrics" aria-label="Indicadores operacionais">
        {([
          { label: 'Novos pedidos', value: summary.pending, icon: Sparkles, status: 'PENDENTE' },
          { label: 'Em preparo', value: summary.preparing, icon: CookingPot, status: 'PREPARANDO' },
          { label: 'Prontos', value: summary.ready, icon: PackageCheck, status: 'PRONTO' },
          { label: 'Em entrega', value: summary.onDelivery, icon: Bike, status: 'SAIU_PARA_ENTREGA' },
          { label: 'Aguardam pagamento', value: summary.awaitingPayment, icon: AlertTriangle, status: 'PAYMENT' },
        ] as const).map((metric) => <button key={metric.label} type="button" className="metric-card"
          aria-label={`Ver ${metric.label.toLowerCase()}`} onClick={() => metric.status === 'PAYMENT' ? selectQueueView('PAYMENT') : updateStatus(metric.status)}>
          <span>{metric.label}</span><metric.icon aria-hidden="true" /><strong>{metric.value ?? '—'}</strong>
        </button>)}
      </section>
      <div className="orders-filters" aria-label="Filtros de pedidos">
        <label className="orders-search"><Search aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nº ou cliente..." aria-label="Buscar pedido por número ou cliente" /></label>
        <label><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} aria-label="Filtrar modalidade"><option value="">Modalidade</option><option value="DELIVERY">Entrega</option><option value="RETIRADA">Retirada</option><option value="MESA">Mesa</option></select></label>
        <label><select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as typeof paymentFilter)} aria-label="Filtrar pagamento"><option value="">Pagamento</option><option value="PIX">Pix</option><option value="CARTAO">Cartão</option><option value="DINHEIRO">Dinheiro</option></select></label>
        <label><select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as typeof periodFilter)} aria-label="Filtrar período"><option value="ALL">Todo o período</option><option value="TODAY">Hoje</option></select></label>
        <button type="button" className="filters-clear" onClick={clearFilters} aria-label="Limpar filtros" disabled={!hasFilters}><FilterX aria-hidden="true" /></button>
      </div>
      <S.OrdersPanel>
        <S.OrdersPanelHeader>
          <div><span className="section-icon" aria-hidden="true"><ShoppingBag /></span><span><small>OPERAÇÃO EM TEMPO REAL</small><h2>Fila atual</h2><p>Encontre o pedido certo e acompanhe a próxima ação.</p></span></div>
          <div className="orders-live-actions"><span className="live-status"><Activity aria-hidden="true" />{page.loading ? 'Atualizando pedidos...' : page.error ? 'A atualização está pendente' : 'Pedidos atualizados'}</span><button type="button" className="orders-refresh" disabled={page.loading} aria-label="Atualizar pedidos" onClick={() => void page.refresh()}><RefreshCw aria-hidden="true" />Atualizar</button></div>
        </S.OrdersPanelHeader>
        <S.QueueTabs aria-label="Visualizações rápidas da fila">
          <button type="button" aria-label="Mostrar todos os pedidos" aria-pressed={queueView === 'ALL'} onClick={() => selectQueueView('ALL')}>Todos <span>{summary.total}</span></button>
          <button type="button" aria-label="Mostrar pedidos ativos" aria-pressed={queueView === 'ACTIVE'} onClick={() => selectQueueView('ACTIVE')}>Ativos <span>{summary.active}</span></button>
          <button type="button" aria-label="Mostrar pedidos aguardando pagamento" aria-pressed={queueView === 'PAYMENT'} onClick={() => selectQueueView('PAYMENT')}>Pagamento <span>{summary.awaitingPayment}</span></button>
          <button type="button" aria-label="Mostrar pedidos em andamento" aria-pressed={queueView === 'IN_PROGRESS'} onClick={() => selectQueueView('IN_PROGRESS')}>Em andamento <span>{summary.inProgress}</span></button>
          <button type="button" aria-label="Mostrar pedidos concluídos" aria-pressed={queueView === 'DELIVERED'} onClick={() => selectQueueView('DELIVERED')}>Concluídos <span>{summary.delivered}</span></button>
          <button type="button" aria-pressed={status === 'CANCELADO'} onClick={() => updateStatus('CANCELADO')}>Cancelados <span>{summary.cancelled ?? '—'}</span></button>
        </S.QueueTabs>
        {page.error ? <S.OrdersEmpty role="alert"><p>{page.error}</p><button type="button" disabled={page.loading} onClick={() => void page.retry()}>Tentar novamente</button></S.OrdersEmpty> : null}
        {displayedOrders.length ? (
          <SplitLayout className="orders-split-view" data-detail-open={detailOpen}>
            <nav ref={queueRef} className="order-compact-list" aria-label="Selecionar pedido para detalhes">
              <div className="queue-list-head">Fila atual <span>{page.total} pedidos</span></div>
              <div className="queue-columns" aria-hidden="true"><span>Pedido</span><span>Modalidade</span><span>Pagamento</span><span>Total</span><span>Situação</span></div>
              {displayedOrders.map((item) => <button key={item.numericId} type="button" data-order-id={item.numericId}
                aria-label={`Ver detalhes do pedido ${item.id} de ${item.customerName}`}
                aria-controls={detailId}
                aria-expanded={detailOpen && selectedOrder?.numericId === item.numericId}
                className={detailOpen && selectedOrder?.numericId === item.numericId ? 'selected' : ''}
                aria-current={detailOpen && selectedOrder?.numericId === item.numericId ? 'true' : undefined}
                onClick={() => selectOrder(item.numericId)}>
                <span className="compact-identity"><b>{item.id} <span>{item.customerName}</span></b><small>{getOrderTypeLabel(item.type)} · {formatOrderCreatedAt(item.createdAt)}</small></span>
                <span className="compact-modality">{getOrderTypeLabel(item.type)}</span><span className="compact-payment">{getPaymentMethodLabel(item.payOnDeliveryMethod || item.paymentMethod)}</span><span className="compact-value">{money(item.total)}</span><span className={`compact-status tone-${item.status.toLowerCase()}`}>{ADMIN_ORDER_STATUS_LABELS[item.status] ?? item.status}</span>
              </button>)}
            </nav>
            <div id={detailId} className="selected-order-detail" role="region" aria-label="Detalhes e ações do pedido selecionado" aria-hidden={!detailOpen} inert={!detailOpen}
              aria-busy={page.loading || cancellingOrderId !== null || confirmingPaymentId !== null}>
              {selectedOrder ? <AdminOrderDetail key={selectedOrder.numericId} order={selectedOrder} money={money} pendingTableCash={pendingTableCash}
                busy={{ payment: confirmingPaymentId !== null, tablePayment: Boolean(confirmingTableCashId), cancel: cancellingOrderId !== null, status: changingStatusId !== null, refund: checkingRefundId !== null, print: printingOrderId !== null }}
                onClose={closeDetail} onPrint={() => void printOrder(selectedOrder)} onCancel={() => void cancelOrder(selectedOrder)}
                onConfirmPayment={() => void confirmPayment(selectedOrder)} onConfirmTableCash={() => { if (pendingTableCash) void confirmTableCashPayment(selectedOrder, pendingTableCash); }}
                onCheckRefund={() => void checkRefund(selectedOrder)} onChangeStatus={onUpdateOrderStatus ? (nextStatus) => void changeOrderStatus(selectedOrder, nextStatus) : undefined}
                onRefresh={() => void page.refresh()} renderPickupPayment={renderPickupPayment} /> : null}
            </div>
          </SplitLayout>
        ) : page.loading ? <S.OrdersEmpty role="status"><p>Carregando pedidos...</p></S.OrdersEmpty> : !page.error ? (
          <S.OrdersEmpty><span aria-hidden="true">{summary.total ? <Search /> : <ShoppingBag />}</span><h3>{summary.total ? 'Nenhum pedido encontrado' : 'Sua fila está vazia'}</h3><p>{summary.total ? 'Ajuste a busca ou escolha outra visualização para encontrar o pedido.' : 'Os novos pedidos aparecerão aqui automaticamente, sem precisar atualizar a página.'}</p>{hasFilters ? <button type="button" onClick={clearFilters}><FilterX aria-hidden="true" />Limpar filtros</button> : null}</S.OrdersEmpty>
        ) : null}
        <S.OrdersPagination>
          <span>{page.loading && !displayedOrders.length ? 'Carregando pedidos...' : page.total === 0 ? 'Nenhum pedido para exibir' : `Exibindo ${displayedOrders.length} de ${page.total} pedidos`}</span>
          <div>{displayedOrders.length > ADMIN_ORDERS_PAGE_SIZE ? <button type="button" aria-label="Voltar aos 10 pedidos iniciais" disabled={page.loading} onClick={() => void page.reset()}><ChevronLeft aria-hidden="true" />Voltar aos 10 iniciais</button> : null}{page.hasMore ? <button type="button" aria-label="Mostrar mais 10 pedidos" disabled={page.loading} onClick={() => void page.loadMore()}>{page.loading ? 'Carregando...' : 'Mostrar mais 10'} <ChevronDown aria-hidden="true" /></button> : null}</div>
        </S.OrdersPagination>
      </S.OrdersPanel>
    </S.OrdersWorkspace>
  );
}
