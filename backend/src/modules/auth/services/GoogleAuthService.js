import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { UserRole } from "@prisma/client";
import userRepository from "../repositories/UserRepository.js";

function getSafeNameFromEmail(email) {
  const username = String(email || "")
    .split("@")[0]
    ?.trim();
  return username || "Cliente";
}

class GoogleAuthService {
  async execute({ idToken }) {
    if (!idToken) {
      throw new Error("Token do Google não informado");
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      throw new Error(
        "Login com Google indisponível. Configure GOOGLE_CLIENT_ID no backend.",
      );
    }

    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: googleClientId,
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

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
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
    };
  }
}

export default new GoogleAuthService();
