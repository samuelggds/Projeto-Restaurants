import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders, isAxiosError } from 'axios';
import { publicApiError } from './publicApiError';

describe('public API errors', () => {
  it('preserves the error contract without retaining credentials in inspect, JSON or toJSON', () => {
    const config = {
      headers: new AxiosHeaders({ Authorization: 'Bearer private-token' }),
      data: '{"password":"secret-password"}',
    };
    const error = new AxiosError(
      'upstream private-message',
      'ERR_BAD_REQUEST',
      config,
      { cookie: 'private-cookie' },
      {
        config,
        headers: { 'set-cookie': ['private-cookie'] },
        status: 403,
        statusText: 'Forbidden',
        data: {
          code: 'BILLING_BLOCKED',
          error: 'Sistema bloqueado por inadimplência',
          invoiceId: 12,
          token: 'private-token',
          details: config,
        },
      },
    );
    const safe = publicApiError(error) as AxiosError;
    expect(isAxiosError(safe)).toBe(true);
    expect(safe.response).toMatchObject({
      status: 403,
      data: { code: 'BILLING_BLOCKED', invoiceId: 12 },
    });
    expect(safe.config).toBeUndefined();
    expect(safe.request).toBeUndefined();
    expect(JSON.stringify({ ...safe, json: safe.toJSON() })).not.toMatch(
      /private-|secret-password|password/,
    );
    expect(error.config).toBe(config);
  });

  it('keeps domain errors identifiable and sanitizes network failures', () => {
    const domain = new Error('Sessão alterada');
    expect(publicApiError(domain)).toBe(domain);
    const network = publicApiError(new AxiosError('secret', 'ECONNABORTED')) as AxiosError;
    expect(network.code).toBe('ECONNABORTED');
    expect(network.message).not.toContain('secret');
  });
});
