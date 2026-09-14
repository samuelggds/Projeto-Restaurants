import { consumeSingleUseOAuthState } from '../security/oauthState.js';
import { resolveOAuthEndpoint } from '../security/oauthEndpoints.js';
import {
  parseOAuthCredentials,
  saveRestaurantOAuthCredentials,
} from './RestaurantPaymentCredentialsService.js';

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

class CompletePagBankOAuthService {
  async execute({
    code,
    state,
    providerError,
  }: {
    code?: string;
    state?: string;
    providerError?: string;
    providerErrorDescription?: string;
  }) {
    const normalizedCode = String(code || '').trim();
    const normalizedState = String(state || '').trim();
    if (!normalizedState) throw new Error('Estado OAuth PagBank não recebido.');
    const { restaurantId } = await consumeSingleUseOAuthState(normalizedState, 'PAGBANK');
    if (providerError) {
      throw new Error('PagBank não autorizou a conexão. Tente conectar a conta novamente.');
    }
    if (!normalizedCode) throw new Error('Código de autorização PagBank não recebido.');

    const clientId = String(process.env.PAGBANK_CONNECT_CLIENT_ID || '').trim();
    const clientSecret = String(process.env.PAGBANK_CONNECT_CLIENT_SECRET || '').trim();
    const platformToken = String(process.env.PAGBANK_CONNECT_PLATFORM_TOKEN || '').trim();
    if (!clientId || !clientSecret || !platformToken) {
      throw new Error('Credenciais da aplicação PagBank Connect não configuradas.');
    }
    const backendUrl = String(
      process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`,
    )
      .trim()
      .replace(/\/+$/, '');
    const redirectUri = String(
      process.env.PAGBANK_CONNECT_REDIRECT_URI || `${backendUrl}/settings/pagbank/oauth/callback`,
    ).trim();
    const apiBaseUrl = resolveOAuthEndpoint('PAGBANK_API');
    const response = await fetch(`${apiBaseUrl}/oauth2/token`, {
      method: 'POST',
      redirect: 'error',
      headers: {
        Authorization: `Bearer ${platformToken}`,
        X_CLIENT_ID: clientId,
        X_CLIENT_SECRET: clientSecret,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: normalizedCode,
        redirect_uri: redirectUri,
      }),
    });
    const body = (await response.json()) as TokenResponse;
    if (!response.ok) {
      throw new Error('PagBank não concluiu a conexão. Tente conectar a conta novamente.');
    }
    await saveRestaurantOAuthCredentials(restaurantId, 'PAGBANK', {
      ...parseOAuthCredentials(body),
      environment:
        new URL(apiBaseUrl).hostname === 'sandbox.api.pagseguro.com' ? 'sandbox' : 'production',
    });
    return { restaurantId, connected: true };
  }
}

export default new CompletePagBankOAuthService();
