import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import nfcRegistrationService from './nfcRegistrationService';

vi.mock('./api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('nfcRegistrationService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('aceita somente lista com paginação válida', async () => {
    const response = { customers: [], page: 1, total: 0, pageSize: 20 };
    vi.mocked(api.get).mockResolvedValueOnce({ data: response });
    await expect(nfcRegistrationService.list()).resolves.toEqual(response);
  });

  it('rejeita dados incompletos em vez de derrubar a interface', async () => {
    for (const body of [{}, { customers: null }, { customers: [], page: 1, total: '0', pageSize: 20 }]) {
      vi.mocked(api.get).mockResolvedValueOnce({ data: body });
      await expect(nfcRegistrationService.list()).rejects.toThrow('Resposta de cadastro NFC inválida.');
    }
  });
});
