import api from './api';
import type { AiCreditBalance } from './aiGuideService';

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
  demoNotice?: string;
  restaurantName: string | null;
  sourceUrl?: string;
  sourceImageUrl?: string;
  categoriesCreated: number;
  productsCreated: number;
  createdCategories: MenuImportCreatedItem[];
  createdProducts: MenuImportCreatedItem[];
};

export type MenuImportDraftItem = {
  publicId: string;
  position: number;
  category: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  confidence: number | null;
  uncertainFields: string[];
  duplicateProductId: number | null;
  action: 'CREATE' | 'UPDATE' | 'SKIP';
  selected: boolean;
  publishedProductId: number | null;
  updatedAt: string;
};

export type MenuImportDraft = {
  publicId: string;
  sourceType: 'IMAGE' | 'IFOOD';
  status: 'REVIEW' | 'PUBLISHED' | 'CANCELED' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  expiresAt: string;
  items: MenuImportDraftItem[];
  summary: {
    total: number;
    selected: number;
    duplicates: number;
    uncertain: number;
    missingDescription: number;
    missingImage: number;
  };
  credits?: AiCreditBalance;
};

export type ImportedProductImageResult = {
  productId: number;
  productName: string;
  status: 'GENERATED' | 'MANUAL_REQUIRED' | 'ALREADY_HAS_IMAGE';
  reason?: 'BRANDED_PRODUCT';
};

export const MENU_IMPORT_TIMEOUT_MS = 180_000;
export const PRODUCT_IMAGE_GENERATION_TIMEOUT_MS = 180_000;

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

  async previewMenuFromImage(payload: ImportMenuFromImagePayload): Promise<MenuImportDraft> {
    const response = await api.post<MenuImportDraft>(
      '/menu-import/image/preview',
      payload,
      requestConfig,
    );
    return response.data;
  }

  async getDraft(publicId: string): Promise<MenuImportDraft> {
    const response = await api.get<MenuImportDraft>(`/menu-import/drafts/${encodeURIComponent(publicId)}`);
    return response.data;
  }

  async updateDraftItem(
    draftPublicId: string,
    itemPublicId: string,
    payload: Partial<Pick<MenuImportDraftItem, 'selected' | 'action' | 'category' | 'name' | 'description' | 'price' | 'image' | 'duplicateProductId'>>,
  ): Promise<MenuImportDraft> {
    const response = await api.patch<MenuImportDraft>(
      `/menu-import/drafts/${encodeURIComponent(draftPublicId)}/items/${encodeURIComponent(itemPublicId)}`,
      payload,
    );
    return response.data;
  }

  async publishDraft(publicId: string) {
    const response = await api.post<{
      draftPublicId: string;
      status: 'PUBLISHED' | 'PARTIAL';
      results: Array<{ itemPublicId: string; productId?: number; status: string; error?: string }>;
      canRetryFailedItems: boolean;
      undoNote: string;
    }>(`/menu-import/drafts/${encodeURIComponent(publicId)}/publish`);
    return response.data;
  }

  async generateImportedProductImage(productId: number): Promise<ImportedProductImageResult> {
    const response = await api.post<ImportedProductImageResult>(
      `/menu-import/products/${productId}/generate-image`,
      {},
      {
        timeout: PRODUCT_IMAGE_GENERATION_TIMEOUT_MS,
        skipBaseUrlFallback: true,
      },
    );
    return response.data;
  }
}

export default new MenuImportService();
