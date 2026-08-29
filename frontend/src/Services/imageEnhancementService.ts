import axios from 'axios';
import api from './api';

export const IMAGE_ENHANCEMENT_TIMEOUT_MS = 180_000;

const requestConfig = {
  timeout: IMAGE_ENHANCEMENT_TIMEOUT_MS,
  skipBaseUrlFallback: true,
} as const;

function normalizeImageEnhancementError(error: unknown) {
  if (!axios.isAxiosError(error)) return error;

  const serverMessage = String(error.response?.data?.error || '').trim();
  if (serverMessage) return new Error(serverMessage, { cause: error });

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new Error(
      'A melhoria da imagem demorou mais de 3 minutos. Tente novamente com uma imagem menor.',
      { cause: error },
    );
  }

  if (!error.response) {
    return new Error('Não foi possível conectar ao serviço de melhoria de imagens.', {
      cause: error,
    });
  }

  return error;
}

async function enhanceImage(path: string, imageDataUrl: string) {
  try {
    const response = await api.post(path, { imageDataUrl }, requestConfig);
    return String(response.data?.imageDataUrl || '');
  } catch (error) {
    throw normalizeImageEnhancementError(error);
  }
}

const imageEnhancementService = {
  async enhanceRestaurantImage(imageDataUrl: string) {
    return enhanceImage('/image-enhancement/restaurant', imageDataUrl);
  },
  async enhanceBannerImage(imageDataUrl: string) {
    return enhanceImage('/image-enhancement/banner', imageDataUrl);
  },
};

export default imageEnhancementService;
