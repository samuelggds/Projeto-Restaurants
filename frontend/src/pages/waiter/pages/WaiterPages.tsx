import {
  BellRing,
  CheckCircle2,
  Clock3,
  Eye,
  Info,
  ReceiptText,
  Trash2,
  Users,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import type { CallStatus, Order, RestaurantTable, ServiceCall, TableStatus } from '../types';
import { useWaiterWorkspace as useWorkspace } from '../useWaiterWorkspace';
import { Empty, MetricCards, OrderItems, StatusBadge, brl } from '../components/Shared';
import { WaiterTableAccountDialog } from '../components/WaiterTableAccountDialog';
import { WAITER_LIST_BATCH_SIZE, WaiterListControls } from '../components/WaiterListControls';
import * as S from '../Waiter.styles';

function getErrorMessage(error: unknown, fallback: string) {
  const typed = error as { response?: { data?: { error?: string } }; message?: string };
  return typed.response?.data?.error || typed.message || fallback;
}

function durationInSeconds(value: string) {
  const parts = value.split(':').map(Number).filter(Number.isFinite);
  if (!parts.length) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function formatAverageDuration(calls: ServiceCall[]) {
  if (!calls.length) return '—';
  const total = calls.reduce((sum, call) => sum + durationInSeconds(call.elapsed), 0);
  const seconds = Math.round(total / calls.length);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function ReadyOrderCard({
  order,
  onOpenOrder,
  onMarkDelivered,
  highlighted = false,
}: {
  order: Order;
  onOpenOrder?: (order: Order) => void;
  onMarkDelivered?: (order: Order) => Promise<void>;
  highlighted?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const detailsId = useId();

  const toggleDetails = () => setExpanded((current) => !current);

  const markDelivered = async () => {
    if (!onMarkDelivered || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onMarkDelivered(order);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Não foi possível confirmar a entrega à mesa.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <S.PriorityOrder
      id={`waiter-ready-order-${encodeURIComponent(order.id.replace(/^#/, ''))}`}
      className={highlighted ? 'highlighted' : undefined}
      $interactive={Boolean(onOpenOrder)}
      role={onOpenOrder ? 'button' : undefined}
      tabIndex={onOpenOrder ? 0 : undefined}
      aria-label={onOpenOrder ? `Abrir pedido ${order.id} em Para entregar` : undefined}
      onClick={onOpenOrder ? () => onOpenOrder(order) : undefined}
      onKeyDown={(event) => {
        if (!onOpenOrder) return;
        if (event.target !== event.currentTarget) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onOpenOrder(order);
      }}
    >
      <div className="identity">
        <b>{order.reference}</b>
        <span>
          Pedido {order.id} • pronto há {order.elapsed}
        </span>
      </div>
      <div className="items">
        <OrderItems order={order} />
        {!onOpenOrder && expanded && (
          <S.OrderDetails
            id={detailsId}
            role="region"
            aria-label={`Detalhes do pedido ${order.id}`}
          >
            <span>
              <small>Cliente</small>
              <b>{order.customer || 'Não informado'}</b>
            </span>
            <span>
              <small>Recebido às</small>
              <b>{order.createdAt}</b>
            </span>
            <span>
              <small>Total</small>
              <b>{brl(order.total)}</b>
            </span>
          </S.OrderDetails>
        )}
      </div>
      <div className="right">
        <StatusBadge status={order.status} />
        {!onOpenOrder && (
          <S.LinkButton
            type="button"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={toggleDetails}
          >
            <Eye size={15} /> {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
          </S.LinkButton>
        )}
        {onMarkDelivered && (
          <S.DeliveryConfirmButton
            type="button"
            onClick={() => void markDelivered()}
            disabled={submitting}
          >
            <CheckCircle2 size={15} />
            {submitting ? 'Confirmando...' : 'Entregue à mesa'}
          </S.DeliveryConfirmButton>
        )}
        {error && <S.ActionError role="alert">{error}</S.ActionError>}
      </div>
    </S.PriorityOrder>
  );
}

export function WaiterOverviewPage({
  onOpenOrder,
  onOpenPayments,
}: {
  onOpenOrder?: (orderId: string) => void;
  onOpenPayments?: () => void;
} = {}) {
  const { orders, tables, calls, accounts } = useWorkspace();
  const ready = orders
    .filter((order) => order.channel === 'TABLE' && order.status === 'PRONTO')
    .sort((left, right) => durationInSeconds(right.elapsed) - durationInSeconds(left.elapsed));
  const waiting = calls.filter((call) => call.status === 'WAITING');
  const openedTables = tables.filter((table) => table.status === 'OCCUPIED');
  const pendingPayments = accounts.flatMap((account) =>
    account.pendingManualPayments.map((payment) => ({ account, payment })),
  );

  return (
    <>
      <S.PageIntro>
        <div>
          <span>RESUMO DO SALÃO</span>
          <h2>O que precisa da sua atenção agora</h2>
          <p>Comece pelos chamados mais antigos e pelos pedidos que já estão prontos.</p>
        </div>
      </S.PageIntro>
      <MetricCards
        items={[
          { label: 'Prontos para entregar', value: ready.length, tone: 'green' },
          { label: 'Chamados aguardando', value: waiting.length, icon: 'calls' },
          {
            label: 'Mesas ocupadas',
            value: tables.filter((table) => table.status === 'OCCUPIED').length,
            icon: 'tables',
          },
          { label: 'Pagamentos para confirmar', value: pendingPayments.length, icon: 'clock' },
        ]}
      />
      <S.Grid>
        <S.Card>
          <header>
            <div>
              <h2>Prontos para entregar</h2>
              <p>A cozinha finalizou estes pedidos. Confira a mesa antes de sair.</p>
            </div>
            <Clock3 aria-hidden="true" />
          </header>
          <S.Stack>
            {ready.slice(0, 4).map((order) => (
              <ReadyOrderCard
                key={order.id}
                order={order}
                onOpenOrder={
                  onOpenOrder ? (currentOrder) => onOpenOrder(currentOrder.id) : undefined
                }
              />
            ))}
            {!ready.length && <Empty>Nenhum pedido pronto para entrega.</Empty>}
          </S.Stack>
        </S.Card>
        <S.Stack>
          <WaiterCallsSummary />
          <S.Card>
            <header>
              <div>
                <h2>Recebimentos presenciais</h2>
                <p>Confirme somente após receber em dinheiro ou na maquininha.</p>
              </div>
              <ReceiptText aria-hidden="true" />
            </header>
            <S.Stack>
              {pendingPayments.slice(0, 3).map(({ account, payment }) => (
                <S.OpenTableRow key={payment.publicId}>
                  <span>
                    <b>Mesa {String(account.tableNumber).padStart(2, '0')}</b>
                    <small>{payment.method === 'CASH' ? 'Dinheiro' : 'Cartão na maquininha'}</small>
                  </span>
                  <strong>{brl(payment.totalCents / 100)}</strong>
                  {onOpenPayments && (
                    <button type="button" onClick={onOpenPayments}>
                      Conferir
                    </button>
                  )}
                </S.OpenTableRow>
              ))}
              {!pendingPayments.length && (
                <Empty>Nenhum recebimento presencial aguarda confirmação.</Empty>
              )}
            </S.Stack>
          </S.Card>
          <S.Card>
            <header>
              <div>
                <h2>Mesas abertas</h2>
                <p>O QR Code funciona para pedidos somente enquanto a mesa estiver aberta.</p>
              </div>
              <Users aria-hidden="true" />
            </header>
            <S.Stack>
              {openedTables.slice(0, 4).map((table) => (
                <S.OpenTableRow key={table.id}>
                  <span>
                    <b>Mesa {String(table.number).padStart(2, '0')}</b>
                    <small>
                      {table.openedAt ? `Aberta às ${table.openedAt}` : 'Atendimento em andamento'}
                    </small>
                  </span>
                  <strong>{brl(table.total || 0)}</strong>
                  <TableSessionButton table={table} />
                </S.OpenTableRow>
              ))}
              {!openedTables.length && <Empty>Nenhuma mesa aberta no momento.</Empty>}
            </S.Stack>
          </S.Card>
        </S.Stack>
      </S.Grid>
    </>
  );
}

function WaiterCallsSummary() {
  const { calls, updateCall } = useWorkspace();
  const waiting = calls
    .filter((call) => call.status === 'WAITING')
    .sort((left, right) => durationInSeconds(right.elapsed) - durationInSeconds(left.elapsed))
    .slice(0, 2);
  return (
    <S.Card>
      <header>
        <div>
          <h2>Chamados do salão</h2>
          <p>Assuma um chamado para que a equipe saiba quem está atendendo.</p>
        </div>
        <BellRing aria-hidden="true" />
      </header>
      {waiting.map((call) => (
        <CallRow key={call.id} call={call} action={() => updateCall(call.id, 'IN_PROGRESS')} />
      ))}
      {!waiting.length && <Empty>Nenhum chamado aguardando atendimento.</Empty>}
    </S.Card>
  );
}

export function WaiterDeliveriesPage({
  focusedOrderId,
  onFocusComplete,
}: {
  focusedOrderId?: string | null;
  onFocusComplete?: () => void;
} = {}) {
  const { orders, tables, updateOrderStatus } = useWorkspace();
  const [query, setQuery] = useState('');
  const [table, setTable] = useState('ALL');
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(
    focusedOrderId ?? null,
  );
  const [visibleCount, setVisibleCount] = useState(WAITER_LIST_BATCH_SIZE);

  useEffect(() => {
    if (!focusedOrderId) return;
    const targetOrder = orders.find(
      (order) =>
        order.id === focusedOrderId && order.channel === 'TABLE' && order.status === 'PRONTO',
    );
    if (!targetOrder) {
      onFocusComplete?.();
      return;
    }

    let scrollFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      setQuery('');
      setTable('ALL');
      setHighlightedOrderId(focusedOrderId);
      scrollFrame = window.requestAnimationFrame(() => {
        document
          .getElementById(
            `waiter-ready-order-${encodeURIComponent(focusedOrderId.replace(/^#/, ''))}`,
          )
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    const timer = window.setTimeout(() => {
      setHighlightedOrderId(null);
      onFocusComplete?.();
    }, 2600);

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(scrollFrame);
      window.clearTimeout(timer);
    };
  }, [focusedOrderId, onFocusComplete, orders]);
  const ready = useMemo(
    () =>
      orders
        .filter(
          (order) =>
            order.channel === 'TABLE' &&
            order.status === 'PRONTO' &&
            (table === 'ALL' || order.reference === table) &&
            `${order.id} ${order.reference} ${order.customer || ''} ${order.items.join(' ')}`
              .toLocaleLowerCase('pt-BR')
              .includes(query.trim().toLocaleLowerCase('pt-BR')),
        )
        .sort((left, right) => durationInSeconds(right.elapsed) - durationInSeconds(left.elapsed)),
    [orders, query, table],
  );
  const tableOptions = [
    ...new Set(orders.filter((order) => order.channel === 'TABLE').map((order) => order.reference)),
  ].sort((left, right) => left.localeCompare(right, 'pt-BR', { numeric: true }));

  return (
    <>
      <S.Toolbar aria-label="Filtros dos pedidos prontos">
        <input
          aria-label="Buscar pedidos prontos"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setVisibleCount(WAITER_LIST_BATCH_SIZE);
          }}
          placeholder="Buscar mesa, pedido, cliente ou item"
        />
        <select
          aria-label="Filtrar por mesa"
          value={table}
          onChange={(event) => {
            setTable(event.target.value);
            setVisibleCount(WAITER_LIST_BATCH_SIZE);
          }}
        >
          <option value="ALL">Todas as mesas</option>
          {tableOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <S.LiveStatus role="status">Atualização automática</S.LiveStatus>
      </S.Toolbar>
      <MetricCards
        items={[
          { label: 'Prontos para entregar', value: ready.length, tone: 'green' },
          { label: 'Maior espera', value: ready[0]?.elapsed ?? '—', icon: 'clock' },
          {
            label: 'Mesas ocupadas',
            value: tables.filter((item) => item.status === 'OCCUPIED').length,
            icon: 'tables',
          },
        ]}
      />
      <S.Card>
        <header>
          <div>
            <h2>Prontos para entregar</h2>
            <p>
              A cozinha conclui o preparo. Depois de levar o pedido, confirme a entrega para liberar
              o fechamento da mesa.
            </p>
          </div>
        </header>
        <S.Stack>
          {ready.slice(0, visibleCount).map((order) => (
            <ReadyOrderCard
              key={order.id}
              order={order}
              highlighted={highlightedOrderId === order.id}
              onMarkDelivered={(currentOrder) => updateOrderStatus(currentOrder.id, 'ENTREGUE')}
            />
          ))}
          {!ready.length && <Empty>Nenhum pedido pronto para os filtros selecionados.</Empty>}
          <WaiterListControls
            visibleCount={Math.min(visibleCount, ready.length)}
            totalCount={ready.length}
            itemLabel="pedidos"
            onShowMore={() => setVisibleCount((current) => current + WAITER_LIST_BATCH_SIZE)}
            onReset={() => setVisibleCount(WAITER_LIST_BATCH_SIZE)}
          />
        </S.Stack>
      </S.Card>
    </>
  );
}

function tableStatusLabel(table: RestaurantTable) {
  if (table.status === 'FREE') return 'LIVRE';
  return table.sessionStatus === 'CLOSING_REQUESTED' ? 'CONTA SOLICITADA' : 'ABERTA';
}

function TableSessionButton({ table }: { table: RestaurantTable }) {
  const { openTable, closeTable } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const occupied = table.status === 'OCCUPIED';
  const closingRequested = table.sessionStatus === 'CLOSING_REQUESTED';

  const execute = async () => {
    setLoading(true);
    setError('');
    try {
      if (occupied) {
        if (!table.sessionId) {
          throw new Error(
            'A sessão desta mesa não foi identificada. Atualize a tela e tente novamente.',
          );
        }
        await closeTable(table.sessionId);
      } else {
        await openTable(table.id);
      }
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        occupied ? 'Não foi possível fechar esta mesa.' : 'Não foi possível abrir esta mesa.',
      );
      setError(
        closingRequested && /(pedidos|pagamentos)/i.test(message)
          ? `${message} Confira “Ver conta e pagamentos” para valores pendentes. Se houver pedido PRONTO, acesse “Para entregar” e confirme “Entregue à mesa”.`
          : message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={occupied ? 'close-table' : 'open-table'}
        onClick={() => void execute()}
        disabled={loading}
      >
        {loading
          ? 'Salvando...'
          : closingRequested
            ? 'Finalizar mesa'
            : occupied
              ? 'Fechar mesa'
              : 'Abrir mesa'}
      </button>
      {error && <S.ActionError role="alert">{error}</S.ActionError>}
    </>
  );
}

export function WaiterTablesPage() {
  const { tables, accounts } = useWorkspace();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<TableStatus | 'ALL' | 'CLOSING'>('ALL');
  const [accountTable, setAccountTable] = useState<RestaurantTable | null>(null);
  const [visibleCount, setVisibleCount] = useState(WAITER_LIST_BATCH_SIZE);
  const visible = tables.filter(
    (table) =>
      (status === 'ALL' ||
        (status === 'CLOSING'
          ? table.sessionStatus === 'CLOSING_REQUESTED'
          : table.status === status)) &&
      String(table.number).includes(query.trim()),
  );

  return (
    <>
      <S.InlineNotice role="note">
        <Info />
        <span>
          <b>QR Codes administrados pelo restaurante.</b> Aqui você apenas abre a mesa para liberar
          pedidos e fecha quando o atendimento e o pagamento terminarem.
        </span>
      </S.InlineNotice>
      <S.Toolbar aria-label="Filtros das mesas">
        <input
          aria-label="Buscar mesa"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setVisibleCount(WAITER_LIST_BATCH_SIZE);
          }}
          placeholder="Buscar número da mesa"
          inputMode="numeric"
        />
        <select
          aria-label="Filtrar mesas por status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as TableStatus | 'ALL' | 'CLOSING');
            setVisibleCount(WAITER_LIST_BATCH_SIZE);
          }}
        >
          <option value="ALL">Todos os status</option>
          <option value="FREE">Livres</option>
          <option value="OCCUPIED">Ocupadas</option>
          <option value="CLOSING">Conta solicitada</option>
        </select>
      </S.Toolbar>
      <MetricCards
        items={[
          { label: 'Mesas', value: tables.length, icon: 'tables' },
          {
            label: 'Ocupadas',
            value: tables.filter((table) => table.status === 'OCCUPIED').length,
            icon: 'tables',
          },
          {
            label: 'Livres',
            value: tables.filter((table) => table.status === 'FREE').length,
            tone: 'green',
            icon: 'tables',
          },
          {
            label: 'Conta solicitada',
            value: tables.filter((table) => table.sessionStatus === 'CLOSING_REQUESTED').length,
            icon: 'calls',
          },
        ]}
      />
      <S.TableGrid>
        {visible.slice(0, visibleCount).map((table) => {
          const account = accounts.find(
            (item) =>
              item.sessionPublicId === table.sessionPublicId || item.tableNumber === table.number,
          );
          return (
            <S.TableCard
              key={table.id}
              className={table.sessionStatus === 'CLOSING_REQUESTED' ? 'closing' : undefined}
            >
              <header>
                <b>Mesa {String(table.number).padStart(2, '0')}</b>
                <S.TableState $state={table.status}>{tableStatusLabel(table)}</S.TableState>
              </header>
              <div className="meta">
                <span>
                  <Users size={14} /> {table.guests || 0} cliente(s)
                </span>
                {table.openedAt ? (
                  <span>
                    <Clock3 size={14} /> Aberta às {table.openedAt}
                  </span>
                ) : table.sessionStatus === 'CLOSING_REQUESTED' ? (
                  <span>Atendimento em finalização</span>
                ) : (
                  <span>Abra a mesa antes de o cliente fazer o pedido</span>
                )}
                {table.sessionStatus === 'CLOSING_REQUESTED' && (
                  <span>
                    <ReceiptText size={14} /> Conta solicitada: novos pedidos estão bloqueados
                  </span>
                )}
                <strong>{brl(table.total || 0)}</strong>
                {account && (
                  <span>
                    <ReceiptText size={14} /> Saldo em aberto:{' '}
                    {brl(account.summary.remainingCents / 100)}
                  </span>
                )}
              </div>
              <div className="actions">
                {table.status === 'OCCUPIED' && (
                  <button
                    type="button"
                    className="view-account"
                    disabled={!table.sessionPublicId}
                    title={
                      table.sessionPublicId
                        ? 'Abrir conta e pagamentos desta mesa'
                        : 'Atualize os dados para carregar a conta desta mesa'
                    }
                    onClick={() => setAccountTable(table)}
                  >
                    <ReceiptText size={14} /> Ver conta e pagamentos
                  </button>
                )}
                <TableSessionButton table={table} />
              </div>
            </S.TableCard>
          );
        })}
      </S.TableGrid>
      {!visible.length && <Empty>Nenhuma mesa encontrada com estes filtros.</Empty>}
      <WaiterListControls
        visibleCount={Math.min(visibleCount, visible.length)}
        totalCount={visible.length}
        itemLabel="mesas"
        onShowMore={() => setVisibleCount((current) => current + WAITER_LIST_BATCH_SIZE)}
        onReset={() => setVisibleCount(WAITER_LIST_BATCH_SIZE)}
      />
      {accountTable && (
        <WaiterTableAccountDialog table={accountTable} onClose={() => setAccountTable(null)} />
      )}
    </>
  );
}

function callTitle(type: ServiceCall['type']) {
  if (type === 'BILL') return 'Pediu a conta';
  return 'Chamou o garçom';
}

function CallRow({
  call,
  action,
  label = 'Atender',
  actionIcon,
}: {
  call: ServiceCall;
  action?: () => Promise<void>;
  label?: string;
  actionIcon?: 'delete';
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const execute = async () => {
    if (!action || loading) return;
    setLoading(true);
    setError('');
    try {
      await action();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Não foi possível atualizar este chamado.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <S.CallCard>
      <span className="icon" aria-hidden="true">
        {call.type === 'BILL' ? <ReceiptText /> : <BellRing />}
      </span>
      <span className="info">
        <b>Mesa {String(call.tableNumber).padStart(2, '0')}</b>
        <span>{callTitle(call.type)}</span>
        {call.employeeName && <small>Responsável: {call.employeeName}</small>}
      </span>
      <span className="time" aria-label={`Tempo de espera ${call.elapsed}`}>
        {call.elapsed}
      </span>
      {action && (
        <S.PrimaryButton
          className={`action${actionIcon === 'delete' ? ' delete' : ''}`}
          type="button"
          onClick={() => void execute()}
          disabled={loading}
        >
          {loading ? 'Salvando...' : actionIcon === 'delete' ? <Trash2 size={15} /> : label}
          {actionIcon === 'delete' && !loading ? label : null}
        </S.PrimaryButton>
      )}
      {error && <S.ActionError role="alert">{error}</S.ActionError>}
    </S.CallCard>
  );
}

function CallSection({
  title,
  description,
  calls,
  action,
  actionLabel,
  actionIcon,
  footer,
  empty,
}: {
  title: string;
  description: string;
  calls: ServiceCall[];
  action?: (call: ServiceCall) => Promise<void>;
  actionLabel?: string;
  actionIcon?: 'delete';
  footer?: ReactNode;
  empty: string;
}) {
  return (
    <S.Card>
      <header>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      {calls.map((call) => (
        <CallRow
          key={call.id}
          call={call}
          action={action ? () => action(call) : undefined}
          label={actionLabel}
          actionIcon={actionIcon}
        />
      ))}
      {!calls.length && <Empty>{empty}</Empty>}
      {footer}
    </S.Card>
  );
}

function resolvedToday(call: ServiceCall) {
  if (!call.resolvedAt) return false;
  const date = new Date(call.resolvedAt);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function WaiterCallsPage() {
  const { calls, updateCall, deleteCall } = useWorkspace();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CallStatus | 'ALL'>('ALL');
  const [visibleCounts, setVisibleCounts] = useState({
    waiting: WAITER_LIST_BATCH_SIZE,
    attending: WAITER_LIST_BATCH_SIZE,
    resolved: WAITER_LIST_BATCH_SIZE,
  });
  const [deleteCandidate, setDeleteCandidate] = useState<ServiceCall | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const filtered = calls.filter((call) =>
    `mesa ${call.tableNumber} ${callTitle(call.type)} ${call.employeeName || ''}`
      .toLocaleLowerCase('pt-BR')
      .includes(normalizedQuery),
  );
  const waiting = filtered
    .filter((call) => call.status === 'WAITING')
    .sort((left, right) => durationInSeconds(right.elapsed) - durationInSeconds(left.elapsed));
  const attending = filtered.filter((call) => call.status === 'IN_PROGRESS');
  const resolved = filtered.filter((call) => call.status === 'RESOLVED');
  const activeCalls = calls.filter((call) => call.status !== 'RESOLVED');
  const resetVisibleCounts = () =>
    setVisibleCounts({
      waiting: WAITER_LIST_BATCH_SIZE,
      attending: WAITER_LIST_BATCH_SIZE,
      resolved: WAITER_LIST_BATCH_SIZE,
    });

  return (
    <>
      <S.Toolbar aria-label="Filtros dos chamados">
        <input
          aria-label="Buscar chamados"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            resetVisibleCounts();
          }}
          placeholder="Buscar mesa ou tipo de chamado"
          inputMode="numeric"
        />
        <select
          aria-label="Filtrar chamados por status"
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value as CallStatus | 'ALL');
            resetVisibleCounts();
          }}
        >
          <option value="ALL">Todos os status</option>
          <option value="WAITING">Aguardando</option>
          <option value="IN_PROGRESS">Em atendimento</option>
          <option value="RESOLVED">Concluídos</option>
        </select>
        <S.LiveStatus role="status">Atualização automática</S.LiveStatus>
      </S.Toolbar>
      <MetricCards
        items={[
          {
            label: 'Aguardando',
            value: calls.filter((call) => call.status === 'WAITING').length,
            icon: 'calls',
          },
          {
            label: 'Em atendimento',
            value: calls.filter((call) => call.status === 'IN_PROGRESS').length,
            icon: 'calls',
          },
          { label: 'Espera média', value: formatAverageDuration(activeCalls), icon: 'clock' },
          {
            label: 'Atendidos hoje',
            value: calls.filter((call) => call.status === 'RESOLVED' && resolvedToday(call)).length,
            tone: 'green',
            icon: 'calls',
          },
        ]}
      />
      <S.CallsGrid>
        {(filter === 'ALL' || filter === 'WAITING') && (
          <CallSection
            title="Aguardando atendimento"
            description="Os chamados com maior espera aparecem primeiro."
            calls={waiting.slice(0, visibleCounts.waiting)}
            action={(call) => updateCall(call.id, 'IN_PROGRESS')}
            empty="Nenhum chamado aguardando atendimento."
            footer={
              <WaiterListControls
                visibleCount={Math.min(visibleCounts.waiting, waiting.length)}
                totalCount={waiting.length}
                itemLabel="chamados"
                onShowMore={() =>
                  setVisibleCounts((current) => ({
                    ...current,
                    waiting: current.waiting + WAITER_LIST_BATCH_SIZE,
                  }))
                }
                onReset={() =>
                  setVisibleCounts((current) => ({
                    ...current,
                    waiting: WAITER_LIST_BATCH_SIZE,
                  }))
                }
              />
            }
          />
        )}
        {(filter === 'ALL' || filter === 'IN_PROGRESS') && (
          <CallSection
            title="Em atendimento"
            description="Conclua somente depois de atender a solicitação da mesa."
            calls={attending.slice(0, visibleCounts.attending)}
            action={(call) => updateCall(call.id, 'RESOLVED')}
            actionLabel="Concluir"
            empty="Nenhum chamado em atendimento."
            footer={
              <WaiterListControls
                visibleCount={Math.min(visibleCounts.attending, attending.length)}
                totalCount={attending.length}
                itemLabel="chamados"
                onShowMore={() =>
                  setVisibleCounts((current) => ({
                    ...current,
                    attending: current.attending + WAITER_LIST_BATCH_SIZE,
                  }))
                }
                onReset={() =>
                  setVisibleCounts((current) => ({
                    ...current,
                    attending: WAITER_LIST_BATCH_SIZE,
                  }))
                }
              />
            }
          />
        )}
        {(filter === 'RESOLVED' || filter === 'ALL') && (
          <CallSection
            title="Concluídos"
            description="Histórico recente dos chamados atendidos pela equipe."
            calls={resolved.slice(0, visibleCounts.resolved)}
            action={async (call) => setDeleteCandidate(call)}
            actionLabel="Excluir"
            actionIcon="delete"
            footer={
              <WaiterListControls
                visibleCount={Math.min(visibleCounts.resolved, resolved.length)}
                totalCount={resolved.length}
                itemLabel="chamados"
                onShowMore={() =>
                  setVisibleCounts((current) => ({
                    ...current,
                    resolved: current.resolved + WAITER_LIST_BATCH_SIZE,
                  }))
                }
                onReset={() =>
                  setVisibleCounts((current) => ({
                    ...current,
                    resolved: WAITER_LIST_BATCH_SIZE,
                  }))
                }
              />
            }
            empty="Nenhum chamado concluído para esta busca."
          />
        )}
      </S.CallsGrid>
      {deleteCandidate && (
        <S.ConfirmBackdrop role="presentation" onClick={() => setDeleteCandidate(null)}>
          <S.ConfirmDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-call-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="icon" aria-hidden="true">
              <Trash2 />
            </span>
            <h2 id="delete-call-title">Excluir chamado?</h2>
            <p>
              O chamado da Mesa {String(deleteCandidate.tableNumber).padStart(2, '0')} será removido
              do histórico de concluídos.
            </p>
            <div className="actions">
              <S.PaginationButton type="button" onClick={() => setDeleteCandidate(null)}>
                Cancelar
              </S.PaginationButton>
              <S.DangerButton
                type="button"
                onClick={async () => {
                  const call = deleteCandidate;
                  setDeleteCandidate(null);
                  await deleteCall(call.id);
                }}
              >
                Excluir chamado
              </S.DangerButton>
            </div>
          </S.ConfirmDialog>
        </S.ConfirmBackdrop>
      )}
    </>
  );
}
