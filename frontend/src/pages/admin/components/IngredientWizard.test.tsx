import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminIngredient } from '../types';
import { IngredientWizard } from './IngredientWizard';

const confirmDialog = vi.fn().mockResolvedValue(true);
const createPersistentImageDataUrl = vi.hoisted(() => vi.fn());

vi.mock('../../../components/AppDialog/context', () => ({
  useAppDialog: () => ({ confirmDialog }),
}));
vi.mock('../../../utils/persistentImage', () => ({ createPersistentImageDataUrl }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const ingredients: AdminIngredient[] = [
  { id: 1, name: 'Bacon', category: 'Adicionais', price: 4, active: true },
];
const imageResults = [
  {
    id: '101',
    thumbnailUrl: 'https://images.pexels.com/bacon-thumb.jpg',
    previewUrl: 'https://images.pexels.com/bacon.jpg',
    source: 'Pexels' as const,
    sourceUrl: 'https://www.pexels.com/photo/101/',
    photographer: 'Ana Foto',
    photographerUrl: 'https://www.pexels.com/@ana',
    alt: 'Bacon em uma tigela',
    selectionToken: 'signed.selection',
  },
  {
    id: '102',
    thumbnailUrl: 'https://images.pexels.com/bacon-2-thumb.jpg',
    previewUrl: 'https://images.pexels.com/bacon-2.jpg',
    source: 'Pexels' as const,
    sourceUrl: 'https://www.pexels.com/photo/102/',
    photographer: 'Beto Foto',
    photographerUrl: 'https://www.pexels.com/@beto',
    alt: 'Fatias de bacon',
    selectionToken: 'other.selection',
  },
];

const searchResponse = (page = 1) => ({
  query: 'Cheddar food ingredient',
  page,
  provider: 'Pexels' as const,
  results: imageResults,
});

describe('wizard de ingrediente', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    confirmDialog.mockReset().mockResolvedValue(true);
    createPersistentImageDataUrl
      .mockReset()
      .mockResolvedValue('data:image/webp;base64,UklGRgQAAABXRUJQ');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const renderWizard = async (
    overrides: Partial<React.ComponentProps<typeof IngredientWizard>> = {},
  ) => {
    const props: React.ComponentProps<typeof IngredientWizard> = {
      categories: ['Adicionais', 'Molhos'],
      ingredients,
      onClose: vi.fn(),
      onCreate: vi.fn(),
      onSearchImages: vi.fn().mockResolvedValue(searchResponse()),
      ...overrides,
    };
    await act(async () => root.render(<IngredientWizard {...props} />));
    return props;
  };

  const button = (text: string) => {
    const candidates = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
    const match =
      candidates.find((candidate) => candidate.textContent?.trim() === text) ||
      candidates.find((candidate) => candidate.textContent?.includes(text));
    expect(match, `Botão “${text}” não encontrado`).toBeTruthy();
    return match as HTMLButtonElement;
  };

  const click = async (text: string) => {
    await act(async () => button(text).click());
  };

  const input = (selector: string) => {
    const match = document.querySelector(selector) as HTMLInputElement | null;
    expect(match, `Campo “${selector}” não encontrado`).toBeTruthy();
    return match as HTMLInputElement;
  };

  const fill = async (selector: string, value: string) => {
    const field = input(selector);
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      setValue?.call(field, value);
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
  };

  const reachPhotoStep = async (name = 'Cheddar') => {
    await fill('input[placeholder="Ex.: Bacon"]', name);
    await click('Continuar');
  };

  const reachCategoryStep = async (name = 'Cheddar') => {
    await reachPhotoStep(name);
    await click('Continuar sem foto');
  };

  const reachPriceStep = async (name = 'Cheddar', category = 'Adicionais') => {
    await reachCategoryStep(name);
    const select = document.querySelector(
      'select[aria-label="Categoria do ingrediente"]',
    ) as HTMLSelectElement;
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
      setValue?.call(select, category);
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await click('Continuar');
  };

  const configurePrice = async (price = '3.5') => {
    await click('Sim');
    await fill('input[aria-label="Valor adicional padrão"]', price);
  };

  it('exige uma categoria antes de avançar', async () => {
    await renderWizard({ categories: [] });
    await reachCategoryStep();

    await click('Continuar');

    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      'Escolha uma categoria ou crie uma nova para continuar.',
    );
    expect(document.body.textContent).toContain('3 de 4');
  });

  it('usa a validação central para nome obrigatório e duplicidade', async () => {
    await renderWizard();

    await click('Continuar');
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      'Informe o nome do ingrediente.',
    );

    await fill('input[placeholder="Ex.: Bacon"]', ' bacon ');
    await click('Continuar');
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      'Já existe um ingrediente com esse nome.',
    );
  });

  it('impede valor adicional negativo', async () => {
    await renderWizard();
    await reachPriceStep();
    await configurePrice('-1');
    await click('Concluir');

    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      'Informe um valor adicional igual ou maior que zero.',
    );
  });

  it('pesquisa somente ao avançar e mostra loading antes das sugestões', async () => {
    let finishSearch: (value: ReturnType<typeof searchResponse>) => void = () => undefined;
    const onSearchImages = vi.fn(
      () =>
        new Promise<ReturnType<typeof searchResponse>>((resolve) => {
          finishSearch = resolve;
        }),
    );
    await renderWizard({ onSearchImages });

    await fill('input[placeholder="Ex.: Bacon"]', 'Bacon defumado');
    expect(onSearchImages).not.toHaveBeenCalled();
    await click('Continuar');
    expect(document.body.textContent).toContain('Procurando uma boa imagem');

    await act(async () => finishSearch(searchResponse()));
    expect(onSearchImages).toHaveBeenCalledWith({
      name: 'Bacon defumado',
      category: undefined,
      page: 1,
    });
    expect(document.body.textContent).toContain('Encontramos algumas imagens');
    expect(document.querySelector('img[alt="Bacon em uma tigela"]')).toBeTruthy();
  });

  it('só usa uma foto sugerida depois da confirmação do administrador', async () => {
    const onCreate = vi.fn();
    await renderWizard({ onCreate });
    await reachPhotoStep();

    await click('Usar esta foto');
    expect(document.body.textContent).toContain('Foto selecionada');
    await click('Continuar');
    const select = document.querySelector(
      'select[aria-label="Categoria do ingrediente"]',
    ) as HTMLSelectElement;
    await act(async () => {
      select.value = 'Adicionais';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await click('Continuar');
    await click('Concluir');

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        image: undefined,
        imageSelectionToken: 'signed.selection',
      }),
    );
  });

  it('pesquisa novamente usando a próxima página', async () => {
    const onSearchImages = vi.fn(({ page }) => Promise.resolve(searchResponse(page)));
    await renderWizard({ onSearchImages });
    await reachPhotoStep();

    await click('Pesquisar novamente');

    expect(onSearchImages).toHaveBeenLastCalledWith({
      name: 'Cheddar',
      category: undefined,
      page: 2,
    });
  });

  it('aceita upload próprio e envia a imagem persistente', async () => {
    const onCreate = vi.fn();
    await renderWizard({ onCreate });
    await reachPhotoStep();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image'], 'bacon.png', { type: 'image/png' });
    Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] });
    await act(async () => fileInput.dispatchEvent(new Event('change', { bubbles: true })));

    expect(createPersistentImageDataUrl).toHaveBeenCalledWith(file, 512, {
      targetWidth: 512,
      targetHeight: 512,
    });
    await click('Continuar');
    const select = document.querySelector(
      'select[aria-label="Categoria do ingrediente"]',
    ) as HTMLSelectElement;
    await act(async () => {
      select.value = 'Adicionais';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await click('Continuar');
    await click('Concluir');

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        image: 'data:image/webp;base64,UklGRgQAAABXRUJQ',
        imageSelectionToken: undefined,
      }),
    );
  });

  it('falha do provider não bloqueia o caminho sem foto', async () => {
    const onCreate = vi.fn();
    await renderWizard({
      onCreate,
      onSearchImages: vi.fn().mockRejectedValue(new Error('provider indisponível')),
    });
    await reachPhotoStep('Cheddar');

    expect(document.body.textContent).toContain('Não conseguimos buscar imagens agora.');
    await click('Continuar sem foto');
    const select = document.querySelector(
      'select[aria-label="Categoria do ingrediente"]',
    ) as HTMLSelectElement;
    await act(async () => {
      select.value = 'Adicionais';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await click('Continuar');
    await click('Concluir');

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ image: null }));
  });

  it('preserva os dados ao voltar e avançar entre as etapas', async () => {
    await renderWizard();
    await reachPriceStep();
    await configurePrice('2');

    await click('Voltar');
    expect(
      (document.querySelector('select[aria-label="Categoria do ingrediente"]') as HTMLSelectElement)
        .value,
    ).toBe('Adicionais');
    await click('Voltar');
    expect(document.body.textContent).toContain('Escolha uma foto');
    await click('Voltar');
    expect(input('input[placeholder="Ex.: Bacon"]').value).toBe('Cheddar');
    await click('Continuar');
    await click('Continuar sem foto');
    await click('Continuar');
    expect(input('input[aria-label="Valor adicional padrão"]').value).toBe('2');
  });

  it('cadastra no catálogo, exibe sucesso e permite iniciar outro cadastro', async () => {
    const onCreate = vi.fn().mockResolvedValue({
      id: 9,
      name: 'Cheddar',
      category: 'Adicionais',
      price: 3.5,
      active: true,
    });
    await renderWizard({ onCreate });
    await reachPriceStep();
    await configurePrice();

    await click('Concluir');

    expect(onCreate).toHaveBeenCalledWith({
      name: 'Cheddar',
      category: 'Adicionais',
      price: 3.5,
      active: true,
      image: null,
      imageSelectionToken: undefined,
    });
    expect(document.body.textContent).toContain('Ingrediente criado com sucesso!');

    await click('Cadastrar outro ingrediente');
    expect(document.body.textContent).toContain('1 de 4');
  });

  it('devolve o ingrediente criado e fecha imediatamente no modo inline', async () => {
    const created: AdminIngredient = {
      id: 12,
      name: 'Barbecue',
      category: 'Molhos',
      price: 2,
      active: true,
    };
    const onClose = vi.fn();
    const onCreated = vi.fn();
    await renderWizard({
      initialCategory: 'Molhos',
      mode: 'INLINE',
      onClose,
      onCreate: vi.fn().mockResolvedValue(created),
      onCreated,
    });
    await fill('input[placeholder="Ex.: Bacon"]', 'Barbecue');
    await click('Continuar');
    await click('Continuar sem foto');
    expect(document.body.textContent).toContain('Categoria definida pela etapa do produto');
    expect(document.body.textContent).not.toContain('Criar nova categoria');
    await click('Continuar');
    await click('Sim');
    await fill('input[aria-label="Valor adicional padrão"]', '2');
    await click('Concluir');

    expect(onCreated).toHaveBeenCalledWith(created);
    expect(onClose).toHaveBeenCalledOnce();
    expect(document.body.textContent).not.toContain('Ingrediente criado com sucesso!');
  });

  it('pede confirmação antes de descartar dados pelo botão de fechar', async () => {
    const onClose = vi.fn();
    confirmDialog.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await renderWizard({ onClose });
    await fill('input[placeholder="Ex.: Bacon"]', 'Cheddar');

    await act(async () =>
      (
        document.querySelector('[aria-label="Fechar cadastro de ingrediente"]') as HTMLButtonElement
      ).click(),
    );
    expect(onClose).not.toHaveBeenCalled();

    await act(async () =>
      (
        document.querySelector('[aria-label="Fechar cadastro de ingrediente"]') as HTMLButtonElement
      ).click(),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('mantém o formulário aberto e mostra a mensagem devolvida pela API', async () => {
    const onClose = vi.fn();
    const onCreate = vi.fn().mockRejectedValue({
      response: { data: { error: 'Ingrediente indisponível para este restaurante.' } },
    });
    await renderWizard({ onClose, onCreate });
    await reachPriceStep();
    await configurePrice();

    await click('Concluir');

    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      'Ingrediente indisponível para este restaurante.',
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Ele normalmente aumenta o preço?');
  });
});
