import api from './api';
import { resolvePublicProductImages } from './publicMediaSource';

function productsFromResponse(response) {
  return resolvePublicProductImages(
    response.data?.products,
    response.config?.baseURL || api.defaults?.baseURL || '',
  );
}

class MenuService {
  async listProducts(restaurantId) {
    const response = await api.get('/products', {
      params: { restaurantId },
    });

    return productsFromResponse(response);
  }

  async listProductsBySlug(slug) {
    const response = await api.get('/products', {
      params: { slug },
    });

    return productsFromResponse(response);
  }

  async listProductRatings(restaurantId, clientKey) {
    const response = await api.get('/products/ratings', {
      params: {
        restaurantId,
        clientKey,
      },
    });

    return response.data?.ratings || [];
  }

  async rateProduct({ restaurantId, productId, rating, clientKey }) {
    const response = await api.post(`/products/${productId}/rating`, {
      restaurantId,
      rating,
      clientKey,
    });

    return response.data?.rating || null;
  }
}

export default new MenuService();
