import {
  AlertTriangle,
  Armchair,
  BellRing,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  Truck,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import * as S from './Attendant.styles';
import type {
  AttendantCall,
  AttendantOrder,
  AttendantOrderStatus,
  AttendantOrderType,
  AttendantRestaurantBrand,
  AttendantView,
  AttendantWorkspaceSnapshot,
  AttendantWorkspaceState,
} from './types';

type Props = {
  attendantName: string;
  restaurant: AttendantRestaurantBrand;
  snapshot: AttendantWorkspaceSnapshot;
  workspaceState: AttendantWorkspaceState;
  initialView?: AttendantView;
  onViewChange?: (view: AttendantView) => void;
  onRefresh: () => void | Promise<void>;
  onLogout: () => void;
};

const viewContent: Record<AttendantView, { title: string; subtitle: string }> = {
  overview: { title: 'Visão geral', subtitle: 'Prioridades e ritmo da operação agora' },
  orders: { title: 'Pedidos', subtitle: 'Fila ativa da cozinha, salão e balcão' },
  tables: { title: 'Mesas', subtitle: 'Ocupação e solicitações em andamento' },
  calls: { title: 'Chamados', subtitle: 'Solicitações abertas e histórico de hoje' },
};

const navItems: Array<{ id: AttendantView; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'orders', label: 'Pedidos', icon: ClipboardList },
  { id: 'tables', label: 'Mesas', icon: Armchair },
  { id: 'calls', label: 'Chamados', icon: BellRing },
];

function timeLabel(value: string | null) {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function elapsedLabel(value: string, now: number) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'agora';
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
}

function initials(value: string) {
  const result = value
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return result || 'AT';
}

function orderReference(order: AttendantOrder) {
  if (order.type === 'MESA') return `Mesa ${order.tableNumber ?? '?'}`;
  if (order.type === 'DELIVERY') return 'Delivery';
  return 'Retirada';
}

function orderTypeLabel(type: AttendantOrderType) {
  if (type === 'MESA') return 'Mesa';
  if (type === 'DELIVERY') return 'Delivery';
  return 'Retirada';
}

function orderStatusLabel(status: AttendantOrderStatus) {
  if (status === 'PREPARANDO') return 'Em preparo';
  if (status === 'PRONTO') return 'Pronto';
  return 'Pendente';
}

function orderIcon(type: AttendantOrderType) {
  if (type === 'MESA') return UtensilsCrossed;
  if (type === 'DELIVERY') return Truck;
  return Store;
}

function statusTone(status: AttendantOrderStatus): 'neutral' | 'teal' | 'amber' {
  if (status === 'PRONTO') return 'teal';
  if (status === 'PREPARANDO') return 'amber';
  return 'neutral';
}

function callLabel(call: AttendantCall) {
  return call.type === 'BILL' ? 'Fechamento de conta' : 'Atendimento no salão';
}

function callStatusLabel(call: AttendantCall) {
  if (call.status === 'RESOLVED') return 'Resolvido';
  if (call.status === 'IN_PROGRESS') return 'Em atendimento';
  return 'Aguardando';
}

function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <S.Empty>
      <span className="empty-icon">
        <Icon />
      </span>
      <strong>{title}</strong>
      <span>{text}</span>
    </S.Empty>
  );
}

function Metrics({ snapshot }: { snapshot: AttendantWorkspaceSnapshot }) {
  const readyOrders = snapshot.orders.filter((order) => order.status === 'PRONTO').length;
  const activeCalls = snapshot.calls.filter((call) => call.status !== 'RESOLVED').length;
  const closingTables = snapshot.tables.filter(
    (table) => table.status === 'CLOSING_REQUESTED',
  ).length;
  const metrics: Array<{
    label: string;
    value: number;
    tone: 'neutral' | 'teal' | 'amber' | 'red';
    icon: LucideIcon;
  }> = [
    {
      label: 'Pedidos ativos',
      value: snapshot.orders.length,
      tone: 'neutral',
      icon: ClipboardList,
    },
    { label: 'Prontos agora', value: readyOrders, tone: 'teal', icon: PackageCheck },
    {
      label: 'Chamados abertos',
      value: activeCalls,
      tone: activeCalls ? 'red' : 'teal',
      icon: BellRing,
    },
    {
      label: closingTables ? 'Contas solicitadas' : 'Mesas ocupadas',
      value: closingTables || snapshot.tables.length,
      tone: closingTables ? 'amber' : 'neutral',
      icon: Armchair,
    },
  ];

  return (
    <S.MetricGrid aria-label="Resumo da operação">
      {metrics.map(({ label, value, tone, icon: Icon }) => (
        <S.Metric key={label} $tone={tone}>
          <span className="metric-icon">
            <Icon />
          </span>
          <span>
            <strong>{value}</strong>
            <small>{label}</small>
          </span>
        </S.Metric>
      ))}
    </S.MetricGrid>
  );
}

