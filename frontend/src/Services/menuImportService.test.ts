import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from './api';
import menuImportService, { MENU_IMPORT_TIMEOUT_MS } from './menuImportService';

vi.mock('./api', () => ({
  default: { post: vi.fn() },
}));

const summary = {
  restaurantName: 'North Pizza',
  categoriesCreated: 2,
  productsCreated: 5,
  createdCategories: [{ id: 1, name: 'Pizzas' }],
  createdProducts: [{ id: 10, name: 'Pizza Calabresa' }],
};

describe('menuImportService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia o link público ao endpoint autenticado do iFood', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: summary });

    await expect(
      menuImportService.importIfoodMenu({ url: 'https://www.ifood.com.br/delivery/north' }),
    ).resolves.toEqual(summary);

    expect(api.post).toHaveBeenCalledWith(
      '/menu-import/ifood',
      { url: 'https://www.ifood.com.br/delivery/north' },
      { timeout: MENU_IMPORT_TIMEOUT_MS, skipBaseUrlFallback: true },
    );
  });

  it('envia o data URL otimizado ao endpoint de análise por imagem', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: summary });

    await expect(
      menuImportService.importMenuFromImage({ imageUrl: 'data:image/webp;base64,UklGRg==' }),
    ).resolves.toEqual(summary);

    expect(api.post).toHaveBeenCalledWith(
      '/menu-import/image',
      { imageUrl: 'data:image/webp;base64,UklGRg==' },
      { timeout: MENU_IMPORT_TIMEOUT_MS, skipBaseUrlFallback: true },
    );
  });
});
