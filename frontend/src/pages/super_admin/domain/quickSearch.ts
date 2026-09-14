import type { SuperAdminData } from '../types';
import { normalizeSearch } from './superAdminDomain';

export type QuickSearchTarget = {
  kind: 'restaurant' | 'invoice' | 'administrator' | 'support';
  id: number;
};

export interface QuickSearchResult {
  target: QuickSearchTarget;
  title: string;
  description: string;
  category: string;
}

type SearchData = Pick<SuperAdminData, 'restaurants' | 'invoices' | 'administrators' | 'tickets'>;

interface SearchEntry extends QuickSearchResult {
  normalizedTitle: string;
  searchable: string;
}

export const QUICK_SEARCH_LIMIT = 12;

const categoryOrder = { restaurant: 0, administrator: 1, invoice: 2, support: 3 } as const;

function entry(
  target: QuickSearchTarget,
  title: string,
  description: string,
  category: string,
  extra: string[] = [],
): SearchEntry {
  return {
    target,
    title,
    description,
    category,
    normalizedTitle: normalizeSearch(title),
    searchable: normalizeSearch(
      [title, description, category, String(target.id), `#${target.id}`, ...extra].join(' '),
    ),
  };
}

export function buildQuickSearchIndex(data: SearchData): SearchEntry[] {
  return [
    ...data.restaurants.map((restaurant) =>
      entry(
        { kind: 'restaurant', id: restaurant.id },
        restaurant.name,
        `/${restaurant.slug} · ${restaurant.email}`,
        'Restaurante',
        [restaurant.primaryAdmin?.name || '', restaurant.primaryAdmin?.email || ''],
      ),
    ),
    ...data.administrators.map((administrator) =>
      entry(
        { kind: 'administrator', id: administrator.id },
        administrator.name,
        `${administrator.restaurant} · ${administrator.email}`,
        'Administrador',
      ),
    ),
    ...data.invoices.map((invoice) =>
      entry({ kind: 'invoice', id: invoice.id }, invoice.code, invoice.restaurant, 'Fatura'),
    ),
    ...data.tickets.map((ticket) =>
      entry({ kind: 'support', id: ticket.id }, ticket.subject, ticket.restaurant, 'Suporte'),
    ),
  ];
}

/** The index contains only dashboard records already loaded for the authorized user. */
export function searchQuickAccess(index: SearchEntry[], query: string) {
  const normalizedQuery = normalizeSearch(query).replace(/\s+/g, ' ');
  if (!normalizedQuery) return { results: [] as QuickSearchResult[], total: 0 };

  const terms = normalizedQuery.split(' ');
  const rank = (item: SearchEntry) => {
    if (
      item.normalizedTitle === normalizedQuery ||
      String(item.target.id) === normalizedQuery ||
      `#${item.target.id}` === normalizedQuery
    )
      return 0;
    if (item.normalizedTitle.startsWith(normalizedQuery)) return 1;
    return 2;
  };
  const matches = index
    .filter((item) => terms.every((term) => item.searchable.includes(term)))
    .sort((left, right) => {
      const priority =
        rank(left) - rank(right) ||
        categoryOrder[left.target.kind] - categoryOrder[right.target.kind];
      if (priority) return priority;
      if (left.normalizedTitle !== right.normalizedTitle)
        return left.normalizedTitle < right.normalizedTitle ? -1 : 1;
      return left.target.id - right.target.id;
    });

  return {
    results: matches
      .slice(0, QUICK_SEARCH_LIMIT)
      .map(({ target, title, description, category }) => ({
        target,
        title,
        description,
        category,
      })),
    total: matches.length,
  };
}