function TableCards({ snapshot, limit }: { snapshot: AttendantWorkspaceSnapshot; limit?: number }) {
  const tables = typeof limit === 'number' ? snapshot.tables.slice(0, limit) : snapshot.tables;
  if (!tables.length) {
    return (
      <S.Panel>
        <EmptyState
          icon={Armchair}
          title="Nenhuma mesa ocupada"
          text="As mesas abertas aparecerão aqui assim que uma sessão começar."
        />
      </S.Panel>
    );
  }

  return (
    <S.TableGrid aria-label="Mesas ocupadas">
      {tables.map((table) => {
        const attention = table.status === 'CLOSING_REQUESTED' || table.activeCallCount > 0;
        return (
          <S.TableCard key={table.id} $attention={attention}>
            <header>
              <span className="table-number">
                <small>Mesa</small>
                <strong>{String(table.tableNumber).padStart(2, '0')}</strong>
              </span>
              <S.StatusPill $tone={attention ? 'amber' : 'teal'}>
                {table.status === 'CLOSING_REQUESTED' ? 'Conta solicitada' : 'Ocupada'}
              </S.StatusPill>
            </header>
            <S.TableStats>
              <span title="Pessoas na mesa">
                <Users />
                <b>{table.participantCount}</b>
                pessoas
              </span>
              <span title="Pedidos ativos">
                <ShoppingBag />
                <b>{table.activeOrderCount}</b>
                pedidos
              </span>
              <span title="Chamados ativos">
                <BellRing />
                <b>{table.activeCallCount}</b>
                chamados
              </span>
            </S.TableStats>
            <time dateTime={table.openedAt}>Aberta às {timeLabel(table.openedAt)}</time>
          </S.TableCard>
        );
      })}
    </S.TableGrid>
  );
}

