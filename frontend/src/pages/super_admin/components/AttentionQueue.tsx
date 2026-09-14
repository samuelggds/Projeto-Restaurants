import {
  ArrowUpRight,
  CheckCheck,
  Clock3,
  Headphones,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { SuperAdminData } from '../types';
import { buildAttentionQueue, type AttentionCategory } from '../domain/attentionQueue';
import type { QuickSearchTarget } from '../domain/quickSearch';
import { formatCurrency, formatDate } from '../domain/superAdminDomain';
import * as S from './AttentionQueue.styles';

const categories = [
  { id: 'support', label: 'Suporte', icon: Headphones },
  { id: 'billing', label: 'Cobranças', icon: WalletCards },
  { id: 'trial', label: 'Períodos de teste', icon: Clock3 },
  { id: 'access', label: 'Acessos', icon: ShieldCheck },
] as const;
const pageSize = 5;

export function AttentionQueue({
  data,
  onSelect,
  onRefresh,
  refreshing,
  updatedAt,
}: {
  data: SuperAdminData;
  onSelect: (target: QuickSearchTarget) => void;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  updatedAt: string | null;
}) {
  const [filter, setFilter] = useState<AttentionCategory | 'all'>('all');
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const items = useMemo(() => buildAttentionQueue(data, now), [data, now]);
  const filtered = filter === 'all' ? items : items.filter((item) => item.category === filter);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const chooseFilter = (next: typeof filter) => {
    setFilter(next);
    setPage(0);
  };

  return (
    <S.Panel aria-labelledby="attention-queue-title">
      <div className="queue-heading">
        <div>
          <span className="eyebrow">Seu próximo passo</span>
          <h2 id="attention-queue-title">Precisa da sua atenção</h2>
          <p>Encontre o que revisar e abra cada caso para continuar.</p>
        </div>
        <S.Refresh type="button" disabled={refreshing} onClick={() => void onRefresh()}>
          <RefreshCw size={16} aria-hidden="true" className={refreshing ? 'spin' : undefined} />
          {refreshing ? 'Atualizando…' : 'Atualizar pendências'}
        </S.Refresh>
      </div>
      <S.Filters aria-label="Filtrar pendências">
        <button type="button" aria-pressed={filter === 'all'} onClick={() => chooseFilter('all')}>
          Todas <span>{items.length}</span>
        </button>
        {categories.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => chooseFilter(id)}
          >
            <Icon size={16} aria-hidden="true" />
            {label} <span>{items.filter((item) => item.category === id).length}</span>
          </button>
        ))}
      </S.Filters>
      <p className="queue-scope">
        Com base nos registros carregados. Faturas e conversas podem ter histórico adicional.
        {updatedAt ? (
          <>
            {' '}
            Atualização: <time dateTime={updatedAt}>{formatDate(updatedAt, true)}</time>.
          </>
        ) : null}
      </p>
      <S.List>
        {visible.map((item) => {
          const category = categories.find(({ id }) => id === item.category)!;
          const Icon = category.icon;
          return (
            <li key={item.key}>
              <span className="item-icon" data-category={item.category}>
                <Icon size={19} aria-hidden="true" />
              </span>
              <div className="item-copy">
                <span className="item-category">{category.label}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <small>
                  {item.dateLabel}: {formatDate(item.date, true)}
                  {item.amount !== undefined
                    ? ` · ${formatCurrency(item.amount, data.settings.currency, data.settings.locale)}`
                    : ''}
                </small>
              </div>
              <button
                type="button"
                aria-label={`Revisar ${category.label.toLowerCase()}: ${item.title}`}
                onClick={() => onSelect(item.target)}
              >
                Revisar <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </S.List>
      {!visible.length ? (
        <S.Empty role="status">
          <CheckCheck aria-hidden="true" />
          <div>
            <h3>Nenhuma pendência neste recorte</h3>
            <p>Os registros carregados não têm pendências para o filtro selecionado.</p>
          </div>
        </S.Empty>
      ) : null}
      <S.Footer>
        <span role="status">
          {filtered.length
            ? `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, filtered.length)} de ${filtered.length} pendências`
            : '0 pendências'}
        </span>
        {pages > 1 ? (
          <nav aria-label="Paginação de pendências">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              Anteriores
            </button>
            <button
              type="button"
              disabled={currentPage === pages - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              Próximas
            </button>
          </nav>
        ) : (
          <small>Por tipo, com as mais antigas primeiro.</small>
        )}
      </S.Footer>
    </S.Panel>
  );
}
