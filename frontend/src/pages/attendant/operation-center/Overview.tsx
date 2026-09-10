import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  PackageCheck,
} from 'lucide-react';
import { useId, useState } from 'react';
import type { AttendantOrder, AttendantWorkspaceSnapshot } from '../types';
import type { OperationDestination } from './navigation';
import { snapshotTime, elapsed, pendingDays, ageLabel, isDelayed, orderPlace } from './format';
import { SectionTitle, Guide, Panel, PanelHead, TextButton } from './shared.styles';
import {
  PriorityGrid,
  PriorityCard,
  PriorityOrderButton,
  PendingBreakdown,
} from './overview.styles';
import { EmptyState } from './EmptyState';

export function Overview({
  snapshot,
  onGo,
  onOpen,
}: {
  snapshot: AttendantWorkspaceSnapshot;
  onGo: (destination: OperationDestination) => void;
  onOpen: (order: AttendantOrder) => void;
}) {
  const [showOldPending, setShowOldPending] = useState(false);
  const oldPendingId = useId();
  const now = snapshotTime(snapshot);
  const oldOrders = snapshot.orders.filter((order) => pendingDays(order.createdAt, now) > 0).length;
  const oldCalls = snapshot.calls.filter(
    (call) => call.status !== 'RESOLVED' && pendingDays(call.requestedAt, now) > 0,
  ).length;
  const oldTables = snapshot.tables.filter((table) => pendingDays(table.openedAt, now) > 0).length;
  const overdue = snapshot.orders.filter((order) => isDelayed(order, now)).length;
  const ready = snapshot.orders.filter((order) => order.status === 'PRONTO').length;
  const waitingCalls = snapshot.calls.filter((call) => call.status === 'WAITING').length;
  const cards = [
    {
      icon: AlertTriangle,
      label: 'Pendências antigas',
      value: oldOrders + oldCalls + oldTables,
      text: 'Itens de dias anteriores que ainda precisam ser resolvidos.',
      onSelect: () => setShowOldPending((current) => !current),
    },
    {
      icon: Clock3,
      label: 'Pedidos demorando',
      value: overdue,
      text: 'Pedidos acima do tempo de atenção.',
      onSelect: () => onGo({ view: 'orders', status: 'ATRASADO' }),
    },
    {
      icon: PackageCheck,
      label: 'Prontos agora',
      value: ready,
      text: 'Pedidos aguardando a próxima etapa.',
      onSelect: () => onGo({ view: 'orders', status: 'PRONTO' }),
    },
    {
      icon: BellRing,
      label: 'Chamados aguardando',
      value: waitingCalls,
      text: 'Mesas aguardando alguém assumir o chamado.',
      onSelect: () => onGo({ view: 'calls', mode: 'WAITING' }),
    },
  ];
  const priorityOrders = [...snapshot.orders]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, 5);

  return (
    <>
      <SectionTitle>
        <h2>Precisa da sua atenção agora</h2>
        <p>Pendências antigas aparecem primeiro para nada sumir quando virar o dia.</p>
      </SectionTitle>
      <PriorityGrid>
        {cards.map(({ icon: Icon, label, value, text, onSelect }, index) => (
          <PriorityCard
            key={label}
            type="button"
            onClick={onSelect}
            aria-expanded={index === 0 ? showOldPending : undefined}
            aria-controls={index === 0 && showOldPending ? oldPendingId : undefined}
          >
            <span className="icon">
              <Icon />
            </span>
            <span>
              <small>{label}</small>
              <strong>{value}</strong>
              <p>{text}</p>
            </span>
            <ChevronRight />
          </PriorityCard>
        ))}
      </PriorityGrid>
      {showOldPending && (
        <PendingBreakdown
          id={oldPendingId}
          role="region"
          aria-label="Pendências de dias anteriores"
        >
          <h3>O que ficou de dias anteriores</h3>
          <p>Escolha o tipo de pendência para abrir sua lista filtrada.</p>
          <div>
            <button type="button" onClick={() => onGo({ view: 'orders', day: 'OLD' })}>
              <ClipboardList aria-hidden="true" />
              <span>
                Pedidos antigos<strong>{oldOrders}</strong>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onGo({ view: 'calls', day: 'OLD' })}>
              <BellRing aria-hidden="true" />
              <span>
                Chamados antigos<strong>{oldCalls}</strong>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onGo({ view: 'tables', day: 'OLD' })}>
              <AlertTriangle aria-hidden="true" />
              <span>
                Mesas abertas desde dias anteriores<strong>{oldTables}</strong>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </PendingBreakdown>
      )}
      <Guide>
        <CircleHelp />
        <div>
          <strong>Ordem sugerida de trabalho</strong>
          <p>
            Comece pelas pendências anteriores, depois pedidos demorando, chamados e pedidos
            prontos.
          </p>
        </div>
      </Guide>
      <Panel>
        <PanelHead>
          <div>
            <ClipboardList />
            <span>
              <strong>Fila prioritária</strong>
              <small>Mais antigos primeiro</small>
            </span>
          </div>
          <TextButton type="button" onClick={() => onGo({ view: 'orders' })}>
            Ver todos <ChevronRight />
          </TextButton>
        </PanelHead>
        {priorityOrders.length ? (
          priorityOrders.map((order) => (
            <PriorityOrderButton
              key={order.id}
              onClick={() => onOpen(order)}
              aria-label={`Abrir pedido ${order.code}, ${order.customerName || orderPlace(order)}`}
            >
              <span className="badge">{order.code}</span>
              <span>
                <b>{order.customerName || orderPlace(order)}</b>
                <small>
                  {orderPlace(order)} · {ageLabel(order.createdAt, now)}
                </small>
              </span>
              <time>{elapsed(order.createdAt, now)}</time>
            </PriorityOrderButton>
          ))
        ) : (
          <EmptyState
            icon={CheckCircle2}
            title="Fila tranquila"
            text="Nenhum pedido ativo agora."
          />
        )}
      </Panel>
    </>
  );
}
