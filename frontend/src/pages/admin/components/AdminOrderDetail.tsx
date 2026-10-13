import { lazy, Suspense, useId, useState, type ReactNode } from 'react';
import {
  AlertCircle, AlertTriangle, Banknote, Bike, Check, CheckCircle2, ChefHat,
  ChevronDown, Clock3, Info, LoaderCircle, MessageSquare, PackageCheck,
  Printer, QrCode, ShieldCheck, ShoppingBag, Utensils, X,
} from 'lucide-react';
import type { AdminOrder } from '../types';
import {
  canCancelAdminOrder, getOrderPaymentPresentation, getOrderProgress,
  getOrderTypeLabel, getPaymentMethodLabel, isOrderWaitingForCapacity,
} from '../domain/adminOrders';
import {
  ADMIN_ORDER_STATUS_LABELS, formatOrderCreatedAt, getRecordedOrderHistory,
} from '../domain/adminOrderDetailPresentation';
import { LalamoveFreightQuote } from './LalamoveFreightQuote';
import * as S from './AdminOrderDetail.styles';

const PickupPaymentPanel = lazy(() => import('./PickupPaymentPanel'));

export type PendingTableCash = {
  paymentPublicId: string;
  totalCents: number;
  payerDisplayName: string;
};

export type OrderDetailBusy = {
  payment: boolean;
  tablePayment: boolean;
  cancel: boolean;
  status: boolean;
  refund: boolean;
  print: boolean;
};

type Props = {
  order: AdminOrder;
  money: (value: number) => string;
  pendingTableCash?: PendingTableCash | null;
  busy: OrderDetailBusy;
  onClose: () => void;
  onPrint: () => void;
  onCancel: () => void;
  onConfirmPayment: () => void;
  onConfirmTableCash: () => void;
  onCheckRefund: () => void;
  onChangeStatus?: (status: string) => void;
  onRefresh: () => void;
  renderPickupPayment?: (order: AdminOrder) => ReactNode;
};

