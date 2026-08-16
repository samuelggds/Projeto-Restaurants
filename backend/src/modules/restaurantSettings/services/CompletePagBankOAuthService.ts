import jwt from 'jsonwebtoken';
import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

class CompletePagBankOAuthService {
  async execute({ code, state }: { code?: string; state?: string }) {
    const normalizedCode = String(code || '').trim();
    const normalizedState = String(state || '').trim();
    const jwtSecret = String(process.env.JWT_SECRET || '').trim();
    if (!normalizedCode || !normalizedState) {
      throw new Error('Código de autorização PagBank não recebido.');
    }
    const decoded = jwt.verify(normalizedState, jwtSecret) as {
      restaurantId?: number;
    };
    const restaurantId = Number(decoded.restaurantId || 0);
    if (!restaurantId) throw new Error('Estado OAuth PagBank inválido.');

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
    const apiBaseUrl = String(process.env.PAGBANK_CONNECT_API_URL || 'https://api.pagseguro.com')
      .trim()
      .replace(/\/+$/, '');
    const response = await fetch(`${apiBaseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${platformToken}`,
        X_CLIENT_ID: clientId,
        X_CLIENT_SECRET: clientSecret,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
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