function Overview({
  snapshot,
  now,
  onNavigate,
}: {
  snapshot: AttendantWorkspaceSnapshot;
  now: number;
  onNavigate: (view: AttendantView) => void;
}) {
  const activeCalls = snapshot.calls
    .filter((call) => call.status !== 'RESOLVED')
    .sort((first, second) => first.requestedAt.localeCompare(second.requestedAt));
  const readyOrders = snapshot.orders
    .filter((order) => order.status === 'PRONTO')
    .sort((first, second) =>
      (first.readyAt || first.createdAt).localeCompare(second.readyAt || second.createdAt),
    );

  return (
    <>
      <Metrics snapshot={snapshot} />
      <S.OverviewGrid>
        <S.Panel>
          <S.PanelHeader>
            <span className="heading-icon">
              <BellRing />
            </span>
            <span>
              <h2>Chamados prioritários</h2>
              <p>Mais antigos primeiro</p>
            </span>
            <S.TextButton type="button" onClick={() => onNavigate('calls')}>
              Ver todos <ChevronRight />
            </S.TextButton>
          </S.PanelHeader>
          {activeCalls.length ? (
            <S.Queue>
              {activeCalls.slice(0, 4).map((call) => {
                const urgent = now - new Date(call.requestedAt).getTime() >= 5 * 60_000;
                return (
                  <S.QueueRow key={call.id}>
                    <span className={`row-icon${urgent ? ' urgent' : ''}`}>
                      {call.type === 'BILL' ? <ClipboardList /> : <BellRing />}
                    </span>
                    <span className="row-body">
                      <span className="row-top">
                        <strong>Mesa {String(call.tableNumber).padStart(2, '0')}</strong>
                        <S.StatusPill $tone={urgent ? 'red' : 'amber'}>
                          {callStatusLabel(call)}
                        </S.StatusPill>
                      </span>
                      <small>{callLabel(call)}</small>
                    </span>
                    <time dateTime={call.requestedAt}>{elapsedLabel(call.requestedAt, now)}</time>
                  </S.QueueRow>
                );
              })}
            </S.Queue>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="Salão sem chamados"
              text="Nenhuma solicitação aguarda atendimento neste momento."
            />
          )}
        </S.Panel>

        <S.Panel>
          <S.PanelHeader>
            <span className="heading-icon">
              <PackageCheck />
            </span>
            <span>
              <h2>Pedidos prontos</h2>
              <p>Aguardando retirada ou entrega</p>
            </span>
            <S.TextButton type="button" onClick={() => onNavigate('orders')}>
              Ver fila <ChevronRight />
            </S.TextButton>
          </S.PanelHeader>
          {readyOrders.length ? (
            <S.Queue>
              {readyOrders.slice(0, 4).map((order) => {
                const Icon = orderIcon(order.type);
                return (
                  <S.QueueRow key={order.id}>
                    <span className="row-icon ready">
                      <Icon />
                    </span>
                    <span className="row-body">
                      <span className="row-top">
                        <strong>
                          {order.code} · {orderReference(order)}
                        </strong>
                        <S.StatusPill $tone="teal">Pronto</S.StatusPill>
                      </span>
                      <small>
                        {order.items
                          .map((item) => `${item.quantity}× ${item.productName}`)
                          .join(' · ') || 'Itens não informados'}
                      </small>
                    </span>
                    <time dateTime={order.readyAt || order.createdAt}>
                      {elapsedLabel(order.readyAt || order.createdAt, now)}
                    </time>
                  </S.QueueRow>
                );
              })}
            </S.Queue>
          ) : (
            <EmptyState
              icon={Clock3}
              title="Nenhum pedido pronto"
              text="Os pedidos liberados pela cozinha serão destacados aqui."
            />
          )}
        </S.Panel>
      </S.OverviewGrid>

      <S.SectionHeader>
        <div>
          <h2>Mesas em operação</h2>
          <p>Ocupação, pedidos e solicitações por mesa</p>
        </div>
        <span>{snapshot.tables.length} ocupada(s)</span>
      </S.SectionHeader>
      <TableCards snapshot={snapshot} limit={8} />
    </>
  );
}

