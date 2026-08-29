import api from './api';

const imageEnhancementService = {
  async enhanceRestaurantImage(imageDataUrl: string) {
    const response = await api.post('/image-enhancement/restaurant', { imageDataUrl });
    return String(response.data?.imageDataUrl || '');
  },
  async enhanceBannerImage(imageDataUrl: string) {
    const response = await api.post('/image-enhancement/banner', { imageDataUrl });
    return String(response.data?.imageDataUrl || '');
  },
};

export default imageEnhancementService;
