import { useMemo, useState } from 'react';
import {
  CircleOff,
  RefreshCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react';
import * as S from './AdminPeople.styles';
import type { AdminOrder } from '../types';
import { filterCustomerSummaries, summarizeCustomers } from '../domain/adminOverview';

type AdminCustomersProps = {
  orders: AdminOrder[];
  money: (value: number) => string;
};

type CustomerSort = 'VALUE' | 'ORDERS' | 'NAME';

const CUSTOMER_BATCH_SIZE = 12;

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('pt-BR');
  return initials || 'CL';
}

export function AdminCustomers({ orders, money }: AdminCustomersProps) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CustomerSort>('VALUE');
  const [visibleLimit, setVisibleLimit] = useState(CUSTOMER_BATCH_SIZE);
  const customers = useMemo(() => summarizeCustomers(orders), [orders]);
  const visibleCustomers = useMemo(() => {
    const filtered = filterCustomerSummaries(customers, search);
    return [...filtered].sort((left, right) => {
      if (sort === 'NAME') return left.name.localeCompare(right.name, 'pt-BR');
      if (sort === 'ORDERS') return right.count - left.count || right.total - left.total;
      return right.total - left.total || right.count - left.count;
    });
  }, [customers, search, sort]);
  const displayedCustomers = visibleCustomers.slice(0, visibleLimit);
  const totalOrders = useMemo(
    () => customers.reduce((total, customer) => total + customer.count, 0),
    [customers],
  );
  const totalMoved = useMemo(
    () => customers.reduce((total, customer) => total + customer.total, 0),
    [customers],
  );
  const returningCustomers = useMemo(
    () => customers.filter((customer) => customer.count > 1).length,
    [customers],
  );
  const returnRate = customers.length
    ? Math.round((returningCustomers / customers.length) * 100)
    : 0;

  return (
    <S.PeopleWorkspace>
      <S.PeopleHero aria-labelledby="customers-hero-title">
        <S.HeroCopy>
          <span className="eyebrow">
            <Sparkles aria-hidden="true" /> Relacionamento com clientes
          </span>
          <h2 id="customers-hero-title">
            {customers.length
              ? 'Conheça quem movimenta seu restaurante'
              : 'Sua base de clientes começa no primeiro pedido'}
          </h2>
          <p>
            Consulte o histórico de compras, identifique quem voltou e encontre cada cliente sem
            perder tempo.
          </p>
          <div className="hero-status" aria-label="Resumo da base de clientes">
            <span>
              <Users aria-hidden="true" /> {customers.length}{' '}
              {customers.length === 1 ? 'cliente identificado' : 'clientes identificados'}
            </span>
            <span>
              <RefreshCcw aria-hidden="true" /> {returningCustomers}{' '}
              {returningCustomers === 1 ? 'cliente recorrente' : 'clientes recorrentes'}
            </span>
            <span>
              <ShoppingBag aria-hidden="true" /> {totalOrders}{' '}
              {totalOrders === 1 ? 'pedido registrado' : 'pedidos registrados'}
            </span>
          </div>
        </S.HeroCopy>
        <S.HeroAside>
          <small>Recorrência da base</small>
          <strong>{returnRate}% voltaram</strong>
          <span>Percentual de clientes com mais de um pedido no histórico do restaurante.</span>
        </S.HeroAside>
      </S.PeopleHero>

      <S.PeopleMetrics aria-label="Indicadores dos clientes">
        <S.PeopleMetric>
          <span className="metric-icon primary" aria-hidden="true">
            <Users />
          </span>
          <span className="metric-copy">
            <small>Clientes identificados</small>
            <strong>{customers.length}</strong>
            <em>Com pedidos no histórico</em>
          </span>
        </S.PeopleMetric>
        <S.PeopleMetric>
          <span className="metric-icon success" aria-hidden="true">
            <RefreshCcw />
          </span>
          <span className="metric-copy">
            <small>Clientes recorrentes</small>
            <strong>{returningCustomers}</strong>
            <em>Fizeram dois pedidos ou mais</em>
          </span>
        </S.PeopleMetric>
        <S.PeopleMetric>
          <span className="metric-icon info" aria-hidden="true">
            <ShoppingBag />
          </span>
          <span className="metric-copy">
            <small>Pedidos associados</small>
            <strong>{totalOrders}</strong>
            <em>Somados em toda a base</em>
          </span>
        </S.PeopleMetric>
        <S.PeopleMetric>
          <span className="metric-icon warning" aria-hidden="true">
            <WalletCards />
          </span>
          <span className="metric-copy">
            <small>Valor movimentado</small>
            <strong>{money(totalMoved)}</strong>
            <em>Total dos pedidos registrados</em>
          </span>
        </S.PeopleMetric>
      </S.PeopleMetrics>

      <S.DirectoryPanel aria-labelledby="customers-directory-title">
        <S.DirectoryHeader>
          <div>
            <span className="section-icon" aria-hidden="true">
              <Users />
            </span>
            <span>
              <small>Base do restaurante</small>
              <h2 id="customers-directory-title">Histórico por cliente</h2>
            </span>
          </div>
        </S.DirectoryHeader>
        <S.DirectoryDescription>
          Busque por nome ou e-mail e compare rapidamente pedidos e valores movimentados.
        </S.DirectoryDescription>

        <S.DirectoryToolbar className="customers-toolbar">
          <label>
            <span>Buscar</span>
            <span className="control">
              <Search aria-hidden="true" />
              <input
                aria-label="Buscar cliente por nome ou e-mail"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setVisibleLimit(CUSTOMER_BATCH_SIZE);
                }}
                placeholder="Buscar cliente"
              />
            </span>
          </label>
          <label>
            <span>Ordenar por</span>
            <select
              aria-label="Ordenar clientes"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as CustomerSort);
                setVisibleLimit(CUSTOMER_BATCH_SIZE);
              }}
            >
              <option value="VALUE">Maior valor</option>
              <option value="ORDERS">Mais pedidos</option>
              <option value="NAME">Nome</option>
            </select>
          </label>
          <S.ResultCount aria-live="polite">
            {visibleCustomers.length}{' '}
            {visibleCustomers.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
          </S.ResultCount>
        </S.DirectoryToolbar>

        {displayedCustomers.length ? (
          <S.PeopleList aria-label="Lista de clientes">
            {displayedCustomers.map((customer) => (
              <S.CustomerRow key={`${customer.email}-${customer.name}`}>
                <span className="avatar" aria-hidden="true">
                  {getInitials(customer.name)}
                </span>
                <span className="identity">
                  <b>{customer.name}</b>
                  <span>{customer.email}</span>
                </span>
                <span className="customer-stat orders">
                  <small>Pedidos</small>
                  <strong>{customer.count}</strong>
                </span>
                <span className="customer-stat">
                  <small>Valor movimentado</small>
                  <strong>{money(customer.total)}</strong>
                </span>
              </S.CustomerRow>
            ))}
          </S.PeopleList>
        ) : (
          <S.EmptyState>
            <div>
              <CircleOff aria-hidden="true" />
              <strong>
                {customers.length ? 'Nenhum cliente encontrado' : 'Ainda não há clientes'}
              </strong>
              <span>
                {customers.length
                  ? 'Tente buscar por outro nome ou e-mail.'
                  : 'Os clientes aparecerão aqui assim que os primeiros pedidos forem registrados.'}
              </span>
            </div>
          </S.EmptyState>
        )}

        {visibleLimit < visibleCustomers.length && (
          <S.LoadMoreButton
            type="button"
            onClick={() => setVisibleLimit((current) => current + CUSTOMER_BATCH_SIZE)}
          >
            Mostrar mais clientes
          </S.LoadMoreButton>
        )}
      </S.DirectoryPanel>
    </S.PeopleWorkspace>
  );
}
