import api from './api';

export type ComboOptionInput = {
  componentProductId: number;
  additionalPrice: number;
  minQuantity: number;
  maxQuantity: number;
  defaultQuantity: number;
  locked: boolean;
  active: boolean;
};

export type ComboGroupInput = {
  name: string;
  description?: string;
  minSelections: number;
  maxSelections: number;
  active: boolean;
  options: ComboOptionInput[];
};

export type ComboInput = {
  name: string;
  description: string;
  image: string;
  price: number;
  active: boolean;
  featured: boolean;
  groups: ComboGroupInput[];
};

export type ComboRecord = ComboInput & {
  id: number;
  kind: 'COMBO';
  configurationVersion: number;
  comboGroups: Array<
    Omit<ComboGroupInput, 'options'> & {
      id: number;
      options: Array<
        ComboOptionInput & {
          id: number;
          componentProduct: {
            id: number;
            name: string;
            description?: string | null;
            image?: string | null;
            price: number;
            stock?: number | null;
            active: boolean;
          };
        }
      >;
    }
  >;
};

const productComboService = {
  async list() {
    const response = await api.get<{ combos: ComboRecord[] }>('/product-combos');
    return response.data.combos || [];
  },

  async create(input: ComboInput) {
    const response = await api.post<{ combo: ComboRecord }>('/product-combos', input);
    return response.data.combo;
  },

  async update(id: number, input: ComboInput) {
    const response = await api.put<{ combo: ComboRecord }>(`/product-combos/${id}`, input);
    return response.data.combo;
  },

  async remove(id: number) {
    const response = await api.delete<{ archived: boolean }>(`/product-combos/${id}`);
    return response.data;
  },

  async generateImage(id: number) {
    const response = await api.post<{ image: string }>(`/product-combos/${id}/generate-image`, {}, {
      timeout: 180_000,
      skipBaseUrlFallback: true,
    });
    return response.data.image;
  },

  async generatePreviewImage(input: ComboInput) {
    const response = await api.post<{ image: string }>(
      '/product-combos/generate-image-preview',
      input,
      { timeout: 180_000, skipBaseUrlFallback: true },
    );
    return response.data.image;
  },
};

export default productComboService;
