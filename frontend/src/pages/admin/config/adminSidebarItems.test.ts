import { describe, expect, it } from 'vitest';
import { adminSidebarNavigationGroups, operationNavigationItems, managementNavigationItems, mobilePrimaryNavigationItems, mobileMoreNavigationItems, mobileGroupedNavigation } from './adminSidebarItems';

describe('menu administrativo por funcionalidades', () => {
  it('mantém todas as abas uma única vez, incluindo suporte e reservas', () => {
    const expected = [...operationNavigationItems,...managementNavigationItems].map(item => item.area);
    const actual = adminSidebarNavigationGroups.flatMap(group => group.items.map(item => item.area));
    expect(new Set(actual).size).toBe(actual.length);
    expect([...actual].sort()).toEqual([...expected].sort());
    expect(adminSidebarNavigationGroups.map(group => group.label)).toEqual([
      'OPERAÇÃO', 'CARDÁPIO E CLIENTES', 'EQUIPE E GESTÃO', 'FINANCEIRO', 'SISTEMA',
    ]);
  });
  it('mantém barra inferior mobile e todos os itens do menu Mais', () => {
    const primary = mobilePrimaryNavigationItems.map(item => item.area);
    const more = mobileGroupedNavigation.flatMap(group => group.items.map(item => item.area));
    expect([...more].sort()).toEqual(mobileMoreNavigationItems.map(item => item.area).sort());
    expect(new Set([...primary, ...more]).size).toBe(primary.length + more.length);
    expect(more).toContain('reservations');
    expect(more).toContain('settings');
  });
});
