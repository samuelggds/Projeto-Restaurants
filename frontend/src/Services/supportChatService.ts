import api from './api';

class SupportChatService {
  async getMessages(options?: {
    restaurantId?: number | string;
    beforeId?: number | string;
    limit?: number;
    channel?: 'platform' | 'internal';
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

    if (options?.channel) {
      params.channel = options.channel;
    }

    const query = Object.keys(params).length > 0 ? { params } : undefined;

    const response = await api.get('/ai-support/messages', query);
    return response.data;
  }

  async updateIssue(id: string, status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED', issueResponse?: string) {
    const response = await api.patch(`/ai-support/messages/${id}/issue`, {
      status,
      response: issueResponse,
    });
    return response.data;
  }

  async deleteIssue(id: string) {
    const response = await api.delete(`/ai-support/messages/${id}/issue`);
    return response.data;
  }

  async getMyIssueUpdates() {
    const response = await api.get('/ai-support/my-issue-updates');
    return response.data;
  }
}

export default new SupportChatService();
