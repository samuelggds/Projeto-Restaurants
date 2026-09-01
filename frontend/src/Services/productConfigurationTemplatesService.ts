import api from './api';
import type {
  AdminProductCompositionItem,
  AdminProductConfigurationTemplate,
  AdminProductOptionGroup,
  AdminProductPortionConfiguration,
} from '../pages/admin/types';

type TemplateConfiguration = {
  optionGroups: AdminProductOptionGroup[];
  compositionItems: AdminProductCompositionItem[];
  portionConfiguration?: AdminProductPortionConfiguration | null;
};

type TemplatePayload = {
  name: string;
  description?: string;
  configuration: TemplateConfiguration;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mapTemplate(value: unknown): AdminProductConfigurationTemplate {
  const raw = record(value);
  const configuration = record(raw.configuration);
  return {
    id: Number(raw.id),
    name: String(raw.name || 'Modelo sem nome'),
    description: raw.description ? String(raw.description) : null,
    configuration: {
      optionGroups: Array.isArray(configuration.optionGroups)
        ? (configuration.optionGroups as AdminProductOptionGroup[])
        : [],
      compositionItems: Array.isArray(configuration.compositionItems)
        ? (configuration.compositionItems as AdminProductCompositionItem[])
        : [],
      portionConfiguration: configuration.portionConfiguration
        ? (configuration.portionConfiguration as AdminProductPortionConfiguration)
        : null,
    },
  };
}

class ProductConfigurationTemplatesService {
  async list() {
    const response = await api.get('/product-configuration-templates');
    const values = Array.isArray(response.data?.templates) ? response.data.templates : [];
    return values.map(mapTemplate).filter((template) => template.id > 0);
  }

  async create(payload: TemplatePayload) {
    const response = await api.post('/product-configuration-templates', payload);
    return mapTemplate(response.data?.template);
  }

  async deactivate(id: number) {
    await api.delete(`/product-configuration-templates/${id}`);
  }
}

export default new ProductConfigurationTemplatesService();
