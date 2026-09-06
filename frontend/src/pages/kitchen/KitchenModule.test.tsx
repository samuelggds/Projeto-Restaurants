import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KitchenModule } from './KitchenModule';
import type { KitchenWorkspaceState } from './types';

vi.mock('../../features/employee-help/useEmployeeIssueNotifications', () => ({
  useEmployeeIssueNotifications: vi.fn(),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const employee = {
  id: '4',
  name: 'Ana Cozinha',
  email: 'ana@restaurant.test',
  role: 'KITCHEN' as const,
  shift: '18:00',
};
const restaurant = {
  restaurantName: 'Restaurante Teste',
  monogram: 'RT',
  primaryColor: '#d64d08',
};
const emptyData = { orders: [], tables: [], calls: [] };
const baseState: KitchenWorkspaceState = {
  loading: false,
  refreshing: false,
  error: null,
  lastUpdatedAt: null,
  realtimeStatus: 'connected',
};

describe('KitchenModule workspace states', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(state: KitchenWorkspaceState, onRefresh = vi.fn()) {
    act(() =>
      root.render(
        <KitchenModule
          employee={employee}
          restaurant={restaurant}
          data={emptyData}
          workspaceState={state}
          onRefresh={onRefresh}
        />,
      ),
    );
    return onRefresh;
  }

  it('distingue carregamento de um retorno vazio confirmado', () => {
    render({ ...baseState, loading: true });
    const loading = container.querySelector('[role="status"]');
    expect(loading?.textContent).toContain('Carregando pedidos...');
    expect(container.textContent).not.toContain('Nenhum pedido ativo no momento.');

    render({ ...baseState, lastUpdatedAt: new Date().toISOString() });
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.textContent).toContain('Nenhum pedido ativo no momento.');
  });

  it('mostra erro bloqueante com retry sem renderizar um vazio enganoso', () => {
    const onRefresh = render({
      ...baseState,
      error: 'Não foi possível carregar os pedidos da cozinha.',
    });

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Não foi possível carregar os pedidos da cozinha.');
    expect(container.textContent).not.toContain('Nenhum pedido ativo no momento.');
    const retry = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Tentar novamente',
    );
    act(() => retry?.click());
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('expõe navegação e ações principais como botões acessíveis', () => {
    render({ ...baseState, lastUpdatedAt: new Date().toISOString() });

    const overview = [...container.querySelectorAll('nav button')].find(
      (button) => button.textContent?.trim() === 'Visão geral',
    );
    expect(overview?.getAttribute('aria-current')).toBe('page');
    expect(container.querySelector('[aria-label="Atualizar pedidos da cozinha"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Sair da área da cozinha"]')).not.toBeNull();

    const mobileNavigation = container.querySelector('[aria-label="Navegação móvel da cozinha"]');
    expect(mobileNavigation?.querySelectorAll('button')).toHaveLength(4);

    const more = container.querySelector(
      '[aria-label="Abrir opções da cozinha"]',
    ) as HTMLButtonElement;
    act(() => more.click());
    const menu = container.querySelector('[role="menu"]');
    expect(menu?.textContent).toContain('Central de ajuda');
    expect(menu?.textContent).toContain('Sair da conta');
  });
});