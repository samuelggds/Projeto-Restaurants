import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminPromotionBanner } from '../types';
import { PromotionBannerSettings } from './PromotionBannerSettings';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function banner(localId: string, title: string, position: number): AdminPromotionBanner {
  return {
    id: position + 1,
    localId,
    title,
    highlight: '',
    description: '',
    buttonLabel: 'Ver cardápio',
    image: 'https://cdn.example.com/banner.webp',
    active: true,
    position,
  };
}

function changeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

type HarnessProps = {
  initial?: AdminPromotionBanner[];
  onEnhance?: (localId: string) => void;
  onImageChange?: (localId: string) => void;
};

function Harness({ initial = [], onEnhance, onImageChange }: HarnessProps) {
  const [banners, setBanners] = useState(initial);
  return (
    <PromotionBannerSettings
      banners={banners}
      onChange={setBanners}
      onEnhance={(localId) => onEnhance?.(localId)}
      onImageChange={(localId) => onImageChange?.(localId)}
      enhancingLocalId={null}
    />
  );
}

describe('PromotionBannerSettings', () => {
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

  it('permite adicionar vários banners sem slots fixos e editar a prévia', () => {
    act(() => root.render(<Harness />));
    const add = container.querySelector('.add-banner') as HTMLButtonElement;
    act(() => add.click());
    act(() => add.click());

    expect(container.querySelectorAll('article[aria-label^="Editor do banner"]')).toHaveLength(2);
    const title = container.querySelector('[aria-label="Título do banner 1"]') as HTMLInputElement;
    const highlight = container.querySelector(
      '[aria-label="Destaque do banner 1"]',
    ) as HTMLInputElement;
    const description = container.querySelector(
      '[aria-label="Descrição do banner 1"]',
    ) as HTMLTextAreaElement;
    act(() => {
      changeValue(title, 'Festival de pizzas');
      changeValue(highlight, '30% OFF');
      changeValue(description, 'Oferta válida hoje.');
    });

    const preview = container.querySelector('[aria-label="Prévia do banner 1"]');
    expect(preview?.textContent).toContain('Festival de pizzas');
    expect(preview?.textContent).toContain('30% OFF');
    expect(preview?.textContent).toContain('Oferta válida hoje.');
  });

  it('reordena, oculta e remove banners mantendo as posições visuais', () => {
    act(() =>
      root.render(<Harness initial={[banner('a', 'Primeiro', 0), banner('b', 'Segundo', 1)]} />),
    );

    act(() => {
      (
        container.querySelector('[aria-label="Mover banner 2 para cima"]') as HTMLButtonElement
      ).click();
    });
    expect(
      (container.querySelector('[aria-label="Título do banner 1"]') as HTMLInputElement).value,
    ).toBe('Segundo');

    const visibility = container.querySelector(
      '[aria-label="Exibir banner 1 na Home"]',
    ) as HTMLInputElement;
    act(() => visibility.click());
    expect(visibility.checked).toBe(false);
    expect(container.textContent).toContain('Oculto');

    act(() => {
      (container.querySelector('[aria-label="Remover banner 1"]') as HTMLButtonElement).click();
    });
    expect(container.querySelectorAll('article[aria-label^="Editor do banner"]')).toHaveLength(1);
    expect(
      (container.querySelector('[aria-label="Título do banner 1"]') as HTMLInputElement).value,
    ).toBe('Primeiro');
  });

  it('encaminha upload e melhoria por IA para o banner correto', () => {
    const onEnhance = vi.fn();
    const onImageChange = vi.fn();
    act(() =>
      root.render(
        <Harness
          initial={[banner('banner-alvo', 'Promoção', 0)]}
          onEnhance={onEnhance}
          onImageChange={onImageChange}
        />,
      ),
    );

    act(() => {
      (
        container.querySelector('[aria-label="Selecionar imagem do banner 1"]') as HTMLInputElement
      ).dispatchEvent(new Event('change', { bubbles: true }));
      (
        Array.from(container.querySelectorAll('button')).find((button) =>
          button.textContent?.includes('Melhorar com IA'),
        ) as HTMLButtonElement
      ).click();
    });

    expect(onImageChange).toHaveBeenCalledWith('banner-alvo');
    expect(onEnhance).toHaveBeenCalledWith('banner-alvo');
  });
});
