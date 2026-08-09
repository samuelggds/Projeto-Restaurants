import jwt from "jsonwebtoken";

type Payload = { restaurantId: number | string; userId: number | string };

class StartPagBankOAuthService {
  async execute({ restaurantId, userId }: Payload) {
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedUserId = Number(userId);
    const clientId = String(process.env.PAGBANK_CONNECT_CLIENT_ID || "").trim();
    const jwtSecret = String(process.env.JWT_SECRET || "").trim();

    if (!normalizedRestaurantId || !normalizedUserId) {
      throw new Error("Restaurante ou administrador inválido para conectar PagBank.");
    }
    if (!clientId) {
      throw new Error("PAGBANK_CONNECT_CLIENT_ID não configurado no backend.");
    }
    if (jwtSecret.length < 32) {
      throw new Error("JWT_SECRET inválido para iniciar conexão PagBank.");
    }

    const backendUrl = String(process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`)
      .trim().replace(/\/+$/, "");
    const redirectUri = String(
      process.env.PAGBANK_CONNECT_REDIRECT_URI ||
      `${backendUrl}/settings/pagbank/oauth/callback`,
    ).trim();
    const state = jwt.sign(
      { restaurantId: normalizedRestaurantId, userId: normalizedUserId },
      jwtSecret,
      { expiresIn: "10m" },
    );
    const authBaseUrl = String(
      process.env.PAGBANK_CONNECT_AUTH_URL ||
      "https://connect.pagbank.com.br/oauth2/authorize",
    ).trim();
    const query = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "payments.read payments.create payments.refund checkout.create checkout.view",
      state,
    });

    return { authorizationUrl: `${authBaseUrl}?${query.toString()}` };
  }
}

export default new StartPagBankOAuthService();
