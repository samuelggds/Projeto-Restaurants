import { createSingleUseOAuthState } from '../security/oauthState.js';
import { resolveOAuthEndpoint } from '../security/oauthEndpoints.js';

type StartMercadoPagoOAuthPayload = {
  restaurantId: number | string;
  userId: number | string;
};

class StartMercadoPagoOAuthService {
  private getBackendBaseUrl() {
    return String(process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`)
      .trim()
      .replace(/\/+$/, '');
  }

  private getRedirectUri() {
    return String(process.env.MP_OAUTH_REDIRECT_URI || '').trim();
  }

  private getAuthBaseUrl() {
    return resolveOAuthEndpoint('MERCADO_PAGO_AUTHORIZATION');
  }

  private getClientId() {
    return String(
      process.env.MP_OAUTH_CLIENT_ID ||
        process.env.MP_CLIENT_ID ||
        process.env.MERCADO_PAGO_CLIENT_ID ||
        '',
    ).trim();
  }

  async execute({ restaurantId, userId }: StartMercadoPagoOAuthPayload) {
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedUserId = Number(userId);

    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante invalido para conectar Mercado Pago.');
    }

    if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
      throw new Error('Usuario invalido para conectar Mercado Pago.');
    }

    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error(
        'Client ID OAuth do Mercado Pago nao configurado. Defina MP_OAUTH_CLIENT_ID (ou MP_CLIENT_ID / MERCADO_PAGO_CLIENT_ID) no backend.',
      );
    }

    const backendBaseUrl = this.getBackendBaseUrl();
    const redirectUri =
      this.getRedirectUri() || `${backendBaseUrl}/settings/mercado-pago/oauth/callback`;

    const state = await createSingleUseOAuthState({
      provider: 'MERCADO_PAGO',
      restaurantId: normalizedRestaurantId,
      userId: normalizedUserId,
    });

    const query = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      platform_id: 'mp',
      state,
      redirect_uri: redirectUri,
    });

    return {
      authorizationUrl: `${this.getAuthBaseUrl()}?${query.toString()}`,
    };
  }
}

export default new StartMercadoPagoOAuthService();