export function AdminOrderDetail({
  order, money, pendingTableCash, busy, onClose, onPrint, onCancel,
  onConfirmPayment, onConfirmTableCash, onCheckRefund, onChangeStatus,
  onRefresh, renderPickupPayment,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();
  const payment = getOrderPaymentPresentation(order);
  const waitingForCapacity = isOrderWaitingForCapacity(order);
  const statusLabel = waitingForCapacity ? 'Aguardando vaga'
    : ADMIN_ORDER_STATUS_LABELS[order.status] ?? order.status.replaceAll('_', ' ');
  const type = String(order.type || '').toUpperCase();
  const isTable = ['MESA', 'TABLE', 'TABLE_SESSION'].includes(type);
  const isPickup = type === 'RETIRADA';
  const isCancelled = order.status === 'CANCELADO';
  const isFinished = isCancelled || order.status === 'ENTREGUE';
  const refundPending = order.refundStatus === 'PROCESSING';
  const hasRefund = Boolean(order.refundStatus && order.refundStatus !== 'NOT_REQUESTED');
  const method = String(order.payOnDeliveryMethod || order.paymentMethod || '').trim().toUpperCase();
  const isCounterPayment = isPickup && !order.paid && !order.paymentMethod && !order.payOnDelivery;
  // Reuse existing receipt workflows. Online approval is never a manual action.
  const canConfirmDeliveryCash = !isTable && !isCancelled && !hasRefund &&
    !order.paid && order.payOnDelivery === true && method === 'DINHEIRO';
  const canConfirmTableCash = isTable && !isCancelled && !hasRefund &&
    !order.paid && Boolean(pendingTableCash);
  const financialBusy = busy.payment || busy.tablePayment || busy.cancel || busy.refund;
  const canQuote = type === 'DELIVERY' && order.paid === true && !order.payOnDelivery &&
    !order.assignedCourierId && !hasRefund && ['PENDENTE', 'PREPARANDO', 'PRONTO'].includes(order.status);
  const canProgress = Boolean(onChangeStatus) && !waitingForCapacity &&
    (order.paid || order.payOnDelivery || !['PIX', 'CARTAO'].includes(String(order.paymentMethod || '').toUpperCase())) &&
    !isFinished && !refundPending;
  const progress = getOrderProgress(order.status);
  const steps = [
    { label: 'Recebido', Icon: Check },
    { label: 'Preparo', Icon: ChefHat },
    { label: 'Pronto', Icon: PackageCheck },
    { label: isTable ? 'Servir' : isPickup ? 'Retirada' : 'Despachar', Icon: isTable ? Utensils : isPickup ? ShoppingBag : Bike },
    { label: 'Concluir', Icon: CheckCircle2 },
  ];
  const history = getRecordedOrderHistory(order);
  const paymentHeading = hasRefund ? payment.title
    : order.paid && payment.automaticRefund ? 'Pagamento online · Pago'
      : order.paid ? payment.title
        : isCounterPayment ? 'Pagamento no balcão'
          : isTable ? 'Pagamento da mesa' : payment.title;
  const notice = isCancelled ? 'Pedido cancelado'
    : waitingForCapacity ? 'Aguardando vaga para iniciar o preparo'
      : order.status === 'PRONTO' && isCounterPayment ? 'Pronto para retirada · pagamento no balcão pendente'
        : order.status === 'PRONTO' && isTable && !order.paid ? 'Pedido pronto · pagamento da mesa pendente'
          : `${statusLabel} · ${payment.title}`;

  return (
    <S.DetailPanel className={`order-card status-${order.status.toLowerCase()}`} aria-label={`Informações do pedido ${order.id}`}>
      <header className="detail-header">
        <div className="detail-identity">
          <div className="detail-title-row">
            <h3>Pedido {order.id}</h3>
            <span className="order-status" data-status={order.status}><i aria-hidden="true" />{statusLabel}</span>
          </div>
          <p>{order.customerName} · {formatOrderCreatedAt(order.createdAt)} · {getOrderTypeLabel(order.type)}{isTable && order.tableNumber !== undefined ? ` · Mesa ${order.tableNumber}` : ''}</p>
        </div>
        <div className="detail-header-actions">
          <button type="button" title="Imprimir comanda" aria-label={`Imprimir pedido ${order.id}`} onClick={onPrint} disabled={busy.print}>
            {busy.print ? <LoaderCircle className="detail-spinner" aria-hidden="true" /> : <Printer aria-hidden="true" />}
          </button>
          <button type="button" title="Fechar detalhes" aria-label="Fechar detalhes do pedido" onClick={onClose}><X aria-hidden="true" /></button>
        </div>
      </header>
      <div className="detail-notice" data-tone={isCancelled || !order.paid || hasRefund ? 'warning' : 'success'}>
        <Info aria-hidden="true" /><span>{notice}</span>
      </div>
      <section className="detail-progress" aria-label="Andamento do pedido">
        <h4>Andamento do pedido</h4>
        <div className="detail-steps" role="progressbar" aria-label={`Andamento do pedido ${order.id}`} aria-valuemin={0} aria-valuemax={5} aria-valuenow={progress} aria-valuetext={statusLabel}>
          {steps.map(({ label, Icon }, index) => (
            <div key={label} className="detail-step" data-complete={!isCancelled && index + 1 < progress} data-current={!isCancelled && index + 1 === progress} aria-hidden="true">
              <span className="detail-step-icon">{index + 1 < progress && !isCancelled ? <Check /> : <Icon />}</span><span>{label}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="detail-items" aria-label="Itens do pedido">
        <div className="detail-section-heading"><h4>Itens do pedido</h4><span>{order.items?.length ?? 0} {order.items?.length === 1 ? 'item' : 'itens'}</span></div>
        {order.items?.length ? order.items.map((item, index) => (
          <div className="detail-item" key={`${item.id}-${index}`}>
            <span className="detail-quantity">{item.quantity}×</span>
            <div><strong>{item.name}</strong>{item.options.map((option, optionIndex) => <small key={optionIndex}>{option}</small>)}{item.observation ? <small>Observação: {item.observation}</small> : null}</div>
            <b>{item.unitPrice === undefined ? '—' : money(item.unitPrice * item.quantity)}</b>
          </div>
        )) : <p className="detail-muted">Itens indisponíveis nesta consulta.</p>}
        {order.observation ? <p className="detail-observation"><MessageSquare aria-hidden="true" /><span>Observação: {order.observation}</span></p> : null}
      </section>
      <section className="detail-payment" aria-label={`Pagamento do pedido ${order.id}`}>
        {isCounterPayment && !isFinished && !hasRefund ? (
          renderPickupPayment ? renderPickupPayment(order) : (
            <Suspense fallback={<p className="detail-muted" role="status">Carregando pagamento no balcão…</p>}>
              <PickupPaymentPanel key={order.numericId} compact orderId={order.numericId} total={order.total} preferredMethod={order.payOnDeliveryMethod} onPaid={onRefresh} />
            </Suspense>
          )
        ) : (
          <>
            <div className="detail-section-heading"><h4>{paymentHeading}</h4><b>{money(order.total)}</b></div>
            <div className="detail-payment-state" data-tone={payment.tone}>
              {order.paid && !hasRefund ? <CheckCircle2 aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
              <div><strong>{canConfirmTableCash ? 'Dinheiro recebido pelo garçom' : hasRefund ? payment.title : order.paid ? 'Pago' : 'Pendente'}</strong><small>{canConfirmTableCash ? 'Aguardando confirmação final do administrador' : payment.detail}</small></div>
            </div>
            {isTable && !order.paid && !isCancelled && !hasRefund ? (
              <>
                <div className="detail-table-methods" role="group" aria-label="Formas de pagamento da mesa">
                  <span data-selected={method === 'PIX' && !pendingTableCash}><QrCode aria-hidden="true" />Pix</span>
                  <span data-selected={Boolean(pendingTableCash) || ['DINHEIRO', 'CASH'].includes(method)}><Banknote aria-hidden="true" />Dinheiro</span>
                </div>
                <p className="detail-muted">O pagamento é vinculado à conta da mesa. O Pix é confirmado pelo provedor; o dinheiro exige registro do garçom e conferência do administrador.</p>
              </>
            ) : null}
            {canConfirmTableCash && pendingTableCash ? (
              <>
                <p className="detail-muted">Recebimento de {pendingTableCash.payerDisplayName}: <b>{money(pendingTableCash.totalCents / 100)}</b>. O valor pode abranger mais de um pedido da mesa.</p>
                <button className="detail-receipt" type="button" onClick={onConfirmTableCash} disabled={financialBusy} aria-label={`Confirmar dinheiro recebido do pedido ${order.id}`}>
                  {busy.tablePayment ? <LoaderCircle className="detail-spinner" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}{busy.tablePayment ? 'Confirmando...' : 'Confirmar dinheiro recebido'}
                </button>
              </>
            ) : null}
            {canConfirmDeliveryCash ? <button className="detail-receipt" type="button" onClick={onConfirmPayment} disabled={financialBusy} aria-label={`Confirmar pagamento do pedido ${order.id}`}>{busy.payment ? <LoaderCircle className="detail-spinner" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}{busy.payment ? 'Confirmando...' : 'Confirmar dinheiro recebido'}</button> : null}
          </>
        )}
      </section>
      <div className="detail-financial-history">
        <section className="detail-financial" aria-label="Resumo financeiro"><h4>Resumo financeiro</h4>
          {order.itemsSubtotal !== undefined ? <div><span>Subtotal</span><b>{money(order.itemsSubtotal)}</b></div> : null}
          {order.productDiscountTotal !== undefined && order.productDiscountTotal > 0 ? <div><span>Desconto em produtos</span><b>− {money(order.productDiscountTotal)}</b></div> : null}
          {order.couponDiscount !== undefined && order.couponDiscount > 0 ? <div><span>Cupom {order.couponCode ?? ''}</span><b>− {money(order.couponDiscount)}</b></div> : null}
          {order.deliveryFeeAmount !== undefined && order.deliveryFeeAmount > 0 ? <div><span>Entrega</span><b>{money(order.deliveryFeeAmount)}</b></div> : null}
          <div className="detail-total"><span>Total</span><b>{money(order.total)}</b></div>
        </section>
        <section className="detail-history" aria-label="Histórico registrado"><h4>Histórico de status</h4>{history.length ? <ol>{history.map((event, index) => <li key={event.label} data-latest={index === 0}><strong>{event.label}</strong><time dateTime={event.date}>{formatOrderCreatedAt(event.date)}</time></li>)}</ol> : <p className="detail-muted">Nenhum horário registrado nesta consulta.</p>}</section>
      </div>
      <footer className="detail-footer">
        {waitingForCapacity ? <p className="detail-operation-note" role="status"><Clock3 aria-hidden="true" />Limite simultâneo atingido. O pedido foi recebido e entrará automaticamente na operação assim que uma vaga for liberada.</p> : null}
        {canProgress && order.status === 'PENDENTE' ? <button className="detail-primary" type="button" onClick={() => onChangeStatus?.('PREPARANDO')} disabled={busy.status || financialBusy} aria-label={`Iniciar preparo do pedido ${order.id}`}><ChefHat aria-hidden="true" />{busy.status ? 'Atualizando...' : 'Iniciar preparo'}</button> : null}
        {canProgress && order.status === 'PREPARANDO' ? <button className="detail-primary" type="button" onClick={() => onChangeStatus?.('PRONTO')} disabled={busy.status || financialBusy} aria-label={`Marcar pronto o pedido ${order.id}`}><PackageCheck aria-hidden="true" />{busy.status ? 'Atualizando...' : 'Marcar pronto'}</button> : null}
        {canProgress && order.status === 'PRONTO' && type !== 'DELIVERY' ? <button className="detail-primary" type="button" onClick={() => onChangeStatus?.('ENTREGUE')} disabled={busy.status || financialBusy || !order.paid} aria-label={`Concluir pedido ${order.id}`}><CheckCircle2 aria-hidden="true" />{busy.status ? 'Atualizando...' : 'Concluir pedido'}</button> : null}
        <p className="detail-operation-note">{order.refundStatus === 'SUCCEEDED' ? <><CheckCircle2 aria-hidden="true" />Estorno concluído no mesmo meio de pagamento</>
          : refundPending ? <><LoaderCircle className="detail-spinner" aria-hidden="true" />Cancelamento em conciliação. Consulte o estorno antes de tentar novamente.</>
            : order.refundStatus === 'FAILED' ? <><AlertTriangle aria-hidden="true" />O estorno não foi concluído; tente novamente</>
              : !isFinished && payment.automaticRefund ? <><ShieldCheck aria-hidden="true" />Ao cancelar, o estorno online será solicitado automaticamente</>
                : !isFinished && order.paid && order.payOnDelivery ? <><Banknote aria-hidden="true" />Pagamento na entrega exige devolução manual</>
                  : !isFinished && order.paid ? <><AlertTriangle aria-hidden="true" />Pagamento sem estorno online automático</>
                    : canConfirmDeliveryCash && order.status === 'ENTREGUE' ? 'Entrega concluída · aguardando confirmação do dinheiro'
                      : isFinished ? 'Pedido finalizado' : isCounterPayment ? 'Aguardando pagamento no balcão' : isTable ? 'Pagamento controlado pela conta da mesa' : 'Sem cobrança online confirmada'}</p>
        {refundPending ? <button className="detail-secondary" type="button" onClick={onCheckRefund} disabled={financialBusy} aria-label={`Consultar estorno do pedido ${order.id}`}>{busy.refund ? 'Consultando…' : 'Consultar estorno'}</button> : null}
        <div className="detail-footer-links">
          {canCancelAdminOrder(order) ? <button className="detail-cancel" type="button" onClick={onCancel} disabled={financialBusy} aria-label={`${payment.automaticRefund ? 'Cancelar e estornar' : 'Cancelar'} o pedido ${order.id}`}>{busy.cancel ? 'Processando...' : payment.automaticRefund ? 'Cancelar e estornar' : 'Cancelar pedido'}</button> : <span />}
          <button className="detail-more" type="button" aria-expanded={moreOpen} aria-controls={moreId} onClick={() => setMoreOpen((value) => !value)}>Mais opções<ChevronDown aria-hidden="true" /></button>
        </div>
        <div id={moreId} className="detail-more-content" hidden={!moreOpen}>
          <dl><div><dt>Modalidade</dt><dd>{getOrderTypeLabel(order.type)}{isTable && order.tableNumber !== undefined ? ` · Mesa ${order.tableNumber}` : ''}</dd></div><div><dt>Forma de pagamento</dt><dd>{getPaymentMethodLabel(order.payOnDeliveryMethod || order.paymentMethod)}</dd></div></dl>
          {moreOpen && canQuote ? <LalamoveFreightQuote orderId={order.numericId} /> : moreOpen && type === 'DELIVERY' ? <p className="detail-muted">Entrega parceira disponível para pedidos pagos online, sem entregador atribuído e ainda não despachados.</p> : null}
        </div>
      </footer>
    </S.DetailPanel>
  );
}
