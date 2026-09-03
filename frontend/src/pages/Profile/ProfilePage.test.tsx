import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { profileMockData } from './data';
import { ProfilePage } from './ProfilePage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('ProfilePage', () => {
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

  it('expõe a etapa atual do pedido e a navegação selecionada', () => {
    act(() => root.render(<ProfilePage />));

    const appHeader = container.querySelector('header');
    expect(appHeader?.textContent).toContain('Início');
    expect(appHeader?.textContent).toContain('Cardápio');
    expect(appHeader?.textContent).not.toContain('Sobre');

    const progress = container.querySelector('[aria-label="Progresso do pedido"]');
    expect(progress?.tagName).toBe('OL');
    expect(progress?.querySelectorAll('li')).toHaveLength(4);
    expect(progress?.querySelector('[aria-current="step"]')?.getAttribute('aria-label')).toContain(
      'etapa atual',
    );

    const selectedTabs = container.querySelectorAll('nav [aria-current="page"]');
    expect(selectedTabs).toHaveLength(2);
    expect([...selectedTabs].every((tab) => tab.textContent?.includes('Visão geral'))).toBe(true);
  });

  it('atualiza a seleção ao navegar pelas abas móveis', () => {
    act(() => root.render(<ProfilePage />));

    const mobileNavigationTrigger = container.querySelector(
      'button[aria-controls="profile-mobile-sections"]',
    ) as HTMLButtonElement;
    act(() => mobileNavigationTrigger.click());

    const mobileOrders = [...container.querySelectorAll('nav button')].find(
      (button) => button.textContent?.trim() === 'Meus pedidos' && button.closest('aside') === null,
    ) as HTMLButtonElement;
    act(() => mobileOrders.click());

    expect(mobileNavigationTrigger.getAttribute('aria-current')).toBe('page');
    expect(mobileNavigationTrigger.textContent).toContain('Meus pedidos');
    expect(container.querySelector('#profile-mobile-sections')).toBeNull();
    expect(container.textContent).toContain('Acompanhe pedidos atuais e consulte seu histórico.');
  });

  it('expande o histórico em blocos de 10 e retorna ao início', () => {
    const recentOrders = Array.from({ length: 23 }, (_, index) => ({
      ...profileMockData.recentOrders[0],
      id: `#SC-${3000 + index}`,
      summary: `Pedido anterior ${index + 1}`,
    }));

    act(() =>
      root.render(<ProfilePage initialView="orders" data={{ ...profileMockData, recentOrders }} />),
    );

    const history = container.querySelector('[aria-label="Histórico de pedidos"]') as HTMLElement;
    expect(history.querySelectorAll('article')).toHaveLength(10);

    const showMore = () =>
      container.querySelector(
        'button[aria-label="Mostrar mais 10 pedidos do histórico"]',
      ) as HTMLButtonElement;
    act(() => showMore().click());
    expect(history.querySelectorAll('article')).toHaveLength(20);

    act(() => showMore().click());
    expect(history.querySelectorAll('article')).toHaveLength(23);

    const reset = container.querySelector(
      'button[aria-label="Voltar aos 10 pedidos iniciais"]',
    ) as HTMLButtonElement;
    act(() => reset.click());
    expect(history.querySelectorAll('article')).toHaveLength(10);
  });
});
