import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminMockSettings } from '../data';
import { AppearanceSettings } from './AppearanceSettings';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function changeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('AppearanceSettings', () => {
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

  it('renderiza os valores visuais e a descrição como controles gerenciados', () => {
    act(() =>
      root.render(
        <AppearanceSettings
          settings={{
            ...adminMockSettings,
            restaurantName: 'Restaurante Teste',
            primaryColor: '#123456',
            description: 'Descrição pública do restaurante.',
            fontFamily: 'Manrope',
            seoTitle: 'Título para buscadores',
            seoDescription: 'Descrição exclusiva para buscadores.',
          }}
          update={() => undefined}
        />,
      ),
    );

    expect(
      (container.querySelector('[aria-label="Código da cor principal"]') as HTMLInputElement).value,
    ).toBe('#123456');
    expect(
      (container.querySelector('[aria-label="Fonte da loja"]') as HTMLSelectElement).value,
    ).toBe('Manrope');
    expect(
      (container.querySelector('[aria-label="Título da página"]') as HTMLInputElement).value,
    ).toBe('Título para buscadores');
    expect(
      (container.querySelector('[aria-label="Descrição para buscadores"]') as HTMLTextAreaElement)
        .value,
    ).toBe('Descrição exclusiva para buscadores.');
  });

  it('encaminha a cor e a descrição ao estado persistível da tela', () => {
    const update = vi.fn();
    act(() => root.render(<AppearanceSettings settings={adminMockSettings} update={update} />));

    const color = container.querySelector(
      '[aria-label="Código da cor principal"]',
    ) as HTMLInputElement;
    const description = container.querySelector(
      '[aria-label="Descrição para buscadores"]',
    ) as HTMLTextAreaElement;
    const title = container.querySelector('[aria-label="Título da página"]') as HTMLInputElement;
    const font = container.querySelector('[aria-label="Fonte da loja"]') as HTMLSelectElement;

    act(() => {
      changeValue(color, '#abcdef');
      changeValue(title, 'Título atualizado');
      changeValue(description, 'Nova descrição');
      font.value = 'DM Sans';
      font.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(update).toHaveBeenCalledWith('primaryColor', '#abcdef');
    expect(update).toHaveBeenCalledWith('fontFamily', 'DM Sans');
    expect(update).toHaveBeenCalledWith('seoTitle', 'Título atualizado');
    expect(update).toHaveBeenCalledWith('seoDescription', 'Nova descrição');
  });
});
