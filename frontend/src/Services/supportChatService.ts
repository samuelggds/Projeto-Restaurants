import api from './api';

class SupportChatService {
  async getMessages(options?: {
    restaurantId?: number | string;
    beforeId?: number | string;
    limit?: number;
  }) {
    const params: Record<string, string | number> = {};

    if (
      options?.restaurantId !== undefined &&
      options?.restaurantId !== null &&
      `${options.restaurantId}`.trim()
    ) {
      params.restaurantId = options.restaurantId;
    }

    if (
      options?.beforeId !== undefined &&
      options?.beforeId !== null &&
      `${options.beforeId}`.trim()
    ) {
      params.beforeId = options.beforeId;
    }

    if (Number.isInteger(options?.limit) && Number(options?.limit) > 0) {
      params.limit = Number(options?.limit);
    }

    const query = Object.keys(params).length > 0 ? { params } : undefined;

    const response = await api.get('/ai-support/messages', query);
    return response.data;
  }
}

export default new SupportChatService();
