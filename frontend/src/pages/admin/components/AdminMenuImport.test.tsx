import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import menuImportService from '../../../Services/menuImportService';
import { AdminMenuImport } from './AdminMenuImport';

vi.mock('../../../Services/menuImportService', () => ({
  default: {
    importIfoodMenu: vi.fn(),
    importMenuFromImage: vi.fn(),
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const summary = {
  restaurantName: 'North Pizza',
  categoriesCreated: 2,
  productsCreated: 2,
  createdCategories: [
    { id: 1, name: 'Pizzas' },
    { id: 2, name: 'Bebidas' },
  ],
  createdProducts: [
    { id: 10, name: 'Pizza Calabresa' },
    { id: 11, name: 'Coca-Cola 350ml' },
  ],
};

describe('importação de cardápio', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const renderImport = async (onImported = vi.fn()) => {
    await act(async () => {
      root.render(<AdminMenuImport onClose={vi.fn()} onImported={onImported} />);
    });
    return onImported;
  };

  const click = async (button: HTMLButtonElement) => {
    await act(async () => button.click());
  };

  const fill = async (input: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      setter?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  it('recusa origem fora do domínio oficial antes de chamar a API', async () => {
    await renderImport();
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Link público do restaurante no iFood"]',
    );
    expect(input).toBeTruthy();

    await fill(input as HTMLInputElement, 'https://example.com/menu');
    const submit = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Analisar e importar'),
    );
    expect(submit).toBeTruthy();
    await click(submit as HTMLButtonElement);

    expect(container.textContent).toContain(
      'Cole um link público HTTPS válido do restaurante no iFood.',
    );
    expect(menuImportService.importIfoodMenu).not.toHaveBeenCalled();
  });

  it('mostra o resumo persistido e recarrega o catálogo após importar', async () => {
    vi.mocked(menuImportService.importIfoodMenu).mockResolvedValue(summary);
    const onImported = await renderImport();
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Link público do restaurante no iFood"]',
    );

    await fill(input as HTMLInputElement, 'https://www.ifood.com.br/delivery/north-pizza');
    const submit = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Analisar e importar'),
    );
    await click(submit as HTMLButtonElement);

    expect(menuImportService.importIfoodMenu).toHaveBeenCalledWith({
      url: 'https://www.ifood.com.br/delivery/north-pizza',
    });
    expect(onImported).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Cardápio importado com sucesso');
    expect(container.textContent).toContain('Pizza Calabresa');
    expect(container.textContent).toContain('Coca-Cola 350ml');
  });

  it('oferece a importação alternativa por foto sem exigir iFood', async () => {
    await renderImport();
    const photoTab = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Foto do cardápio'),
    );
    await click(photoTab as HTMLButtonElement);

    expect(container.textContent).toContain('Envie a foto do cardápio');
    expect(container.querySelector('input[type="file"]')).toBeTruthy();
    const analyze = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Analisar e importar'),
    );
    expect((analyze as HTMLButtonElement).disabled).toBe(true);
  });
});
