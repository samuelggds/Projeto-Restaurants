import {
  BellRing,
  CalendarClock,
  LayoutGrid,
  CheckCircle2,
  Clock3,
  Eye,
  Info,
  ReceiptText,
  ArrowRightLeft,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import type { CallStatus, Order, RestaurantTable, ServiceCall, TableStatus } from '../types';
import { useWaiterWorkspace as useWorkspace } from '../useWaiterWorkspace';
import {
  Empty,
  MetricCards,
  OrderItems,
  StatusBadge,
  WorkspaceSyncStatus,
  brl,
} from '../components/Shared';
import { WaiterTableAccountDialog } from '../components/WaiterTableAccountDialog';
import { TableSeatDiagram } from '../components/TableSeatDiagram';
import { SelectedTablePanel } from '../components/SelectedTablePanel';
import { tableOverview, tableOperationalState, nextReservationCaption } from '../domain/tableOverview';
import { WAITER_LIST_BATCH_SIZE, WaiterListControls } from '../components/WaiterListControls';
import * as S from '../Waiter.styles';

function getErrorMessage(error: unknown, fallback: string) {
  const typed = error as { response?: { data?: { error?: string } }; message?: string };
  return typed.response?.data?.error || typed.message || fallback;
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('pt-BR')
    .replace(/\b0+(?=\d)/g, '');
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
            normalizeSearch(
              `${order.id} ${order.reference} ${order.customer || ''} ${order.items.join(' ')}`,
            ).includes(normalizeSearch(query)),
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
          type="search"
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
        {(query || table !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setTable('ALL');
              setVisibleCount(WAITER_LIST_BATCH_SIZE);
            }}
          >
            <X size={16} aria-hidden="true" /> Limpar filtros
          </button>
        )}
        <WorkspaceSyncStatus />
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
  if (table.status === 'RESERVED') return 'RESERVADA';
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

