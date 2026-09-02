import api from './api';

type ImportIfoodMenuPayload = {
  url: string;
  restaurantId?: number | string;
};

type ImportMenuFromImagePayload = {
  imageUrl: string;
  restaurantId?: number | string;
};

export type MenuImportCreatedItem = {
  id: number;
  name: string;
};

export type MenuImportSummary = {
  restaurantName: string | null;
  sourceUrl?: string;
  sourceImageUrl?: string;
  categoriesCreated: number;
  productsCreated: number;
  createdCategories: MenuImportCreatedItem[];
  createdProducts: MenuImportCreatedItem[];
};

export const MENU_IMPORT_TIMEOUT_MS = 180_000;

const requestConfig = {
  timeout: MENU_IMPORT_TIMEOUT_MS,
  skipBaseUrlFallback: true,
} as const;

class MenuImportService {
  async importIfoodMenu(payload: ImportIfoodMenuPayload): Promise<MenuImportSummary> {
    const response = await api.post<MenuImportSummary>(
      '/menu-import/ifood',
      payload,
      requestConfig,
    );
    return response.data;
  }

  async importMenuFromImage(payload: ImportMenuFromImagePayload): Promise<MenuImportSummary> {
    const response = await api.post<MenuImportSummary>(
      '/menu-import/image',
      payload,
      requestConfig,
    );
    return response.data;
  }
}

export default new MenuImportService();
