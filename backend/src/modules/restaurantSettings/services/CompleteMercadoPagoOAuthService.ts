import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import { consumeSingleUseOAuthState } from '../security/oauthState.js';
import { resolveOAuthEndpoint } from '../security/oauthEndpoints.js';

type CompleteMercadoPagoOAuthPayload = {
  code?: string;
  state?: string;
  providerError?: string;
  providerErrorDescription?: string;
};

type MercadoPagoOAuthTokenResponse = {
  access_token?: string;
  error?: string;
  message?: string;
  status?: number;
};

class CompleteMercadoPagoOAuthService {
  private getApiBaseUrl() {
    return resolveOAuthEndpoint('MERCADO_PAGO_API');
  }

  private getBackendBaseUrl() {
    return String(process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`)
      .trim()
      .replace(/\/+$/, '');
  }

  private getRedirectUri() {
    return String(process.env.MP_OAUTH_REDIRECT_URI || '').trim();
  }

  private getClientId() {
    return String(
      process.env.MP_OAUTH_CLIENT_ID ||
        process.env.MP_CLIENT_ID ||
        process.env.MERCADO_PAGO_CLIENT_ID ||
        '',
    ).trim();
  }

  private getClientSecret() {
    return String(
      process.env.MP_OAUTH_CLIENT_SECRET ||
        process.env.MP_CLIENT_SECRET ||
        process.env.MERCADO_PAGO_CLIENT_SECRET ||
        '',
    ).trim();
  }

  private extractProviderError(response: MercadoPagoOAuthTokenResponse) {
    const apiError = String(response?.error || '').trim();
    const apiMessage = String(response?.message || '').trim();

    if (apiError || apiMessage) {
      return [apiError, apiMessage].filter(Boolean).join(': ');
    }

    return 'Mercado Pago nao concluiu a autorizacao.';
  }

  async execute({
    code,
    state,
    providerError,
    providerErrorDescription,
  }: CompleteMercadoPagoOAuthPayload) {
    const normalizedState = String(state || '').trim();
    if (!normalizedState) {
      throw new Error('State OAuth do Mercado Pago nao recebido.');
    }
    const { restaurantId } = await consumeSingleUseOAuthState(normalizedState, 'MERCADO_PAGO');

    if (providerError) {
      const details = String(providerErrorDescription || '').trim();
      const baseMessage = `Mercado Pago recusou autorizacao (${providerError}).`;
      throw new Error(details ? `${baseMessage} ${details}` : baseMessage);
    }

    const normalizedCode = String(code || '').trim();
    if (!normalizedCode) {
      throw new Error('Codigo OAuth do Mercado Pago nao recebido.');
    }

    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    if (!clientId || !clientSecret) {
      throw new Error(
        'Credenciais OAuth do Mercado Pago nao configuradas. Defina MP_OAUTH_CLIENT_ID e MP_OAUTH_CLIENT_SECRET (ou aliases MP_CLIENT_ID/MP_CLIENT_SECRET).',
      );
    }

    const redirectUri =
      this.getRedirectUri() || `${this.getBackendBaseUrl()}/settings/mercado-pago/oauth/callback`;

    const tokenResponse = await fetch(`${this.getApiBaseUrl()}/oauth/token`, {
      method: 'POST',
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: normalizedCode,
        redirect_uri: redirectUri,
      }),
    });

    const tokenBody = (await tokenResponse.json()) as MercadoPagoOAuthTokenResponse;

    if (!tokenResponse.ok) {
      throw new Error(this.extractProviderError(tokenBody));
    }

    const accessToken = String(tokenBody?.access_token || '').trim();
    if (!accessToken) {
      throw new Error('Mercado Pago nao retornou access_token valido.');
    }

    const existingSettings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);

    if (existingSettings) {
      await restaurantSettingsRepository.update(restaurantId, {
        pixProvider: 'MERCADO_PAGO',
        cardGateway: 'MERCADO_PAGO',
        mercadoPagoAccessToken: accessToken,
      });
    } else {
      await restaurantSettingsRepository.create({
        restaurantId,
        deliveryFee: 0,
        minimumOrder: 0,
        pixProvider: 'MERCADO_PAGO',
        cardGateway: 'MERCADO_PAGO',
        mercadoPagoAccessToken: accessToken,
      });
    }

    return {
      restaurantId,
      connected: true,
    };
  }
}

export default new CompleteMercadoPagoOAuthService();
