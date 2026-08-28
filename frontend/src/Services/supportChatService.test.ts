import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import supportChatService from './supportChatService';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('supportChatService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('solicita os canais PLATFORM e INTERNAL separadamente', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { messages: [] } });

    await supportChatService.getMessages({ limit: 100, channel: 'platform' });
    await supportChatService.getMessages({ limit: 50, channel: 'internal' });

    expect(api.get).toHaveBeenNthCalledWith(1, '/ai-support/messages', {
      params: { limit: 100, channel: 'platform' },
    });
    expect(api.get).toHaveBeenNthCalledWith(2, '/ai-support/messages', {
      params: { limit: 50, channel: 'internal' },
    });
  });
});