function Orders({ snapshot, now }: { snapshot: AttendantWorkspaceSnapshot; now: number }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | AttendantOrderStatus>('ALL');
  const [type, setType] = useState<'ALL' | AttendantOrderType>('ALL');
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const filtered = snapshot.orders.filter((order) => {
    const searchable = [
      order.code,
      order.customerName,
      orderReference(order),
      ...order.items.map((item) => item.productName),
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('pt-BR');
    return (
      (!normalizedQuery || searchable.includes(normalizedQuery)) &&
      (status === 'ALL' || order.status === status) &&
      (type === 'ALL' || order.type === type)
    );
  });

  return (
    <>
      <Metrics snapshot={snapshot} />
      <S.Toolbar>
        <S.SearchBox>
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar pedido, mesa, cliente ou item"
            aria-label="Buscar pedidos"
          />
        </S.SearchBox>
        <S.Segmented aria-label="Filtrar pedidos por status">
          {[
            ['ALL', 'Todos'],
            ['PENDENTE', 'Pendentes'],
            ['PREPARANDO', 'Em preparo'],
            ['PRONTO', 'Prontos'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={status === value ? 'active' : ''}
              aria-pressed={status === value}
              onClick={() => setStatus(value as 'ALL' | AttendantOrderStatus)}
            >
              {label}
            </button>
          ))}
        </S.Segmented>
        <S.Select
          value={type}
          onChange={(event) => setType(event.target.value as 'ALL' | AttendantOrderType)}
          aria-label="Filtrar pedidos por canal"
        >
          <option value="ALL">Todos os canais</option>
          <option value="MESA">Mesa</option>
          <option value="RETIRADA">Retirada</option>
          <option value="DELIVERY">Delivery</option>
        </S.Select>
      </S.Toolbar>

      <S.SectionHeader>
        <div>
          <h2>Fila operacional</h2>
          <p>Pedidos confirmados e visíveis para acompanhamento</p>
        </div>
        <span>{filtered.length} resultado(s)</span>
      </S.SectionHeader>

      {filtered.length ? (
        <S.OrderList aria-label="Fila de pedidos">
          {filtered.map((order) => {
            const Icon = orderIcon(order.type);
            return (
              <S.OrderRow key={order.id} $status={order.status}>
                <span className="order-icon">
                  <Icon />
                </span>
                <span className="order-body">
                  <span className="order-title">
                    <strong>{order.code}</strong>
                    <b>{orderReference(order)}</b>
                    <S.StatusPill $tone={statusTone(order.status)}>
                      {orderStatusLabel(order.status)}
                    </S.StatusPill>
                  </span>
                  <p>
                    {order.items
                      .map((item) => `${item.quantity}× ${item.productName}`)
                      .join(' · ') || 'Itens não informados'}
                  </p>
                  <span className="order-meta">
                    <span>
                      <CircleDot /> {orderTypeLabel(order.type)}
                    </span>
                    {order.customerName && (
                      <span>
                        <Users /> {order.customerName}
                      </span>
                    )}
                  </span>
                </span>
                <span className="order-time">
                  <strong>{elapsedLabel(order.createdAt, now)} na fila</strong>
                  <small>Recebido às {timeLabel(order.createdAt)}</small>
                </span>
              </S.OrderRow>
            );
          })}
        </S.OrderList>
      ) : (
        <S.Panel>
          <EmptyState
            icon={Search}
            title="Nenhum pedido encontrado"
            text="Ajuste a busca ou os filtros para ver outros pedidos ativos."
          />
        </S.Panel>
      )}
    </>
  );
}

function Tables({ snapshot }: { snapshot: AttendantWorkspaceSnapshot }) {
  const participants = snapshot.tables.reduce((total, table) => total + table.participantCount, 0);
  const orders = snapshot.tables.reduce((total, table) => total + table.activeOrderCount, 0);
  const calls = snapshot.tables.reduce((total, table) => total + table.activeCallCount, 0);
  return (
    <>
      <S.MetricGrid aria-label="Resumo das mesas">
        <S.Metric $tone="neutral">
          <span className="metric-icon">
            <Armchair />
          </span>
          <span>
            <strong>{snapshot.tables.length}</strong>
            <small>Mesas ocupadas</small>
          </span>
        </S.Metric>
        <S.Metric $tone="teal">
          <span className="metric-icon">
            <Users />
          </span>
          <span>
            <strong>{participants}</strong>
            <small>Pessoas nas mesas</small>
          </span>
        </S.Metric>
        <S.Metric $tone="neutral">
          <span className="metric-icon">
            <ShoppingBag />
          </span>
          <span>
            <strong>{orders}</strong>
            <small>Pedidos de mesa ativos</small>
          </span>
        </S.Metric>
        <S.Metric $tone={calls ? 'red' : 'teal'}>
          <span className="metric-icon">
            <BellRing />
          </span>
          <span>
            <strong>{calls}</strong>
            <small>Chamados vinculados</small>
          </span>
        </S.Metric>
      </S.MetricGrid>
      <S.SectionHeader>
        <div>
          <h2>Mapa de ocupação</h2>
          <p>Mesas com sessão ativa no restaurante</p>
        </div>
        <span>Ordenado por número</span>
      </S.SectionHeader>
      <TableCards snapshot={snapshot} />
    </>
  );
}

function Calls({ snapshot, now }: { snapshot: AttendantWorkspaceSnapshot; now: number }) {
  const [mode, setMode] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const calls = snapshot.calls
    .filter((call) => (mode === 'ACTIVE' ? call.status !== 'RESOLVED' : call.status === 'RESOLVED'))
    .sort((first, second) =>
      mode === 'ACTIVE'
        ? first.requestedAt.localeCompare(second.requestedAt)
        : (second.resolvedAt || second.requestedAt).localeCompare(
            first.resolvedAt || first.requestedAt,
          ),
    );

  return (
    <>
      <S.MetricGrid aria-label="Resumo dos chamados">
        <S.Metric $tone="red">
          <span className="metric-icon">
            <BellRing />
          </span>
          <span>
            <strong>{snapshot.calls.filter((call) => call.status === 'WAITING').length}</strong>
            <small>Aguardando</small>
          </span>
        </S.Metric>
        <S.Metric $tone="amber">
          <span className="metric-icon">
            <Clock3 />
          </span>
          <span>
            <strong>{snapshot.calls.filter((call) => call.status === 'IN_PROGRESS').length}</strong>
            <small>Em atendimento</small>
          </span>
        </S.Metric>
        <S.Metric $tone="teal">
          <span className="metric-icon">
            <CheckCircle2 />
          </span>
          <span>
            <strong>{snapshot.calls.filter((call) => call.status === 'RESOLVED').length}</strong>
            <small>Resolvidos hoje</small>
          </span>
        </S.Metric>
        <S.Metric $tone="neutral">
          <span className="metric-icon">
            <ClipboardList />
          </span>
          <span>
            <strong>
              {
                snapshot.calls.filter((call) => call.type === 'BILL' && call.status !== 'RESOLVED')
                  .length
              }
            </strong>
            <small>Contas solicitadas</small>
          </span>
        </S.Metric>
      </S.MetricGrid>

      <S.Toolbar>
        <S.Segmented aria-label="Alternar lista de chamados">
          <button
            type="button"
            className={mode === 'ACTIVE' ? 'active' : ''}
            aria-pressed={mode === 'ACTIVE'}
            onClick={() => setMode('ACTIVE')}
          >
            Em aberto
          </button>
          <button
            type="button"
            className={mode === 'HISTORY' ? 'active' : ''}
            aria-pressed={mode === 'HISTORY'}
            onClick={() => setMode('HISTORY')}
          >
            Resolvidos hoje
          </button>
        </S.Segmented>
      </S.Toolbar>

      <S.SectionHeader>
        <div>
          <h2>{mode === 'ACTIVE' ? 'Solicitações abertas' : 'Histórico de hoje'}</h2>
          <p>{mode === 'ACTIVE' ? 'Mais antigas primeiro' : 'Mais recentes primeiro'}</p>
        </div>
        <span>{calls.length} chamado(s)</span>
      </S.SectionHeader>

      {calls.length ? (
        <S.CallList aria-label="Lista de chamados">
          {calls.map((call) => {
            const resolved = call.status === 'RESOLVED';
            const urgent = !resolved && now - new Date(call.requestedAt).getTime() >= 5 * 60_000;
            return (
              <S.CallRow key={call.id} $urgent={urgent} $resolved={resolved}>
                <span className="call-icon">
                  {call.type === 'BILL' ? <ClipboardList /> : <BellRing />}
                </span>
                <span className="call-body">
                  <div>
                    <strong>Mesa {String(call.tableNumber).padStart(2, '0')}</strong>
                    <S.StatusPill $tone={resolved ? 'teal' : urgent ? 'red' : 'amber'}>
                      {callStatusLabel(call)}
                    </S.StatusPill>
                  </div>
                  <p>
                    {callLabel(call)}
                    {call.assignedToName ? ` · Responsável: ${call.assignedToName}` : ''}
                  </p>
                </span>
                <span className="call-time">
                  <strong>
                    {resolved && call.resolvedAt
                      ? `Resolvido às ${timeLabel(call.resolvedAt)}`
                      : elapsedLabel(call.requestedAt, now)}
                  </strong>
                  <small>Solicitado às {timeLabel(call.requestedAt)}</small>
                </span>
              </S.CallRow>
            );
          })}
        </S.CallList>
      ) : (
        <S.Panel>
          <EmptyState
            icon={mode === 'ACTIVE' ? CheckCircle2 : Clock3}
            title={mode === 'ACTIVE' ? 'Nenhum chamado em aberto' : 'Sem histórico hoje'}
            text={
              mode === 'ACTIVE'
                ? 'O salão não possui solicitações aguardando atendimento.'
                : 'Os chamados concluídos hoje aparecerão nesta lista.'
            }
          />
        </S.Panel>
      )}
    </>
  );
}

export function AttendantWorkspace({
  attendantName,
  restaurant,
  snapshot,
  workspaceState,
  initialView = 'overview',
  onViewChange,
  onRefresh,
  onLogout,
}: Props) {
  const [view, setView] = useState<AttendantView>(initialView);
  const [now, setNow] = useState(() => Date.now());
  const mainRef = useRef<HTMLElement | null>(null);
  const openCalls = snapshot.calls.filter((call) => call.status !== 'RESOLVED').length;
  const page = viewContent[view];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const navigate = (next: AttendantView) => {
    setView(next);
    onViewChange?.(next);
    if (window.innerWidth <= 840) {
      mainRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const lastUpdated = workspaceState.lastUpdatedAt
    ? timeLabel(workspaceState.lastUpdatedAt)
    : '--:--';

  return (
    <S.Root $primary={restaurant.primaryColor}>
      <S.Sidebar>
        <S.Brand>
          <span className="mark">{restaurant.monogram}</span>
          <span>
            <strong>{restaurant.name}</strong>
            <small>Área do atendente</small>
          </span>
        </S.Brand>
        <S.Navigation aria-label="Navegação do atendente">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={view === id ? 'active' : ''}
              aria-current={view === id ? 'page' : undefined}
              onClick={() => navigate(id)}
            >
              <Icon />
              <span>{label}</span>
              {id === 'calls' && openCalls > 0 && <i>{openCalls}</i>}
            </button>
          ))}
        </S.Navigation>
        <S.SidebarFooter>
          <span className="avatar">{initials(attendantName)}</span>
          <span>
            <strong>{attendantName}</strong>
            <small>Atendente</small>
          </span>
          <S.SidebarLogout
            type="button"
            onClick={onLogout}
            aria-label="Sair da área do atendente"
            title="Sair"
          >
            <LogOut />
          </S.SidebarLogout>
        </S.SidebarFooter>
      </S.Sidebar>

      <S.Main ref={mainRef}>
        <S.Topbar>
          <S.MobileIdentity>{restaurant.monogram}</S.MobileIdentity>
          <S.PageTitle>
            <h1>{page.title}</h1>
            <p>{page.subtitle}</p>
          </S.PageTitle>
          <S.TopActions>
            <S.SyncStatus>
              <span>
                <i /> Operação conectada
              </span>
              <small>Atualizado às {lastUpdated}</small>
            </S.SyncStatus>
            <S.IconButton
              type="button"
              onClick={() => void onRefresh()}
              disabled={workspaceState.refreshing}
              aria-label="Atualizar dados da operação"
              title="Atualizar dados"
            >
              <RefreshCw className={workspaceState.refreshing ? 'spinning' : ''} />
            </S.IconButton>
            <S.MobileLogout
              type="button"
              onClick={onLogout}
              aria-label="Sair da área do atendente"
              title="Sair"
            >
              <LogOut />
            </S.MobileLogout>
          </S.TopActions>
        </S.Topbar>

        <S.Content>
          {workspaceState.error && (
            <S.Notice role="alert">
              <AlertTriangle />
              <span>
                <strong>Não foi possível atualizar a operação.</strong>
                <small>{workspaceState.error}</small>
              </span>
              <button type="button" onClick={() => void onRefresh()}>
                Tentar novamente
              </button>
            </S.Notice>
          )}

          {workspaceState.loading &&
          !snapshot.orders.length &&
          !snapshot.calls.length &&
          !snapshot.tables.length ? (
            <S.Loading role="status" aria-live="polite">
              <span className="loader">
                <RefreshCw />
              </span>
              <strong>Sincronizando a operação</strong>
              <span>Buscando pedidos, mesas e chamados do restaurante.</span>
            </S.Loading>
          ) : view === 'overview' ? (
            <Overview snapshot={snapshot} now={now} onNavigate={navigate} />
          ) : view === 'orders' ? (
            <Orders snapshot={snapshot} now={now} />
          ) : view === 'tables' ? (
            <Tables snapshot={snapshot} />
          ) : (
            <Calls snapshot={snapshot} now={now} />
          )}
        </S.Content>
      </S.Main>

      <S.BottomNav aria-label="Navegação móvel do atendente">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={view === id ? 'active' : ''}
            aria-current={view === id ? 'page' : undefined}
            onClick={() => navigate(id)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </S.BottomNav>
    </S.Root>
  );
}
