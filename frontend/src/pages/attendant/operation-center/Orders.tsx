import { ChevronLeft, ChevronRight, Clock3, Search } from 'lucide-react';
import { useState } from 'react';
import type { AttendantOrder, AttendantWorkspaceSnapshot } from '../types';
import { PAGE_SIZE } from './types';
import {
  snapshotTime,
  elapsed,
  pendingDays,
  ageLabel,
  isDelayed,
  orderPlace,
  statusText,
} from './format';
import { Toolbar, SearchBox, Filters, List, OrderCard, Pagination } from './shared.styles';
import { EmptyState } from './EmptyState';
import type { DayFilter, OrderFilter } from './navigation';
import { PeriodFilters } from './PeriodFilters';

export function Orders({
  snapshot,
  onOpen,
  initialStatus = 'ALL',
  initialDay = 'ALL',
}: {
  snapshot: AttendantWorkspaceSnapshot;
  onOpen: (order: AttendantOrder) => void;
  initialStatus?: OrderFilter;
  initialDay?: DayFilter;
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderFilter>(initialStatus);
  const [dayFilter, setDayFilter] = useState<DayFilter>(initialDay);
  const [page, setPage] = useState(0);
  const now = snapshotTime(snapshot);
  const normalizedQuery = query.trim().toLowerCase().replace(/^#/, '');

  const filtered = snapshot.orders
    .filter((order) => {
      const delayed = isDelayed(order, now);
      const statusMatch =
        statusFilter === 'ALL' ||
        (statusFilter === 'ATRASADO' ? delayed : order.status === statusFilter);
      const old = pendingDays(order.createdAt, now) > 0;
      const dayMatch = dayFilter === 'ALL' || (dayFilter === 'OLD' ? old : !old);
      const haystack = [
        order.code.replace(/^#/, ''),
        order.code,
        order.customerName,
        orderPlace(order),
        ...order.items.map((item) => item.productName),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return statusMatch && dayMatch && (!normalizedQuery || haystack.includes(normalizedQuery));
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const filters = [
    ['ALL', 'Todos'],
    ['PENDENTE', 'Novos'],
    ['PREPARANDO', 'Em preparo'],
    ['PRONTO', 'Prontos'],
    ['ATRASADO', 'Atrasados'],
  ] as const;

  return (
    <>
      <Toolbar>
        <SearchBox>
          <Search />
          <input
            aria-label="Buscar pedidos"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Buscar por nº do pedido, cliente, mesa ou item"
          />
        </SearchBox>
        <Filters>
          {filters.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={statusFilter === value ? 'active' : ''}
              aria-pressed={statusFilter === value}
              onClick={() => {
                setStatusFilter(value);
                setPage(0);
              }}
            >
              {label}
            </button>
          ))}
        </Filters>
      </Toolbar>
      <PeriodFilters
        value={dayFilter}
        total={filtered.length}
        onChange={(value) => {
          setDayFilter(value);
          setPage(0);
        }}
      />
      <List>
        {visible.map((order) => {
          const delayed = isDelayed(order, now);
          const old = pendingDays(order.createdAt, now) > 0;
          return (
            <OrderCard key={order.id} $attention={delayed || old}>
              <div className="status">
                <strong>{order.code}</strong>
                <em className={old ? 'old' : ''}>
                  {old
                    ? ageLabel(order.createdAt, now)
                    : delayed
                      ? 'Precisa de atenção'
                      : statusText(order.status)}
                </em>
              </div>
              <div className="copy">
                <b>{order.customerName || orderPlace(order)}</b>
                <small>
                  {orderPlace(order)} ·{' '}
                  {order.items.map((item) => `${item.quantity}× ${item.productName}`).join(' · ') ||
                    'Itens não informados'}
                </small>
              </div>
              <div className="time">
                <Clock3 /> {elapsed(order.createdAt, now)}
              </div>
              <button type="button" onClick={() => onOpen(order)}>
                Ver detalhes <ChevronRight />
              </button>
            </OrderCard>
          );
        })}
        {!visible.length && (
          <EmptyState
            icon={Search}
            title="Nenhum pedido encontrado"
            text="Tente outro número, termo ou filtro."
          />
        )}
      </List>
      {filtered.length > PAGE_SIZE && (
        <Pagination>
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft /> Voltar 10
          </button>
          <span>
            Mostrando {safePage * PAGE_SIZE + 1}–
            {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
          >
            Próximos 10 <ChevronRight />
          </button>
        </Pagination>
      )}
    </>
  );
}
