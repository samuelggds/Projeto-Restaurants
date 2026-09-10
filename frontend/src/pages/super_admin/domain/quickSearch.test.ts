import { describe, expect, it } from 'vitest';
import type { RestaurantTenant, SuperAdminData } from '../types';
import { buildQuickSearchIndex, QUICK_SEARCH_LIMIT, searchQuickAccess } from './quickSearch';

function restaurant(id = 17, name = 'Pizzaria São João'): RestaurantTenant {
  return {
    id,
    name,
    slug: 'sao-joao',
    email: 'contato@saojoao.example',
    phone: null,
    active: true,
    accessBlockReason: 'NONE',
    status: 'ACTIVE',
    createdAt: '2026-09-10T12:00:00Z',
    lastAccessAt: null,
    nextBillingAt: null,
    monthlyFee: 149,
    monthlyOrderRevenue: 0,
    primaryAdmin: null,
    subscription: null,
  };
}

function fixture(): Pick<
  SuperAdminData,
  'restaurants' | 'administrators' | 'invoices' | 'tickets'
> {
  return {
    restaurants: [restaurant()],
    administrators: [
      {
        id: 33,
        name: 'Ana Gonçalves',
        email: 'ana@aurora.example',
        restaurantId: 18,
        restaurant: 'Aurora',
        status: 'ACTIVE',
        lastAccessAt: null,
        mfaEnabled: true,
        mfaRequired: true,
        effectiveMfa: true,
        mustChangePassword: false,
        createdAt: '2026-09-10T12:00:00Z',
      },
    ],
    invoices: [
      {
        id: 71,
        code: 'FAT-000071',
        restaurantId: 18,
        restaurant: 'Aurora',
        dueDate: '2026-09-10',
        paidAt: null,
        value: 149,
        monthlyFee: 149,
        systemFees: 0,
        status: 'PENDING',
        paymentLink: null,
      },
    ],
    tickets: [
      {
        id: 91,
        restaurantId: 17,
        restaurant: 'Pizzaria São João',
        subject: 'Dúvida sobre a impressão',
        status: 'OPEN',
        messageCount: 1,
        lastMessageAt: '2026-09-10T12:00:00Z',
        lastSenderRole: 'ADMIN',
      },
    ],
  };
}

describe('quickSearch', () => {
  it('busca sem acentos, sem distinção de maiúsculas e com todos os termos entre campos', () => {
    const index = buildQuickSearchIndex(fixture());

    expect(searchQuickAccess(index, '  SAO   joao  ').total).toBe(2);
    expect(searchQuickAccess(index, 'goncalves AURORA').results[0]?.target).toEqual({
      kind: 'administrator',
      id: 33,
    });
    expect(searchQuickAccess(index, 'Ana Sao').total).toBe(0);
  });

  it('encontra e-mail, slug, código de fatura, assunto e referências numéricas', () => {
    const index = buildQuickSearchIndex(fixture());
    const cases = [
      ['contato@saojoao.example', 'restaurant', 17],
      ['sao-joao', 'restaurant', 17],
      ['ana@aurora.example', 'administrator', 33],
      ['FAT-000071', 'invoice', 71],
      ['#71', 'invoice', 71],
      ['91', 'support', 91],
      ['impressao', 'support', 91],
    ] as const;

    for (const [query, kind, id] of cases) {
      expect(searchQuickAccess(index, query).results[0]?.target).toEqual({ kind, id });
    }
  });

  it('permite restringir pelo tipo de registro junto ao nome do restaurante', () => {
    const index = buildQuickSearchIndex(fixture());

    expect(
      searchQuickAccess(index, 'fatura Aurora').results.map((result) => result.target),
    ).toEqual([{ kind: 'invoice', id: 71 }]);
    expect(searchQuickAccess(index, 'suporte joao').results.map((result) => result.target)).toEqual(
      [{ kind: 'support', id: 91 }],
    );
  });

  it('não lista dados pessoais antes de uma busca nem inventa registros ausentes', () => {
    const index = buildQuickSearchIndex(fixture());

    expect(searchQuickAccess(index, ' \n\t ')).toEqual({ results: [], total: 0 });
    expect(searchQuickAccess(index, 'restaurante inexistente')).toEqual({ results: [], total: 0 });
    expect(
      searchQuickAccess(
        buildQuickSearchIndex({
          restaurants: [],
          administrators: [],
          invoices: [],
          tickets: [],
        }),
        'Aurora',
      ),
    ).toEqual({ results: [], total: 0 });
  });

  it('prioriza nome e ID exatos antes de correspondências parciais de outras categorias', () => {
    const data = fixture();
    data.restaurants.push(restaurant(33, 'Ana'), restaurant(331, 'Ana 33'));
    const index = buildQuickSearchIndex(data);

    expect(searchQuickAccess(index, 'Ana').results[0]?.target).toEqual({
      kind: 'restaurant',
      id: 33,
    });
    expect(
      searchQuickAccess(index, '33')
        .results.slice(0, 2)
        .map((result) => result.target),
    ).toEqual([
      { kind: 'restaurant', id: 33 },
      { kind: 'administrator', id: 33 },
    ]);
  });

  it('limita a lista, informa o total e mantém a ordem estável independentemente do backend', () => {
    const data = fixture();
    data.restaurants = Array.from({ length: QUICK_SEARCH_LIMIT + 5 }, (_, position) =>
      restaurant(position + 1, `Restaurante ${String(position + 1).padStart(2, '0')}`),
    );
    const firstIndex = buildQuickSearchIndex(data);
    const before = JSON.stringify(firstIndex);
    const first = searchQuickAccess(firstIndex, 'restaurante');
    data.restaurants.reverse();
    const reversed = searchQuickAccess(buildQuickSearchIndex(data), 'restaurante');

    expect(first.total).toBe(QUICK_SEARCH_LIMIT + 5);
    expect(first.results).toHaveLength(QUICK_SEARCH_LIMIT);
    expect(first).toEqual(reversed);
    expect(JSON.stringify(firstIndex)).toBe(before);
  });

  it('trata caracteres de HTML e expressão regular como texto literal', () => {
    const data = fixture();
    data.restaurants = [restaurant(20, '<script>alert(1)</script> [VIP]')];
    const index = buildQuickSearchIndex(data);

    expect(searchQuickAccess(index, '[VIP]').results[0]?.title).toBe(data.restaurants[0].name);
    expect(searchQuickAccess(index, '.*').total).toBe(0);
  });
});
