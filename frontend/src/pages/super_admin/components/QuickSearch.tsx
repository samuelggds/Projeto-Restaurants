import { ArrowUpRight, Building2, MessagesSquare, Receipt, Search, UsersRound } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import {
  buildQuickSearchIndex,
  searchQuickAccess,
  type QuickSearchTarget,
} from '../domain/quickSearch';
import type { SuperAdminData } from '../types';
import { Modal } from './Shared';
import * as S from './QuickSearch.styles';

const resultIcons = {
  restaurant: Building2,
  invoice: Receipt,
  administrator: UsersRound,
  support: MessagesSquare,
} as const;

export function QuickSearch({
  data,
  onClose,
  onSelect,
}: {
  data: SuperAdminData;
  onClose: () => void;
  onSelect: (target: QuickSearchTarget) => void;
}) {
  const [query, setQuery] = useState('');
  const searchId = useId();
  const { restaurants, administrators, invoices, tickets } = data;
  const index = useMemo(
    () => buildQuickSearchIndex({ restaurants, administrators, invoices, tickets }),
    [restaurants, administrators, invoices, tickets],
  );
  const { results, total } = useMemo(() => searchQuickAccess(index, query), [index, query]);
  const hasQuery = query.trim().length > 0;

  return (
    <Modal
      title="Busca rápida"
      description="Busca nos registros carregados do painel."
      onClose={onClose}
    >
      <S.SearchField role="search">
        <label htmlFor={searchId}>Nome, e-mail ou referência</label>
        <div className="input-wrap">
          <Search size={19} aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: Aurora, Ana ou FAT-000071"
            autoComplete="off"
            maxLength={160}
            data-dialog-initial-focus
            aria-describedby={`${searchId}-summary`}
          />
        </div>
      </S.SearchField>
      <S.ResultsSummary
        id={`${searchId}-summary`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {hasQuery
          ? `${total} ${total === 1 ? 'resultado encontrado' : 'resultados encontrados'}.${
              total > results.length
                ? ` Exibindo ${results.length}. Refine a busca para encontrar o registro desejado.`
                : ''
            }`
          : 'Restaurantes, administradores, faturas e conversas de suporte.'}
      </S.ResultsSummary>
      {results.length ? (
        <S.ResultList aria-label="Resultados da busca">
          {results.map((result) => {
            const Icon = resultIcons[result.target.kind];
            return (
              <li key={`${result.target.kind}-${result.target.id}`}>
                <S.ResultButton type="button" onClick={() => onSelect(result.target)}>
                  <span className="result-icon" aria-hidden="true">
                    <Icon size={19} />
                  </span>
                  <span className="result-copy">
                    <span className="result-category">{result.category}</span>
                    <strong>{result.title}</strong>
                    <span className="result-description">{result.description}</span>
                  </span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </S.ResultButton>
              </li>
            );
          })}
        </S.ResultList>
      ) : (
        <S.SearchHint>
          <Search size={27} aria-hidden="true" />
          <h3>
            {hasQuery ? 'Nenhum registro corresponde à busca' : 'O que você precisa encontrar?'}
          </h3>
          <p>
            {hasQuery
              ? 'Tente outro nome, e-mail ou número. Esta busca considera apenas os registros carregados no painel.'
              : 'Encontre um registro e abra seus detalhes sem precisar percorrer as áreas do painel.'}
          </p>
        </S.SearchHint>
      )}
    </Modal>
  );
}
