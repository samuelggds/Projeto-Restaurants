import type { ClaimedPrintJob } from '../types.js';

export class PrintAgentApi {
  constructor(
    private readonly apiBaseUrl: string,
    private readonly credential: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async request<T>(path: string, body: unknown) {
    const response = await this.fetchImpl(`${this.apiBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.credential}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    const data = (await response.json().catch(() => null)) as T | { error?: string } | null;
    if (!response.ok) {
      throw new Error(
        data && typeof data === 'object' && 'error' in data && data.error
          ? String(data.error)
          : `SaaS respondeu HTTP ${response.status}.`,
      );
    }
    return data as T;
  }

  heartbeat(input: { printerName?: string | null; appVersion?: string }) {
    return this.request<{ ok: true; serverTime: string }>(
      '/kitchen-printing/agent/heartbeat',
      input,
    );
  }

  async claim() {
    const result = await this.request<{ job: ClaimedPrintJob | null }>(
      '/kitchen-printing/agent/jobs/claim',
      {},
    );
    return result.job;
  }

  markPrinted(jobPublicId: string) {
    return this.request(`/kitchen-printing/agent/jobs/${jobPublicId}/printed`, {});
  }

  markFailed(jobPublicId: string, error: string) {
    return this.request(`/kitchen-printing/agent/jobs/${jobPublicId}/failed`, { error });
  }
}
