import { describe, expect, it } from 'vitest';
import { sectionTitle, settingGroups, settingItems } from './adminNavigation';

describe('navegação agrupada das configurações', () => {
  it('mantém cada subseção em um único grupo e inclui descontos em operação', () => {
    const ids = settingItems.map(([id]) => id);
    const operation = settingGroups.find((group) => group.id === 'operation');

    expect(new Set(ids).size).toBe(ids.length);
    expect(operation?.items.some(([id]) => id === 'promotions')).toBe(true);
    expect(sectionTitle.promotions).toBe('Descontos e fidelidade');
  });
});
