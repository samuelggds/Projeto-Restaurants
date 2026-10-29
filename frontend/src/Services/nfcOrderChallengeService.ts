import api from './api';
export type NfcDraftItem = { productId: number; quantity: number };
export type NfcChallenge = { challengeId: string; expiresAt: string; confirmed: boolean; alreadyConsumed: boolean };
class NfcOrderChallengeService {
  async create(comandaId: string, items: NfcDraftItem[], idempotencyKey: string, observation?: string) {
    const response = await api.post<NfcChallenge>('/nfc-orders/challenges',
      { comandaId, items, ...(observation ? { observation } : {}) }, { headers: { 'Idempotency-Key': idempotencyKey } });
    return response.data;
  }
  async pending(token: string) {
    const response = await api.post<{ challenge: { id: string; expiresAt: string; draftItems: NfcDraftItem[] } | null }>(
      '/nfc-orders/challenges/pending', { token });
    return response.data.challenge;
  }
  async finalize(challengeId: string) {
    const response = await api.post<{ orderId: number; paid: boolean; status: string }>(`/nfc-orders/challenges/${encodeURIComponent(challengeId)}/finalize`, {});
    return response.data;
  }
  async verify(challengeId: string, token: string, cpfPrefix: string) {
    const response = await api.post<{ verified: boolean }>(
      `/nfc-orders/challenges/${encodeURIComponent(challengeId)}/verify`, { token, cpfPrefix });
    return response.data;
  }
}
export default new NfcOrderChallengeService();
