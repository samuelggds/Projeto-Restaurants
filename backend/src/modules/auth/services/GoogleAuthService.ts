import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { UserRole } from "@prisma/client";
import userRepository from "../repositories/UserRepository.js";
import authTokenService from "./AuthTokenService.js";
import loginMfaService from "./LoginMfaService.js";

function getSafeNameFromEmail(email: string | undefined) {
  const username = String(email || "")
    .split("@")[0]
    ?.trim();
  return username || "Cliente";
}

function parseGoogleClientIds() {
  const singleClientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  const listFromEnv = String(process.env.GOOGLE_CLIENT_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const merged = [singleClientId, ...listFromEnv].filter(Boolean);

  return Array.from(new Set(merged));
}

class GoogleAuthService {
  async execute({ idToken }: { idToken: string }) {
    if (!idToken) {
      throw new Error("Token do Google não informado");
    }

    const googleClientIds = parseGoogleClientIds();
    const googleClientId = googleClientIds[0] || "";

    if (!googleClientId || googleClientIds.length === 0) {
      throw new Error(
        "Login com Google indisponível. Configure GOOGLE_CLIENT_ID (ou GOOGLE_CLIENT_IDS) no backend.",
      );
    }

    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: googleClientIds,
    });
    const payload = ticket.getPayload();

    const email = payload?.email;

    if (!email || payload?.email_verified !== true) {
      throw new Error("Não foi possível validar sua conta Google");
    }

    let user = await userRepository.findByEmail(email);

    if (!user) {
      const generatedPassword = `google:${payload?.sub || email}:${Date.now()}`;
      const passwordHash = await bcrypt.hash(generatedPassword, 10);

      user = await userRepository.create({
        name: payload?.name || getSafeNameFromEmail(email),
        email,
        password: passwordHash,
        role: UserRole.CLIENTE,
      });
    }

    if (!user.active) {
      throw new Error("Conta desativada. Reative sua conta para continuar.");
    }

    const mfaChallenge = await loginMfaService.beginIfRequired(user as any);
    if (mfaChallenge) {
      return mfaChallenge;
    }

    const tokenPayload = {
      id: user.id,
      role: user.role,
      restaurantId: user.restaurantId,
    };
    const token = authTokenService.createAccessToken(tokenPayload);
    const refreshToken =
      await authTokenService.createRefreshToken(tokenPayload);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        mustChangePassword: user.mustChangePassword,
        mfaEnabled: user.mfaEnabled,
        phone: user.phone,
        address: user.address,
        number: user.number,
        district: user.district,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        complement: user.complement,
        restaurantId: user.restaurantId,
      },
      token,
      refreshToken,
    };
  }
}

export default new GoogleAuthService();
