import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import { consumeSingleUseOAuthState } from '../security/oauthState.js';
import { resolveOAuthEndpoint } from '../security/oauthEndpoints.js';

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
    providerErrorDescription,
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
      throw new Error(
        String(providerErrorDescription || providerError || 'PagBank recusou a autorização.'),
      );
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
    const accessToken = String(body.access_token || '').trim();
    if (!response.ok || !accessToken) {
      throw new Error(String(body.error_description || body.error || 'PagBank recusou a conexão.'));
    }
    const refreshToken = String(body.refresh_token || '').trim() || null;
    const expiresIn = Number(body.expires_in || 0);
    const expiresAt =
      expiresIn > 0 ? new Date(Date.now() + Math.max(expiresIn - 300, 60) * 1000) : null;
    const existing = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
    const data = {
      pixProvider: 'PAGBANK',
      cardGateway: 'PAGBANK',
      pagbankToken: accessToken,
      pagbankRefreshToken: refreshToken,
      pagbankTokenExpiresAt: expiresAt,
      pagbankEnvironment: 'production',
    };
    if (existing) await restaurantSettingsRepository.update(restaurantId, data);
    else
      await restaurantSettingsRepository.create({
        restaurantId,
        deliveryFee: 0,
        minimumOrder: 0,
        ...data,
      });
    return { restaurantId, connected: true };
  }
}

export default new CompletePagBankOAuthService();
