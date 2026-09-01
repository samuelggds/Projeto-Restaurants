import { describe, expect, it } from 'vitest';
import { sectionTitle, settingGroups, settingItems } from './adminNavigation';

describe('navegação agrupada das configurações', () => {
  it('mantém cada subseção em um único grupo e inclui descontos e conta da mesa em operação', () => {
    const ids = settingItems.map(([id]) => id);
    const operation = settingGroups.find((group) => group.id === 'operation');

    expect(new Set(ids).size).toBe(ids.length);
    expect(operation?.items.some(([id]) => id === 'promotions')).toBe(true);
    expect(operation?.items.some(([id]) => id === 'table-account')).toBe(true);
    expect(operation?.items.some(([id]) => id === 'courier-payments')).toBe(true);
    expect(sectionTitle.promotions).toBe('Descontos e fidelidade');
    expect(sectionTitle['table-account']).toBe('Conta e pagamento da mesa');
    expect(sectionTitle['courier-payments']).toBe('Pagamento dos motoqueiros');
  });
});