export function WaiterTablesPage({onNavigate}: {onNavigate?: (view:'deliveries'|'payments')=>void}={}) {
  const { tables, accounts, transferTable, reservations, reservationAvailability } = useWorkspace();
  const overview = tableOverview(tables, reservations, reservationAvailability);
  const unavailable = overview.reservationStatus === 'unavailable';
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<TableStatus | 'ALL' | 'CLOSING'>('ALL');
  const [accountTable, setAccountTable] = useState<RestaurantTable | null>(null);
  const [transferSource, setTransferSource] = useState<RestaurantTable | null>(null);
  const [transferDestination, setTransferDestination] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const selectedTable=tables.find(table=>table.id===selectedTableId)||null;
  const [panelCloseKey,setPanelCloseKey]=useState(0);
  const showAccount=()=>{if(selectedTable){setAccountTable(selectedTable);}};
  const beginTransfer=()=>{if(selectedTable){setTransferSource(selectedTable);setTransferDestination('');setTransferError('');}};

  const confirmTransfer = async () => {
    if (!transferSource?.sessionId || !transferDestination || transferBusy) return;
    setTransferBusy(true);
    setTransferError('');
    try {
      await transferTable(transferSource.sessionId, transferDestination);
      setTransferSource(null);
      setTransferDestination('');
    } catch (error: unknown) {
      setTransferError(getErrorMessage(error, 'Não foi possível transferir a mesa.'));
    } finally {
      setTransferBusy(false);
    }
  };
  const [visibleCount, setVisibleCount] = useState(WAITER_LIST_BATCH_SIZE);
  const visible = tables.filter(
    (table) =>
      (status === 'ALL' ||
        (status === 'CLOSING'
          ? table.sessionStatus === 'CLOSING_REQUESTED'
          : status === 'RESERVED'
            ? tableOperationalState(table, overview.upcoming) === 'RESERVED'
            : tableOperationalState(table, overview.upcoming) === status)) &&
      normalizeSearch(`mesa ${table.number}`).includes(normalizeSearch(query)),
  );

  return (
    <>
      <S.InlineNotice role="note">
        <Info />
        <span>
          <b>Abra a mesa para iniciar o atendimento.</b> Use “Abrir mesa” abaixo para permitir a entrada
          pelo QR Code. Ao fechar a mesa, os acessos dos clientes são encerrados. Uma nova abertura exige
          uma nova entrada na sessão.
        </span>
      </S.InlineNotice>
      <S.Toolbar aria-label="Filtros das mesas">
        <input
          type="search"
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
          <option value="RESERVED" disabled={overview.reservationStatus !== 'ready'}>Reservadas</option>
          <option value="CLOSING">Conta solicitada</option>
        </select>
        {(query || status !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setStatus('ALL');
              setVisibleCount(WAITER_LIST_BATCH_SIZE);
            }}
          >
            <X size={16} aria-hidden="true" /> Limpar filtros
          </button>
        )}
      </S.Toolbar>
      <S.TableOverviewMetrics aria-label="Indicadores do salão">
        <S.TableOverviewMetric>
          <span>Mesas no salão</span><div><strong>{tables.length}</strong><LayoutGrid aria-hidden="true" size={17}/></div>
          <small>Mesas cadastradas</small>
        </S.TableOverviewMetric>
        <S.TableOverviewMetric>
          <span>Ocupadas</span><div><strong>{overview.occupiedCount}</strong><Users aria-hidden="true" size={17}/></div>
          <small>{overview.guests} clientes</small>
        </S.TableOverviewMetric>
        <S.TableOverviewMetric>
          <span>Livres</span><div><strong>{overview.reservationStatus === 'unavailable' ? '—' : overview.freeCount}</strong><CheckCircle2 aria-hidden="true" size={17}/></div>
          <small>{overview.reservationStatus === 'unavailable' ? 'Disponibilidade indisponível' : 'Prontas para receber'}</small>
        </S.TableOverviewMetric>
        <S.TableOverviewMetric>
          <span>Reservadas</span><div><strong>{overview.reservedCount ?? '—'}</strong><CalendarClock aria-hidden="true" size={17}/></div>
          <small>{overview.reservationStatus === 'unavailable' ? 'Reservas indisponíveis' : overview.reservationStatus === 'disabled' ? 'Reservas desativadas' : nextReservationCaption(overview.nextReservation)}</small>
        </S.TableOverviewMetric>
      </S.TableOverviewMetrics>
      <S.TableLayout $selected={Boolean(selectedTable)}>
        <S.TableGrid>
        {visible.slice(0, visibleCount).map((table) => {
          // A conta pertence à sessão aberta, nunca somente ao número da mesa.
          // Evita mostrar saldos antigos em mesas livres ou após troca de sessão.
          const account = table.status === 'OCCUPIED'
            ? accounts.find((item) =>
                table.sessionPublicId
                  ? item.sessionPublicId === table.sessionPublicId
                  : table.sessionId
                    ? item.tableSessionId === table.sessionId
                    : item.tableId === table.id,
              )
            : undefined;
          return (
            <S.TableCard
              key={table.id}
              className={[table.sessionStatus === 'CLOSING_REQUESTED' ? 'closing' : '', selectedTableId === table.id ? 'selected' : ''].filter(Boolean).join(' ')}
            >
              <header>
                <b>Mesa {String(table.number).padStart(2, '0')}</b>
                <S.TableState $state={tableOperationalState(table, overview.upcoming)}>{table.status === 'FREE' && unavailable ? 'A CONFIRMAR' : tableOperationalState(table, overview.upcoming) === 'RESERVED' ? 'RESERVADA' : tableStatusLabel(table)}</S.TableState>
              </header>
              <button type="button" className="select-table" aria-label={`Selecionar Mesa ${table.number}`}
                aria-pressed={selectedTableId === table.id} onClick={() => {setSelectedTableId(table.id);setPanelCloseKey(current=>current+1);}}>
                <TableSeatDiagram number={table.number} capacity={table.seatCapacity}
                  tone={table.status === 'OCCUPIED' ? 'busy' : tableOperationalState(table, overview.upcoming) === 'RESERVED' ? 'reserved' : 'free'} />
              </button>
              <div className="meta">
                <span>{table.seatCapacity ? `${table.seatCapacity} lugares` : 'Lugares não configurados'}</span>
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

            </S.TableCard>
          );
        })}
      </S.TableGrid>
      {selectedTable&&<SelectedTablePanel key={`${selectedTable.sessionPublicId||selectedTable.id}-${panelCloseKey}`}
        table={selectedTable} onClose={()=>setSelectedTableId(null)}
        reserved={tableOperationalState(selectedTable, overview.upcoming) === 'RESERVED'}
        availabilityUnknown={unavailable}
        onAccount={showAccount} onTransfer={beginTransfer}
        onNavigate={view=>onNavigate?.(view)}
        sessionAction={<TableSessionButton table={selectedTable}/>} />}
      </S.TableLayout>
      {!visible.length && <Empty>Nenhuma mesa encontrada com estes filtros.</Empty>}
      <WaiterListControls
        visibleCount={Math.min(visibleCount, visible.length)}
        totalCount={visible.length}
        itemLabel="mesas"
        onShowMore={() => setVisibleCount((current) => current + WAITER_LIST_BATCH_SIZE)}
        onReset={() => setVisibleCount(WAITER_LIST_BATCH_SIZE)}
      />
      {transferSource && (
        <S.TransferBackdrop role="presentation" onMouseDown={() => !transferBusy && setTransferSource(null)}>
          <S.TransferDialog role="dialog" aria-modal="true" aria-label="Transferir mesa"
            onMouseDown={event => event.stopPropagation()}>
            <header>
              <div><h2>Transferir mesa</h2><p>Mova o atendimento para outra mesa livre do salão.</p></div>
              <button type="button" aria-label="Fechar transferência" disabled={transferBusy}
                onClick={() => setTransferSource(null)}><X size={18}/></button>
            </header>
            <div className="transfer-body">
              <strong>Mesa atual</strong>
              <div className="transfer-source">
                <TableSeatDiagram number={transferSource.number} capacity={transferSource.seatCapacity} tone="busy"/>
                <div><b>Mesa {String(transferSource.number).padStart(2,'0')}</b>
                  <small>{transferSource.guests} clientes · {transferSource.seatCapacity || '—'} lugares</small>
                </div>
                <b>{brl(transferSource.total)}</b>
              </div>
              <div className="select-head"><strong>Selecionar mesa de destino</strong>
                <small>{tables.filter(t => t.id !== transferSource.id && t.status === 'FREE').length} mesas livres</small>
              </div>
              <select id="transfer-destination" aria-label="Mesa de destino" value={transferDestination}
                onChange={event => setTransferDestination(event.target.value)} disabled={transferBusy}>
                <option value="">Selecione uma mesa livre</option>
                {tables.filter(item => item.id !== transferSource.id && item.status === 'FREE'
                  && item.seatCapacity && item.seatCapacity >= transferSource.guests).map(item => (
                  <option key={item.id} value={item.id}>Mesa {String(item.number).padStart(2,'0')} · {item.seatCapacity} lugares</option>
                ))}
              </select>
              {tables.find(t => t.id === transferDestination) && (
                <div className="transfer-selected">
                  <TableSeatDiagram number={tables.find(t => t.id === transferDestination)!.number}
                    capacity={tables.find(t => t.id === transferDestination)!.seatCapacity} tone="free"/>
                  <div><b>Mesa {String(tables.find(t => t.id === transferDestination)!.number).padStart(2,'0')} pronta para receber</b>
                  <small>{tables.find(t => t.id === transferDestination)!.seatCapacity} lugares disponíveis</small></div>
                  <CheckCircle2 size={18}/>
                </div>
              )}
              <p className="transfer-explainer"><Info size={16}/>
                Apenas a mesa muda. Pedidos, participantes, pagamentos e valores continuam
                vinculados à mesma sessão. A origem ficará livre.</p>
              {transferError && <S.ActionError role="alert">{transferError}</S.ActionError>}
            </div>
            <footer>
              <button type="button" disabled={transferBusy} onClick={() => setTransferSource(null)}>Cancelar</button>
              <button className="confirm" type="button" disabled={transferBusy || !transferDestination}
                onClick={() => void confirmTransfer()}>
                <ArrowRightLeft size={16}/>{transferBusy ? 'Transferindo...' : 'Transferir mesa'}
              </button>
            </footer>
          </S.TransferDialog>
        </S.TransferBackdrop>
      )}
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
  const normalizedQuery = normalizeSearch(query);
  const filtered = calls.filter((call) =>
    normalizeSearch(
      `mesa ${call.tableNumber} ${callTitle(call.type)} ${call.employeeName || ''}`,
    ).includes(normalizedQuery),
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
          type="search"
          aria-label="Buscar chamados"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            resetVisibleCounts();
          }}
          placeholder="Buscar mesa ou tipo de chamado"
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
        {(query || filter !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setFilter('ALL');
              resetVisibleCounts();
            }}
          >
            <X size={16} aria-hidden="true" /> Limpar filtros
          </button>
        )}
        <WorkspaceSyncStatus />
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
            empty={
              normalizedQuery
                ? 'Nenhum chamado aguardando corresponde à busca.'
                : 'Nenhum chamado aguardando atendimento.'
            }
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
            empty={
              normalizedQuery
                ? 'Nenhum chamado em atendimento corresponde à busca.'
                : 'Nenhum chamado em atendimento.'
            }
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
