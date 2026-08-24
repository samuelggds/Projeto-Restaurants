import { describe, expect, it } from 'vitest';
import {
  compareReadyForPickupOrders,
  filterCourierOrders,
  getCourierItemChoices,
  getCourierItemObservation,
  isCourierOrderVisibleToAccount,
  isReadyForCourierPickup,
  normalizeCourierOrders,
} from './courierOrders';

describe('courierOrders', () => {
  it('aceita somente delivery pronto para retirada', () => {
    expect(isReadyForCourierPickup({ type: 'DELIVERY', status: 'PRONTO' })).toBe(true);
    expect(isReadyForCourierPickup({ type: 'MESA', status: 'PRONTO' })).toBe(false);
  });
  it('ordena os pedidos mais antigos primeiro', () => {
    const orders = [
      { id: 2, createdAt: '2026-08-10T12:00:00Z' },
      { id: 1, createdAt: '2026-08-10T11:00:00Z' },
    ];
    expect(orders.sort(compareReadyForPickupOrders).map((order) => order.id)).toEqual([1, 2]);
  });
  it('filtra por status e pelo número pesquisado', () => {
    expect(
      filterCourierOrders(
        [
          { id: 48, type: 'DELIVERY', status: 'PRONTO' },
          { id: 49, type: 'DELIVERY', status: 'ENTREGUE' },
        ],
        'PRONTO',
        '#48',
      ),
    ).toHaveLength(1);
  });

  it('normaliza somente pedidos delivery válidos para o fluxo do motoqueiro', () => {
    expect(
      normalizeCourierOrders([
        { id: 1, type: 'delivery', status: 'pronto', items: null },
        { id: 2, type: 'MESA', status: 'PRONTO' },
        { id: 3, type: 'DELIVERY', status: 'PENDENTE' },
        { id: 'inválido', type: 'DELIVERY', status: 'PRONTO' },
      ]),
    ).toEqual([expect.objectContaining({ id: 1, type: 'DELIVERY', status: 'PRONTO', items: [] })]);
  });

  it('mostra disponíveis sem responsável e rotas apenas do motoqueiro autenticado', () => {
    expect(
      isCourierOrderVisibleToAccount(
        { id: 1, type: 'DELIVERY', status: 'PRONTO', assignedCourierId: null },
        44,
      ),
    ).toBe(true);
    expect(
      isCourierOrderVisibleToAccount(
        { id: 2, type: 'DELIVERY', status: 'SAIU_PARA_ENTREGA', assignedCourierId: 44 },
        44,
      ),
    ).toBe(true);
    expect(
      isCourierOrderVisibleToAccount(
        { id: 3, type: 'DELIVERY', status: 'SAIU_PARA_ENTREGA', assignedCourierId: 45 },
        44,
      ),
    ).toBe(false);
  });

  it('preserva escolhas estruturadas, legado e observação do item', () => {
    expect(
      getCourierItemChoices({
        customizations: [
          { groupName: 'Massa', options: [{ name: 'Fina' }] },
          { name: 'Adicionais', options: ['Bacon', { ingredient: { name: 'Queijo' } }] },
        ],
        ingredients: ['Queijo', 'Molho especial'],
      }),
    ).toEqual([
      { groupName: 'Massa', options: ['Fina'] },
      { groupName: 'Adicionais', options: ['Bacon', 'Queijo'] },
      { groupName: 'Itens escolhidos', options: ['Molho especial'] },
    ]);
    expect(getCourierItemChoices({ ingredients: ['Molho', { name: 'Cebola' }] })).toEqual([
      { groupName: 'Itens escolhidos', options: ['Molho', 'Cebola'] },
    ]);
    expect(getCourierItemObservation({ observation: 'Sem talheres' })).toBe('Sem talheres');
  });
});
