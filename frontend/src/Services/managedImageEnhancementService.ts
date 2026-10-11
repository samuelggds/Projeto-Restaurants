import axios from 'axios';
import api from './api';
import { IMAGE_ENHANCEMENT_TIMEOUT_MS } from './imageEnhancementService';

export type ManagedImagePurpose = 'PRODUCT' | 'COMBO' | 'BANNER' | 'COVER' | 'LOGO';

const requestConfig = { timeout: IMAGE_ENHANCEMENT_TIMEOUT_MS, skipBaseUrlFallback: true } as const;
const messages: Record<string, string> = {
  MANAGED_IMAGE_INVALID_INPUT: 'Use uma imagem JPG, PNG ou WebP válida.',
  MANAGED_IMAGE_FORBIDDEN: 'Somente um SUPER_ADMIN ativo pode usar esta melhoria.',
  MANAGED_IMAGE_NOT_FOUND: 'Restaurante não encontrado.',
  MANAGED_IMAGE_WORKSPACE_CLOSED: 'Este restaurante não possui workspace assistido disponível.',
  MANAGED_IMAGE_ALREADY_REQUESTED: 'Esta solicitação já foi processada ou está em andamento. Ela não será repetida automaticamente.',
  MANAGED_IMAGE_RATE_LIMITED: 'Limite de melhorias da plataforma atingido. Aguarde antes de tentar novamente.',
  IMAGE_AI_NOT_CONFIGURED: 'O serviço de melhoria de imagens ainda não está configurado.',
  IMAGE_AI_AUTH_ERROR: 'O serviço de melhoria está temporariamente indisponível.',
  IMAGE_AI_QUOTA_EXCEEDED: 'A cota da OpenAI da plataforma foi atingida.',
  IMAGE_AI_RATE_LIMITED: 'O serviço de IA está ocupado. Aguarde antes de tentar novamente.',
  IMAGE_AI_TIMEOUT: 'A OpenAI demorou demais para responder. A imagem original foi mantida. Não houve repetição automática.',
  IMAGE_AI_REJECTED: 'A IA não conseguiu processar esta imagem. Envie outra foto.',
  IMAGE_AI_PROVIDER_ERROR: 'O serviço de IA não respondeu corretamente. A imagem original foi mantida.',
};

export async function enhanceManagedRestaurantImage(input: {
  restaurantId: number;
  purpose: ManagedImagePurpose;
  imageDataUrl: string;
  operationId: string;
}): Promise<string> {
  if (!Number.isSafeInteger(input.restaurantId) || input.restaurantId <= 0) throw new Error('Restaurante inválido.');
  try {
    const response = await api.post(
      `/super-admin/managed-service/restaurants/${input.restaurantId}/images/enhance`,
      { purpose: input.purpose, imageDataUrl: input.imageDataUrl, operationId: input.operationId },
      requestConfig,
    );
    const result = response.data as { imageDataUrl?: unknown; payer?: unknown };
    if (result.payer !== 'PLATFORM' || typeof result.imageDataUrl !== 'string' || !result.imageDataUrl.startsWith('data:image/png;base64,')) {
      throw new Error('A melhoria não retornou uma imagem válida. A original foi mantida.');
    }
    return result.imageDataUrl;
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    const code = String(error.response?.data?.code || '');
    if (messages[code]) throw new Error(messages[code]);
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') throw new Error(messages.IMAGE_AI_TIMEOUT);
    if (error.response?.status === 403 || error.response?.status === 401) throw new Error('A sessão não está autorizada para esta operação.');
    throw new Error('Não foi possível obter a melhoria. A imagem original foi mantida; uma nova tentativa pode gerar novo consumo da plataforma.');
  }
}
