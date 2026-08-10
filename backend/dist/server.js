// src/server.ts
import "dotenv/config";

// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit5 from "express-rate-limit";

// src/routes/index.ts
import { Router as Router17 } from "express";

// src/modules/auth/routes/authRoutes.ts
import { Router } from "express";

// src/modules/auth/services/RegisterService.ts
import bcrypt from "bcrypt";

// src/config/prisma.ts
import { PrismaClient } from "@prisma/client";
var prisma = new PrismaClient();
var prisma_default = prisma;

// src/modules/auth/repositories/UserRepository.ts
var UserRepository = class {
  async findByEmail(email, db = prisma_default) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return null;
    }
    return db.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive"
        }
      }
    });
  }
  async findByPhone(phone, db = prisma_default) {
    const normalizedPhone = String(phone || "").replace(/\D/g, "");
    if (!normalizedPhone) {
      return null;
    }
    const users = await db.$queryRaw`
      SELECT *
      FROM "User"
      WHERE regexp_replace(COALESCE("phone", ''), '[^0-9]', '', 'g') = ${normalizedPhone}
      LIMIT 1
    `;
    return users[0] || null;
  }
  async create(data, db = prisma_default) {
    return db.user.create({
      data
    });
  }
  async findById(id, db = prisma_default) {
    return db.user.findUnique({
      where: {
        id: Number(id)
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        mustChangePassword: true,
        phone: true,
        cpf: true,
        address: true,
        number: true,
        district: true,
        city: true,
        state: true,
        zipCode: true,
        complement: true,
        restaurantId: true,
        avatar: true
      }
    });
  }
  async updateProfile(id, data, db = prisma_default) {
    return db.user.update({
      where: {
        id: Number(id)
      },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        mustChangePassword: true,
        phone: true,
        cpf: true,
        address: true,
        number: true,
        district: true,
        city: true,
        state: true,
        zipCode: true,
        complement: true,
        restaurantId: true,
        avatar: true
      }
    });
  }
  async updatePassword(id, password, db = prisma_default) {
    return db.user.update({
      where: {
        id: Number(id)
      },
      data: {
        password,
        mustChangePassword: false
      }
    });
  }
  async savePasswordResetCode(id, codeHash, expiresAt, db = prisma_default) {
    return db.user.update({
      where: {
        id: Number(id)
      },
      data: {
        resetPasswordCodeHash: codeHash,
        resetPasswordCodeExpiresAt: expiresAt
      }
    });
  }
  async clearPasswordResetCode(id, db = prisma_default) {
    return db.user.update({
      where: {
        id: Number(id)
      },
      data: {
        resetPasswordCodeHash: null,
        resetPasswordCodeExpiresAt: null
      }
    });
  }
  async updatePasswordAndClearResetCode(id, password, db = prisma_default) {
    return db.user.update({
      where: {
        id: Number(id)
      },
      data: {
        password,
        resetPasswordCodeHash: null,
        resetPasswordCodeExpiresAt: null
      }
    });
  }
  async findByIdWithPassword(id, db = prisma_default) {
    return db.user.findUnique({
      where: {
        id: Number(id)
      }
    });
  }
  async deactivate(id, db = prisma_default) {
    return db.user.update({
      where: {
        id: Number(id)
      },
      data: {
        active: false
      }
    });
  }
  async reactivate(id, db = prisma_default) {
    return db.user.update({
      where: {
        id: Number(id)
      },
      data: {
        active: true
      }
    });
  }
};
var UserRepository_default = new UserRepository();

// src/validators/RegisterValidator.ts
import { z } from "zod";
var registerSchema = z.object({
  name: z.string().min(1, "Nome obrigat\xF3rio"),
  email: z.string().min(1, "Email obrigat\xF3rio").email("Email inv\xE1lido"),
  password: z.string().min(6, "Senha deve conter no m\xEDnimo 6 caracteres!"),
  confirmPassword: z.string().min(1, "Confirma\xE7\xE3o de senha obrigat\xF3ria")
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas n\xE3o coincidem!",
  path: ["confirmPassword"]
});

// src/modules/auth/services/RegisterService.ts
var RegisterService = class {
  async execute({ name, email, password, confirmPassword }) {
    registerSchema.parse({ name, email, password, confirmPassword });
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const userExists = await UserRepository_default.findByEmail(normalizedEmail);
    if (userExists) {
      throw new Error("Este e-mail j\xE1 est\xE1 em uso!");
    }
    const passwordhash = await bcrypt.hash(password, 10);
    const user = await UserRepository_default.create({
      name,
      email: normalizedEmail,
      password: passwordhash
    });
    return user;
  }
};
var RegisterService_default = new RegisterService();

// src/modules/auth/controllers/RegisterController.ts
var RegisterController = class {
  async handle(req, res) {
    try {
      const { name, email, password, confirmPassword } = req.body;
      const user = await RegisterService_default.execute({
        name,
        email,
        password,
        confirmPassword
      });
      return res.status(201).json({ user });
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao registrar usuario"
      });
    }
  }
};
var RegisterController_default = new RegisterController();

// src/modules/auth/services/LoginService.ts
import bcrypt3 from "bcrypt";

// src/validators/LoginValidator.ts
import { z as z2 } from "zod";
var loginSchema = z2.object({
  email: z2.string().min(1, "Email obrigat\xF3rio").email("Email inv\xE1lido"),
  password: z2.string().min(1, "Senha obrigat\xF3ria")
});

// src/modules/auth/services/LoginLockoutService.ts
var BASE_LOCK_SECONDS = Number(process.env.LOGIN_LOCKOUT_BASE_SECONDS || 60);
var MAX_LOCK_SECONDS = Number(process.env.LOGIN_LOCKOUT_MAX_SECONDS || 3600);
var LOCKOUT_AFTER_FAILURES = Number(
  process.env.LOGIN_LOCKOUT_AFTER_FAILURES || 5
);
var STATE_TTL_MS = Number(process.env.LOGIN_LOCKOUT_STATE_TTL_MS || 864e5);
function normalizeKey(email) {
  return String(email || "").trim().toLowerCase().slice(0, 255);
}
async function clearExpiredStates() {
  const cutoff = new Date(Date.now() - STATE_TTL_MS);
  await prisma_default.loginLockout.deleteMany({
    where: {
      updatedAt: {
        lt: cutoff
      }
    }
  });
}
var LoginLockoutService = class {
  async check(email) {
    await clearExpiredStates();
    const key = normalizeKey(email);
    if (!key) {
      return { locked: false, waitSeconds: 0 };
    }
    const state = await prisma_default.loginLockout.findUnique({
      where: {
        emailNormalized: key
      },
      select: {
        lockUntil: true
      }
    });
    if (!state) {
      return { locked: false, waitSeconds: 0 };
    }
    const now = Date.now();
    const lockUntilMs = state.lockUntil ? new Date(state.lockUntil).getTime() : 0;
    if (lockUntilMs <= now) {
      return { locked: false, waitSeconds: 0 };
    }
    return {
      locked: true,
      waitSeconds: Math.max(1, Math.ceil((lockUntilMs - now) / 1e3))
    };
  }
  async registerFailure(email) {
    await clearExpiredStates();
    const key = normalizeKey(email);
    if (!key) {
      return {
        locked: false,
        waitSeconds: 0,
        failedAttempts: 0
      };
    }
    const now = Date.now();
    const current = await prisma_default.loginLockout.findUnique({
      where: {
        emailNormalized: key
      }
    });
    const nextFailedAttempts = Number(current?.failedAttempts || 0) + 1;
    if (nextFailedAttempts < LOCKOUT_AFTER_FAILURES) {
      await prisma_default.loginLockout.upsert({
        where: {
          emailNormalized: key
        },
        update: {
          failedAttempts: nextFailedAttempts,
          lockUntil: null
        },
        create: {
          emailNormalized: key,
          failedAttempts: nextFailedAttempts,
          lockUntil: null
        }
      });
      return {
        locked: false,
        waitSeconds: 0,
        failedAttempts: nextFailedAttempts
      };
    }
    const exponent = Math.max(0, nextFailedAttempts - LOCKOUT_AFTER_FAILURES);
    const lockSeconds = Math.min(
      MAX_LOCK_SECONDS,
      BASE_LOCK_SECONDS * 2 ** exponent
    );
    await prisma_default.loginLockout.upsert({
      where: {
        emailNormalized: key
      },
      update: {
        failedAttempts: nextFailedAttempts,
        lockUntil: new Date(now + lockSeconds * 1e3)
      },
      create: {
        emailNormalized: key,
        failedAttempts: nextFailedAttempts,
        lockUntil: new Date(now + lockSeconds * 1e3)
      }
    });
    return {
      locked: true,
      waitSeconds: lockSeconds,
      failedAttempts: nextFailedAttempts
    };
  }
  async registerSuccess(email) {
    const key = normalizeKey(email);
    if (!key) {
      return;
    }
    await prisma_default.loginLockout.deleteMany({
      where: {
        emailNormalized: key
      }
    });
  }
};
var LoginLockoutService_default = new LoginLockoutService();

// src/modules/auth/services/AuthTokenService.ts
import crypto2 from "crypto";
import jwt from "jsonwebtoken";

// src/config/auth.ts
var DEFAULT_JWT_EXPIRES_IN = "12h";
var DEFAULT_JWT_REFRESH_EXPIRES_IN = "14d";
var DEFAULT_JWT_MFA_EXPIRES_IN = "10m";
function getJwtSecret() {
  return String(process.env.JWT_SECRET || "").trim();
}
function getJwtExpiresIn() {
  const value = String(process.env.JWT_EXPIRES_IN || "").trim();
  return value || DEFAULT_JWT_EXPIRES_IN;
}
function getJwtRefreshSecret() {
  return String(process.env.JWT_REFRESH_SECRET || "").trim();
}
function getJwtRefreshExpiresIn() {
  const value = String(process.env.JWT_REFRESH_EXPIRES_IN || "").trim();
  return value || DEFAULT_JWT_REFRESH_EXPIRES_IN;
}
function getJwtMfaSecret() {
  return String(process.env.JWT_MFA_SECRET || "").trim();
}
function getJwtMfaExpiresIn() {
  const value = String(process.env.JWT_MFA_EXPIRES_IN || "").trim();
  return value || DEFAULT_JWT_MFA_EXPIRES_IN;
}

// src/modules/auth/services/AuthTokenService.ts
function getSafeRefreshSecret() {
  const refreshSecret = getJwtRefreshSecret();
  return refreshSecret || getJwtSecret();
}
function normalizePayload(payload) {
  return {
    id: Number(payload.id || 0),
    role: String(payload.role || ""),
    subRole: payload.subRole ?? null,
    restaurantId: payload.restaurantId === null || payload.restaurantId === void 0 ? null : Number(payload.restaurantId)
  };
}
var AuthTokenService = class {
  createAccessToken(payload) {
    const normalized = normalizePayload(payload);
    return jwt.sign(normalized, getJwtSecret(), {
      expiresIn: getJwtExpiresIn()
    });
  }
  async createRefreshToken(payload) {
    const normalized = normalizePayload(payload);
    const jti = crypto2.randomUUID();
    const refreshPayload = {
      ...normalized,
      type: "refresh",
      jti
    };
    const refreshToken = jwt.sign(refreshPayload, getSafeRefreshSecret(), {
      expiresIn: getJwtRefreshExpiresIn()
    });
    const decoded = jwt.decode(refreshToken);
    const exp = decoded && typeof decoded !== "string" ? Number(decoded.exp || 0) : 0;
    if (!exp) {
      throw new Error("Falha ao gerar refresh token");
    }
    await prisma_default.authRefreshSession.upsert({
      where: {
        userId: normalized.id
      },
      update: {
        jti,
        expiresAt: new Date(exp * 1e3)
      },
      create: {
        userId: normalized.id,
        jti,
        expiresAt: new Date(exp * 1e3)
      }
    });
    return refreshToken;
  }
  async rotateRefreshToken(refreshToken) {
    const decoded = jwt.verify(refreshToken, getSafeRefreshSecret());
    if (!decoded || typeof decoded === "string") {
      throw new Error("Refresh token invalido");
    }
    const userId = Number(decoded.id || 0);
    const role = String(decoded.role || "");
    const restaurantId = decoded.restaurantId === null || decoded.restaurantId === void 0 ? null : Number(decoded.restaurantId);
    const jti = String(decoded.jti || "").trim();
    const tokenType = String(decoded.type || "").trim();
    if (!Number.isInteger(userId) || userId <= 0 || !role || !jti) {
      throw new Error("Refresh token invalido");
    }
    if (tokenType !== "refresh") {
      throw new Error("Refresh token invalido");
    }
    const session = await prisma_default.authRefreshSession.findUnique({
      where: {
        userId
      },
      select: {
        jti: true,
        expiresAt: true
      }
    });
    const latestJti = String(session?.jti || "");
    if (!latestJti || latestJti !== jti) {
      throw new Error("Refresh token expirado");
    }
    const expiresAt = session?.expiresAt ? new Date(session.expiresAt) : null;
    if (!expiresAt || expiresAt.getTime() <= Date.now()) {
      throw new Error("Refresh token expirado");
    }
    const payload = {
      id: userId,
      role,
      restaurantId
    };
    const accessToken = this.createAccessToken(payload);
    const nextRefreshToken = await this.createRefreshToken(payload);
    return {
      accessToken,
      refreshToken: nextRefreshToken
    };
  }
  async revokeRefreshToken(refreshToken) {
    const decoded = jwt.verify(refreshToken, getSafeRefreshSecret());
    if (!decoded || typeof decoded === "string") {
      throw new Error("Refresh token invalido");
    }
    const userId = Number(decoded.id || 0);
    const jti = String(decoded.jti || "").trim();
    if (!Number.isInteger(userId) || userId <= 0 || !jti) {
      throw new Error("Refresh token invalido");
    }
    await prisma_default.authRefreshSession.deleteMany({
      where: {
        userId,
        jti
      }
    });
  }
};
var AuthTokenService_default = new AuthTokenService();

// src/modules/auth/services/LoginMfaService.ts
import bcrypt2 from "bcrypt";
import crypto3 from "crypto";
import jwt2 from "jsonwebtoken";
import nodemailer from "nodemailer";
import { UserRole } from "@prisma/client";
function createTransporter() {
  const smtpHost2 = String(process.env.SMTP_HOST || "").trim();
  const smtpPort2 = Number(process.env.SMTP_PORT || 587);
  const smtpSecure2 = String(process.env.SMTP_SECURE || "false") === "true";
  const smtpAuthType = String(process.env.SMTP_AUTH_TYPE || "basic").trim().toLowerCase();
  const smtpUser2 = String(process.env.SMTP_USER || "").trim();
  const smtpPass2 = String(process.env.SMTP_PASS || "").trim();
  const smtpClientId = String(process.env.SMTP_CLIENT_ID || "").trim();
  const smtpClientSecret = String(process.env.SMTP_CLIENT_SECRET || "").trim();
  const smtpRefreshToken = String(process.env.SMTP_REFRESH_TOKEN || "").trim();
  const smtpAccessToken = String(process.env.SMTP_ACCESS_TOKEN || "").trim();
  if (!smtpHost2 || !smtpPort2 || !smtpUser2) {
    return null;
  }
  if (smtpAuthType === "oauth2") {
    if (!smtpClientId || !smtpClientSecret || !smtpRefreshToken) {
      return null;
    }
    return nodemailer.createTransport({
      host: smtpHost2,
      port: smtpPort2,
      secure: smtpSecure2,
      requireTLS: true,
      auth: {
        type: "OAuth2",
        user: smtpUser2,
        clientId: smtpClientId,
        clientSecret: smtpClientSecret,
        refreshToken: smtpRefreshToken,
        accessToken: smtpAccessToken || void 0
      }
    });
  }
  if (!smtpPass2) {
    return null;
  }
  return nodemailer.createTransport({
    host: smtpHost2,
    port: smtpPort2,
    secure: smtpSecure2,
    requireTLS: true,
    auth: {
      user: smtpUser2,
      pass: smtpPass2
    }
  });
}
function isBasicAuthDisabledError(error2) {
  const message = error2 instanceof Error ? error2.message : String(error2 || "");
  const normalized = message.toLowerCase();
  return normalized.includes("535") && normalized.includes("basic authentication is disabled");
}
function getMfaSecret() {
  return getJwtMfaSecret() || getJwtSecret();
}
function getRequiredMfaRoles() {
  const rawEnvValue = process.env.MFA_REQUIRED_ROLES;
  const envValue = rawEnvValue === void 0 ? `${UserRole.ADMIN},${UserRole.SUPER_ADMIN}` : String(rawEnvValue);
  return new Set(
    envValue.split(",").map((item) => item.trim().toUpperCase()).filter(Boolean)
  );
}
function requiresMfa(role) {
  return getRequiredMfaRoles().has(
    String(role || "").trim().toUpperCase()
  );
}
function mapUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    phone: user.phone,
    address: user.address,
    number: user.number,
    district: user.district,
    city: user.city,
    state: user.state,
    zipCode: user.zipCode,
    complement: user.complement,
    restaurantId: user.restaurantId
  };
}
var LoginMfaService = class {
  async beginIfRequired(user) {
    if (!requiresMfa(user.role)) {
      return null;
    }
    await prisma_default.authMfaChallenge.deleteMany({
      where: {
        expiresAt: {
          lt: /* @__PURE__ */ new Date()
        }
      }
    });
    const code = String(crypto3.randomInt(1e5, 1e6));
    const codeHash = await bcrypt2.hash(code, 10);
    const ttlMinutes = Number(process.env.MFA_CODE_TTL_MIN || 10);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1e3);
    await prisma_default.authMfaChallenge.upsert({
      where: {
        userId: Number(user.id)
      },
      update: {
        codeHash,
        expiresAt
      },
      create: {
        userId: Number(user.id),
        codeHash,
        expiresAt
      }
    });
    const token = jwt2.sign(
      {
        type: "login_mfa",
        userId: Number(user.id)
      },
      getMfaSecret(),
      {
        expiresIn: getJwtMfaExpiresIn()
      }
    );
    const transporter = createTransporter();
    if (transporter) {
      const from = String(
        process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER || ""
      ).trim() || "no-reply@pizzaia.local";
      try {
        await transporter.sendMail({
          from,
          to: user.email,
          subject: "Codigo de verificacao de login - Pizza IA",
          text: `Seu codigo de verificacao e: ${code}. Ele expira em ${ttlMinutes} minutos.`
        });
      } catch (error2) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[login-2fa] Falha no SMTP em desenvolvimento. Codigo para ${user.email}: ${code}`
          );
          return {
            mfaRequired: true,
            mfaToken: token,
            message: "Codigo de verificacao gerado (SMTP indisponivel em desenvolvimento)."
          };
        }
        if (isBasicAuthDisabledError(error2)) {
          throw new Error(
            "Falha no SMTP: o provedor bloqueou login por usuario/senha (basic auth). Configure SMTP_AUTH_TYPE=oauth2 com credenciais OAuth2 ou use app password."
          );
        }
        throw error2;
      }
    } else {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "Falha no SMTP: configure SMTP_HOST, SMTP_PORT, SMTP_USER e credenciais validas para enviar o codigo 2FA por e-mail."
        );
      }
      console.warn(
        `[login-2fa] SMTP nao configurado. Codigo para ${user.email}: ${code}`
      );
    }
    return {
      mfaRequired: true,
      mfaToken: token,
      message: "Codigo de verificacao enviado para o e-mail cadastrado."
    };
  }
  async verifyAndIssueTokens({
    mfaToken,
    code
  }) {
    const rawToken = String(mfaToken || "").trim();
    const rawCode = String(code || "").trim();
    if (!rawToken || !rawCode) {
      throw new Error("Token e codigo de verificacao sao obrigatorios");
    }
    const decoded = jwt2.verify(rawToken, getMfaSecret());
    if (!decoded || typeof decoded === "string") {
      throw new Error("Token de verificacao invalido");
    }
    const tokenType = String(decoded.type || "").trim();
    const userId = Number(decoded.userId || 0);
    if (tokenType !== "login_mfa" || !Number.isInteger(userId) || userId <= 0) {
      throw new Error("Token de verificacao invalido");
    }
    const challenge = await prisma_default.authMfaChallenge.findUnique({
      where: {
        userId
      }
    });
    if (!challenge || new Date(challenge.expiresAt).getTime() <= Date.now()) {
      throw new Error("Codigo de verificacao expirado");
    }
    const validCode = await bcrypt2.compare(rawCode, challenge.codeHash);
    if (!validCode) {
      throw new Error("Codigo de verificacao invalido");
    }
    await prisma_default.authMfaChallenge.deleteMany({
      where: {
        userId
      }
    });
    const user = await UserRepository_default.findByIdWithPassword(userId);
    if (!user || !user.active) {
      throw new Error("Conta desativada. Reative sua conta para continuar.");
    }
    const tokenPayload = {
      id: user.id,
      role: user.role,
      restaurantId: user.restaurantId
    };
    const token = AuthTokenService_default.createAccessToken(tokenPayload);
    const refreshToken = await AuthTokenService_default.createRefreshToken(tokenPayload);
    return {
      user: mapUser(user),
      token,
      refreshToken
    };
  }
};
var LoginMfaService_default = new LoginMfaService();

// src/modules/auth/services/LoginService.ts
var LoginService = class {
  async execute({ email, password }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const lockStatus = await LoginLockoutService_default.check(normalizedEmail);
    if (lockStatus.locked) {
      throw new Error(
        `Muitas tentativas de login. Tente novamente em ${lockStatus.waitSeconds}s.`
      );
    }
    try {
      loginSchema.parse({ email, password });
    } catch (_err) {
      throw new Error("Dados inv\xE1lidos");
    }
    const user = await UserRepository_default.findByEmail(normalizedEmail);
    if (!user) {
      await LoginLockoutService_default.registerFailure(normalizedEmail);
      throw new Error("Email ou senha inv\xE1lidos!");
    }
    const passwordMatch = await bcrypt3.compare(password, user.password);
    if (!passwordMatch) {
      const failure = await LoginLockoutService_default.registerFailure(normalizedEmail);
      if (failure.locked) {
        throw new Error(
          `Muitas tentativas de login. Tente novamente em ${failure.waitSeconds}s.`
        );
      }
      throw new Error("Senha incorreta!");
    }
    if (!user.active) {
      await LoginLockoutService_default.registerFailure(normalizedEmail);
      throw new Error("Conta desativada. Reative sua conta para continuar.");
    }
    await LoginLockoutService_default.registerSuccess(normalizedEmail);
    const mfaChallenge = await LoginMfaService_default.beginIfRequired(user);
    if (mfaChallenge) {
      return mfaChallenge;
    }
    const tokenPayload = {
      id: user.id,
      role: user.role,
      subRole: user.subRole ?? null,
      restaurantId: user.restaurantId
    };
    const token = AuthTokenService_default.createAccessToken(tokenPayload);
    const refreshToken = await AuthTokenService_default.createRefreshToken(tokenPayload);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        subRole: user.subRole ?? null,
        active: user.active,
        mustChangePassword: user.mustChangePassword,
        phone: user.phone,
        address: user.address,
        number: user.number,
        district: user.district,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        complement: user.complement,
        restaurantId: user.restaurantId
      },
      token,
      refreshToken
    };
  }
};
var LoginService_default = new LoginService();

// src/modules/auth/controllers/LoginController.ts
var LoginController = class {
  async handle(req, res) {
    try {
      const { email, password } = req.body;
      const result = await LoginService_default.execute({
        email,
        password
      });
      return res.json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao fazer login"
      });
    }
  }
};
var LoginController_default = new LoginController();

// src/modules/auth/services/GoogleAuthService.ts
import bcrypt4 from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { UserRole as UserRole2 } from "@prisma/client";
function getSafeNameFromEmail(email) {
  const username = String(email || "").split("@")[0]?.trim();
  return username || "Cliente";
}
function parseGoogleClientIds() {
  const singleClientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  const listFromEnv = String(process.env.GOOGLE_CLIENT_IDS || "").split(",").map((item) => item.trim()).filter(Boolean);
  const merged = [singleClientId, ...listFromEnv].filter(Boolean);
  return Array.from(new Set(merged));
}
var GoogleAuthService = class {
  async execute({ idToken }) {
    if (!idToken) {
      throw new Error("Token do Google n\xE3o informado");
    }
    const googleClientIds = parseGoogleClientIds();
    const googleClientId = googleClientIds[0] || "";
    if (!googleClientId || googleClientIds.length === 0) {
      throw new Error(
        "Login com Google indispon\xEDvel. Configure GOOGLE_CLIENT_ID (ou GOOGLE_CLIENT_IDS) no backend."
      );
    }
    const client3 = new OAuth2Client(googleClientId);
    const ticket = await client3.verifyIdToken({
      idToken,
      audience: googleClientIds
    });
    const payload = ticket.getPayload();
    const email = payload?.email;
    if (!email || payload?.email_verified !== true) {
      throw new Error("N\xE3o foi poss\xEDvel validar sua conta Google");
    }
    let user = await UserRepository_default.findByEmail(email);
    if (!user) {
      const generatedPassword = `google:${payload?.sub || email}:${Date.now()}`;
      const passwordHash = await bcrypt4.hash(generatedPassword, 10);
      user = await UserRepository_default.create({
        name: payload?.name || getSafeNameFromEmail(email),
        email,
        password: passwordHash,
        role: UserRole2.CLIENTE
      });
    }
    if (!user.active) {
      throw new Error("Conta desativada. Reative sua conta para continuar.");
    }
    const mfaChallenge = await LoginMfaService_default.beginIfRequired(user);
    if (mfaChallenge) {
      return mfaChallenge;
    }
    const tokenPayload = {
      id: user.id,
      role: user.role,
      restaurantId: user.restaurantId
    };
    const token = AuthTokenService_default.createAccessToken(tokenPayload);
    const refreshToken = await AuthTokenService_default.createRefreshToken(tokenPayload);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        mustChangePassword: user.mustChangePassword,
        phone: user.phone,
        address: user.address,
        number: user.number,
        district: user.district,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        complement: user.complement,
        restaurantId: user.restaurantId
      },
      token,
      refreshToken
    };
  }
};
var GoogleAuthService_default = new GoogleAuthService();

// src/modules/auth/controllers/GoogleAuthController.ts
var GoogleAuthController = class {
  async handle(req, res) {
    try {
      const { idToken } = req.body;
      const result = await GoogleAuthService_default.execute({ idToken });
      return res.json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro no login Google"
      });
    }
  }
};
var GoogleAuthController_default = new GoogleAuthController();

// src/modules/auth/services/GetProfileService.ts
var GetProfileService = class {
  async execute(userId) {
    return UserRepository_default.findById(userId);
  }
};
var GetProfileService_default = new GetProfileService();

// src/modules/auth/controllers/MeController.ts
var MeController = class {
  async handle(req, res) {
    try {
      const user = await GetProfileService_default.execute(req.user.id);
      return res.status(200).json(user);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao buscar perfil"
      });
    }
  }
};
var MeController_default = new MeController();

// src/middlewares/authMiddleware.ts
import jwt3 from "jsonwebtoken";
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Token n\xE3o informado!" });
  }
  const [, token] = authHeader.split(" ");
  try {
    const decoded = jwt3.verify(token, process.env.JWT_SECRET);
    if (typeof decoded === "string") {
      return res.status(401).json({ error: "Token inv\xE1lido!" });
    }
    req.user = {
      id: Number(decoded.id || 0),
      role: String(decoded.role || ""),
      subRole: decoded.subRole === null || decoded.subRole === void 0 ? null : String(decoded.subRole),
      restaurantId: decoded.restaurantId === null || decoded.restaurantId === void 0 ? null : Number(decoded.restaurantId),
      email: decoded.email === null || decoded.email === void 0 ? null : String(decoded.email)
    };
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Token inv\xE1lido!" });
  }
}

// src/modules/auth/services/UpdatePasswordService.ts
import bcrypt5 from "bcrypt";
var UpdatePasswordService = class {
  async execute(userId, oldPassword, newPassword) {
    const user = await UserRepository_default.findByIdWithPassword(userId);
    if (!user) {
      throw new Error("Usu\xE1rio n\xE3o encontrado!");
    }
    const passwordCompare = await bcrypt5.compare(oldPassword, user.password);
    if (!passwordCompare) {
      throw new Error("Senha atual incorreta!");
    }
    const hashPassword = await bcrypt5.hash(newPassword, 10);
    return UserRepository_default.updatePassword(userId, hashPassword);
  }
};
var UpdatePasswordService_default = new UpdatePasswordService();

// src/modules/auth/controllers/UpdatePasswordController.ts
var UpdatePasswordController = class {
  async handle(req, res) {
    try {
      const userId = req.user.id;
      const { oldPassword, newPassword } = req.body;
      await UpdatePasswordService_default.execute(userId, oldPassword, newPassword);
      return res.status(200).json({ message: "Senha atualizada com sucesso!" });
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao atualizar senha"
      });
    }
  }
};
var UpdatePasswordController_default = new UpdatePasswordController();

// src/modules/auth/services/UpdateProfileService.ts
var UpdateProfileService = class {
  async execute(userId, profileData) {
    const currentUser = await UserRepository_default.findById(userId);
    if (!currentUser) {
      throw new Error("Usu\xE1rio n\xE3o encontrado!");
    }
    const nextEmail = String(profileData.email || "").trim().toLowerCase();
    if (nextEmail && nextEmail !== currentUser.email) {
      const emailInUse = await UserRepository_default.findByEmail(nextEmail);
      if (emailInUse && Number(emailInUse.id) !== Number(userId)) {
        throw new Error("Este e-mail j\xE1 est\xE1 em uso!");
      }
    }
    return UserRepository_default.updateProfile(userId, {
      name: String(profileData.name || "").trim(),
      email: nextEmail,
      phone: String(profileData.phone || "").trim() || null,
      cpf: String(profileData.cpf || "").replace(/\D/g, "") || null,
      address: String(profileData.address || "").trim() || null,
      number: String(profileData.number || "").trim() || null,
      district: String(profileData.district || "").trim() || null,
      city: String(profileData.city || "").trim() || null,
      state: String(profileData.state || "").trim() || null,
      zipCode: String(profileData.zipCode || "").trim() || null,
      complement: String(profileData.complement || "").trim() || null,
      avatar: String(profileData.avatar || "").trim() || null
    });
  }
};
var UpdateProfileService_default = new UpdateProfileService();

// src/modules/auth/controllers/UpdateProfileController.ts
var UpdateProfileController = class {
  async handle(req, res) {
    try {
      const userId = req.user.id;
      const profileData = req.body;
      const user = await UpdateProfileService_default.execute(userId, profileData);
      return res.status(200).json(user);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao atualizar perfil"
      });
    }
  }
};
var UpdateProfileController_default = new UpdateProfileController();

// src/modules/auth/services/DeactivateUserService.ts
var DeactivateUserService = class {
  async execute(userId) {
    const user = await UserRepository_default.findById(userId);
    if (!user) {
      throw new Error("Usu\xE1rio n\xE3o encontrado!");
    }
    return UserRepository_default.deactivate(userId);
  }
};
var DeactivateUserService_default = new DeactivateUserService();

// src/modules/auth/controllers/DeactivateUserController.ts
var DeactivateUserController = class {
  async handle(req, res) {
    try {
      const userId = req.user.id;
      const user = await DeactivateUserService_default.execute(userId);
      return res.json(user);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao desativar usuario"
      });
    }
  }
};
var DeactivateUserController_default = new DeactivateUserController();

// src/modules/auth/services/ReactivateUserService.ts
var ReactivateUserService = class {
  async execute(userId) {
    const user = await UserRepository_default.findById(userId);
    if (!user) {
      throw new Error("Usu\xE1rio n\xE3o encontrado!");
    }
    if (user.active) {
      throw new Error("A conta ja est\xE1 ativa!");
    }
    return UserRepository_default.reactivate(userId);
  }
};
var ReactivateUserService_default = new ReactivateUserService();

// src/modules/auth/controllers/ReactivateUserController.ts
var ReactivateUserController = class {
  async handle(req, res) {
    try {
      const userId = req.user.id;
      const user = await ReactivateUserService_default.execute(userId);
      return res.json(user);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao reativar usuario"
      });
    }
  }
};
var ReactivateUserController_default = new ReactivateUserController();

// src/modules/auth/services/RequestPasswordResetService.ts
import bcrypt6 from "bcrypt";
import crypto4 from "crypto";
import nodemailer2 from "nodemailer";

// src/validators/ForgotPasswordValidator.ts
import { z as z3 } from "zod";
var forgotPasswordSchema = z3.object({
  email: z3.string().trim().email("Email invalido").optional(),
  phone: z3.string().trim().min(8, "Telefone invalido").optional()
}).refine((data) => Boolean(data.email || data.phone), {
  message: "Informe e-mail ou telefone",
  path: ["email"]
});
var resetPasswordSchema = z3.object({
  email: z3.string().trim().email("Email invalido").optional(),
  phone: z3.string().trim().min(8, "Telefone invalido").optional(),
  code: z3.string().trim().regex(/^\d{6}$/, "Codigo invalido"),
  newPassword: z3.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z3.string().min(6, "Confirme a nova senha")
}).refine((data) => Boolean(data.email || data.phone), {
  message: "Informe e-mail ou telefone",
  path: ["email"]
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas nao conferem",
  path: ["confirmPassword"]
});

// src/modules/auth/services/RequestPasswordResetService.ts
function createTransporter2() {
  const smtpHost2 = String(process.env.SMTP_HOST || "").trim();
  const smtpPort2 = Number(process.env.SMTP_PORT || 587);
  const smtpSecure2 = String(process.env.SMTP_SECURE || "false") === "true";
  const smtpAuthType = String(process.env.SMTP_AUTH_TYPE || "basic").trim().toLowerCase();
  const smtpUser2 = String(process.env.SMTP_USER || "").trim();
  const smtpPass2 = String(process.env.SMTP_PASS || "").trim();
  const smtpClientId = String(process.env.SMTP_CLIENT_ID || "").trim();
  const smtpClientSecret = String(process.env.SMTP_CLIENT_SECRET || "").trim();
  const smtpRefreshToken = String(process.env.SMTP_REFRESH_TOKEN || "").trim();
  const smtpAccessToken = String(process.env.SMTP_ACCESS_TOKEN || "").trim();
  if (!smtpHost2 || !smtpPort2 || !smtpUser2) {
    return null;
  }
  if (smtpAuthType === "oauth2") {
    if (!smtpClientId || !smtpClientSecret || !smtpRefreshToken) {
      return null;
    }
    return nodemailer2.createTransport({
      host: smtpHost2,
      port: smtpPort2,
      secure: smtpSecure2,
      requireTLS: true,
      auth: {
        type: "OAuth2",
        user: smtpUser2,
        clientId: smtpClientId,
        clientSecret: smtpClientSecret,
        refreshToken: smtpRefreshToken,
        accessToken: smtpAccessToken || void 0
      }
    });
  }
  if (!smtpPass2) {
    return null;
  }
  return nodemailer2.createTransport({
    host: smtpHost2,
    port: smtpPort2,
    secure: smtpSecure2,
    requireTLS: true,
    auth: {
      user: smtpUser2,
      pass: smtpPass2
    }
  });
}
function isBasicAuthDisabledError2(error2) {
  const message = error2 instanceof Error ? error2.message : String(error2 || "");
  const normalized = message.toLowerCase();
  return normalized.includes("535") && normalized.includes("basic authentication is disabled");
}
var RequestPasswordResetService = class {
  async execute({ email, phone }) {
    forgotPasswordSchema.parse({ email, phone });
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPhone = String(phone || "").trim();
    const user = normalizedEmail ? await UserRepository_default.findByEmail(normalizedEmail) : await UserRepository_default.findByPhone(normalizedPhone);
    const safeMessage = "Se os dados informados existirem, enviamos um codigo para redefinir a senha.";
    if (!user) {
      return { message: safeMessage };
    }
    const code = String(crypto4.randomInt(1e5, 1e6));
    const codeHash = await bcrypt6.hash(code, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1e3);
    await UserRepository_default.savePasswordResetCode(user.id, codeHash, expiresAt);
    const frontendUrl = String(
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/$/, "");
    const transporter = createTransporter2();
    if (transporter) {
      const from = String(
        process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER || ""
      ).trim() || "no-reply@pizzaia.local";
      try {
        await transporter.sendMail({
          from,
          to: user.email,
          subject: "Recuperacao de senha - Peca ja food",
          text: `Seu codigo para redefinir a senha e: ${code}. Ele expira em 15 minutos.

Se preferir, abra: ${frontendUrl}/recover-password`
        });
      } catch (error2) {
        if (isBasicAuthDisabledError2(error2)) {
          throw new Error(
            "Falha no SMTP: o provedor bloqueou login por usuario/senha (basic auth). Configure SMTP_AUTH_TYPE=oauth2 com credenciais OAuth2 ou use um provedor com app password."
          );
        }
        throw error2;
      }
    } else {
      console.warn(
        `[password-reset] SMTP nao configurado. Codigo para ${user.email}: ${code}`
      );
    }
    return { message: safeMessage };
  }
};
var RequestPasswordResetService_default = new RequestPasswordResetService();

// src/modules/auth/controllers/RequestPasswordResetController.ts
var RequestPasswordResetController = class {
  async handle(req, res) {
    try {
      const { email, phone } = req.body;
      const result = await RequestPasswordResetService_default.execute({
        email,
        phone
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao solicitar recuperacao de senha"
      });
    }
  }
};
var RequestPasswordResetController_default = new RequestPasswordResetController();

// src/modules/auth/services/ResetPasswordByCodeService.ts
import bcrypt7 from "bcrypt";
var ResetPasswordByCodeService = class {
  async execute({
    email,
    phone,
    code,
    newPassword,
    confirmPassword
  }) {
    resetPasswordSchema.parse({
      email,
      phone,
      code,
      newPassword,
      confirmPassword
    });
    const normalizedEmail = String(email || "").trim();
    const normalizedPhone = String(phone || "").trim();
    const user = normalizedEmail ? await UserRepository_default.findByEmail(normalizedEmail) : await UserRepository_default.findByPhone(normalizedPhone);
    if (!user?.resetPasswordCodeHash || !user?.resetPasswordCodeExpiresAt || new Date(user.resetPasswordCodeExpiresAt).getTime() < Date.now()) {
      throw new Error("Codigo invalido ou expirado");
    }
    const isCodeValid = await bcrypt7.compare(code, user.resetPasswordCodeHash);
    if (!isCodeValid) {
      throw new Error("Codigo invalido ou expirado");
    }
    const passwordHash = await bcrypt7.hash(newPassword, 10);
    await UserRepository_default.updatePasswordAndClearResetCode(user.id, passwordHash);
    return { message: "Senha redefinida com sucesso" };
  }
};
var ResetPasswordByCodeService_default = new ResetPasswordByCodeService();

// src/modules/auth/controllers/ResetPasswordByCodeController.ts
var ResetPasswordByCodeController = class {
  async handle(req, res) {
    try {
      const { email, phone, code, newPassword, confirmPassword } = req.body;
      const result = await ResetPasswordByCodeService_default.execute({
        email,
        phone,
        code,
        newPassword,
        confirmPassword
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao redefinir senha"
      });
    }
  }
};
var ResetPasswordByCodeController_default = new ResetPasswordByCodeController();

// src/middlewares/security/loginRateLimitMiddleware.ts
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 255);
}
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (Array.isArray(forwarded) && forwarded.length) {
    return String(forwarded[0] || "").split(",")[0]?.trim() || req.ip;
  }
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() || req.ip;
  }
  return req.ip;
}
var windowMs = Number(
  process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1e3
);
var max = Number(process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS || 8);
var loginRateLimitMiddleware = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = normalizeEmail(req.body?.email);
    const ip = ipKeyGenerator(String(getClientIp(req) || "unknown").trim());
    return `${ip}:${email || "no-email"}`;
  },
  message: {
    error: "Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente."
  }
});

// src/modules/auth/services/RefreshTokenService.ts
var RefreshTokenService = class {
  async execute(refreshToken) {
    const token = String(refreshToken || "").trim();
    if (!token) {
      throw new Error("Refresh token nao informado");
    }
    return AuthTokenService_default.rotateRefreshToken(token);
  }
};
var RefreshTokenService_default = new RefreshTokenService();

// src/modules/auth/controllers/RefreshTokenController.ts
var RefreshTokenController = class {
  async handle(req, res) {
    try {
      const refreshToken = String(req.body?.refreshToken || "");
      const result = await RefreshTokenService_default.execute(refreshToken);
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(401).json({
        error: error2 instanceof Error ? error2.message : "Falha ao renovar sessao"
      });
    }
  }
};
var RefreshTokenController_default = new RefreshTokenController();

// src/modules/auth/services/LogoutService.ts
var LogoutService = class {
  async execute(refreshToken) {
    const token = String(refreshToken || "").trim();
    if (!token) {
      throw new Error("Refresh token nao informado");
    }
    await AuthTokenService_default.revokeRefreshToken(token);
    return { ok: true };
  }
};
var LogoutService_default = new LogoutService();

// src/modules/auth/controllers/LogoutController.ts
var LogoutController = class {
  async handle(req, res) {
    try {
      const refreshToken = String(req.body?.refreshToken || "");
      await LogoutService_default.execute(refreshToken);
      return res.status(200).json({ ok: true });
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Falha ao fazer logout"
      });
    }
  }
};
var LogoutController_default = new LogoutController();

// src/modules/auth/controllers/VerifyLoginMfaController.ts
var VerifyLoginMfaController = class {
  async handle(req, res) {
    try {
      const { mfaToken, code } = req.body;
      const result = await LoginMfaService_default.verifyAndIssueTokens({
        mfaToken,
        code
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(401).json({
        error: error2 instanceof Error ? error2.message : "Falha na verificacao de login"
      });
    }
  }
};
var VerifyLoginMfaController_default = new VerifyLoginMfaController();

// src/middlewares/security/accountActionRateLimitMiddleware.ts
import rateLimit2, { ipKeyGenerator as ipKeyGenerator2 } from "express-rate-limit";
function getEmailKey(req) {
  const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 255);
  const ip = ipKeyGenerator2(String(req.ip || "unknown").trim());
  return `${ip}:${email || "no-email"}`;
}
var passwordResetRateLimitMiddleware = rateLimit2({
  windowMs: Number(
    process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1e3
  ),
  max: Number(process.env.PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS || 5),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getEmailKey,
  message: {
    error: "Muitas solicita\xE7\xF5es de recupera\xE7\xE3o. Aguarde antes de tentar novamente."
  }
});
var registrationRateLimitMiddleware = rateLimit2({
  windowMs: Number(
    process.env.REGISTRATION_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1e3
  ),
  max: Number(process.env.REGISTRATION_RATE_LIMIT_MAX_REQUESTS || 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator2(String(req.ip || "unknown").trim()),
  message: {
    error: "Muitos cadastros originados deste endere\xE7o. Tente mais tarde."
  }
});

// src/modules/auth/routes/authRoutes.ts
var router = Router();
router.post("/register", registrationRateLimitMiddleware, (req, res) => {
  RegisterController_default.handle(req, res);
});
router.post("/login", loginRateLimitMiddleware, (req, res) => {
  LoginController_default.handle(req, res);
});
router.post("/forgot-password", passwordResetRateLimitMiddleware, (req, res) => {
  RequestPasswordResetController_default.handle(req, res);
});
router.post("/reset-password", passwordResetRateLimitMiddleware, (req, res) => {
  ResetPasswordByCodeController_default.handle(req, res);
});
router.post("/google", (req, res) => {
  GoogleAuthController_default.handle(req, res);
});
router.post("/refresh", (req, res) => {
  RefreshTokenController_default.handle(req, res);
});
router.post("/logout", (req, res) => {
  LogoutController_default.handle(req, res);
});
router.post("/login/verify-2fa", loginRateLimitMiddleware, (req, res) => {
  VerifyLoginMfaController_default.handle(req, res);
});
router.get("/google/client-id", (req, res) => {
  const singleClientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  const listClientIds = String(process.env.GOOGLE_CLIENT_IDS || "").split(",").map((item) => item.trim()).filter(Boolean);
  const clientId = singleClientId || listClientIds[0] || null;
  return res.json({
    clientId
  });
});
router.get("/me", authMiddleware, (req, res) => {
  MeController_default.handle(req, res);
});
router.put("/password", authMiddleware, (req, res) => {
  UpdatePasswordController_default.handle(req, res);
});
router.put("/profile", authMiddleware, (req, res) => {
  UpdateProfileController_default.handle(req, res);
});
router.patch("/deactivate", authMiddleware, (req, res) => {
  DeactivateUserController_default.handle(req, res);
});
router.patch("/reactivate", authMiddleware, (req, res) => {
  ReactivateUserController_default.handle(req, res);
});
var authRoutes_default = router;

// src/modules/products/routes/productsRoutes.ts
import { Router as Router2 } from "express";

// src/modules/products/repositories/ProductRepository.ts
var ProductRepository = class {
  async create(data, restaurantId, db = prisma_default) {
    return db.product.create({
      data: {
        ...data,
        restaurantId
      }
    });
  }
  async findByName(name, restaurantId, db = prisma_default) {
    return db.product.findFirst({
      where: {
        restaurantId,
        name: {
          equals: String(name || "").trim(),
          mode: "insensitive"
        }
      }
    });
  }
  async findAll(restaurantId, db = prisma_default) {
    return db.product.findMany({
      where: {
        restaurantId
      },
      include: {
        category: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }
  async update(id, data, restaurantId, db = prisma_default) {
    return db.product.updateMany({
      where: {
        id: Number(id),
        restaurantId
      },
      data
    });
  }
  async findById(id, restaurantId, db = prisma_default) {
    return db.product.findFirst({
      where: {
        id: Number(id),
        restaurantId
      },
      include: {
        category: true
      }
    });
  }
  async delete(id, restaurantId, db = prisma_default) {
    const productId = Number(id);
    const hasOrders = await db.orderItem.findFirst({
      where: {
        productId,
        order: {
          restaurantId
        }
      }
    });
    if (hasOrders) {
      throw new Error(
        "N\xE3o \xE9 poss\xEDvel excluir um produto que j\xE1 possui pedidos."
      );
    }
    return db.product.deleteMany({
      where: {
        id: productId,
        restaurantId
      }
    });
  }
  async listRatingsByRestaurant(restaurantId, clientKey, db = prisma_default) {
    const summaries = await db.productRating.groupBy({
      by: ["productId"],
      where: {
        restaurantId
      },
      _avg: {
        rating: true
      },
      _count: {
        _all: true
      }
    });
    let userRatingsMap = /* @__PURE__ */ new Map();
    if (clientKey) {
      const userRatings = await db.productRating.findMany({
        where: {
          restaurantId,
          clientKey
        },
        select: {
          productId: true,
          rating: true
        }
      });
      userRatingsMap = new Map(
        userRatings.map((item) => [
          Number(item.productId),
          Number(item.rating)
        ])
      );
    }
    return summaries.map((item) => ({
      productId: Number(item.productId),
      average: Number(item._avg.rating || 0),
      count: Number(item._count._all || 0),
      userRating: Number(userRatingsMap.get(Number(item.productId)) || 0)
    }));
  }
  async upsertRating(data, db = prisma_default) {
    const { restaurantId, productId, clientKey, rating } = data;
    return db.productRating.upsert({
      where: {
        restaurantId_productId_clientKey: {
          restaurantId,
          productId,
          clientKey
        }
      },
      update: {
        rating
      },
      create: {
        restaurantId,
        productId,
        clientKey,
        rating
      }
    });
  }
  async getRatingSummary(productId, restaurantId, clientKey, db = prisma_default) {
    const grouped = await db.productRating.groupBy({
      by: ["productId"],
      where: {
        restaurantId,
        productId
      },
      _avg: {
        rating: true
      },
      _count: {
        _all: true
      }
    });
    const summary = grouped[0];
    let userRating = 0;
    if (clientKey) {
      const mine = await db.productRating.findUnique({
        where: {
          restaurantId_productId_clientKey: {
            restaurantId,
            productId,
            clientKey
          }
        },
        select: {
          rating: true
        }
      });
      userRating = Number(mine?.rating || 0);
    }
    return {
      productId: Number(productId),
      average: Number(summary?._avg?.rating || 0),
      count: Number(summary?._count?._all || 0),
      userRating
    };
  }
};
var ProductRepository_default = new ProductRepository();

// src/validators/ProductValidator.ts
import { z as z4 } from "zod";
var createProductSchema = z4.object({
  name: z4.string().trim().min(1, "Nome obrigat\xF3rio!"),
  description: z4.string().trim().optional(),
  image: z4.string().trim().optional(),
  price: z4.number({
    invalid_type_error: "Pre\xE7o deve ser um n\xFAmero.",
    required_error: "Pre\xE7o deve ser um n\xFAmero."
  }).positive("Pre\xE7o deve ser maior que zero!"),
  active: z4.boolean().optional(),
  featured: z4.boolean().optional(),
  preparationTime: z4.number().int("Tempo deve ser inteiro.").positive("Tempo deve ser maior que zero.").optional(),
  stock: z4.number().int("Estoque deve ser inteiro.").min(0, "Estoque n\xE3o pode ser negativo.").nullable().optional(),
  categoryId: z4.number({
    invalid_type_error: "Categoria \xE9 obrigat\xF3ria.",
    required_error: "Categoria \xE9 obrigat\xF3ria."
  }).int()
});

// src/modules/products/services/CreateProductService.ts
function requireDefined(value, message) {
  if (value === null || value === void 0) {
    throw new Error(message);
  }
  return value;
}
var CreateProductService = class {
  async execute(data, restaurantId) {
    if (!restaurantId) {
      throw new Error("Restaurante n\xE3o encontrado");
    }
    const parsedData = createProductSchema.parse(data);
    const normalizedStock = parsedData.stock === null || parsedData.stock === void 0 ? null : Number(parsedData.stock);
    const activeFromStock = normalizedStock === null || normalizedStock > 0;
    const requiredName = requireDefined(
      parsedData.name,
      "Nome do produto \xE9 obrigat\xF3rio."
    );
    const requiredPrice = requireDefined(
      parsedData.price,
      "Pre\xE7o do produto \xE9 obrigat\xF3rio."
    );
    const requiredCategoryId = requireDefined(
      parsedData.categoryId,
      "Categoria do produto \xE9 obrigat\xF3ria."
    );
    const payload = {
      ...parsedData,
      name: requiredName,
      price: requiredPrice,
      categoryId: requiredCategoryId,
      active: activeFromStock
    };
    const product = await ProductRepository_default.create(payload, restaurantId);
    return {
      product
    };
  }
};
var CreateProductService_default = new CreateProductService();

// src/modules/products/controllers/CreateProductController.ts
var CreateProductController = class {
  async handle(req, res) {
    try {
      const {
        name,
        description,
        image,
        price,
        categoryId,
        active,
        featured,
        preparationTime,
        stock
      } = req.body;
      const product = await CreateProductService_default.execute(
        {
          name,
          description,
          image,
          price,
          categoryId,
          active,
          featured,
          preparationTime,
          stock
        },
        req.user.restaurantId
      );
      return res.status(201).json(product);
    } catch (error2) {
      return res.status(400).json({
        message: error2 instanceof Error ? error2.message : "Erro ao criar produto"
      });
    }
  }
};
var CreateProductController_default = new CreateProductController();

// src/modules/products/services/UpdateProductService.ts
var UpdateProductService = class {
  async execute(id, data, restaurantId) {
    createProductSchema.partial().parse(data);
    const product = await ProductRepository_default.findById(id, restaurantId);
    if (!product) {
      throw new Error("Produto n\xE3o encontrado!");
    }
    const stockWasProvided = Object.prototype.hasOwnProperty.call(data, "stock");
    const normalizedStock = data.stock === null || data.stock === void 0 ? null : Number(data.stock);
    let nextActive = data.active;
    if (stockWasProvided) {
      nextActive = normalizedStock === null || normalizedStock > 0;
    }
    const payload = {
      ...data,
      active: nextActive
    };
    return ProductRepository_default.update(id, payload, restaurantId);
  }
};
var UpdateProductService_default = new UpdateProductService();

// src/modules/products/controllers/UpdateProductController.ts
var UpdateProductController = class {
  async handle(req, res) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const data = req.body;
      const updatedProduct = await UpdateProductService_default.execute(
        id,
        data,
        req.user.restaurantId
      );
      return res.status(200).json(updatedProduct);
    } catch (error2) {
      return res.status(400).json({
        message: error2 instanceof Error ? error2.message : "Erro ao atualizar produto"
      });
    }
  }
};
var UpdateProductController_default = new UpdateProductController();

// src/modules/products/services/DeleteProductService.ts
var DeleteProductService = class {
  async execute(id, restaurantId) {
    const product = await ProductRepository_default.findById(id, restaurantId);
    if (!product) {
      throw new Error("Produto n\xE3o encontrado!");
    }
    await ProductRepository_default.delete(id, restaurantId);
  }
};
var DeleteProductService_default = new DeleteProductService();

// src/modules/products/controllers/DeleteProductController.ts
var DeleteProductController = class {
  async handle(req, res) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await DeleteProductService_default.execute(id, req.user.restaurantId);
      return res.status(200).json({
        message: "Produto deletado com sucesso!"
      });
    } catch (error2) {
      return res.status(400).json({
        message: error2 instanceof Error ? error2.message : "Erro ao deletar produto"
      });
    }
  }
};
var DeleteProductController_default = new DeleteProductController();

// src/modules/restaurants/repositories/RestaurantRepository.ts
import { UserRole as UserRole3 } from "@prisma/client";
var RestaurantRepository = class {
  async findByEmail(email, db = prisma_default) {
    return db.restaurant.findUnique({
      where: { email }
    });
  }
  async findBySlug(slug, db = prisma_default) {
    return db.restaurant.findUnique({
      where: { slug }
    });
  }
  async create(data, db = prisma_default) {
    return db.restaurant.create({
      data
    });
  }
  async listAll(db = prisma_default) {
    return db.restaurant.findMany({
      include: {
        users: {
          where: { role: UserRole3.ADMIN },
          select: {
            id: true,
            name: true,
            email: true
          },
          take: 1
        },
        subscription: {
          select: {
            id: true,
            plan: true,
            status: true,
            currentPeriodEnd: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }
};
var RestaurantRepository_default = new RestaurantRepository();

// src/modules/products/services/ListProductService.ts
var ListProductsService = class {
  async execute({ restaurantId, slug }) {
    let normalizedRestaurantId = Number(restaurantId);
    if ((!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) && slug) {
      const restaurant = await RestaurantRepository_default.findBySlug(
        String(slug).trim()
      );
      normalizedRestaurantId = Number(restaurant?.id || 0);
    }
    if (!normalizedRestaurantId) {
      throw new Error("Restaurante n\xE3o encontrado");
    }
    const products = await ProductRepository_default.findAll(normalizedRestaurantId);
    const normalizedProducts = products.map((product) => {
      const stockValue = product?.stock === null || product?.stock === void 0 ? null : Number(product.stock);
      if (Number.isFinite(stockValue) && stockValue <= 0) {
        return {
          ...product,
          active: false
        };
      }
      return product;
    });
    return {
      products: normalizedProducts,
      count: normalizedProducts.length
    };
  }
};
var ListProductService_default = new ListProductsService();

// src/modules/products/controllers/ListProductController.ts
var ListProductsController = class {
  async handle(req, res) {
    try {
      const restaurantId = Number(req.query.restaurantId) || Number(req.user?.restaurantId);
      const slug = typeof req.query.slug === "string" ? req.query.slug : void 0;
      const products = await ListProductService_default.execute({
        restaurantId,
        slug
      });
      return res.status(200).json(products);
    } catch (error2) {
      return res.status(400).json({
        message: error2 instanceof Error ? error2.message : "Erro ao listar produtos"
      });
    }
  }
};
var ListProductController_default = new ListProductsController();

// src/modules/products/services/ListProductRatingsService.ts
var ListProductRatingsService = class {
  async execute(restaurantId, clientKey) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!normalizedRestaurantId) {
      throw new Error("Restaurante n\xE3o encontrado");
    }
    const ratings = await ProductRepository_default.listRatingsByRestaurant(
      normalizedRestaurantId,
      String(clientKey || "").trim()
    );
    return {
      ratings,
      count: ratings.length
    };
  }
};
var ListProductRatingsService_default = new ListProductRatingsService();

// src/modules/products/controllers/ListProductRatingsController.ts
var ListProductRatingsController = class {
  async handle(req, res) {
    try {
      const restaurantId = Number(req.query.restaurantId);
      const clientKey = String(req.query.clientKey || "").trim();
      const result = await ListProductRatingsService_default.execute(
        restaurantId,
        clientKey
      );
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        message: error2 instanceof Error ? error2.message : "Erro ao listar avaliacoes de produtos"
      });
    }
  }
};
var ListProductRatingsController_default = new ListProductRatingsController();

// src/modules/products/services/RateProductService.ts
var RateProductService = class {
  async execute({
    productId,
    restaurantId,
    clientKey,
    rating
  }) {
    const normalizedProductId = Number(productId);
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedRating = Number(rating);
    const normalizedClientKey = String(clientKey || "").trim();
    if (!normalizedRestaurantId) {
      throw new Error("Restaurante n\xE3o encontrado");
    }
    if (!normalizedProductId) {
      throw new Error("Produto inv\xE1lido");
    }
    if (!normalizedClientKey) {
      throw new Error("Identificador do cliente n\xE3o informado");
    }
    if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      throw new Error("A avalia\xE7\xE3o deve ser um n\xFAmero inteiro entre 1 e 5");
    }
    const product = await ProductRepository_default.findById(
      normalizedProductId,
      normalizedRestaurantId
    );
    if (!product) {
      throw new Error("Produto n\xE3o encontrado para este restaurante");
    }
    await ProductRepository_default.upsertRating({
      productId: normalizedProductId,
      restaurantId: normalizedRestaurantId,
      clientKey: normalizedClientKey,
      rating: normalizedRating
    });
    const summary = await ProductRepository_default.getRatingSummary(
      normalizedProductId,
      normalizedRestaurantId,
      normalizedClientKey
    );
    return {
      rating: summary
    };
  }
};
var RateProductService_default = new RateProductService();

// src/modules/products/controllers/RateProductController.ts
var RateProductController = class {
  async handle(req, res) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { restaurantId, clientKey, rating } = req.body;
      const result = await RateProductService_default.execute({
        productId: id,
        restaurantId,
        clientKey,
        rating
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        message: error2 instanceof Error ? error2.message : "Erro ao avaliar produto"
      });
    }
  }
};
var RateProductController_default = new RateProductController();

// src/middlewares/adminMiddleware.ts
import { UserRole as UserRole4 } from "@prisma/client";
function adminMiddleware(req, res, next) {
  if (req.user.role !== UserRole4.ADMIN) {
    return res.status(403).json({ error: "Acesso negado!" });
  }
  return next();
}

// src/modules/products/routes/productsRoutes.ts
var router2 = Router2();
router2.post(
  "/",
  authMiddleware,
  adminMiddleware,
  CreateProductController_default.handle
);
router2.get("/", ListProductController_default.handle);
router2.get("/ratings", ListProductRatingsController_default.handle);
router2.post("/:id/rating", RateProductController_default.handle);
router2.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  UpdateProductController_default.handle
);
router2.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  DeleteProductController_default.handle
);
var productsRoutes_default = router2;

// src/modules/orders/routes/orderRoutes.ts
import { Router as Router3 } from "express";

// src/modules/orders/repositories/OrderRepository.ts
import { OrderStatus, PaymentMethod, OrderType } from "@prisma/client";
var OrderRepository = class {
  async create(data, db = prisma_default) {
    return db.order.create({
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            whatsapp: true
          }
        },
        table: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });
  }
  async findAll(restaurantId, status, db = prisma_default) {
    return db.order.findMany({
      where: {
        restaurantId,
        NOT: {
          paid: false,
          paymentMethod: {
            in: [PaymentMethod.PIX, PaymentMethod.CARTAO]
          },
          payOnDelivery: false
        },
        ...status && { status }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            whatsapp: true
          }
        },
        table: true,
        items: {
          include: {
            product: true
          }
        },
        issueThread: {
          select: {
            orderId: true,
            isResolved: true,
            messages: {
              orderBy: {
                sentAt: "desc"
              },
              take: 40,
              select: {
                senderType: true,
                message: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }
  async findCourierOrders(restaurantId, courierId, status, db = prisma_default) {
    const allowedStatuses = [
      OrderStatus.PRONTO,
      OrderStatus.SAIU_PARA_ENTREGA,
      OrderStatus.ENTREGUE
    ];
    if (status && !allowedStatuses.includes(status)) {
      return [];
    }
    return db.order.findMany({
      where: {
        restaurantId,
        type: OrderType.DELIVERY,
        status: status || { in: allowedStatuses },
        OR: [
          { status: OrderStatus.PRONTO, assignedCourierId: null },
          { assignedCourierId: courierId }
        ],
        NOT: {
          paid: false,
          paymentMethod: { in: [PaymentMethod.PIX, PaymentMethod.CARTAO] },
          payOnDelivery: false
        }
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true }
        },
        restaurant: {
          select: { id: true, name: true, whatsapp: true }
        },
        items: { include: { product: true } }
      },
      orderBy: { createdAt: "asc" }
    });
  }
  async updateStatus(id, status, restaurantId, db = prisma_default) {
    await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId
      },
      data: {
        status
      }
    });
    return this.findById(id, restaurantId, db);
  }
  async confirmPayment(id, restaurantId, db = prisma_default) {
    await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId
      },
      data: {
        paid: true,
        paidAt: /* @__PURE__ */ new Date(),
        paymentConfirmationPin: null,
        paymentConfirmationPinExpiresAt: null
      }
    });
    return this.findById(id, restaurantId, db);
  }
  async confirmPixPayment(id, restaurantId, {
    paymentProof,
    paymentProofImage
  } = {}, db = prisma_default) {
    await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId
      },
      data: {
        paid: true,
        paidAt: /* @__PURE__ */ new Date(),
        paymentProof: String(paymentProof || "").trim() || null,
        paymentProofImage: String(paymentProofImage || "").trim() || null,
        paymentConfirmationPin: null,
        paymentConfirmationPinExpiresAt: null
      }
    });
    return this.findById(id, restaurantId, db);
  }
  async setCardCheckoutSessionId(id, restaurantId, cardCheckoutSessionId, db = prisma_default) {
    await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId
      },
      data: {
        cardCheckoutSessionId
      }
    });
    return this.findById(id, restaurantId, db);
  }
  async deleteById(id, restaurantId, db = prisma_default) {
    await db.order.deleteMany({
      where: {
        id: Number(id),
        restaurantId
      }
    });
  }
  async deleteAllByRestaurant(restaurantId, db = prisma_default) {
    return db.order.deleteMany({
      where: {
        restaurantId
      }
    });
  }
  async setPaymentConfirmationPin(id, restaurantId, paymentConfirmationPin, paymentConfirmationPinExpiresAt, db = prisma_default) {
    await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId
      },
      data: {
        paymentConfirmationPin,
        paymentConfirmationPinExpiresAt
      }
    });
    return this.findById(id, restaurantId, db);
  }
  async findById(id, restaurantId, db = prisma_default) {
    return db.order.findFirst({
      where: {
        id: Number(id),
        restaurantId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            whatsapp: true
          }
        },
        table: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });
  }
  async findByPixPaymentId(pixPaymentId, restaurantId, db = prisma_default) {
    return db.order.findFirst({
      where: {
        pixPaymentId,
        ...restaurantId ? {
          restaurantId
        } : {}
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            whatsapp: true
          }
        },
        table: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });
  }
  async findByCardCheckoutSessionId(cardCheckoutSessionId, restaurantId, db = prisma_default) {
    return db.order.findFirst({
      where: {
        cardCheckoutSessionId,
        ...restaurantId ? {
          restaurantId
        } : {}
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            whatsapp: true
          }
        },
        table: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });
  }
  async findLatestByTable(tableId, restaurantId, db = prisma_default) {
    return db.order.findFirst({
      where: {
        tableId: Number(tableId),
        restaurantId: Number(restaurantId)
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            whatsapp: true
          }
        },
        table: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }
  async findByUserId(userId, restaurantId, db = prisma_default) {
    const normalizedRestaurantId = Number(restaurantId);
    const where = {
      userId: Number(userId)
    };
    if (Number.isFinite(normalizedRestaurantId) && normalizedRestaurantId > 0) {
      where.restaurantId = normalizedRestaurantId;
    }
    return db.order.findMany({
      where: {
        ...where,
        NOT: [
          {
            paymentMethod: PaymentMethod.PIX,
            paid: false,
            pixPaymentId: {
              not: null
            }
          },
          {
            paymentMethod: PaymentMethod.CARTAO,
            paid: false,
            cardCheckoutSessionId: {
              not: null
            }
          }
        ]
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        table: true,
        issueThread: {
          select: {
            orderId: true,
            isResolved: true,
            resolvedAt: true,
            resolvedByName: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }
};
var OrderRepository_default = new OrderRepository();

// src/validators/OrderValidator.ts
import { z as z5 } from "zod";
import { OrderType as OrderType2, PaymentMethod as PaymentMethod2 } from "@prisma/client";
var createOrderSchema = z5.object({
  restaurantId: z5.number().int().positive().optional(),
  customerName: z5.string().trim().min(2).optional(),
  customerCpf: z5.string().trim().min(11).optional(),
  customerPhone: z5.string().trim().min(10).optional(),
  type: z5.nativeEnum(OrderType2),
  paymentMethod: z5.nativeEnum(PaymentMethod2).optional(),
  payOnDelivery: z5.boolean().optional(),
  payOnDeliveryMethod: z5.nativeEnum(PaymentMethod2).optional(),
  paid: z5.boolean().optional(),
  pixPaymentId: z5.string().trim().min(3).optional(),
  observation: z5.string().trim().optional(),
  tableId: z5.number().int().positive().optional(),
  address: z5.string().trim().optional(),
  number: z5.string().trim().optional(),
  district: z5.string().trim().optional(),
  city: z5.string().trim().optional(),
  state: z5.string().trim().optional(),
  zipCode: z5.string().trim().optional(),
  complement: z5.string().trim().optional(),
  items: z5.array(
    z5.object({
      productId: z5.number().int().positive(),
      quantity: z5.number().int().positive(),
      observation: z5.string().trim().optional()
    })
  ).min(1, "O pedido deve conter pelo menos um item.")
}).superRefine((data, ctx) => {
  if (data.type !== OrderType2.DELIVERY) {
    return;
  }
  const phoneDigits = String(data.customerPhone || "").replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 13) {
    ctx.addIssue({
      code: z5.ZodIssueCode.custom,
      path: ["customerPhone"],
      message: "Informe um celular/WhatsApp v\xE1lido para pedidos de delivery."
    });
  }
  const requiredAddressFields = [
    ["address", data.address],
    ["number", data.number],
    ["district", data.district],
    ["city", data.city]
  ];
  requiredAddressFields.forEach(([field, value]) => {
    const minimumLength = field === "number" ? 1 : 2;
    if (String(value || "").trim().length < minimumLength) {
      ctx.addIssue({
        code: z5.ZodIssueCode.custom,
        path: [field],
        message: `Informe ${field === "address" ? "a rua" : field === "number" ? "o n\xFAmero" : field === "district" ? "o bairro" : "a cidade"}.`
      });
    }
  });
  if (!/^\d{8}$/.test(String(data.zipCode || "").replace(/\D/g, ""))) {
    ctx.addIssue({
      code: z5.ZodIssueCode.custom,
      path: ["zipCode"],
      message: "Informe um CEP v\xE1lido com 8 n\xFAmeros."
    });
  }
  if (!/^[A-Za-z]{2}$/.test(String(data.state || "").trim())) {
    ctx.addIssue({
      code: z5.ZodIssueCode.custom,
      path: ["state"],
      message: "Informe uma UF v\xE1lida com duas letras."
    });
  }
  if (data.payOnDelivery === true) {
    if (data.type !== OrderType2.DELIVERY) {
      ctx.addIssue({
        code: z5.ZodIssueCode.custom,
        path: ["type"],
        message: "Pagar na entrega s\xF3 \xE9 permitido para pedidos de delivery."
      });
    }
    if (!data.payOnDeliveryMethod) {
      ctx.addIssue({
        code: z5.ZodIssueCode.custom,
        path: ["payOnDeliveryMethod"],
        message: "Informe o m\xE9todo de pagamento para pagar na entrega."
      });
    }
  }
});

// src/modules/tableSession/repositories/TableSessionRepository.ts
import { TableSessionStatus } from "@prisma/client";
var TableSessionRepository = class {
  async create(data, db = prisma_default) {
    return db.tableSession.create({
      data,
      include: {
        table: true,
        openedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }
  async findOpenedByTable(tableId, db = prisma_default) {
    return db.tableSession.findFirst({
      where: {
        tableId: Number(tableId),
        status: TableSessionStatus.OPEN
      },
      include: {
        table: true
      }
    });
  }
  async findById(id, db = prisma_default) {
    return db.tableSession.findUnique({
      where: {
        id: Number(id)
      },
      include: {
        table: true
      }
    });
  }
  async findBySessionToken(sessionToken, db = prisma_default) {
    return db.tableSession.findUnique({
      where: {
        sessionToken
      },
      include: {
        table: true
      }
    });
  }
  async close(id, closedById, db = prisma_default) {
    return db.tableSession.update({
      where: {
        id: Number(id)
      },
      data: {
        status: TableSessionStatus.CLOSED,
        closedById,
        closedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  async listOpenByRestaurant(restaurantId, db = prisma_default) {
    return db.tableSession.findMany({
      where: {
        status: TableSessionStatus.OPEN,
        table: {
          restaurantId
        }
      },
      include: {
        table: true,
        openedBy: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        openedAt: "desc"
      }
    });
  }
};
var TableSessionRepository_default = new TableSessionRepository();

// src/modules/orders/services/OrderPixPaymentService.ts
import { MercadoPagoConfig, Payment } from "mercadopago";

// src/modules/payments/providers/providerCatalog.ts
var PIX_PROVIDERS = {
  MERCADO_PAGO: "MERCADO_PAGO",
  ASAAS: "ASAAS",
  PAGBANK: "PAGBANK",
  NUBANK: "NUBANK",
  PICPAY: "PICPAY"
};
var CARD_PROVIDERS = {
  STRIPE: "STRIPE",
  MERCADO_PAGO: "MERCADO_PAGO",
  ASAAS: "ASAAS",
  PAGARME: "PAGARME",
  PAGBANK: "PAGBANK",
  STONE: "STONE",
  ZOOP: "ZOOP"
};
function normalizePixProvider(value) {
  const provider = String(value || PIX_PROVIDERS.MERCADO_PAGO).trim().toUpperCase();
  if (Object.values(PIX_PROVIDERS).includes(provider)) {
    return provider;
  }
  return PIX_PROVIDERS.MERCADO_PAGO;
}
function normalizeCardProvider(value) {
  const provider = String(value || CARD_PROVIDERS.MERCADO_PAGO).trim().toUpperCase();
  if (Object.values(CARD_PROVIDERS).includes(provider)) {
    return provider;
  }
  return CARD_PROVIDERS.MERCADO_PAGO;
}

// src/modules/orders/services/pixPayload.ts
function extractErrorText(error2) {
  if (typeof error2 === "string") {
    return error2.trim().toLowerCase();
  }
  const asRecord = typeof error2 === "object" && error2 !== null ? error2 : null;
  const message = String(
    asRecord?.message || asRecord?.cause?.message || ""
  );
  const causeText = String(asRecord?.cause || "");
  return `${message} ${causeText}`.trim().toLowerCase();
}
function isMarketplaceSplitConfigurationError(error2) {
  const text = extractErrorText(error2);
  if (!text) {
    return false;
  }
  return text.includes("application_fee") || text.includes("marketplace") || text.includes("split") || text.includes("collector") || text.includes("platform") || text.includes("not allowed") || text.includes("unauthorized") || text.includes("invalid");
}
function parseProviderPaymentId(paymentId) {
  const normalizedPaymentId = String(paymentId || "").trim();
  if (normalizedPaymentId.toLowerCase().startsWith("asaas:")) {
    return {
      provider: PIX_PROVIDERS.ASAAS,
      rawPaymentId: normalizedPaymentId.slice("asaas:".length).trim()
    };
  }
  if (normalizedPaymentId.toLowerCase().startsWith("pagbank:")) {
    return {
      provider: PIX_PROVIDERS.PAGBANK,
      rawPaymentId: normalizedPaymentId.slice("pagbank:".length).trim()
    };
  }
  return {
    provider: PIX_PROVIDERS.MERCADO_PAGO,
    rawPaymentId: normalizedPaymentId
  };
}
function normalizeTxid(value) {
  const normalized = String(value || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25);
  return normalized || "***";
}

// src/modules/restaurantSettings/repositories/RestaurantSettingsRepository.ts
var RestaurantSettingsRepository = class {
  async findByRestaurantId(restaurantId) {
    return prisma_default.restaurantSettings.findUnique({
      where: {
        restaurantId: Number(restaurantId)
      },
      include: {
        restaurant: {
          select: {
            name: true,
            slug: true,
            logo: true,
            coverImage: true,
            whatsapp: true
          }
        }
      }
    });
  }
  async findRestaurantById(restaurantId) {
    return prisma_default.restaurant.findUnique({
      where: {
        id: Number(restaurantId)
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        coverImage: true,
        whatsapp: true,
        banners: {
          where: { active: true },
          select: { id: true, title: true, image: true },
          orderBy: { id: "asc" }
        }
      }
    });
  }
  async findPublicByRestaurantId(restaurantId) {
    return prisma_default.restaurantSettings.findUnique({
      where: {
        restaurantId: Number(restaurantId)
      },
      select: {
        restaurantId: true,
        deliveryFee: true,
        minimumOrder: true,
        pixProvider: true,
        pixKey: true,
        instagram: true,
        facebook: true,
        restaurant: {
          select: {
            name: true,
            slug: true,
            logo: true,
            coverImage: true,
            banners: {
              where: { active: true },
              select: { id: true, title: true, image: true },
              orderBy: { id: "asc" }
            }
          }
        }
      }
    });
  }
  async create(data) {
    return prisma_default.restaurantSettings.create({
      data
    });
  }
  async update(restaurantId, data) {
    return prisma_default.restaurantSettings.update({
      where: {
        restaurantId: Number(restaurantId)
      },
      data
    });
  }
};
var RestaurantSettingsRepository_default = new RestaurantSettingsRepository();

// src/modules/billing/repositories/BillingRepository.ts
var BillingRepository = class {
  async findSubscriptionByRestaurantId(restaurantId, db = prisma_default) {
    return db.subscription.findUnique({
      where: {
        restaurantId
      }
    });
  }
  async updateSubscription(id, data, db = prisma_default) {
    return db.subscription.update({
      where: {
        id: Number(id)
      },
      data
    });
  }
  async createInvoice(data) {
    return prisma_default.invoice.create({
      data
    });
  }
  async findInvoiceByMonth(restaurantId, month, year) {
    return prisma_default.invoice.findFirst({
      where: {
        restaurantId,
        month,
        year
      }
    });
  }
  async findPendingInvoices() {
    return prisma_default.invoice.findMany({
      where: {
        status: "PENDENTE"
      },
      include: {
        restaurant: true
      }
    });
  }
  async updateInvoice(id, data, db = prisma_default) {
    return db.invoice.update({
      where: {
        id: Number(id)
      },
      data
    });
  }
  async deactivateRestaurant(id, db = prisma_default) {
    return db.restaurant.update({
      where: {
        id: Number(id)
      },
      data: {
        active: false
      }
    });
  }
  async activateRestaurant(id, db = prisma_default) {
    return db.restaurant.update({
      where: {
        id: Number(id)
      },
      data: {
        active: true
      }
    });
  }
  async findPaidOrdersByPeriod(restaurantId, startDate, endDate) {
    return prisma_default.order.findMany({
      where: {
        restaurantId,
        paid: true,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });
  }
  async findExpiredTrials() {
    return prisma_default.subscription.findMany({
      where: {
        status: "TESTE",
        trialEndsAt: {
          lte: /* @__PURE__ */ new Date()
        }
      },
      include: {
        restaurant: true
      }
    });
  }
  async findExpiredInvoices() {
    return prisma_default.invoice.findMany({
      where: {
        status: "PENDENTE",
        dueDate: {
          lt: /* @__PURE__ */ new Date()
        }
      },
      include: {
        restaurant: true
      }
    });
  }
  async findInvoiceById(id, db = prisma_default) {
    return db.invoice.findUnique({
      where: { id: Number(id) }
    });
  }
  async findInvoiceByIdAndRestaurantId(id, restaurantId) {
    return prisma_default.invoice.findFirst({
      where: {
        id: Number(id),
        restaurantId
      }
    });
  }
  async findAllSubscriptions() {
    return prisma_default.subscription.findMany();
  }
  async findInvoicesByRestaurantId(restaurantId) {
    return prisma_default.invoice.findMany({
      where: {
        restaurantId
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }
};
var BillingRepository_default = new BillingRepository();

// src/modules/billing/config/planConfig.ts
import { PlanType } from "@prisma/client";
var PLAN_CONFIG = {
  [PlanType.BASICO]: {
    name: "B\xE1sico",
    monthlyFee: 100,
    trialDays: 30
  },
  [PlanType.PROFISSIONAL]: {
    name: "Profissional",
    monthlyFee: 200,
    trialDays: 30
  },
  [PlanType.PREMIUM]: {
    name: "Premium",
    monthlyFee: 300,
    trialDays: 30
  }
};

// src/modules/billing/services/SplitService.ts
var SplitService = class {
  async execute({ restaurantId, orderTotal }) {
    const subscription = await BillingRepository_default.findSubscriptionByRestaurantId(restaurantId);
    if (!subscription) {
      return 0;
    }
    const plan = PLAN_CONFIG[subscription.plan];
    if (!plan) {
      throw new Error("Plano inv\xE1lido.");
    }
    return 0;
  }
};
var SplitService_default = new SplitService();

// src/modules/orders/services/OrderPixPaymentService.ts
var APPROVED_PAYMENT_STATUSES = /* @__PURE__ */ new Set(["approved", "accredited", "paid"]);
var APPROVED_ASAAS_PAYMENT_STATUSES = /* @__PURE__ */ new Set([
  "received",
  "confirmed",
  "received_in_cash"
]);
function normalizeReferenceToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}
function doesProofContainTransactionId(paymentProof, transactionId) {
  const normalizedProof = normalizeReferenceToken(paymentProof);
  const normalizedTransactionId = normalizeReferenceToken(transactionId);
  if (!normalizedProof || !normalizedTransactionId) {
    return false;
  }
  return normalizedProof.includes(normalizedTransactionId);
}
var OrderPixPaymentService = class {
  getPagBankBaseUrl() {
    return String(
      process.env.PAGBANK_API_BASE_URL || "https://api.pagseguro.com"
    ).trim().replace(/\/+$/, "");
  }
  async getPagBankToken(restaurantId) {
    const settings = await RestaurantSettingsRepository_default.findByRestaurantId(restaurantId);
    const token = String(settings?.pagbankToken || "").trim();
    if (!token) {
      throw new Error(
        "Pagamento PIX PagBank indispon\xEDvel. Configure o token PagBank nas configura\xE7\xF5es do restaurante."
      );
    }
    return token;
  }
  async fetchPagBankJson(url, token, init2 = {}) {
    const response = await fetch(url, {
      ...init2,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...init2.headers || {}
      }
    });
    const body = await response.json();
    return { ok: response.ok, body };
  }
  getAsaasBaseUrl() {
    return String(process.env.ASAAS_API_BASE_URL || "https://api.asaas.com").trim().replace(/\/+$/, "");
  }
  async getAsaasAccessToken(restaurantId) {
    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
    const settings = await RestaurantSettingsRepository_default.findByRestaurantId(restaurantId);
    const settingsToken = String(settings?.asaasAccessToken || "").trim();
    const globalToken = String(process.env.ASAAS_API_KEY || "").trim();
    const accessToken = settingsToken || (allowGlobalFallback ? globalToken : "");
    if (!accessToken) {
      throw new Error(
        "Pagamento PIX Asaas indisponivel. Configure token Asaas nas configuracoes do restaurante."
      );
    }
    return accessToken;
  }
  getAsaasError(payload, fallbackMessage) {
    if (!Array.isArray(payload?.errors) || payload.errors.length === 0) {
      return fallbackMessage;
    }
    const message = String(payload.errors[0]?.description || "").trim();
    return message || fallbackMessage;
  }
  normalizeAsaasStatus(value) {
    return String(value || "").trim().toLowerCase();
  }
  normalizeAsaasPaymentId(paymentId) {
    const normalized = String(paymentId || "").trim();
    if (!normalized) {
      return "";
    }
    if (normalized.toLowerCase().startsWith("asaas:")) {
      return normalized;
    }
    return `asaas:${normalized}`;
  }
  async fetchAsaasJson(url, accessToken, {
    method = "GET",
    body
  } = {}) {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        access_token: accessToken
      },
      ...body !== void 0 ? { body: JSON.stringify(body) } : {}
    });
    const responseBody = await response.json();
    return {
      ok: response.ok,
      responseBody
    };
  }
  parseManualPaymentId(paymentId) {
    const normalizedPaymentId = String(paymentId || "").trim();
    const [
      prefix = "",
      provider = "",
      restaurant = "",
      createdAtMs = "",
      transactionIdFromId = ""
    ] = normalizedPaymentId.split(":");
    if (prefix !== "manual") {
      throw new Error("Pagamento PIX manual inv\xE1lido.");
    }
    const restaurantId = Number(restaurant || 0);
    const createdAtTimestamp = Number(createdAtMs || 0);
    const createdAt = new Date(createdAtTimestamp);
    const fallbackTransactionId = normalizeTxid(
      `${provider}${restaurantId}${createdAtTimestamp}`
    );
    const transactionId = normalizeTxid(
      transactionIdFromId || fallbackTransactionId
    );
    if (!Number.isInteger(restaurantId) || restaurantId <= 0 || !Number.isFinite(createdAtTimestamp) || Number.isNaN(createdAt.getTime()) || !transactionId) {
      throw new Error("Pagamento PIX manual inv\xE1lido.");
    }
    return {
      provider: this.normalizePixProvider(provider),
      restaurantId,
      createdAt,
      transactionId
    };
  }
  ensureManualPaymentConfirmationAllowed({
    paymentId,
    paymentProof
  }) {
    const parsed = this.parseManualPaymentId(paymentId);
    const normalizedProof = String(paymentProof || "").trim();
    if (normalizedProof.length < 6) {
      throw new Error(
        "Informe no comprovante o c\xF3digo/ID da transa\xE7\xE3o PIX para confirmar este pagamento."
      );
    }
    if (!doesProofContainTransactionId(normalizedProof, parsed.transactionId)) {
      throw new Error(
        "Comprovante PIX inv\xE1lido: o ID da transa\xE7\xE3o n\xE3o corresponde ao pagamento deste pedido."
      );
    }
  }
  async getMercadoPagoPaymentApi(restaurantId) {
    const normalizedRestaurantId = Number(restaurantId || 0);
    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
    const settings = Number.isInteger(normalizedRestaurantId) && normalizedRestaurantId > 0 ? await RestaurantSettingsRepository_default.findByRestaurantId(
      normalizedRestaurantId
    ) : null;
    const settingsToken = String(settings?.mercadoPagoAccessToken || "").trim();
    const globalToken = String(process.env.MP_ACCESS_TOKEN || "").trim();
    const accessToken = settingsToken || (allowGlobalFallback ? globalToken : "");
    if (!accessToken) {
      throw new Error(
        "Pagamento PIX indisponivel no momento. Configure access token Mercado Pago nas configuracoes do restaurante."
      );
    }
    const client3 = new MercadoPagoConfig({ accessToken });
    return new Payment(client3);
  }
  normalizeCpf(value) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length === 11 ? digits : null;
  }
  normalizeEmail(email, restaurantId) {
    const trimmed = String(email || "").trim();
    if (trimmed && trimmed.includes("@")) {
      return trimmed;
    }
    return `guest.pix.${restaurantId}.${Date.now()}@pecaja.local`;
  }
  normalizePaymentStatus(status) {
    return String(status || "").trim().toLowerCase();
  }
  normalizePixProvider(value) {
    return normalizePixProvider(value);
  }
  async calculateOrderSubtotal({
    restaurantId,
    items
  }) {
    const products = await Promise.all(
      items.map(
        (item) => ProductRepository_default.findById(item.productId, restaurantId)
      )
    );
    products.forEach((product, index) => {
      if (!product) {
        throw new Error(`Produto n\xE3o encontrado: ${items[index].productId}`);
      }
    });
    return items.reduce((acc, item, index) => {
      const product = products[index];
      return acc + Number(product.price) * Number(item.quantity);
    }, 0);
  }
  async createPixPayment({
    restaurantId,
    type,
    paymentMethod,
    pixProvider,
    items,
    address,
    number,
    district,
    city,
    state,
    customerName,
    customerCpf,
    customerPhone,
    userEmail
  }) {
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedType = String(type || "").toUpperCase();
    const normalizedPaymentMethod = String(paymentMethod || "").toUpperCase();
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error("Restaurante inv\xE1lido para gerar PIX.");
    }
    const allowsPixType = normalizedType === "DELIVERY" || normalizedType === "MESA" || normalizedType === "RETIRADA";
    if (!allowsPixType || normalizedPaymentMethod !== "PIX") {
      throw new Error(
        "A geracao de PIX e permitida para pedidos DELIVERY, MESA ou RETIRADA com pagamento PIX."
      );
    }
    if (normalizedType === "DELIVERY") {
      const requiredAddressFields = [address, number, district, city, state].map((value) => String(value || "").trim()).filter(Boolean);
      if (requiredAddressFields.length < 5) {
        throw new Error(
          "Informe o endereco completo para pedidos de delivery."
        );
      }
    }
    const settings = await RestaurantSettingsRepository_default.findPublicByRestaurantId(
      normalizedRestaurantId
    );
    void pixProvider;
    const resolvedPixProvider = this.normalizePixProvider(
      settings?.pixProvider
    );
    const pixKey = String(settings?.pixKey || "").trim();
    if (!pixKey) {
      throw new Error("Chave PIX n\xE3o configurada para este restaurante.");
    }
    const minimumOrder = Number(settings?.minimumOrder || 0);
    const deliveryFee = Number(settings?.deliveryFee || 0);
    const subtotal = await this.calculateOrderSubtotal({
      restaurantId: normalizedRestaurantId,
      items
    });
    if (normalizedType === "DELIVERY" && minimumOrder > 0 && subtotal < minimumOrder) {
      throw new Error(
        `Pedido m\xEDnimo sobre o subtotal para delivery: R$ ${minimumOrder.toFixed(2)}. A taxa de entrega \xE9 cobrada \xE0 parte.`
      );
    }
    const additionalFee = normalizedType === "DELIVERY" ? Math.max(deliveryFee, 0) : 0;
    const systemFee = await SplitService_default.execute({
      restaurantId: normalizedRestaurantId,
      orderTotal: subtotal
    });
    const totalAmount = Number((subtotal + additionalFee).toFixed(2));
    if (totalAmount <= 0) {
      throw new Error("Total do pedido inv\xE1lido para gerar cobran\xE7a PIX.");
    }
    const payerEmail = this.normalizeEmail(userEmail, normalizedRestaurantId);
    const payerName = String(customerName || "Cliente").trim();
    const cpf = this.normalizeCpf(customerCpf);
    const normalizedSystemFee = Number(systemFee || 0);
    if (resolvedPixProvider === PIX_PROVIDERS.PAGBANK) {
      const token = await this.getPagBankToken(normalizedRestaurantId);
      const backendUrl = String(process.env.BACKEND_URL || "").trim().replace(/\/+$/, "");
      const notificationUrl = backendUrl ? `${backendUrl}/orders/webhook/pagbank?restaurantId=${normalizedRestaurantId}` : "";
      const result = await this.fetchPagBankJson(
        `${this.getPagBankBaseUrl()}/orders`,
        token,
        {
          method: "POST",
          headers: { "x-idempotency-key": crypto.randomUUID() },
          body: JSON.stringify({
            reference_id: `orderpix:${normalizedRestaurantId}:${Date.now()}`,
            customer: {
              name: payerName || "Cliente",
              email: payerEmail,
              ...cpf ? { tax_id: cpf } : {}
            },
            items: [
              {
                reference_id: `restaurant-${normalizedRestaurantId}`,
                name: `Pedido restaurante ${normalizedRestaurantId}`,
                quantity: 1,
                unit_amount: Math.round(totalAmount * 100)
              }
            ],
            qr_codes: [
              { amount: { value: Math.round(totalAmount * 100) } }
            ],
            ...notificationUrl ? { notification_urls: [notificationUrl] } : {}
          })
        }
      );
      const providerError = String(
        result.body?.error_messages?.[0]?.description || ""
      ).trim();
      const orderId = String(result.body?.id || "").trim();
      const qrCode2 = String(result.body?.qr_codes?.[0]?.text || "").trim();
      if (!result.ok || !orderId || !qrCode2) {
        throw new Error(
          providerError || "N\xE3o foi poss\xEDvel gerar o Pix no PagBank."
        );
      }
      const base64Url = String(
        result.body?.qr_codes?.[0]?.links?.find(
          (link) => link.rel === "QRCODE.BASE64"
        )?.href || ""
      ).trim();
      let qrCodeBase642 = null;
      if (base64Url) {
        const imageResponse = await fetch(base64Url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (imageResponse.ok) {
          qrCodeBase642 = (await imageResponse.text()).trim() || null;
        }
      }
      return {
        paymentId: `pagbank:${orderId}`,
        status: "WAITING",
        provider: resolvedPixProvider,
        totalAmount,
        qrCode: qrCode2,
        qrCodeBase64: qrCodeBase642,
        requiresStatusCheck: true
      };
    }
    if (resolvedPixProvider === PIX_PROVIDERS.ASAAS) {
      const accessToken = await this.getAsaasAccessToken(
        normalizedRestaurantId
      );
      const asaasBaseUrl = this.getAsaasBaseUrl();
      const privateSettings = await RestaurantSettingsRepository_default.findByRestaurantId(
        normalizedRestaurantId
      );
      const customerResult = await this.fetchAsaasJson(
        `${asaasBaseUrl}/v3/customers`,
        accessToken,
        {
          method: "POST",
          body: {
            name: payerName || "Cliente",
            email: payerEmail,
            ...cpf ? { cpfCnpj: cpf } : {},
            ...customerPhone ? { mobilePhone: String(customerPhone).replace(/\D/g, "") } : {}
          }
        }
      );
      if (!customerResult.ok || !String(customerResult.responseBody?.id || "").trim()) {
        throw new Error(
          this.getAsaasError(
            customerResult.responseBody,
            "Nao foi possivel criar/identificar cliente para pagamento PIX no Asaas."
          )
        );
      }
      const customerId = String(customerResult.responseBody.id || "").trim();
      const walletId = String(privateSettings?.gatewayMerchantId || "").trim();
      const platformWalletId = String(
        process.env.ASAAS_PLATFORM_WALLET_ID || ""
      ).trim();
      const buildAsaasPaymentBody = (includeSplit) => ({
        customer: customerId,
        billingType: "PIX",
        value: totalAmount,
        dueDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        description: `Pedido delivery restaurante ${normalizedRestaurantId}`,
        externalReference: `orderpix:${normalizedRestaurantId}:${Date.now()}`,
        ...includeSplit && normalizedSystemFee > 0 && platformWalletId ? {
          split: [
            {
              walletId: platformWalletId,
              fixedValue: normalizedSystemFee
            },
            ...walletId ? [
              {
                walletId,
                remainingValue: true
              }
            ] : []
          ]
        } : {}
      });
      let paymentResult = await this.fetchAsaasJson(
        `${asaasBaseUrl}/v3/payments`,
        accessToken,
        {
          method: "POST",
          body: buildAsaasPaymentBody(normalizedSystemFee > 0)
        }
      );
      const shouldRetryWithoutSplit = normalizedSystemFee > 0 && !paymentResult.ok && isMarketplaceSplitConfigurationError(
        this.getAsaasError(
          paymentResult.responseBody,
          "Erro ao criar pagamento PIX no Asaas."
        )
      );
      if (shouldRetryWithoutSplit) {
        console.warn(
          "[ASAAS_PIX_SPLIT_FALLBACK] Asaas rejeitou split. Recriando pagamento sem split.",
          {
            restaurantId: normalizedRestaurantId,
            systemFee: normalizedSystemFee
          }
        );
        paymentResult = await this.fetchAsaasJson(
          `${asaasBaseUrl}/v3/payments`,
          accessToken,
          {
            method: "POST",
            body: buildAsaasPaymentBody(false)
          }
        );
      }
      if (!paymentResult.ok) {
        throw new Error(
          this.getAsaasError(
            paymentResult.responseBody,
            "Nao foi possivel gerar cobranca PIX no Asaas."
          )
        );
      }
      const asaasPaymentId = String(
        paymentResult.responseBody?.id || ""
      ).trim();
      if (!asaasPaymentId) {
        throw new Error("Asaas nao retornou id do pagamento PIX.");
      }
      const qrResult = await this.fetchAsaasJson(
        `${asaasBaseUrl}/v3/payments/${encodeURIComponent(asaasPaymentId)}/pixQrCode`,
        accessToken
      );
      if (!qrResult.ok) {
        throw new Error(
          this.getAsaasError(
            qrResult.responseBody,
            "Nao foi possivel gerar QR Code PIX no Asaas."
          )
        );
      }
      const qrCode2 = String(qrResult.responseBody?.payload || "").trim();
      const qrCodeBase642 = String(
        qrResult.responseBody?.encodedImage || ""
      ).trim();
      if (!qrCode2) {
        throw new Error("Asaas nao retornou payload PIX para pagamento.");
      }
      return {
        paymentId: this.normalizeAsaasPaymentId(asaasPaymentId),
        status: String(paymentResult.responseBody?.status || "PENDING"),
        provider: resolvedPixProvider,
        totalAmount,
        qrCode: qrCode2,
        qrCodeBase64: qrCodeBase642 || null,
        requiresStatusCheck: true
      };
    }
    if (resolvedPixProvider !== PIX_PROVIDERS.MERCADO_PAGO) {
      throw new Error(
        "Este provedor PIX ainda nao possui confirmacao automatica. Selecione Mercado Pago ou Asaas."
      );
    }
    const paymentApi = await this.getMercadoPagoPaymentApi(
      normalizedRestaurantId
    );
    const baseBody = {
      transaction_amount: totalAmount,
      description: `Pedido delivery restaurante ${normalizedRestaurantId}`,
      payment_method_id: "pix",
      payer: {
        email: payerEmail,
        first_name: payerName || "Cliente",
        ...cpf ? {
          identification: {
            type: "CPF",
            number: cpf
          }
        } : {}
      },
      metadata: {
        restaurant_id: String(normalizedRestaurantId),
        source: "order_checkout",
        provider: resolvedPixProvider
      },
      external_reference: `orderpix:${normalizedRestaurantId}:${Date.now()}`
    };
    let response;
    if (normalizedSystemFee > 0) {
      try {
        response = await paymentApi.create({
          body: {
            ...baseBody,
            application_fee: normalizedSystemFee
          }
        });
      } catch (error2) {
        if (!isMarketplaceSplitConfigurationError(error2)) {
          throw error2;
        }
        console.warn(
          "[PIX_SPLIT_FALLBACK] Mercado Pago rejeitou application_fee. Recriando pagamento sem split.",
          {
            restaurantId: normalizedRestaurantId,
            systemFee: normalizedSystemFee
          }
        );
        response = await paymentApi.create({
          body: baseBody
        });
      }
    } else {
      response = await paymentApi.create({
        body: baseBody
      });
    }
    const payment = typeof response === "object" && response !== null ? response.body ?? response : {};
    const paymentData = payment;
    const transactionData = paymentData?.point_of_interaction?.transaction_data || {};
    const qrCode = String(transactionData?.qr_code || "").trim();
    const qrCodeBase64 = String(transactionData?.qr_code_base64 || "").trim();
    if (!paymentData?.id || !qrCode) {
      throw new Error("N\xE3o foi poss\xEDvel gerar o QR Code PIX no momento.");
    }
    return {
      paymentId: String(paymentData.id),
      status: String(paymentData.status || "pending"),
      provider: resolvedPixProvider,
      totalAmount,
      qrCode,
      qrCodeBase64: qrCodeBase64 || null,
      requiresStatusCheck: true
    };
  }
  async getPaymentStatus({ paymentId, restaurantId }) {
    const normalizedPaymentId = String(paymentId || "").trim();
    if (!normalizedPaymentId) {
      throw new Error("Pagamento PIX inv\xE1lido.");
    }
    if (normalizedPaymentId.startsWith("manual:")) {
      throw new Error("Pagamento PIX manual nao e permitido.");
    }
    const parsedPaymentId = parseProviderPaymentId(normalizedPaymentId);
    const normalizedRestaurantIdNumber = Number(restaurantId || 0);
    if (parsedPaymentId.provider === PIX_PROVIDERS.ASAAS) {
      const effectiveRestaurantId = Number.isInteger(normalizedRestaurantIdNumber) && normalizedRestaurantIdNumber > 0 ? normalizedRestaurantIdNumber : 0;
      if (!effectiveRestaurantId) {
        throw new Error(
          "Restaurante inv\xE1lido para consulta de pagamento PIX Asaas."
        );
      }
      const accessToken = await this.getAsaasAccessToken(effectiveRestaurantId);
      const asaasBaseUrl = this.getAsaasBaseUrl();
      const statusResult = await this.fetchAsaasJson(
        `${asaasBaseUrl}/v3/payments/${encodeURIComponent(parsedPaymentId.rawPaymentId)}`,
        accessToken
      );
      if (!statusResult.ok) {
        throw new Error(
          this.getAsaasError(
            statusResult.responseBody,
            "Nao foi possivel consultar pagamento PIX Asaas."
          )
        );
      }
      const status2 = this.normalizeAsaasStatus(
        statusResult.responseBody?.status
      );
      return {
        paymentId: normalizedPaymentId,
        status: status2,
        provider: PIX_PROVIDERS.ASAAS,
        isApproved: APPROVED_ASAAS_PAYMENT_STATUSES.has(status2),
        sameRestaurant: true,
        requiresStatusCheck: true
      };
    }
    if (parsedPaymentId.provider === PIX_PROVIDERS.PAGBANK) {
      if (!normalizedRestaurantIdNumber) {
        throw new Error("Restaurante inv\xE1lido para consultar Pix PagBank.");
      }
      const token = await this.getPagBankToken(normalizedRestaurantIdNumber);
      const result = await this.fetchPagBankJson(
        `${this.getPagBankBaseUrl()}/orders/${encodeURIComponent(parsedPaymentId.rawPaymentId)}`,
        token
      );
      if (!result.ok) {
        throw new Error("N\xE3o foi poss\xEDvel consultar o Pix no PagBank.");
      }
      const statuses = (result.body?.charges || []).map(
        (charge) => String(charge.status || "").toUpperCase()
      );
      const isApproved = statuses.includes("PAID");
      return {
        paymentId: normalizedPaymentId,
        status: isApproved ? "paid" : statuses[0] || "waiting",
        provider: PIX_PROVIDERS.PAGBANK,
        isApproved,
        sameRestaurant: true,
        requiresStatusCheck: true
      };
    }
    const paymentApi = await this.getMercadoPagoPaymentApi(
      Number.isInteger(normalizedRestaurantIdNumber) && normalizedRestaurantIdNumber > 0 ? normalizedRestaurantIdNumber : void 0
    );
    const response = await paymentApi.get({
      id: parsedPaymentId.rawPaymentId
    });
    const payment = typeof response === "object" && response !== null ? response.body ?? response : {};
    const paymentData = payment;
    const status = this.normalizePaymentStatus(paymentData?.status);
    const metadataRestaurantId = String(
      paymentData?.metadata?.restaurant_id || ""
    ).trim();
    const normalizedRestaurantId = String(restaurantId || "").trim();
    const sameRestaurant = !normalizedRestaurantId || !metadataRestaurantId || metadataRestaurantId === normalizedRestaurantId;
    return {
      paymentId: normalizedPaymentId,
      status,
      provider: PIX_PROVIDERS.MERCADO_PAGO,
      isApproved: APPROVED_PAYMENT_STATUSES.has(status),
      sameRestaurant,
      requiresStatusCheck: true
    };
  }
  async ensurePaymentApproved({
    paymentId,
    restaurantId
  }) {
    const statusResult = await this.getPaymentStatus({
      paymentId,
      restaurantId
    });
    if (!statusResult.sameRestaurant) {
      throw new Error(
        "Este pagamento PIX n\xE3o pertence ao restaurante do pedido."
      );
    }
    if (!statusResult.isApproved) {
      throw new Error("Pagamento PIX ainda n\xE3o foi aprovado.");
    }
    return statusResult;
  }
};
var OrderPixPaymentService_default = new OrderPixPaymentService();

// src/modules/orders/services/CreateOrderService.ts
import {
  PaymentMethod as PaymentMethod3,
  TableSessionStatus as TableSessionStatus2,
  OrderType as OrderType3
} from "@prisma/client";

// src/services/customerNotifier.ts
var configuredProvider = String(
  process.env.CUSTOMER_NOTIFICATION_PROVIDER || "none"
).trim().toLowerCase();
var whatsappWebhookUrl = String(
  process.env.WHATSAPP_WEBHOOK_URL || ""
).trim();
var whatsappWebhookToken = String(
  process.env.WHATSAPP_WEBHOOK_TOKEN || ""
).trim();
function getErrorMessage(error2) {
  return error2 instanceof Error ? error2.message : "unknown";
}
function resolveProvider() {
  if (configuredProvider && configuredProvider !== "none") {
    return configuredProvider;
  }
  if (whatsappWebhookUrl) {
    return "whatsapp_webhook";
  }
  return "none";
}
function normalizeToE164Br(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  if (/^55\d{10,11}$/.test(digits)) {
    return `+${digits}`;
  }
  if (/^\d{10}$/.test(digits)) {
    return `+55${digits}`;
  }
  if (/^\d{11}$/.test(digits)) {
    return `+55${digits}`;
  }
  return "";
}
function formatCurrencyBrl(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number.isFinite(amount) ? amount : 0);
}
function buildCustomerMessage({
  customerName,
  restaurantName,
  orderId,
  total,
  paymentMethod
}) {
  const resolvedCustomerName = String(customerName || "Cliente").trim();
  const resolvedRestaurantName = String(restaurantName || "restaurante").trim();
  const resolvedPaymentMethod = String(paymentMethod || "PIX").toUpperCase();
  return [
    `Oi, ${resolvedCustomerName}!`,
    `Seu pagamento via ${resolvedPaymentMethod} foi confirmado com sucesso.`,
    `Pedido #${orderId} confirmado no ${resolvedRestaurantName}.`,
    `Total: ${formatCurrencyBrl(total)}.`,
    "Agora e so aguardar, seu pedido entrou em preparo."
  ].join("\n");
}
function buildOrderStatusChangedMessage({
  customerName,
  restaurantName,
  orderId,
  status
}) {
  const resolvedCustomerName = String(customerName || "Cliente").trim();
  const resolvedRestaurantName = String(restaurantName || "restaurante").trim();
  const resolvedStatus = String(status || "EM ANDAMENTO").replace(/_/g, " ").toUpperCase();
  return [
    `Oi, ${resolvedCustomerName}!`,
    `Atualizacao do seu pedido #${orderId} no ${resolvedRestaurantName}.`,
    `Novo status: ${resolvedStatus}.`
  ].join("\n");
}
function buildRestaurantPinRequestMessage({
  restaurantName,
  orderId,
  requestedByRole
}) {
  const resolvedRestaurantName = String(restaurantName || "restaurante").trim();
  const normalizedRole = String(requestedByRole || "MOTOQUEIRO").toUpperCase();
  const requesterLabel = normalizedRole === "ADMIN" ? "Admin" : "Motoqueiro";
  return [
    `Notificacao - ${resolvedRestaurantName}`,
    `${requesterLabel} solicitou PIN de confirmacao de pagamento.`,
    `Pedido #${orderId}.`
  ].join("\n");
}
function buildRestaurantOrderIssueReportedMessage({
  restaurantName,
  orderId,
  customerName,
  customerPhone,
  issueMessage,
  orderStatus,
  orderType,
  paymentMethod,
  total,
  addressLabel,
  itemsSummary,
  createdAt
}) {
  const resolvedRestaurantName = String(restaurantName || "restaurante").trim();
  const resolvedCustomerName = String(customerName || "Cliente").trim();
  const resolvedCustomerPhone = String(customerPhone || "").trim();
  const resolvedIssueMessage = String(issueMessage || "").trim().slice(0, 600);
  const resolvedOrderStatus = String(orderStatus || "N/A").trim().replace(/_/g, " ").toUpperCase();
  const resolvedOrderType = String(orderType || "N/A").trim().replace(/_/g, " ").toUpperCase();
  const resolvedPaymentMethod = String(paymentMethod || "N/A").trim().replace(/_/g, " ").toUpperCase();
  const resolvedAddressLabel = String(addressLabel || "").trim();
  const resolvedItemsSummary = Array.isArray(itemsSummary) ? itemsSummary.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 8) : [];
  const resolvedCreatedAt = String(createdAt || "").trim();
  const resolvedCreatedAtText = resolvedCreatedAt ? new Date(resolvedCreatedAt).toLocaleString("pt-BR") : "N/A";
  return [
    `Notificacao - ${resolvedRestaurantName}`,
    `Cliente ${resolvedCustomerName} relatou problema no pedido #${orderId}.`,
    resolvedCustomerPhone ? `Telefone do cliente: ${resolvedCustomerPhone}.` : null,
    `Status: ${resolvedOrderStatus} | Tipo: ${resolvedOrderType} | Pagamento: ${resolvedPaymentMethod}.`,
    `Total: ${formatCurrencyBrl(total)}.`,
    resolvedAddressLabel ? `Endereco: ${resolvedAddressLabel}.` : null,
    resolvedItemsSummary.length > 0 ? `Itens: ${resolvedItemsSummary.join("; ")}.` : null,
    `Criado em: ${resolvedCreatedAtText}.`,
    `Mensagem: ${resolvedIssueMessage || "(sem detalhes)"}`
  ].filter(Boolean).join("\n");
}
async function notifyViaWhatsappWebhook({
  restaurantWhatsapp,
  customerPhone,
  customerName,
  restaurantName,
  orderId,
  total,
  paymentMethod
}) {
  if (!whatsappWebhookUrl) {
    return {
      sent: false,
      reason: "webhook_not_configured"
    };
  }
  const from = normalizeToE164Br(restaurantWhatsapp);
  if (!from) {
    return {
      sent: false,
      reason: "restaurant_whatsapp_not_configured"
    };
  }
  const to = normalizeToE164Br(customerPhone);
  if (!to) {
    return {
      sent: false,
      reason: "invalid_or_missing_phone"
    };
  }
  const message = buildCustomerMessage({
    customerName,
    restaurantName,
    orderId,
    total,
    paymentMethod
  });
  const headers = {
    "Content-Type": "application/json"
  };
  if (whatsappWebhookToken) {
    headers.Authorization = `Bearer ${whatsappWebhookToken}`;
  }
  const response = await fetch(whatsappWebhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      channel: "whatsapp",
      from,
      to,
      message,
      metadata: {
        orderId,
        restaurantWhatsapp: from
      }
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Webhook respondeu ${response.status}: ${body}`.trim());
  }
  return {
    sent: true,
    provider: "whatsapp_webhook",
    from,
    to
  };
}
async function notifyOrderStatusChangedViaWhatsappWebhook({
  restaurantWhatsapp,
  customerPhone,
  customerName,
  restaurantName,
  orderId,
  status
}) {
  if (!whatsappWebhookUrl) {
    return {
      sent: false,
      reason: "webhook_not_configured"
    };
  }
  const from = normalizeToE164Br(restaurantWhatsapp);
  if (!from) {
    return {
      sent: false,
      reason: "restaurant_whatsapp_not_configured"
    };
  }
  const to = normalizeToE164Br(customerPhone);
  if (!to) {
    return {
      sent: false,
      reason: "invalid_or_missing_phone"
    };
  }
  const message = buildOrderStatusChangedMessage({
    customerName,
    restaurantName,
    orderId,
    status
  });
  const headers = {
    "Content-Type": "application/json"
  };
  if (whatsappWebhookToken) {
    headers.Authorization = `Bearer ${whatsappWebhookToken}`;
  }
  const response = await fetch(whatsappWebhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      channel: "whatsapp",
      from,
      to,
      message,
      metadata: {
        orderId,
        status,
        restaurantWhatsapp: from
      }
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Webhook respondeu ${response.status}: ${body}`.trim());
  }
  return {
    sent: true,
    provider: "whatsapp_webhook",
    from,
    to
  };
}
async function notifyRestaurantPinRequestedViaWhatsappWebhook({
  restaurantWhatsapp,
  restaurantName,
  orderId,
  requestedByRole
}) {
  if (!whatsappWebhookUrl) {
    return {
      sent: false,
      reason: "webhook_not_configured"
    };
  }
  const from = normalizeToE164Br(restaurantWhatsapp);
  if (!from) {
    return {
      sent: false,
      reason: "restaurant_whatsapp_not_configured"
    };
  }
  const to = from;
  const message = buildRestaurantPinRequestMessage({
    restaurantName,
    orderId,
    requestedByRole
  });
  const headers = {
    "Content-Type": "application/json"
  };
  if (whatsappWebhookToken) {
    headers.Authorization = `Bearer ${whatsappWebhookToken}`;
  }
  const response = await fetch(whatsappWebhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      channel: "whatsapp",
      from,
      to,
      message,
      metadata: {
        orderId,
        requestedByRole,
        restaurantWhatsapp: from
      }
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Webhook respondeu ${response.status}: ${body}`.trim());
  }
  return {
    sent: true,
    provider: "whatsapp_webhook",
    from,
    to
  };
}
async function notifyRestaurantOrderIssueReportedViaWhatsappWebhook({
  restaurantWhatsapp,
  restaurantName,
  orderId,
  customerName,
  issueMessage,
  orderStatus,
  orderType,
  paymentMethod,
  total,
  addressLabel,
  itemsSummary,
  createdAt
}) {
  if (!whatsappWebhookUrl) {
    return {
      sent: false,
      reason: "webhook_not_configured"
    };
  }
  const from = normalizeToE164Br(restaurantWhatsapp);
  if (!from) {
    return {
      sent: false,
      reason: "restaurant_whatsapp_not_configured"
    };
  }
  const to = from;
  const message = buildRestaurantOrderIssueReportedMessage({
    restaurantName,
    orderId,
    customerName,
    issueMessage,
    orderStatus,
    orderType,
    paymentMethod,
    total,
    addressLabel,
    itemsSummary,
    createdAt
  });
  const headers = {
    "Content-Type": "application/json"
  };
  if (whatsappWebhookToken) {
    headers.Authorization = `Bearer ${whatsappWebhookToken}`;
  }
  const response = await fetch(whatsappWebhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      channel: "whatsapp",
      from,
      to,
      message,
      metadata: {
        orderId,
        customerName,
        issueMessage,
        orderStatus,
        orderType,
        paymentMethod,
        total,
        addressLabel,
        itemsSummary,
        createdAt,
        restaurantWhatsapp: from
      }
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Webhook respondeu ${response.status}: ${body}`.trim());
  }
  return {
    sent: true,
    provider: "whatsapp_webhook",
    from,
    to
  };
}
async function notifyCustomerPaymentConfirmed({
  restaurantWhatsapp,
  customerPhone,
  customerName,
  restaurantName,
  orderId,
  total,
  paymentMethod
}) {
  const provider = resolveProvider();
  if (provider === "none") {
    return {
      sent: false,
      reason: "provider_not_configured"
    };
  }
  try {
    if (provider === "whatsapp_webhook") {
      return await notifyViaWhatsappWebhook({
        restaurantWhatsapp,
        customerPhone,
        customerName,
        restaurantName,
        orderId,
        total,
        paymentMethod
      });
    }
    return {
      sent: false,
      reason: "provider_not_supported",
      provider
    };
  } catch (error2) {
    console.error("[CUSTOMER_NOTIFICATION_ERROR]", getErrorMessage(error2));
    return {
      sent: false,
      reason: "send_failed",
      provider,
      error: getErrorMessage(error2)
    };
  }
}
async function notifyCustomerOrderStatusChanged({
  restaurantWhatsapp,
  customerPhone,
  customerName,
  restaurantName,
  orderId,
  status
}) {
  const provider = resolveProvider();
  if (provider === "none") {
    return {
      sent: false,
      reason: "provider_not_configured"
    };
  }
  try {
    if (provider === "whatsapp_webhook") {
      return await notifyOrderStatusChangedViaWhatsappWebhook({
        restaurantWhatsapp,
        customerPhone,
        customerName,
        restaurantName,
        orderId,
        status
      });
    }
    return {
      sent: false,
      reason: "provider_not_supported",
      provider
    };
  } catch (error2) {
    console.error(
      "[CUSTOMER_STATUS_NOTIFICATION_ERROR]",
      getErrorMessage(error2)
    );
    return {
      sent: false,
      reason: "send_failed",
      provider,
      error: getErrorMessage(error2)
    };
  }
}
async function notifyRestaurantPaymentPinRequested({
  restaurantWhatsapp,
  restaurantName,
  orderId,
  requestedByRole
}) {
  const provider = resolveProvider();
  if (provider === "none") {
    return {
      sent: false,
      reason: "provider_not_configured"
    };
  }
  try {
    if (provider === "whatsapp_webhook") {
      return await notifyRestaurantPinRequestedViaWhatsappWebhook({
        restaurantWhatsapp,
        restaurantName,
        orderId,
        requestedByRole
      });
    }
    return {
      sent: false,
      reason: "provider_not_supported",
      provider
    };
  } catch (error2) {
    console.error(
      "[RESTAURANT_PIN_NOTIFICATION_ERROR]",
      getErrorMessage(error2)
    );
    return {
      sent: false,
      reason: "send_failed",
      provider,
      error: getErrorMessage(error2)
    };
  }
}
async function notifyRestaurantOrderIssueReported({
  restaurantWhatsapp,
  restaurantName,
  orderId,
  customerName,
  issueMessage,
  orderStatus,
  orderType,
  paymentMethod,
  total,
  addressLabel,
  itemsSummary,
  createdAt
}) {
  const provider = resolveProvider();
  if (provider === "none") {
    return {
      sent: false,
      reason: "provider_not_configured"
    };
  }
  try {
    if (provider === "whatsapp_webhook") {
      return await notifyRestaurantOrderIssueReportedViaWhatsappWebhook({
        restaurantWhatsapp,
        restaurantName,
        orderId,
        customerName,
        issueMessage,
        orderStatus,
        orderType,
        paymentMethod,
        total,
        addressLabel,
        itemsSummary,
        createdAt
      });
    }
    return {
      sent: false,
      reason: "provider_not_supported",
      provider
    };
  } catch (error2) {
    console.error(
      "[RESTAURANT_ORDER_ISSUE_NOTIFICATION_ERROR]",
      getErrorMessage(error2)
    );
    return {
      sent: false,
      reason: "send_failed",
      provider,
      error: getErrorMessage(error2)
    };
  }
}

// src/modules/orders/services/CreateOrderService.ts
var CreateOrderService = class {
  formatCpf(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length !== 11) {
      return null;
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  normalizePhone(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) {
      return null;
    }
    if (/^55\d{10,11}$/.test(digits)) {
      return `+${digits}`;
    }
    if (/^\d{10,11}$/.test(digits)) {
      return `+55${digits}`;
    }
    return null;
  }
  async resolveOrderUser({
    tx,
    userId,
    restaurantId,
    customerName,
    customerCpf,
    customerPhone
  }) {
    const normalizedPhone = this.normalizePhone(customerPhone);
    if (userId) {
      if (normalizedPhone) {
        await tx.user.update({
          where: {
            id: Number(userId)
          },
          data: {
            phone: normalizedPhone
          }
        });
      }
      return Number(userId);
    }
    const normalizedName = String(customerName || "").trim();
    const cpfDigits = String(customerCpf || "").replace(/\D/g, "");
    if (normalizedName.length < 2) {
      throw new Error("Informe o nome para finalizar o pedido.");
    }
    if (cpfDigits.length !== 11) {
      throw new Error("Informe um CPF v\xE1lido com 11 d\xEDgitos.");
    }
    const guestEmail = `guest.${restaurantId}.${cpfDigits}@pecaja.local`;
    const guestPassword = `guest-${restaurantId}-${cpfDigits}`;
    const guestUser = await tx.user.upsert({
      where: {
        email: guestEmail
      },
      update: {
        name: normalizedName,
        active: true,
        ...normalizedPhone ? {
          phone: normalizedPhone
        } : {}
      },
      create: {
        name: normalizedName,
        email: guestEmail,
        password: guestPassword,
        role: "CLIENTE",
        active: true,
        phone: normalizedPhone,
        restaurantId
      },
      select: {
        id: true
      }
    });
    return Number(guestUser.id);
  }
  async resolvePaymentState({
    paymentMethod,
    paid,
    pixPaymentId,
    restaurantId
  }) {
    const normalizedPaymentMethod = String(paymentMethod || "").toUpperCase();
    const normalizedPixPaymentId = String(pixPaymentId || "").trim();
    const requestedAsPaid = paid === true;
    if (!requestedAsPaid) {
      return {
        normalizedPaymentMethod,
        normalizedPixPaymentId,
        shouldMarkAsPaid: false,
        paidAt: null
      };
    }
    if (normalizedPaymentMethod === PaymentMethod3.PIX) {
      if (normalizedPixPaymentId && !normalizedPixPaymentId.startsWith("manual:")) {
        const paymentStatus = await OrderPixPaymentService_default.ensurePaymentApproved({
          paymentId: normalizedPixPaymentId,
          restaurantId
        });
        if (!paymentStatus.sameRestaurant) {
          throw new Error(
            "O pagamento PIX informado nao pertence a este restaurante."
          );
        }
        return {
          normalizedPaymentMethod,
          normalizedPixPaymentId,
          shouldMarkAsPaid: true,
          paidAt: /* @__PURE__ */ new Date()
        };
      }
      throw new Error("Pagamento PIX ainda nao foi confirmado pelo provedor.");
    }
    if (normalizedPaymentMethod === PaymentMethod3.CARTAO) {
      return {
        normalizedPaymentMethod,
        normalizedPixPaymentId,
        shouldMarkAsPaid: true,
        paidAt: /* @__PURE__ */ new Date()
      };
    }
    return {
      normalizedPaymentMethod,
      normalizedPixPaymentId,
      shouldMarkAsPaid: false,
      paidAt: null
    };
  }
  async execute({
    userId,
    restaurantId,
    userRestaurantId,
    tableSessionId,
    tableSessionTableId,
    deferRealtimeUntilPaid,
    type,
    paymentMethod,
    payOnDelivery,
    payOnDeliveryMethod,
    paid,
    pixPaymentId,
    paymentProof,
    observation,
    customerName,
    customerCpf,
    customerPhone,
    tableId,
    items,
    address,
    number,
    district,
    city,
    state,
    zipCode,
    paymentProofImage,
    complement
  }) {
    const resolvedRestaurantId = Number(restaurantId) || Number(userRestaurantId) || null;
    if (!resolvedRestaurantId) {
      throw new Error("Restaurante n\xE3o informado para o pedido");
    }
    const shouldPayOnDelivery = payOnDelivery === true;
    const effectivePaymentMethod = shouldPayOnDelivery ? payOnDeliveryMethod || paymentMethod : paymentMethod;
    if (shouldPayOnDelivery && type !== OrderType3.DELIVERY) {
      throw new Error(
        "Pagar na entrega s\xF3 \xE9 permitido para pedidos de delivery."
      );
    }
    if (shouldPayOnDelivery && !effectivePaymentMethod) {
      throw new Error(
        "Informe o m\xE9todo de pagamento para pedidos com pagar na entrega."
      );
    }
    if (String(effectivePaymentMethod || "").toUpperCase() === PaymentMethod3.PIX && (String(paymentProof || "").trim() || String(paymentProofImage || "").trim())) {
      throw new Error(
        "Nao e permitido enviar comprovante manual para PIX. O pedido sera confirmado automaticamente pelo provedor."
      );
    }
    createOrderSchema.parse({
      restaurantId: resolvedRestaurantId,
      customerName,
      customerCpf,
      customerPhone,
      type,
      paymentMethod: effectivePaymentMethod,
      payOnDelivery: shouldPayOnDelivery,
      payOnDeliveryMethod: shouldPayOnDelivery ? effectivePaymentMethod : void 0,
      paid,
      pixPaymentId,
      paymentProof,
      observation,
      tableId,
      items,
      address,
      number,
      district,
      city,
      state,
      zipCode,
      complement,
      paymentProofImage
    });
    const {
      normalizedPaymentMethod,
      normalizedPixPaymentId,
      shouldMarkAsPaid,
      paidAt
    } = await this.resolvePaymentState({
      paymentMethod: effectivePaymentMethod,
      paid: shouldPayOnDelivery ? false : paid,
      pixPaymentId,
      restaurantId: resolvedRestaurantId
    });
    if (type === "MESA") {
      if (!tableSessionId) {
        throw new Error(
          "Sess\xE3o da mesa n\xE3o informada. Valide o PIN da mesa para continuar."
        );
      }
      const session = await TableSessionRepository_default.findById(tableSessionId);
      if (!session || session.status !== TableSessionStatus2.OPEN) {
        throw new Error(
          "Essa mesa est\xE1 fechada. Gere um novo PIN com a equipe para continuar."
        );
      }
      if (Number(tableId || 0) && Number(tableId) !== Number(session.tableId)) {
        throw new Error("Mesa do pedido n\xE3o confere com a sess\xE3o validada.");
      }
      if (Number(tableSessionTableId || 0) > 0 && Number(tableSessionTableId) !== Number(session.tableId)) {
        throw new Error("Sess\xE3o da mesa inv\xE1lida para este pedido.");
      }
      tableId = Number(session.tableId);
    }
    if (type === "DELIVERY") {
      const requiredAddressFields = [address, number, district, city, state].map((value) => String(value || "").trim()).filter(Boolean);
      if (requiredAddressFields.length < 5) {
        throw new Error(
          "Informe o endere\xE7o completo para pedidos de delivery."
        );
      }
      const normalizedCustomerPhone = this.normalizePhone(customerPhone);
      if (!normalizedCustomerPhone && userId) {
        const existingUser = await prisma_default.user.findUnique({
          where: {
            id: Number(userId)
          },
          select: {
            phone: true
          }
        });
        const normalizedExistingPhone = this.normalizePhone(
          existingUser?.phone
        );
        if (!normalizedExistingPhone) {
          throw new Error(
            "Informe um celular/WhatsApp v\xE1lido para pedidos de delivery."
          );
        }
      }
      if (!normalizedCustomerPhone && !userId) {
        throw new Error(
          "Informe um celular/WhatsApp v\xE1lido para pedidos de delivery."
        );
      }
    }
    const createdOrder = await prisma_default.$transaction(async (tx) => {
      const resolvedUserId = await this.resolveOrderUser({
        tx,
        userId,
        restaurantId: resolvedRestaurantId,
        customerName,
        customerCpf,
        customerPhone
      });
      const products = await Promise.all(
        items.map(
          (item) => ProductRepository_default.findById(item.productId, resolvedRestaurantId, tx)
        )
      );
      products.forEach((product, index) => {
        const item = items[index];
        if (!product) {
          throw new Error(`Produto n\xE3o encontrado: ${items[index].productId}`);
        }
        if (product.active === false) {
          throw new Error(`Produto indispon\xEDvel: ${product.name}`);
        }
        const quantity = Number(item.quantity || 0);
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error(`Quantidade inv\xE1lida para ${product.name}.`);
        }
        const stockValue = product.stock === null || product.stock === void 0 ? null : Number(product.stock);
        if (Number.isInteger(stockValue) && stockValue >= 0 && quantity > stockValue) {
          throw new Error(
            `Estoque insuficiente para ${product.name}. Dispon\xEDvel: ${stockValue}.`
          );
        }
      });
      const orderItems = items.map((item, index) => {
        const product = products[index];
        return {
          productId: product.id,
          quantity: item.quantity,
          price: Number(product.price),
          observation: item.observation
        };
      });
      const total = orderItems.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
      );
      const formattedCpf = this.formatCpf(customerCpf);
      const guestSummary = !userId && customerName ? `Cliente: ${String(customerName).trim()}${formattedCpf ? ` | CPF: ${formattedCpf}` : ""}` : "";
      const mergedObservation = [guestSummary, observation].map((item) => String(item || "").trim()).filter(Boolean).join(" | ");
      const normalizedTableId = tableId === null || tableId === void 0 || tableId === "" ? null : Number(tableId);
      const order = await OrderRepository_default.create(
        {
          total,
          systemFee: 0,
          type,
          paymentMethod: effectivePaymentMethod,
          payOnDelivery: shouldPayOnDelivery,
          payOnDeliveryMethod: shouldPayOnDelivery ? effectivePaymentMethod : null,
          paid: shouldMarkAsPaid,
          pixPaymentId: normalizedPixPaymentId || null,
          paidAt,
          paymentProof: null,
          paymentProofImage: null,
          observation: mergedObservation || null,
          userId: resolvedUserId,
          restaurantId: resolvedRestaurantId,
          tableId: normalizedTableId,
          address,
          number,
          district,
          city,
          state,
          zipCode,
          complement
        },
        tx
      );
      await tx.orderItem.createMany({
        data: orderItems.map((item) => ({
          ...item,
          orderId: order.id
        }))
      });
      await Promise.all(
        orderItems.map(async (item, index) => {
          const product = products[index];
          const stockValue = product.stock === null || product.stock === void 0 ? null : Number(product.stock);
          if (!Number.isInteger(stockValue) || stockValue < 0) {
            return;
          }
          const nextStock = Math.max(
            stockValue - Number(item.quantity || 0),
            0
          );
          await tx.product.update({
            where: {
              id: Number(product.id)
            },
            data: {
              stock: nextStock,
              active: nextStock === 0 ? false : Boolean(product.active)
            }
          });
        })
      );
      return OrderRepository_default.findById(order.id, resolvedRestaurantId, tx);
    });
    const isUnpaidDelivery = type === OrderType3.DELIVERY && shouldPayOnDelivery !== true && shouldMarkAsPaid !== true;
    const isUnpaidDigitalPayment = shouldMarkAsPaid !== true && shouldPayOnDelivery !== true && (normalizedPaymentMethod === PaymentMethod3.PIX || normalizedPaymentMethod === PaymentMethod3.CARTAO);
    const shouldDeferRealtimeUntilPaid = deferRealtimeUntilPaid === true || isUnpaidDelivery || isUnpaidDigitalPayment;
    if (!shouldDeferRealtimeUntilPaid) {
      io.to(`restaurant:${createdOrder.restaurantId}`).emit(
        "new-order",
        createdOrder
      );
      io.to(`user:${createdOrder.userId}`).emit("new-order", createdOrder);
    }
    if (shouldMarkAsPaid) {
      io.to(`restaurant:${createdOrder.restaurantId}`).emit(
        "order:payment-confirmed",
        {
          orderId: createdOrder.id,
          paymentMethod: normalizedPaymentMethod,
          paid: true,
          status: createdOrder.status
        }
      );
      io.to(`user:${createdOrder.userId}`).emit("payment-confirmed", {
        orderId: createdOrder.id,
        paymentMethod: normalizedPaymentMethod,
        paid: true,
        status: createdOrder.status
      });
      notifyCustomerPaymentConfirmed({
        customerPhone: createdOrder?.user?.phone || customerPhone,
        customerName: createdOrder?.user?.name || customerName,
        restaurantName: createdOrder?.restaurant?.name,
        restaurantWhatsapp: createdOrder?.restaurant?.whatsapp,
        orderId: createdOrder?.id,
        total: createdOrder?.total,
        paymentMethod: normalizedPaymentMethod
      }).catch((error2) => {
        console.error(
          "[CUSTOMER_NOTIFICATION_UNHANDLED]",
          error2 instanceof Error ? error2.message : String(error2)
        );
      });
    }
    return createdOrder;
  }
};
var CreateOrderService_default = new CreateOrderService();

// src/modules/orders/controllers/CreateOrderController.ts
var CreateOrderController = class {
  async handle(req, res) {
    try {
      const {
        restaurantId,
        type,
        paymentMethod,
        payOnDelivery,
        payOnDeliveryMethod,
        paid,
        pixPaymentId,
        observation,
        customerName,
        customerCpf,
        customerPhone,
        tableId,
        items,
        address,
        number,
        district,
        city,
        state,
        zipCode,
        complement
      } = req.body;
      const userId = req.user?.id ?? null;
      const userRestaurantId = req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null;
      if (payOnDelivery === true && String(payOnDeliveryMethod || paymentMethod || "").toUpperCase() === "DINHEIRO" && String(req.user?.role || "").toUpperCase() !== "ADMIN") {
        throw new Error(
          "Pagamento em dinheiro \xE9 registrado somente pelo administrador."
        );
      }
      const order = await CreateOrderService_default.execute({
        userId,
        restaurantId,
        userRestaurantId,
        tableSessionId: req.tableSession?.id ?? null,
        tableSessionTableId: req.tableSession?.tableId ?? null,
        type,
        paymentMethod,
        payOnDelivery,
        payOnDeliveryMethod,
        paid,
        pixPaymentId,
        observation,
        customerName,
        customerCpf,
        customerPhone,
        tableId,
        items,
        address,
        number,
        district,
        city,
        state,
        zipCode,
        complement
      });
      return res.status(201).json(order);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao criar pedido"
      });
    }
  }
};
var CreateOrderController_default = new CreateOrderController();

// src/modules/orders/state/orderStateMachine.ts
import { OrderStatus as OrderStatus2 } from "@prisma/client";
var transitions = {
  [OrderStatus2.PENDENTE]: [OrderStatus2.PREPARANDO, OrderStatus2.CANCELADO],
  [OrderStatus2.PREPARANDO]: [OrderStatus2.PRONTO],
  [OrderStatus2.PRONTO]: [OrderStatus2.SAIU_PARA_ENTREGA, OrderStatus2.ENTREGUE],
  [OrderStatus2.SAIU_PARA_ENTREGA]: [OrderStatus2.ENTREGUE],
  [OrderStatus2.ENTREGUE]: [],
  [OrderStatus2.CANCELADO]: []
};
function canTransition(from, to) {
  const allowed = transitions[from] || [];
  return allowed.includes(to);
}
var OrderStateMachine = {
  transitions,
  canTransition
};

// src/modules/orders/permissions/orderPermissions.ts
import { OrderStatus as OrderStatus3, UserRole as UserRole5 } from "@prisma/client";
var permissions = {
  [UserRole5.ADMIN]: [
    OrderStatus3.PENDENTE,
    OrderStatus3.PREPARANDO,
    OrderStatus3.PRONTO,
    OrderStatus3.SAIU_PARA_ENTREGA,
    OrderStatus3.ENTREGUE,
    OrderStatus3.CANCELADO
  ],
  [UserRole5.FUNCIONARIO]: [
    OrderStatus3.PREPARANDO,
    OrderStatus3.PRONTO,
    OrderStatus3.SAIU_PARA_ENTREGA,
    OrderStatus3.ENTREGUE
  ],
  [UserRole5.MOTOQUEIRO]: [OrderStatus3.ENTREGUE],
  [UserRole5.CLIENTE]: [OrderStatus3.CANCELADO]
};
function canUserChangeStatus(role, status) {
  const allowed = permissions[role] || [];
  return allowed.includes(status);
}
var OrderPermissions = {
  permissions,
  canUserChangeStatus
};

// src/modules/orders/services/UpdateOrderStatusService.ts
import {
  OrderStatus as OrderStatus4,
  OrderType as OrderType4,
  PaymentMethod as PaymentMethod4,
  UserRole as UserRole6
} from "@prisma/client";

// src/modules/orders/services/restoreOrderItemsStock.ts
async function restoreOrderItemsStock(tx, order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  for (const item of items) {
    const productId = Number(item?.productId || 0);
    const quantity = Number(item?.quantity || 0);
    if (!Number.isInteger(productId) || productId <= 0) {
      continue;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      continue;
    }
    const product = await tx.product.findFirst({
      where: {
        id: productId,
        restaurantId: Number(order.restaurantId)
      },
      select: {
        id: true,
        stock: true
      }
    });
    if (!product) {
      continue;
    }
    const stockValue = product.stock === null || product.stock === void 0 ? null : Number(product.stock);
    if (!Number.isInteger(stockValue) || stockValue < 0) {
      continue;
    }
    await tx.product.update({
      where: {
        id: product.id
      },
      data: {
        stock: stockValue + quantity,
        active: true
      }
    });
  }
}

// src/modules/orders/services/UpdateOrderStatusService.ts
var UpdateOrderStatusService = class {
  PAY_ON_DELIVERY_MARKER = "PAY_ON_DELIVERY:";
  hasLegacyPayOnDeliveryMarker(observation) {
    return String(observation || "").toUpperCase().includes(this.PAY_ON_DELIVERY_MARKER);
  }
  async execute(orderId, restaurantId, status, role, deliveryConfirmationCode, actorUserId) {
    const order = await OrderRepository_default.findById(orderId, restaurantId);
    if (!order) {
      throw new Error("Pedido n\xE3o encontrado!");
    }
    const currentStatus = order.status;
    const canChange = OrderStateMachine.canTransition(currentStatus, status);
    if (!canChange) {
      throw new Error(`Transi\xE7\xE3o inv\xE1lida: ${currentStatus} \u2192 ${status} `);
    }
    const normalizedRole = String(role || "").toUpperCase();
    const canUserChange = OrderPermissions.canUserChangeStatus(
      normalizedRole,
      status
    );
    if (!canUserChange) {
      throw new Error("Usu\xE1rio n\xE3o tem permiss\xE3o para isso!");
    }
    if (normalizedRole === UserRole6.MOTOQUEIRO) {
      if (order.type !== OrderType4.DELIVERY) {
        throw new Error("Motoqueiros s\xF3 podem atualizar pedidos de entrega.");
      }
      if (order.assignedCourierId !== Number(actorUserId || 0)) {
        throw new Error("Esta entrega n\xE3o est\xE1 atribu\xEDda a voc\xEA.");
      }
    }
    if (status === OrderStatus4.ENTREGUE && normalizedRole === UserRole6.MOTOQUEIRO && order.type === OrderType4.DELIVERY) {
      const customerPhoneDigits = String(order?.user?.phone || "").replace(
        /\D/g,
        ""
      );
      const expectedCode = customerPhoneDigits.slice(-4);
      const providedCode = String(deliveryConfirmationCode || "").replace(
        /\D/g,
        ""
      );
      if (!customerPhoneDigits || customerPhoneDigits.length < 4) {
        throw new Error(
          "N\xE3o \xE9 poss\xEDvel confirmar a entrega: cliente sem telefone v\xE1lido cadastrado."
        );
      }
      if (!/^\d{4}$/.test(providedCode)) {
        throw new Error(
          "Informe os 4 \xFAltimos d\xEDgitos do celular do cliente para concluir a entrega."
        );
      }
      if (providedCode !== expectedCode) {
        throw new Error("C\xF3digo de confirma\xE7\xE3o inv\xE1lido para esta entrega.");
      }
    }
    const digitalMethods = [
      PaymentMethod4.PIX,
      PaymentMethod4.CARTAO
    ];
    const isPayOnDelivery = order.payOnDelivery === true || this.hasLegacyPayOnDeliveryMarker(order?.observation);
    const isDigitalPayment = !!order.paymentMethod && digitalMethods.includes(order.paymentMethod);
    const isUnpaidDigitalDeliveryBlocked = order.type === OrderType4.DELIVERY && isDigitalPayment && !isPayOnDelivery && order.paid !== true;
    if (isUnpaidDigitalDeliveryBlocked && status !== OrderStatus4.PENDENTE && status !== OrderStatus4.CANCELADO) {
      throw new Error(
        "Pedido delivery com pagamento digital pendente deve permanecer em PENDENTE at\xE9 a confirma\xE7\xE3o do pagamento."
      );
    }
    if (status === OrderStatus4.ENTREGUE && isDigitalPayment && !isPayOnDelivery && order.paid !== true) {
      throw new Error(
        "N\xE3o \xE9 poss\xEDvel marcar como entregue: o pagamento ainda n\xE3o foi confirmado."
      );
    }
    let updatedOrder;
    if (status === OrderStatus4.CANCELADO) {
      updatedOrder = await prisma_default.$transaction(async (tx) => {
        await restoreOrderItemsStock(tx, order);
        return OrderRepository_default.updateStatus(orderId, status, restaurantId, tx);
      });
    } else {
      updatedOrder = await OrderRepository_default.updateStatus(
        orderId,
        status,
        restaurantId
      );
    }
    if (status === OrderStatus4.ENTREGUE && updatedOrder) {
      updatedOrder = await prisma_default.order.update({
        where: { id: updatedOrder.id },
        data: { deliveredAt: /* @__PURE__ */ new Date() },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          restaurant: {
            select: { id: true, name: true, whatsapp: true }
          },
          table: true,
          items: { include: { product: true } }
        }
      });
    }
    if (status === OrderStatus4.ENTREGUE && (order.paymentMethod === PaymentMethod4.DINHEIRO || isPayOnDelivery) && updatedOrder?.paid !== true) {
      updatedOrder = await OrderRepository_default.confirmPayment(
        orderId,
        restaurantId
      );
      io.to(`restaurant:${restaurantId}`).emit("order:payment-confirmed", {
        orderId: updatedOrder.id,
        paid: true,
        paymentMethod: updatedOrder.paymentMethod
      });
      io.to(`user:${updatedOrder.userId}`).emit("order:payment-confirmed", {
        orderId: updatedOrder.id,
        paid: true,
        paymentMethod: updatedOrder.paymentMethod
      });
    }
    notifyCustomerOrderStatusChanged({
      customerPhone: order?.user?.phone,
      customerName: order?.user?.name,
      restaurantName: order?.restaurant?.name,
      restaurantWhatsapp: order?.restaurant?.whatsapp,
      orderId: updatedOrder?.id,
      status: updatedOrder?.status
    }).catch((error2) => {
      console.error(
        "[CUSTOMER_STATUS_NOTIFICATION_UNHANDLED]",
        error2 instanceof Error ? error2.message : String(error2)
      );
    });
    io.to(`restaurant:${restaurantId}`).emit(
      "order:status-changed",
      updatedOrder
    );
    io.to(`user:${updatedOrder.userId}`).emit(
      "order:status-changed",
      updatedOrder
    );
    return updatedOrder;
  }
};
var UpdateOrderStatusService_default = new UpdateOrderStatusService();

// src/modules/orders/controllers/UpdateOrderStatusController.ts
var UpdateOrderStatusController = class {
  async handle(req, res) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { status, deliveryConfirmationCode } = req.body;
      const normalizedStatus = String(
        status || ""
      ).toUpperCase();
      const { restaurantId, role } = req.user;
      const updatedOrder = await UpdateOrderStatusService_default.execute(
        id,
        restaurantId,
        normalizedStatus,
        role,
        deliveryConfirmationCode,
        req.user.id
      );
      return res.status(200).json(updatedOrder);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao atualizar status do pedido"
      });
    }
  }
};
var UpdateOrderStatusController_default = new UpdateOrderStatusController();

// src/modules/orders/services/ClaimOrderForDeliveryService.ts
import { OrderStatus as OrderStatus5, OrderType as OrderType5, UserRole as UserRole7 } from "@prisma/client";
var ClaimOrderForDeliveryService = class {
  async execute({
    orderId,
    restaurantId,
    courierId,
    role
  }) {
    const normalizedOrderId = Number(orderId);
    if (String(role || "").toUpperCase() !== UserRole7.MOTOQUEIRO) {
      throw new Error("Somente motoqueiros podem retirar pedidos para entrega.");
    }
    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error("Pedido inv\xE1lido.");
    }
    const updatedOrder = await prisma_default.$transaction(async (tx) => {
      const settings = await tx.restaurantSettings.findUnique({
        where: { restaurantId },
        select: { courierFeePerDelivery: true }
      });
      const courierEarning = settings?.courierFeePerDelivery || 0;
      const claimed = await tx.order.updateMany({
        where: {
          id: normalizedOrderId,
          restaurantId,
          type: OrderType5.DELIVERY,
          status: OrderStatus5.PRONTO,
          assignedCourierId: null,
          NOT: {
            paid: false,
            paymentMethod: { in: ["PIX", "CARTAO"] },
            payOnDelivery: false
          }
        },
        data: {
          assignedCourierId: courierId,
          deliveryStartedAt: /* @__PURE__ */ new Date(),
          courierEarning,
          status: OrderStatus5.SAIU_PARA_ENTREGA
        }
      });
      if (claimed.count !== 1) {
        const current = await tx.order.findFirst({
          where: { id: normalizedOrderId, restaurantId },
          select: { type: true, status: true, assignedCourierId: true }
        });
        if (!current) throw new Error("Pedido n\xE3o encontrado.");
        if (current.type !== OrderType5.DELIVERY)
          throw new Error("Este pedido n\xE3o \xE9 uma entrega.");
        if (current.assignedCourierId)
          throw new Error("Este pedido j\xE1 foi retirado por outro motoqueiro.");
        throw new Error("O pedido n\xE3o est\xE1 dispon\xEDvel para retirada.");
      }
      return OrderRepository_default.findById(normalizedOrderId, restaurantId, tx);
    });
    if (!updatedOrder) throw new Error("N\xE3o foi poss\xEDvel carregar o pedido.");
    notifyCustomerOrderStatusChanged({
      customerPhone: updatedOrder.user?.phone,
      customerName: updatedOrder.user?.name,
      restaurantName: updatedOrder.restaurant?.name,
      restaurantWhatsapp: updatedOrder.restaurant?.whatsapp,
      orderId: updatedOrder.id,
      status: updatedOrder.status
    }).catch((error2) => {
      console.error(
        "[CUSTOMER_STATUS_NOTIFICATION_UNHANDLED]",
        error2 instanceof Error ? error2.message : String(error2)
      );
    });
    io.to(`restaurant:${restaurantId}`).emit("order:status-changed", updatedOrder);
    io.to(`user:${updatedOrder.userId}`).emit("order:status-changed", updatedOrder);
    return updatedOrder;
  }
};
var ClaimOrderForDeliveryService_default = new ClaimOrderForDeliveryService();

// src/modules/orders/controllers/ClaimOrderForDeliveryController.ts
var ClaimOrderForDeliveryController = class {
  async handle(req, res) {
    try {
      const order = await ClaimOrderForDeliveryService_default.execute({
        orderId: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
        restaurantId: Number(req.user.restaurantId || 0),
        courierId: Number(req.user.id || 0),
        role: req.user.role
      });
      return res.status(200).json(order);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao retirar pedido"
      });
    }
  }
};
var ClaimOrderForDeliveryController_default = new ClaimOrderForDeliveryController();

// src/modules/orders/services/GetCourierFinanceService.ts
import { OrderStatus as OrderStatus6, UserRole as UserRole8 } from "@prisma/client";
function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
var GetCourierFinanceService = class {
  async execute({ courierId, restaurantId, role }) {
    if (String(role || "").toUpperCase() !== UserRole8.MOTOQUEIRO) {
      throw new Error("Financeiro dispon\xEDvel somente para motoqueiros.");
    }
    const now = /* @__PURE__ */ new Date();
    const today = startOfDay(now);
    const week = new Date(today);
    week.setDate(today.getDate() - (today.getDay() + 6) % 7);
    const month = new Date(today.getFullYear(), today.getMonth(), 1);
    const baseWhere = {
      assignedCourierId: courierId,
      restaurantId,
      status: OrderStatus6.ENTREGUE
    };
    const [todayData, weekData, monthData, pendingData, deliveries] = await Promise.all([
      prisma_default.order.aggregate({ where: { ...baseWhere, deliveredAt: { gte: today } }, _sum: { courierEarning: true }, _count: true }),
      prisma_default.order.aggregate({ where: { ...baseWhere, deliveredAt: { gte: week } }, _sum: { courierEarning: true }, _count: true }),
      prisma_default.order.aggregate({ where: { ...baseWhere, deliveredAt: { gte: month } }, _sum: { courierEarning: true }, _count: true }),
      prisma_default.order.aggregate({ where: { ...baseWhere, courierPaidAt: null }, _sum: { courierEarning: true }, _count: true }),
      prisma_default.order.findMany({
        where: baseWhere,
        select: { id: true, courierEarning: true, courierPaidAt: true, deliveredAt: true, deliveryStartedAt: true, city: true, district: true },
        orderBy: { deliveredAt: "desc" },
        take: 100
      })
    ]);
    const format = (entry) => ({ amount: Number(entry._sum.courierEarning || 0), deliveries: entry._count });
    return {
      today: format(todayData),
      week: format(weekData),
      month: format(monthData),
      pending: format(pendingData),
      deliveries: deliveries.map((order) => ({ ...order, courierEarning: Number(order.courierEarning || 0) }))
    };
  }
};
var GetCourierFinanceService_default = new GetCourierFinanceService();

// src/modules/orders/controllers/GetCourierFinanceController.ts
var GetCourierFinanceController = class {
  async handle(req, res) {
    try {
      const result = await GetCourierFinanceService_default.execute({
        courierId: Number(req.user.id || 0),
        restaurantId: Number(req.user.restaurantId || 0),
        role: req.user.role
      });
      return res.json(result);
    } catch (error2) {
      return res.status(403).json({ error: error2 instanceof Error ? error2.message : "Erro ao consultar financeiro" });
    }
  }
};
var GetCourierFinanceController_default = new GetCourierFinanceController();

// src/modules/orders/services/GetDeliveryTrackingService.ts
import { UserRole as UserRole9 } from "@prisma/client";
var GetDeliveryTrackingService = class {
  async execute({ orderId, userId, restaurantId, role }) {
    const id = Number(orderId);
    const order = await prisma_default.order.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        restaurantId: true,
        assignedCourierId: true,
        status: true,
        type: true,
        address: true,
        number: true,
        district: true,
        city: true,
        state: true,
        deliveryStartedAt: true,
        deliveredAt: true,
        assignedCourier: { select: { id: true, name: true, phone: true, avatar: true } }
      }
    });
    if (!order) throw new Error("Pedido n\xE3o encontrado.");
    const normalizedRole = String(role || "").toUpperCase();
    const allowed = order.userId === userId || normalizedRole === UserRole9.MOTOQUEIRO && order.assignedCourierId === userId || normalizedRole === UserRole9.ADMIN && order.restaurantId === restaurantId;
    if (!allowed) throw new Error("Voc\xEA n\xE3o pode acompanhar esta entrega.");
    const locations = await prisma_default.deliveryLocation.findMany({
      where: { orderId: id },
      orderBy: { recordedAt: "desc" },
      take: 1e3,
      select: { latitude: true, longitude: true, heading: true, speed: true, accuracy: true, recordedAt: true }
    });
    locations.reverse();
    return {
      order,
      locations: locations.map((point) => ({ ...point, latitude: Number(point.latitude), longitude: Number(point.longitude) })),
      latestLocation: locations.length ? { ...locations[locations.length - 1], latitude: Number(locations[locations.length - 1].latitude), longitude: Number(locations[locations.length - 1].longitude) } : null
    };
  }
};
var GetDeliveryTrackingService_default = new GetDeliveryTrackingService();

// src/modules/orders/controllers/GetDeliveryTrackingController.ts
var GetDeliveryTrackingController = class {
  async handle(req, res) {
    try {
      const result = await GetDeliveryTrackingService_default.execute({
        orderId: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
        userId: Number(req.user.id || 0),
        restaurantId: req.user.restaurantId,
        role: req.user.role
      });
      return res.json(result);
    } catch (error2) {
      return res.status(403).json({ error: error2 instanceof Error ? error2.message : "Erro ao consultar rastreamento" });
    }
  }
};
var GetDeliveryTrackingController_default = new GetDeliveryTrackingController();

// src/modules/orders/services/ListOrdersService.ts
import { UserRole as UserRole10 } from "@prisma/client";
var ListOrdersService = class {
  async execute(restaurantId, status, role, userId) {
    if (String(role || "").toUpperCase() === UserRole10.MOTOQUEIRO) {
      const courierId = Number(userId || 0);
      if (!Number.isInteger(courierId) || courierId <= 0) {
        throw new Error("Motoqueiro inv\xE1lido.");
      }
      return OrderRepository_default.findCourierOrders(restaurantId, courierId, status);
    }
    return OrderRepository_default.findAll(restaurantId, status);
  }
};
var ListOrdersService_default = new ListOrdersService();

// src/modules/orders/controllers/ListOrdersController.ts
var ListOrdersController = class {
  async handle(req, res) {
    try {
      const status = Array.isArray(req.query.status) ? req.query.status[0] : req.query.status;
      const normalizedStatus = status ? String(status).toUpperCase() : void 0;
      const restaurantId = req.user.restaurantId;
      const orders = await ListOrdersService_default.execute(
        restaurantId,
        normalizedStatus,
        req.user.role,
        req.user.id
      );
      return res.json(orders);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao listar pedidos"
      });
    }
  }
};
var ListOrdersController_default = new ListOrdersController();

// src/modules/orders/services/GetOrderByIdService.ts
var GetOrderByIdService = class {
  async execute(orderId, restaurantId) {
    const order = await OrderRepository_default.findById(orderId, restaurantId);
    if (!order) {
      throw new Error("Pedido n\xE3o encontrado!");
    }
    return order;
  }
};
var GetOrderByIdService_default = new GetOrderByIdService();

// src/modules/orders/controllers/GetOrderByIdController.ts
var GetOrderByIdController = class {
  async handle(req, res) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const restaurantId = req.user.restaurantId;
      const order = await GetOrderByIdService_default.execute(id, restaurantId);
      return res.json(order);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao buscar pedido"
      });
    }
  }
};
var GetOrderByIdController_default = new GetOrderByIdController();

// src/modules/orders/services/ListMyOrdersService.ts
var ListMyOrdersService = class {
  async execute(userId, restaurantId) {
    return OrderRepository_default.findByUserId(userId, restaurantId);
  }
};
var ListMyOrdersService_default = new ListMyOrdersService();

// src/modules/orders/controllers/ListMyOrdersController.ts
var ListMyOrdersController = class {
  async handle(req, res) {
    try {
      const { id: userId, restaurantId } = req.user;
      const orders = await ListMyOrdersService_default.execute(userId, restaurantId);
      return res.json(orders);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao listar pedidos do usuario"
      });
    }
  }
};
var ListMyOrdersController_default = new ListMyOrdersController();

// src/modules/orders/services/CancelOrderService.ts
import { OrderStatus as OrderStatus8, PaymentMethod as PaymentMethod6 } from "@prisma/client";

// src/modules/orders/services/RefundOrderPaymentService.ts
import Stripe from "stripe";
import { PaymentMethod as PaymentMethod5 } from "@prisma/client";

// src/modules/payments/providers/mercadoPagoClient.ts
import { MercadoPagoConfig as MercadoPagoConfig2, Payment as Payment2, Preference } from "mercadopago";
async function getAccessToken(restaurantId) {
  const normalizedRestaurantId = Number(restaurantId || 0);
  const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
  const settings = Number.isInteger(normalizedRestaurantId) && normalizedRestaurantId > 0 ? await RestaurantSettingsRepository_default.findByRestaurantId(
    normalizedRestaurantId
  ) : null;
  const settingsToken = String(settings?.mercadoPagoAccessToken || "").trim();
  const globalToken = String(process.env.MP_ACCESS_TOKEN || "").trim();
  const token = settingsToken || (allowGlobalFallback ? globalToken : "");
  if (!token) {
    throw new Error(
      "Pagamento Mercado Pago indisponivel. Configure access token do Mercado Pago nas configuracoes do restaurante."
    );
  }
  return token;
}
async function getMercadoPagoClient(restaurantId) {
  return new MercadoPagoConfig2({
    accessToken: await getAccessToken(restaurantId)
  });
}
async function getMercadoPagoPaymentApi(restaurantId) {
  return new Payment2(await getMercadoPagoClient(restaurantId));
}
async function getMercadoPagoPreferenceApi(restaurantId) {
  return new Preference(await getMercadoPagoClient(restaurantId));
}

// src/modules/orders/services/RefundOrderPaymentService.ts
var RefundOrderPaymentService = class {
  resolvePagBankEnvironment() {
    return "production";
  }
  resolvePagBankApiBaseUrl(environment2) {
    void environment2;
    return "https://ws.pagseguro.uol.com.br";
  }
  extractXmlTagValue(xml, tag) {
    const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, "i");
    const match = regex.exec(String(xml || ""));
    return String(match?.[1] || "").trim();
  }
  parsePagBankErrorDetails(xml) {
    const normalizedXml = String(xml || "").trim();
    if (!normalizedXml) {
      return {
        code: "",
        message: ""
      };
    }
    const errorBlockMatch = /<error>([\s\S]*?)<\/error>/i.exec(normalizedXml);
    const errorScope = errorBlockMatch?.[1] || normalizedXml;
    const code = this.extractXmlTagValue(errorScope, "code") || this.extractXmlTagValue(normalizedXml, "code");
    const message = this.extractXmlTagValue(errorScope, "message") || this.extractXmlTagValue(normalizedXml, "message") || this.extractXmlTagValue(errorScope, "error") || this.extractXmlTagValue(normalizedXml, "error");
    return {
      code,
      message
    };
  }
  async getPagBankCredentials(restaurantId) {
    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
    const settings = restaurantId ? await RestaurantSettingsRepository_default.findByRestaurantId(restaurantId) : null;
    const email = String(
      settings?.pagbankEmail || (allowGlobalFallback ? process.env.PAGBANK_EMAIL || process.env.PAGSEGURO_EMAIL : "") || ""
    ).trim();
    const token = String(
      settings?.pagbankToken || (allowGlobalFallback ? process.env.PAGBANK_TOKEN || process.env.PAGSEGURO_TOKEN : "") || ""
    ).trim();
    if (!email || !token) {
      throw new Error(
        "Credenciais PagBank nao configuradas. Nao foi possivel estornar automaticamente."
      );
    }
    return {
      email,
      token,
      environment: this.resolvePagBankEnvironment()
    };
  }
  parseAmount(value) {
    const amount = Number(value || 0);
    return Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : void 0;
  }
  async getMercadoPagoAccessTokenByRestaurant(restaurantId) {
    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
    const normalizedRestaurantId = Number(restaurantId || 0);
    const settings = Number.isInteger(normalizedRestaurantId) && normalizedRestaurantId > 0 ? await RestaurantSettingsRepository_default.findByRestaurantId(
      normalizedRestaurantId
    ) : null;
    const token = String(
      settings?.mercadoPagoAccessToken || (allowGlobalFallback ? process.env.MP_ACCESS_TOKEN : "") || ""
    ).trim();
    if (!token) {
      throw new Error(
        "Credencial Mercado Pago nao configurada no restaurante. Nao foi possivel estornar automaticamente."
      );
    }
    return token;
  }
  async executeMercadoPagoRefund(paymentId, amount, restaurantId) {
    const paymentApi = await getMercadoPagoPaymentApi(
      Number(restaurantId || 0) || void 0
    );
    if (typeof paymentApi.refund === "function") {
      if (amount) {
        await paymentApi.refund({ id: paymentId, amount });
        return;
      }
      await paymentApi.refund({ id: paymentId });
      return;
    }
    if (typeof paymentApi.createRefund === "function") {
      if (amount) {
        await paymentApi.createRefund({ id: paymentId, amount });
        return;
      }
      await paymentApi.createRefund({ id: paymentId });
      return;
    }
    throw new Error(
      "SDK do Mercado Pago sem suporte de estorno configurado no servidor."
    );
  }
  async refundPix(order) {
    const paymentId = String(order.pixPaymentId || "").trim();
    if (!paymentId) {
      throw new Error(
        "Pedido PIX sem identificador de pagamento. Nao foi possivel estornar automaticamente."
      );
    }
    if (paymentId.startsWith("manual:")) {
      throw new Error(
        "Pedido PIX manual exige estorno manual. Nao foi possivel estornar automaticamente."
      );
    }
    const amount = this.parseAmount(order.total);
    await this.executeMercadoPagoRefund(paymentId, amount, order.restaurantId);
  }
  async refundStripeCard(order) {
    const rawSessionId = String(order.cardCheckoutSessionId || "").trim();
    const stripeSessionId = rawSessionId;
    if (!stripeSessionId || !stripeSessionId.startsWith("cs_")) {
      throw new Error(
        "Pedido de cartao sem sessao Stripe valida para estorno automatico."
      );
    }
    const restaurantId = Number(order.restaurantId || 0) || void 0;
    const settings = restaurantId ? await RestaurantSettingsRepository_default.findByRestaurantId(restaurantId) : null;
    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
    const secretKey = String(
      settings?.stripeSecretKey || (allowGlobalFallback ? process.env.STRIPE_SECRET_KEY : "") || ""
    ).trim();
    if (!secretKey) {
      throw new Error(
        "Chave Stripe nao configurada no restaurante. Nao foi possivel estornar automaticamente."
      );
    }
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(stripeSessionId, {
      expand: ["payment_intent"]
    });
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (!paymentIntentId) {
      throw new Error(
        "Checkout Stripe sem payment_intent para estorno automatico."
      );
    }
    await stripe.refunds.create({
      payment_intent: paymentIntentId
    });
  }
  async refundPagBankByTransaction(transactionCode, order) {
    const normalizedTransactionCode = String(transactionCode || "").trim();
    if (!normalizedTransactionCode) {
      throw new Error(
        "Codigo de transacao PagBank invalido para estorno automatico."
      );
    }
    const restaurantId = Number(order.restaurantId || 0) || void 0;
    const { email, token, environment: environment2 } = await this.getPagBankCredentials(restaurantId);
    const amount = this.parseAmount(order.total);
    const params = new URLSearchParams();
    params.set("email", email);
    params.set("token", token);
    params.set("transactionCode", normalizedTransactionCode);
    if (amount) {
      params.set("refundValue", amount.toFixed(2));
    }
    const url = `${this.resolvePagBankApiBaseUrl(environment2)}/v2/transactions/cancels`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      body: params.toString()
    });
    const responseText = await response.text().catch(() => "");
    const parsedError = this.parsePagBankErrorDetails(responseText);
    if (!response.ok) {
      const fallbackSnippet = String(responseText || "").replace(/\s+/g, " ").trim().slice(0, 220);
      const providerMessage = parsedError.message || (fallbackSnippet ? `Falha ao estornar no PagBank. Resposta: ${fallbackSnippet}` : "Falha ao estornar no PagBank.");
      const detailsSuffix = parsedError.code ? ` (code ${parsedError.code})` : "";
      throw new Error(
        `PagBank refund [HTTP ${response.status}]: ${providerMessage}${detailsSuffix}`
      );
    }
    if (parsedError.code && parsedError.message) {
      throw new Error(
        `PagBank refund [HTTP ${response.status}]: ${parsedError.message} (code ${parsedError.code})`
      );
    }
  }
  async refundCard(order) {
    const checkoutSessionId = String(order.cardCheckoutSessionId || "").trim();
    const amount = this.parseAmount(order.total);
    if (!checkoutSessionId) {
      throw new Error(
        "Pedido CARTAO sem identificador de checkout. Nao foi possivel estornar automaticamente."
      );
    }
    if (checkoutSessionId.startsWith("mp_pay:")) {
      const paymentId = checkoutSessionId.replace(/^mp_pay:/i, "").trim();
      if (!paymentId) {
        throw new Error(
          "Pedido CARTAO com id de pagamento Mercado Pago invalido para estorno."
        );
      }
      await this.executeMercadoPagoRefund(
        paymentId,
        amount,
        order.restaurantId
      );
      return;
    }
    if (checkoutSessionId.startsWith("mp_pref:")) {
      const preferenceId = checkoutSessionId.replace(/^mp_pref:/i, "").trim();
      const orderId = Number(order.id || 0);
      const restaurantId = Number(order.restaurantId || 0);
      if (!preferenceId || !Number.isInteger(orderId) || orderId <= 0) {
        throw new Error(
          "Pedido CARTAO Mercado Pago sem dados suficientes para localizar pagamento e estornar automaticamente."
        );
      }
      const externalReference = Number.isInteger(restaurantId) && restaurantId > 0 ? `ordercard:${orderId}:${restaurantId}` : `ordercard:${orderId}`;
      const searchUrl = new URL(
        "https://api.mercadopago.com/v1/payments/search"
      );
      searchUrl.searchParams.set("external_reference", externalReference);
      searchUrl.searchParams.set("sort", "date_created");
      searchUrl.searchParams.set("criteria", "desc");
      searchUrl.searchParams.set("limit", "1");
      const response = await fetch(searchUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${await this.getMercadoPagoAccessTokenByRestaurant(order.restaurantId)}`,
          "Content-Type": "application/json"
        }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          "Falha ao consultar pagamento de cartao no Mercado Pago para estorno automatico."
        );
      }
      const resolvedPaymentId = String(payload?.results?.[0]?.id || "").trim();
      if (!resolvedPaymentId) {
        throw new Error(
          "Nao foi possivel localizar o pagamento de cartao no Mercado Pago para estorno automatico."
        );
      }
      await this.executeMercadoPagoRefund(
        resolvedPaymentId,
        amount,
        order.restaurantId
      );
      return;
    }
    if (checkoutSessionId.startsWith("pagbank_chk:")) {
      throw new Error(
        "Pedido PagBank ainda sem codigo de transacao confirmado para estorno automatico. Faca o estorno manual antes de cancelar."
      );
    }
    if (checkoutSessionId.startsWith("pagbank_tx:")) {
      const transactionCode = checkoutSessionId.replace(/^pagbank_tx:/i, "").trim();
      await this.refundPagBankByTransaction(transactionCode, order);
      return;
    }
    await this.refundStripeCard(order);
  }
  async execute(order) {
    const paymentMethod = String(order.paymentMethod || "").toUpperCase();
    if (order.paid !== true) {
      return;
    }
    if (paymentMethod === PaymentMethod5.PIX) {
      await this.refundPix(order);
      return;
    }
    if (paymentMethod === PaymentMethod5.CARTAO) {
      await this.refundCard(order);
    }
  }
};
var RefundOrderPaymentService_default = new RefundOrderPaymentService();

// src/modules/orders/services/CancelOrderService.ts
var CancelOrderService = class {
  async execute(orderId, userId, restaurantId) {
    const normalizedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;
    const order = await OrderRepository_default.findById(
      normalizedOrderId,
      restaurantId
    );
    if (!order) {
      throw new Error("Pedido n\xE3o encontrado!");
    }
    if (order.userId !== userId) {
      throw new Error("Sem permiss\xE3o!");
    }
    const canCancel = OrderStateMachine.canTransition(
      order.status,
      OrderStatus8.CANCELADO
    );
    if (!canCancel) {
      throw new Error("Pedido n\xE3o pode ser cancelado!");
    }
    const isPaidDigitalOrder = order.paid === true && (order.paymentMethod === PaymentMethod6.PIX || order.paymentMethod === PaymentMethod6.CARTAO);
    if (isPaidDigitalOrder) {
      await RefundOrderPaymentService_default.execute(order);
    }
    const updatedOrder = await prisma_default.$transaction(async (tx) => {
      await restoreOrderItemsStock(tx, order);
      return OrderRepository_default.updateStatus(
        normalizedOrderId,
        OrderStatus8.CANCELADO,
        restaurantId,
        tx
      );
    });
    notifyCustomerOrderStatusChanged({
      customerPhone: order?.user?.phone,
      customerName: order?.user?.name,
      restaurantName: order?.restaurant?.name,
      restaurantWhatsapp: order?.restaurant?.whatsapp,
      orderId: updatedOrder?.id,
      status: updatedOrder?.status
    }).catch((error2) => {
      console.error(
        "[CUSTOMER_STATUS_NOTIFICATION_UNHANDLED]",
        error2?.message || error2
      );
    });
    io.to(`restaurant:${restaurantId}`).emit(
      "order:status-changed",
      updatedOrder
    );
    io.to(`user:${updatedOrder.userId}`).emit(
      "order:status-changed",
      updatedOrder
    );
    return updatedOrder;
  }
};
var CancelOrderService_default = new CancelOrderService();

// src/modules/orders/controllers/CancelOrderController.ts
var CancelOrderController = class {
  async handle(req, res) {
    try {
      const { id } = req.params;
      const { id: userId, restaurantId } = req.user;
      const order = await CancelOrderService_default.execute(id, userId, restaurantId);
      return res.json(order);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao cancelar pedido"
      });
    }
  }
};
var CancelOrderController_default = new CancelOrderController();

// src/modules/orders/services/ConfirmOrderPaymentService.ts
var ConfirmOrderPaymentService = class {
  async execute(orderId, restaurantId, role) {
    const normalizedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;
    if (String(role || "").toUpperCase() !== "ADMIN") {
      throw new Error(
        "Somente o administrador pode confirmar pagamento diretamente."
      );
    }
    const order = await OrderRepository_default.findById(
      normalizedOrderId,
      restaurantId
    );
    if (!order) {
      throw new Error("Pedido n\xE3o encontrado!");
    }
    if (order.payOnDelivery !== true || !order.paymentMethod) {
      throw new Error(
        "A confirma\xE7\xE3o manual est\xE1 dispon\xEDvel apenas para pedidos com pagamento na entrega."
      );
    }
    if (order.paid === true) {
      return order;
    }
    const updatedOrder = await OrderRepository_default.confirmPayment(
      normalizedOrderId,
      restaurantId
    );
    io.to(`restaurant:${restaurantId}`).emit("order:payment-confirmed", {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod
    });
    io.to(`user:${updatedOrder.userId}`).emit("order:payment-confirmed", {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod
    });
    io.to(`user:${updatedOrder.userId}`).emit("payment-confirmed", {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod
    });
    io.to(`restaurant:${restaurantId}`).emit("new-order", updatedOrder);
    io.to(`user:${updatedOrder.userId}`).emit("new-order", updatedOrder);
    io.to(`restaurant:${restaurantId}`).emit(
      "order:status-changed",
      updatedOrder
    );
    io.to(`user:${updatedOrder.userId}`).emit(
      "order:status-changed",
      updatedOrder
    );
    return updatedOrder;
  }
};
var ConfirmOrderPaymentService_default = new ConfirmOrderPaymentService();

// src/modules/orders/controllers/ConfirmOrderPaymentController.ts
var ConfirmOrderPaymentController = class {
  async handle(req, res) {
    try {
      const { id } = req.params;
      const { restaurantId, role } = req.user;
      const updatedOrder = await ConfirmOrderPaymentService_default.execute(
        id,
        restaurantId,
        role
      );
      return res.status(200).json(updatedOrder);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao confirmar pagamento do pedido"
      });
    }
  }
};
var ConfirmOrderPaymentController_default = new ConfirmOrderPaymentController();

// src/modules/orders/utils/paymentConfirmationPin.ts
import crypto5 from "crypto";
var HASH_PREFIX = "hmac:v1:";
function getSecret() {
  const secret = String(
    process.env.PAYMENT_PIN_SECRET || process.env.JWT_MFA_SECRET || process.env.JWT_SECRET || "development-payment-pin-secret"
  ).trim();
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error(
      "PAYMENT_PIN_SECRET deve ter pelo menos 32 caracteres em produ\xE7\xE3o."
    );
  }
  return secret;
}
function hashPaymentConfirmationPin(pin) {
  const digest = crypto5.createHmac("sha256", getSecret()).update(String(pin)).digest("hex");
  return `${HASH_PREFIX}${digest}`;
}
function verifyPaymentConfirmationPin(pin, stored) {
  const normalizedStored = String(stored || "");
  if (!normalizedStored.startsWith(HASH_PREFIX)) {
    const providedBuffer = Buffer.from(String(pin));
    const storedBuffer2 = Buffer.from(normalizedStored);
    return providedBuffer.length === storedBuffer2.length && crypto5.timingSafeEqual(providedBuffer, storedBuffer2);
  }
  const expected = hashPaymentConfirmationPin(pin);
  const expectedBuffer = Buffer.from(expected);
  const storedBuffer = Buffer.from(normalizedStored);
  return expectedBuffer.length === storedBuffer.length && crypto5.timingSafeEqual(expectedBuffer, storedBuffer);
}

// src/modules/orders/services/ConfirmOrderPaymentWithPinService.ts
var ConfirmOrderPaymentWithPinService = class {
  async execute(orderId, restaurantId, role, pin) {
    const normalizedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;
    const normalizedRole = String(role || "").toUpperCase();
    const allowedRoles = ["MOTOQUEIRO", "ADMIN"];
    if (!allowedRoles.includes(normalizedRole)) {
      throw new Error(
        "A confirma\xE7\xE3o por PIN \xE9 permitida apenas para admin ou motoqueiro na entrega."
      );
    }
    const order = await OrderRepository_default.findById(
      normalizedOrderId,
      restaurantId
    );
    if (!order) {
      throw new Error("Pedido n\xE3o encontrado!");
    }
    if (String(order.type || "").toUpperCase() !== "DELIVERY") {
      throw new Error(
        "Confirma\xE7\xE3o por PIN dispon\xEDvel apenas para pedidos DELIVERY."
      );
    }
    if (order.payOnDelivery !== true || !order.paymentMethod) {
      throw new Error(
        "Confirma\xE7\xE3o por PIN dispon\xEDvel apenas para pagamento na entrega."
      );
    }
    if (order.paid === true) {
      return order;
    }
    const normalizedPin = String(pin || "").trim();
    if (!/^\d{4}$/.test(normalizedPin)) {
      throw new Error(
        "PIN inv\xE1lido. Informe os 4 d\xEDgitos enviados por um usu\xE1rio autorizado."
      );
    }
    if (!order.paymentConfirmationPin || !order.paymentConfirmationPinExpiresAt) {
      throw new Error(
        "Este pedido n\xE3o possui PIN ativo. Solicite um novo PIN ao dono/admin."
      );
    }
    if (new Date(order.paymentConfirmationPinExpiresAt).getTime() < Date.now()) {
      throw new Error("PIN expirado. Solicite um novo PIN ao dono/admin.");
    }
    if (!verifyPaymentConfirmationPin(
      normalizedPin,
      String(order.paymentConfirmationPin)
    )) {
      throw new Error("PIN incorreto. Confira com o dono/admin.");
    }
    const updatedOrder = await OrderRepository_default.confirmPayment(
      normalizedOrderId,
      restaurantId
    );
    io.to(`restaurant:${restaurantId}`).emit("order:payment-confirmed", {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
      confirmedWithPin: true
    });
    io.to(`user:${updatedOrder.userId}`).emit("order:payment-confirmed", {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
      confirmedWithPin: true
    });
    io.to(`user:${updatedOrder.userId}`).emit("payment-confirmed", {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
      confirmedWithPin: true
    });
    io.to(`restaurant:${restaurantId}`).emit("new-order", updatedOrder);
    io.to(`user:${updatedOrder.userId}`).emit("new-order", updatedOrder);
    io.to(`restaurant:${restaurantId}`).emit(
      "order:status-changed",
      updatedOrder
    );
    io.to(`user:${updatedOrder.userId}`).emit(
      "order:status-changed",
      updatedOrder
    );
    return updatedOrder;
  }
};
var ConfirmOrderPaymentWithPinService_default = new ConfirmOrderPaymentWithPinService();

// src/modules/orders/controllers/ConfirmOrderPaymentWithPinController.ts
var ConfirmOrderPaymentWithPinController = class {
  async handle(req, res) {
    try {
      const { id } = req.params;
      const { pin } = req.body;
      const { restaurantId, role } = req.user;
      const updatedOrder = await ConfirmOrderPaymentWithPinService_default.execute(
        id,
        restaurantId,
        role,
        pin
      );
      return res.status(200).json(updatedOrder);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao confirmar pagamento com PIN"
      });
    }
  }
};
var ConfirmOrderPaymentWithPinController_default = new ConfirmOrderPaymentWithPinController();

// src/modules/orders/services/GenerateOrderPaymentConfirmationPinService.ts
import crypto6 from "crypto";
function generateFourDigitPin() {
  return String(crypto6.randomInt(1e3, 1e4));
}
var GenerateOrderPaymentConfirmationPinService = class {
  async execute(orderId, restaurantId) {
    const order = await OrderRepository_default.findById(orderId, restaurantId);
    if (!order) {
      throw new Error("Pedido n\xE3o encontrado!");
    }
    if (String(order.type || "").toUpperCase() !== "DELIVERY") {
      throw new Error(
        "PIN de confirma\xE7\xE3o dispon\xEDvel apenas para pedidos DELIVERY."
      );
    }
    if (String(order.status || "").toUpperCase() !== "SAIU_PARA_ENTREGA") {
      throw new Error(
        "PIN de confirma\xE7\xE3o dispon\xEDvel apenas quando o pedido estiver em SAIU_PARA_ENTREGA."
      );
    }
    if (order.paid === true) {
      throw new Error("Pagamento deste pedido j\xE1 est\xE1 confirmado.");
    }
    if (order.payOnDelivery !== true || !order.paymentMethod) {
      throw new Error(
        "PIN de confirma\xE7\xE3o dispon\xEDvel apenas para pagamento na entrega."
      );
    }
    const pin = generateFourDigitPin();
    const pinHash = hashPaymentConfirmationPin(pin);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
    const updatedOrder = await OrderRepository_default.setPaymentConfirmationPin(
      orderId,
      restaurantId,
      pinHash,
      expiresAt
    );
    io.to(`restaurant:${restaurantId}`).emit("order:payment-pin-generated", {
      orderId: updatedOrder.id,
      expiresAt
    });
    io.to(`restaurant:${restaurantId}:admin`).emit(
      "order:payment-pin-generated",
      {
        orderId: updatedOrder.id,
        expiresAt,
        pin
      }
    );
    return {
      orderId: updatedOrder.id,
      pin,
      expiresAt
    };
  }
};
var GenerateOrderPaymentConfirmationPinService_default = new GenerateOrderPaymentConfirmationPinService();

// src/modules/orders/controllers/GenerateOrderPaymentConfirmationPinController.ts
var GenerateOrderPaymentConfirmationPinController = class {
  async handle(req, res) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { restaurantId } = req.user;
      const result = await GenerateOrderPaymentConfirmationPinService_default.execute(
        id,
        restaurantId
      );
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao gerar PIN de confirmacao de pagamento"
      });
    }
  }
};
var GenerateOrderPaymentConfirmationPinController_default = new GenerateOrderPaymentConfirmationPinController();

// src/modules/orders/services/RequestOrderPaymentConfirmationPinService.ts
import { UserRole as UserRole11 } from "@prisma/client";
var RequestOrderPaymentConfirmationPinService = class {
  async execute(orderId, restaurantId, role) {
    const normalizedRole = String(role || "").toUpperCase();
    const allowedRoles = [UserRole11.MOTOQUEIRO, UserRole11.ADMIN];
    if (!allowedRoles.includes(normalizedRole)) {
      throw new Error(
        "Somente admin ou motoqueiro podem solicitar PIN de confirma\xE7\xE3o de pagamento."
      );
    }
    const order = await OrderRepository_default.findById(orderId, restaurantId);
    if (!order) {
      throw new Error("Pedido n\xE3o encontrado!");
    }
    if (String(order.type || "").toUpperCase() !== "DELIVERY") {
      throw new Error(
        "Solicita\xE7\xE3o de PIN dispon\xEDvel apenas para pedidos DELIVERY."
      );
    }
    if (order.paid === true) {
      throw new Error("Pagamento deste pedido j\xE1 est\xE1 confirmado.");
    }
    if (order.payOnDelivery !== true || !order.paymentMethod) {
      throw new Error(
        "Solicita\xE7\xE3o de PIN dispon\xEDvel apenas para pagamento na entrega."
      );
    }
    const requestedAt = (/* @__PURE__ */ new Date()).toISOString();
    notifyRestaurantPaymentPinRequested({
      restaurantWhatsapp: order?.restaurant?.whatsapp,
      restaurantName: order?.restaurant?.name,
      orderId: order?.id,
      requestedByRole: normalizedRole
    }).catch((error2) => {
      console.error(
        "[RESTAURANT_PIN_NOTIFICATION_UNHANDLED]",
        error2 instanceof Error ? error2.message : String(error2)
      );
    });
    io.to(`restaurant:${restaurantId}`).emit("order:payment-pin-requested", {
      orderId: order.id,
      requestedAt,
      requestedByRole: normalizedRole
    });
    return {
      orderId: order.id,
      requestedAt,
      message: "Solicita\xE7\xE3o de PIN enviada para o dono/admin."
    };
  }
};
var RequestOrderPaymentConfirmationPinService_default = new RequestOrderPaymentConfirmationPinService();

// src/modules/orders/controllers/RequestOrderPaymentConfirmationPinController.ts
var RequestOrderPaymentConfirmationPinController = class {
  async handle(req, res) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { restaurantId, role } = req.user;
      const result = await RequestOrderPaymentConfirmationPinService_default.execute(
        id,
        restaurantId,
        role
      );
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao solicitar PIN de confirmacao de pagamento"
      });
    }
  }
};
var RequestOrderPaymentConfirmationPinController_default = new RequestOrderPaymentConfirmationPinController();

// src/modules/orders/controllers/CreateOrderPixPaymentController.ts
var CreateOrderPixPaymentController = class {
  async handle(req, res) {
    try {
      const {
        restaurantId,
        type,
        paymentMethod,
        pixProvider,
        observation,
        tableId,
        items,
        address,
        number,
        district,
        city,
        state,
        zipCode,
        complement,
        customerName,
        customerCpf,
        customerPhone
      } = req.body;
      const userId = req.user?.id ?? null;
      const userRestaurantId = req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null;
      const resolvedRestaurantId = Number(restaurantId) || Number(userRestaurantId);
      const result = await OrderPixPaymentService_default.createPixPayment({
        restaurantId: resolvedRestaurantId,
        type,
        paymentMethod,
        pixProvider,
        items,
        address,
        number,
        district,
        city,
        state,
        customerName,
        customerCpf,
        customerPhone,
        userEmail: req.user?.email || null
      });
      const order = await CreateOrderService_default.execute({
        userId,
        restaurantId: resolvedRestaurantId,
        userRestaurantId,
        tableSessionId: req.tableSession?.id ?? null,
        tableSessionTableId: req.tableSession?.tableId ?? null,
        deferRealtimeUntilPaid: true,
        type,
        paymentMethod,
        paid: false,
        pixPaymentId: String(result.paymentId || ""),
        observation,
        tableId,
        customerName,
        customerCpf,
        customerPhone,
        items,
        address,
        number,
        district,
        city,
        state,
        zipCode,
        complement
      });
      return res.status(201).json({
        ...result,
        orderId: order.id
      });
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao gerar pagamento PIX"
      });
    }
  }
};
var CreateOrderPixPaymentController_default = new CreateOrderPixPaymentController();

// src/modules/orders/services/cardCheckoutProviders.ts
import Stripe2 from "stripe";
function withQueryParam(baseUrl, params) {
  try {
    const nextUrl = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      nextUrl.searchParams.set(key, value);
    });
    return nextUrl.toString();
  } catch {
    return baseUrl;
  }
}
async function getStripeClient(restaurantId) {
  const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
  const settings = await RestaurantSettingsRepository_default.findByRestaurantId(restaurantId);
  const settingsSecretKey = String(settings?.stripeSecretKey || "").trim();
  const globalSecretKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
  const secretKey = settingsSecretKey || (allowGlobalFallback ? globalSecretKey : "");
  if (!secretKey) {
    throw new Error(
      "Pagamento com cartao indisponivel. Configure chave secreta Stripe nas configuracoes do restaurante."
    );
  }
  return new Stripe2(secretKey);
}
function resolveMercadoPagoNotificationUrl(restaurantId) {
  const explicitNotificationUrl = String(
    process.env.MP_NOTIFICATION_URL || ""
  ).trim();
  const backendUrl = String(process.env.BACKEND_URL || "").trim().replace(/\/+$/, "");
  const baseNotificationUrl = explicitNotificationUrl || (backendUrl ? `${backendUrl}/orders/webhook/mercadopago` : "");
  if (!baseNotificationUrl || !restaurantId) {
    return baseNotificationUrl;
  }
  return withQueryParam(baseNotificationUrl, {
    restaurantId: String(restaurantId)
  });
}
function resolvePagBankEnvironment() {
  return "production";
}
async function getPagBankCredentials(restaurantId) {
  const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
  const settings = await RestaurantSettingsRepository_default.findByRestaurantId(restaurantId);
  const settingsEmail = String(settings?.pagbankEmail || "").trim();
  const settingsToken = String(settings?.pagbankToken || "").trim();
  const globalEmail = String(
    process.env.PAGBANK_EMAIL || process.env.PAGSEGURO_EMAIL || ""
  ).trim();
  const globalToken = String(
    process.env.PAGBANK_TOKEN || process.env.PAGSEGURO_TOKEN || ""
  ).trim();
  const email = settingsEmail || (allowGlobalFallback ? globalEmail : "");
  const token = settingsToken || (allowGlobalFallback ? globalToken : "");
  const environment2 = resolvePagBankEnvironment();
  if (!email || !token) {
    throw new Error(
      "Pagamento com cartao PagBank indisponivel. Configure email/token PagBank nas configuracoes do restaurante."
    );
  }
  return { email, token, environment: environment2 };
}
function resolvePagBankCheckoutApiUrl(environment2) {
  void environment2;
  return "https://ws.pagseguro.uol.com.br/v2/checkout";
}
function resolvePagBankCheckoutPageBaseUrl(environment2) {
  void environment2;
  return "https://pagseguro.uol.com.br/v2/checkout/payment.html";
}
function resolveAsaasBaseUrl() {
  return String(process.env.ASAAS_API_BASE_URL || "https://api.asaas.com").trim().replace(/\/+$/, "");
}
async function getAsaasAccessToken(restaurantId) {
  const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
  const settings = await RestaurantSettingsRepository_default.findByRestaurantId(restaurantId);
  const settingsToken = String(settings?.asaasAccessToken || "").trim();
  const globalToken = String(process.env.ASAAS_API_KEY || "").trim();
  const accessToken = settingsToken || (allowGlobalFallback ? globalToken : "");
  if (!accessToken) {
    throw new Error(
      "Pagamento com cartao Asaas indisponivel. Configure token Asaas nas configuracoes do restaurante."
    );
  }
  return accessToken;
}
function getAsaasError(payload, fallback) {
  if (!Array.isArray(payload?.errors) || payload.errors.length === 0) {
    return fallback;
  }
  const message = String(payload.errors[0]?.description || "").trim();
  return message || fallback;
}
async function fetchAsaasJson(url, accessToken, {
  method = "GET",
  body
} = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      access_token: accessToken
    },
    ...body !== void 0 ? { body: JSON.stringify(body) } : {}
  });
  const responseBody = await response.json();
  return {
    ok: response.ok,
    responseBody
  };
}
function resolvePagBankNotificationUrl(restaurantId) {
  const explicitNotificationUrl = String(
    process.env.PAGBANK_NOTIFICATION_URL || ""
  ).trim();
  const backendUrl = String(process.env.BACKEND_URL || "").trim().replace(/\/+$/, "");
  const baseNotificationUrl = explicitNotificationUrl || (backendUrl ? `${backendUrl}/orders/webhook/pagbank` : "");
  if (!baseNotificationUrl || !restaurantId) {
    return baseNotificationUrl;
  }
  return withQueryParam(baseNotificationUrl, {
    restaurantId: String(restaurantId)
  });
}
function extractXmlTagValue(xml, tag) {
  const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, "i");
  const match = regex.exec(String(xml || ""));
  return String(match?.[1] || "").trim();
}
function extractProviderErrorText(error2) {
  if (typeof error2 === "string") {
    return error2.trim().toLowerCase();
  }
  const asRecord = typeof error2 === "object" && error2 !== null ? error2 : null;
  const message = String(
    asRecord?.message || asRecord?.cause?.message || ""
  );
  const causeText = String(asRecord?.cause || "");
  return `${message} ${causeText}`.trim().toLowerCase();
}
function isMarketplaceSplitConfigurationError2(error2) {
  const text = extractProviderErrorText(error2);
  if (!text) {
    return false;
  }
  return text.includes("marketplace_fee") || text.includes("application_fee") || text.includes("marketplace") || text.includes("split") || text.includes("collector") || text.includes("platform") || text.includes("not allowed") || text.includes("unauthorized") || text.includes("invalid");
}
var stripeCardCheckoutProvider = {
  async createCheckout({ order, successUrlBase, cancelUrlBase }) {
    const stripe = await getStripeClient(order.restaurantId);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: Math.round(Number(order.total || 0) * 100),
            product_data: {
              name: `Pedido #${order.id}`,
              description: order.restaurant?.name || "Pedido online"
            }
          }
        }
      ],
      metadata: {
        orderId: String(order.id),
        restaurantId: String(order.restaurantId)
      },
      success_url: withQueryParam(successUrlBase, {
        cardCheckoutStatus: "success",
        orderId: String(order.id)
      }),
      cancel_url: withQueryParam(cancelUrlBase, {
        cardCheckoutStatus: "cancel",
        orderId: String(order.id)
      })
    });
    return {
      provider: CARD_PROVIDERS.STRIPE,
      sessionId: String(session.id),
      checkoutUrl: String(session.url || "")
    };
  }
};
var mercadoPagoCardCheckoutProvider = {
  async createCheckout({ order, successUrlBase, cancelUrlBase }) {
    const preferenceApi = await getMercadoPagoPreferenceApi(order.restaurantId);
    const notificationUrl = resolveMercadoPagoNotificationUrl(
      order.restaurantId
    );
    const marketplaceFee = Number(order.systemFee || 0);
    const buildPreferenceBody = (includeMarketplaceFee) => ({
      items: [
        {
          id: String(order.id),
          title: `Pedido #${order.id}`,
          description: order.restaurant?.name || "Pedido online",
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(order.total || 0)
        }
      ],
      external_reference: `ordercard:${order.id}:${order.restaurantId}`,
      metadata: {
        order_id: String(order.id),
        restaurant_id: String(order.restaurantId),
        source: "order_card_checkout"
      },
      ...includeMarketplaceFee && marketplaceFee > 0 ? { marketplace_fee: marketplaceFee } : {},
      ...notificationUrl ? { notification_url: notificationUrl } : {},
      back_urls: {
        success: withQueryParam(successUrlBase, {
          cardCheckoutStatus: "success",
          orderId: String(order.id)
        }),
        failure: withQueryParam(cancelUrlBase, {
          cardCheckoutStatus: "cancel",
          orderId: String(order.id)
        }),
        pending: withQueryParam(successUrlBase, {
          cardCheckoutStatus: "pending",
          orderId: String(order.id)
        })
      }
    });
    let response;
    if (marketplaceFee > 0) {
      try {
        response = await preferenceApi.create({
          body: buildPreferenceBody(true)
        });
      } catch (error2) {
        if (!isMarketplaceSplitConfigurationError2(error2)) {
          throw error2;
        }
        console.warn(
          "[CARD_SPLIT_FALLBACK] Mercado Pago rejeitou marketplace_fee. Recriando checkout sem split.",
          {
            orderId: order.id,
            restaurantId: order.restaurantId,
            marketplaceFee
          }
        );
        response = await preferenceApi.create({
          body: buildPreferenceBody(false)
        });
      }
    } else {
      response = await preferenceApi.create({
        body: buildPreferenceBody(false)
      });
    }
    const preference2 = typeof response === "object" && response !== null ? response.body ?? response : {};
    const preferenceId = String(
      preference2.id || ""
    ).trim();
    const checkoutUrl = String(
      preference2.init_point || ""
    ).trim();
    if (!preferenceId || !checkoutUrl) {
      throw new Error(
        "Nao foi possivel criar checkout de cartao no Mercado Pago."
      );
    }
    return {
      provider: CARD_PROVIDERS.MERCADO_PAGO,
      sessionId: preferenceId,
      persistenceSessionId: `mp_pref:${preferenceId}`,
      checkoutUrl
    };
  }
};
var pagBankCardCheckoutProvider = {
  async createCheckout({ order, successUrlBase }) {
    const { email, token, environment: environment2 } = await getPagBankCredentials(
      order.restaurantId
    );
    const params = new URLSearchParams();
    params.set("email", email);
    params.set("token", token);
    params.set("currency", "BRL");
    params.set("itemId1", String(order.id));
    params.set("itemDescription1", `Pedido #${order.id}`);
    params.set("itemAmount1", Number(order.total || 0).toFixed(2));
    params.set("itemQuantity1", "1");
    params.set("reference", `ordercard:${order.id}:${order.restaurantId}`);
    params.set(
      "redirectURL",
      withQueryParam(successUrlBase, {
        cardCheckoutStatus: "success",
        orderId: String(order.id)
      })
    );
    const notificationUrl = resolvePagBankNotificationUrl(order.restaurantId);
    if (notificationUrl) {
      params.set("notificationURL", notificationUrl);
    }
    const response = await fetch(resolvePagBankCheckoutApiUrl(environment2), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      body: params.toString()
    });
    const responseText = await response.text();
    if (!response.ok) {
      const providerMessage = extractXmlTagValue(responseText, "message") || extractXmlTagValue(responseText, "error") || "Falha ao criar checkout no PagBank.";
      throw new Error(`PagBank: ${providerMessage}`);
    }
    const checkoutCode = extractXmlTagValue(responseText, "code");
    if (!checkoutCode) {
      throw new Error("PagBank nao retornou codigo de checkout.");
    }
    const checkoutUrl = `${resolvePagBankCheckoutPageBaseUrl(environment2)}?code=${encodeURIComponent(checkoutCode)}`;
    return {
      provider: CARD_PROVIDERS.PAGBANK,
      sessionId: checkoutCode,
      persistenceSessionId: `pagbank_chk:${checkoutCode}`,
      checkoutUrl
    };
  }
};
var asaasCardCheckoutProvider = {
  async createCheckout({ payload, order }) {
    const asaasBaseUrl = resolveAsaasBaseUrl();
    const accessToken = await getAsaasAccessToken(order.restaurantId);
    const payerEmail = String(payload.userId ? "" : "").trim();
    const customerName = String(payload.customerName || "Cliente").trim();
    const cpf = String(payload.customerCpf || "").replace(/\D/g, "");
    const normalizedEmail = String(payload.customerName || "").trim() && payload.customerCpf ? `guest.card.${order.restaurantId}.${Date.now()}@pecaja.local` : `guest.card.${order.restaurantId}.${Date.now()}@pecaja.local`;
    const customerResult = await fetchAsaasJson(
      `${asaasBaseUrl}/v3/customers`,
      accessToken,
      {
        method: "POST",
        body: {
          name: customerName || "Cliente",
          email: payerEmail || normalizedEmail,
          ...cpf.length === 11 ? { cpfCnpj: cpf } : {},
          ...payload.customerPhone ? {
            mobilePhone: String(payload.customerPhone).replace(/\D/g, "")
          } : {}
        }
      }
    );
    if (!customerResult.ok || !String(customerResult.responseBody?.id || "").trim()) {
      throw new Error(
        getAsaasError(
          customerResult.responseBody,
          "Nao foi possivel criar/identificar cliente para checkout de cartao no Asaas."
        )
      );
    }
    const customerId = String(customerResult.responseBody.id || "").trim();
    const settings = await RestaurantSettingsRepository_default.findByRestaurantId(
      order.restaurantId
    );
    const walletId = String(settings?.gatewayMerchantId || "").trim();
    const platformWalletId = String(
      process.env.ASAAS_PLATFORM_WALLET_ID || ""
    ).trim();
    const systemFee = Number(order.systemFee || 0);
    const buildPaymentBody = (includeSplit) => ({
      customer: customerId,
      billingType: "UNDEFINED",
      value: Number(order.total || 0),
      dueDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      description: `Pedido #${order.id}`,
      externalReference: String(order.id),
      ...includeSplit && systemFee > 0 && platformWalletId ? {
        split: [
          {
            walletId: platformWalletId,
            fixedValue: systemFee
          },
          ...walletId ? [
            {
              walletId,
              remainingValue: true
            }
          ] : []
        ]
      } : {}
    });
    let paymentResult = await fetchAsaasJson(
      `${asaasBaseUrl}/v3/payments`,
      accessToken,
      {
        method: "POST",
        body: buildPaymentBody(systemFee > 0)
      }
    );
    const shouldRetryWithoutSplit = systemFee > 0 && !paymentResult.ok && isMarketplaceSplitConfigurationError2(
      getAsaasError(
        paymentResult.responseBody,
        "Erro ao criar checkout de cartao no Asaas."
      )
    );
    if (shouldRetryWithoutSplit) {
      console.warn(
        "[ASAAS_CARD_SPLIT_FALLBACK] Asaas rejeitou split. Recriando checkout sem split.",
        {
          orderId: order.id,
          restaurantId: order.restaurantId,
          systemFee
        }
      );
      paymentResult = await fetchAsaasJson(
        `${asaasBaseUrl}/v3/payments`,
        accessToken,
        {
          method: "POST",
          body: buildPaymentBody(false)
        }
      );
    }
    if (!paymentResult.ok) {
      throw new Error(
        getAsaasError(
          paymentResult.responseBody,
          "Nao foi possivel criar checkout de cartao no Asaas."
        )
      );
    }
    const sessionId = String(paymentResult.responseBody?.id || "").trim();
    const checkoutUrl = String(
      paymentResult.responseBody?.invoiceUrl || ""
    ).trim();
    if (!sessionId || !checkoutUrl) {
      throw new Error(
        "Asaas nao retornou link de checkout para pagamento com cartao."
      );
    }
    return {
      provider: CARD_PROVIDERS.ASAAS,
      sessionId,
      persistenceSessionId: `asaas_pay:${sessionId}`,
      checkoutUrl
    };
  }
};
var CARD_CHECKOUT_PROVIDER_HANDLERS = {
  [CARD_PROVIDERS.STRIPE]: stripeCardCheckoutProvider,
  [CARD_PROVIDERS.MERCADO_PAGO]: mercadoPagoCardCheckoutProvider,
  [CARD_PROVIDERS.PAGBANK]: pagBankCardCheckoutProvider,
  [CARD_PROVIDERS.ASAAS]: asaasCardCheckoutProvider
};
function getCardCheckoutProviderHandler(provider) {
  const handler = CARD_CHECKOUT_PROVIDER_HANDLERS[provider];
  if (!handler) {
    throw new Error(
      `Gateway de cartao ${provider} ainda nao integrado. Configure STRIPE, MERCADO_PAGO, PAGBANK ou ASAAS para processar checkout com cartao no momento.`
    );
  }
  return handler;
}

// src/modules/orders/services/CreateOrderCardCheckoutService.ts
var CreateOrderCardCheckoutService = class {
  async resolveCardProvider(payload) {
    const resolvedRestaurantId = Number(payload.restaurantId) || Number(payload.userRestaurantId) || 0;
    if (!resolvedRestaurantId) {
      throw new Error("Restaurante inv\xE1lido para pagamento com cart\xE3o.");
    }
    const settings = await RestaurantSettingsRepository_default.findByRestaurantId(
      resolvedRestaurantId
    );
    const configuredProvider3 = String(settings?.cardGateway || "").trim();
    if (!configuredProvider3) {
      throw new Error(
        "Pagamento com cart\xE3o indispon\xEDvel. Configure o gateway nas configura\xE7\xF5es do restaurante."
      );
    }
    if (!["MERCADO_PAGO", "ASAAS", "PAGBANK"].includes(configuredProvider3.toUpperCase())) {
      throw new Error(
        "Gateway inv\xE1lido. Escolha Mercado Pago, Asaas ou PagBank."
      );
    }
    return normalizeCardProvider(configuredProvider3);
  }
  ensureCardProviderSupported(provider) {
    getCardCheckoutProviderHandler(provider);
  }
  async execute(payload) {
    const resolvedCardProvider = await this.resolveCardProvider(payload);
    this.ensureCardProviderSupported(resolvedCardProvider);
    const createdOrder = await CreateOrderService_default.execute({
      ...payload,
      deferRealtimeUntilPaid: true,
      paid: false
    });
    const successUrlBase = String(
      payload.successUrl || process.env.FRONTEND_URL || "http://localhost:5173/cart"
    ).trim();
    const cancelUrlBase = String(payload.cancelUrl || successUrlBase).trim();
    try {
      const providerHandler = getCardCheckoutProviderHandler(resolvedCardProvider);
      const checkout = await providerHandler.createCheckout({
        payload,
        order: {
          id: createdOrder.id,
          restaurantId: createdOrder.restaurantId,
          total: createdOrder.total,
          systemFee: createdOrder.systemFee,
          restaurant: createdOrder.restaurant
        },
        successUrlBase,
        cancelUrlBase
      });
      await OrderRepository_default.setCardCheckoutSessionId(
        createdOrder.id,
        createdOrder.restaurantId,
        String(checkout.persistenceSessionId || checkout.sessionId)
      );
      return {
        orderId: createdOrder.id,
        provider: checkout.provider,
        sessionId: checkout.sessionId,
        checkoutUrl: checkout.checkoutUrl
      };
    } catch (error2) {
      await OrderRepository_default.deleteById(
        createdOrder.id,
        createdOrder.restaurantId
      );
      throw error2;
    }
  }
};
var CreateOrderCardCheckoutService_default = new CreateOrderCardCheckoutService();

// src/modules/orders/controllers/CreateOrderCardCheckoutController.ts
var CreateOrderCardCheckoutController = class {
  async handle(req, res) {
    try {
      const {
        restaurantId,
        type,
        paymentMethod,
        items,
        address,
        number,
        district,
        city,
        state,
        zipCode,
        complement,
        customerName,
        customerCpf,
        customerPhone,
        observation,
        tableId,
        cardProvider,
        successUrl,
        cancelUrl
      } = req.body;
      const userId = req.user?.id ?? null;
      const userRestaurantId = req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null;
      const result = await CreateOrderCardCheckoutService_default.execute({
        userId,
        restaurantId,
        userRestaurantId,
        tableSessionId: req.tableSession?.id ?? null,
        tableSessionTableId: req.tableSession?.tableId ?? null,
        type,
        paymentMethod,
        items,
        address,
        number,
        district,
        city,
        state,
        zipCode,
        complement,
        customerName,
        customerCpf,
        customerPhone,
        observation,
        tableId,
        cardProvider,
        successUrl,
        cancelUrl
      });
      return res.status(201).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao iniciar pagamento com cartao"
      });
    }
  }
};
var CreateOrderCardCheckoutController_default = new CreateOrderCardCheckoutController();

// src/modules/orders/controllers/GetOrderPixPaymentStatusController.ts
var GetOrderPixPaymentStatusController = class {
  async handle(req, res) {
    try {
      const { paymentId, restaurantId } = req.body;
      const userRestaurantId = req.user?.restaurantId ?? null;
      const resolvedRestaurantId = Number(restaurantId) || Number(userRestaurantId);
      const result = await OrderPixPaymentService_default.getPaymentStatus({
        paymentId,
        restaurantId: resolvedRestaurantId
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao consultar status do pagamento PIX"
      });
    }
  }
};
var GetOrderPixPaymentStatusController_default = new GetOrderPixPaymentStatusController();

// src/modules/orders/services/FinalizeOrderPixPaymentService.ts
var FinalizeOrderPixPaymentService = class {
  async execute({
    orderId,
    paymentId,
    restaurantId,
    allowMissingOrder = false
  }) {
    const normalizedPaymentId = String(paymentId || "").trim();
    if (!normalizedPaymentId) {
      throw new Error("Pagamento PIX invalido.");
    }
    if (normalizedPaymentId.startsWith("manual:")) {
      throw new Error("Pagamento PIX manual nao e permitido.");
    }
    await OrderPixPaymentService_default.ensurePaymentApproved({
      paymentId: normalizedPaymentId,
      restaurantId
    });
    const normalizedRestaurantId = Number(restaurantId || 0) || void 0;
    const order = orderId ? await OrderRepository_default.findById(
      orderId,
      Number(normalizedRestaurantId || 0)
    ) : await OrderRepository_default.findByPixPaymentId(
      normalizedPaymentId,
      normalizedRestaurantId
    );
    if (!order) {
      if (allowMissingOrder) {
        return null;
      }
      throw new Error("Pedido PIX nao encontrado para este pagamento.");
    }
    if (String(order.pixPaymentId || "").trim() !== normalizedPaymentId) {
      throw new Error("Pagamento PIX nao corresponde ao pedido informado.");
    }
    if (order.paid === true) {
      return order;
    }
    const updatedOrder = await OrderRepository_default.confirmPayment(
      order.id,
      order.restaurantId
    );
    io.to(`restaurant:${updatedOrder.restaurantId}`).emit(
      "order:payment-confirmed",
      {
        orderId: updatedOrder.id,
        paid: true,
        paymentMethod: updatedOrder.paymentMethod
      }
    );
    io.to(`user:${updatedOrder.userId}`).emit("payment-confirmed", {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
      status: updatedOrder.status
    });
    io.to(`restaurant:${updatedOrder.restaurantId}`).emit(
      "new-order",
      updatedOrder
    );
    io.to(`restaurant:${updatedOrder.restaurantId}`).emit(
      "order:status-changed",
      updatedOrder
    );
    io.to(`user:${updatedOrder.userId}`).emit(
      "order:status-changed",
      updatedOrder
    );
    notifyCustomerPaymentConfirmed({
      customerPhone: updatedOrder?.user?.phone,
      customerName: updatedOrder?.user?.name,
      restaurantName: updatedOrder?.restaurant?.name,
      restaurantWhatsapp: updatedOrder?.restaurant?.whatsapp,
      orderId: updatedOrder?.id,
      total: updatedOrder?.total,
      paymentMethod: updatedOrder?.paymentMethod
    }).catch((error2) => {
      console.error(
        "[CUSTOMER_NOTIFICATION_UNHANDLED]",
        error2 instanceof Error ? error2.message : String(error2)
      );
    });
    return updatedOrder;
  }
};
var FinalizeOrderPixPaymentService_default = new FinalizeOrderPixPaymentService();

// src/modules/orders/controllers/ConfirmOrderPixPaymentController.ts
var ConfirmOrderPixPaymentController = class {
  async handle(req, res) {
    try {
      const { orderId, paymentId, restaurantId } = req.body;
      const userRestaurantId = req.user?.restaurantId ?? null;
      const resolvedRestaurantId = Number(restaurantId) || Number(userRestaurantId) || void 0;
      const order = await FinalizeOrderPixPaymentService_default.execute({
        orderId,
        paymentId,
        restaurantId: resolvedRestaurantId
      });
      return res.status(200).json(order);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao confirmar pagamento PIX do pedido"
      });
    }
  }
};
var ConfirmOrderPixPaymentController_default = new ConfirmOrderPixPaymentController();

// src/modules/orders/services/orderIssueChatStore.ts
async function loadThread(orderId) {
  return prisma_default.orderIssueThread.findUnique({
    where: {
      orderId
    },
    include: {
      messages: {
        orderBy: {
          sentAt: "asc"
        }
      }
    }
  });
}
async function ensureOrderIssueThread(input) {
  await prisma_default.orderIssueThread.upsert({
    where: {
      orderId: input.orderId
    },
    create: {
      orderId: input.orderId,
      userId: input.userId,
      restaurantId: input.restaurantId,
      customerName: input.customerName,
      customerPhone: input.customerPhone || null,
      orderStatus: input.orderStatus,
      orderType: input.orderType,
      paymentMethod: input.paymentMethod || null,
      total: input.total,
      orderCreatedAt: new Date(input.createdAt),
      addressLabel: input.addressLabel || null,
      itemsSummary: input.itemsSummary
    },
    update: {
      customerName: input.customerName,
      customerPhone: input.customerPhone || null,
      orderStatus: input.orderStatus,
      orderType: input.orderType,
      paymentMethod: input.paymentMethod || null,
      total: input.total,
      orderCreatedAt: new Date(input.createdAt),
      addressLabel: input.addressLabel || null,
      itemsSummary: input.itemsSummary
    }
  });
  const thread = await loadThread(input.orderId);
  if (!thread) {
    throw new Error("N\xE3o foi poss\xEDvel preparar o chat do pedido.");
  }
  return thread;
}
async function getOrderIssueThread(orderId) {
  return loadThread(orderId);
}
async function addOrderIssueMessage({
  orderId,
  senderType,
  senderName,
  message
}) {
  const thread = await prisma_default.orderIssueThread.findUnique({
    where: {
      orderId
    },
    select: {
      id: true,
      isResolved: true
    }
  });
  if (!thread) {
    throw new Error("Conversa n\xE3o encontrada para este pedido.");
  }
  if (thread.isResolved) {
    throw new Error("Este problema j\xE1 foi resolvido e o chat foi encerrado.");
  }
  const chatMessage = await prisma_default.orderIssueMessage.create({
    data: {
      threadId: thread.id,
      senderType,
      senderName: String(senderName || senderType).trim() || senderType,
      message
    }
  });
  const fullThread = await loadThread(orderId);
  if (!fullThread) {
    throw new Error("N\xE3o foi poss\xEDvel atualizar a conversa do pedido.");
  }
  return {
    thread: fullThread,
    chatMessage
  };
}
async function resolveOrderIssueThread({
  orderId,
  resolvedByName
}) {
  const thread = await prisma_default.orderIssueThread.findUnique({
    where: {
      orderId
    },
    select: {
      id: true,
      isResolved: true
    }
  });
  if (!thread) {
    throw new Error("Conversa n\xE3o encontrada para este pedido.");
  }
  if (thread.isResolved) {
    const existing = await loadThread(orderId);
    if (!existing) {
      throw new Error("Conversa n\xE3o encontrada para este pedido.");
    }
    return existing;
  }
  await prisma_default.orderIssueThread.update({
    where: {
      id: thread.id
    },
    data: {
      isResolved: true,
      resolvedAt: /* @__PURE__ */ new Date(),
      resolvedByName: String(resolvedByName || "Admin").trim() || "Admin"
    }
  });
  const resolved = await loadThread(orderId);
  if (!resolved) {
    throw new Error("Conversa n\xE3o encontrada para este pedido.");
  }
  return resolved;
}
function toOrderIssueThreadPayload(thread) {
  if (!thread) {
    return null;
  }
  return {
    orderId: thread.orderId,
    userId: thread.userId,
    restaurantId: thread.restaurantId,
    customerName: thread.customerName,
    customerPhone: thread.customerPhone,
    status: thread.orderStatus,
    type: thread.orderType,
    paymentMethod: thread.paymentMethod,
    total: Number(thread.total || 0),
    createdAt: thread.orderCreatedAt?.toISOString?.() || null,
    addressLabel: thread.addressLabel,
    itemsSummary: thread.itemsSummary,
    isResolved: thread.isResolved,
    resolvedAt: thread.resolvedAt?.toISOString?.() || null,
    resolvedByName: thread.resolvedByName,
    messages: thread.messages.map((message) => ({
      id: String(message.id),
      senderType: message.senderType,
      senderName: message.senderName,
      message: message.message,
      sentAt: message.sentAt?.toISOString?.() || null
    })),
    updatedAt: thread.updatedAt?.toISOString?.() || null
  };
}

// src/modules/orders/services/ReportOrderIssueService.ts
function buildOrderAddressLabel(order) {
  const parts = [
    String(order?.address || "").trim(),
    String(order?.number || "").trim(),
    String(order?.district || "").trim(),
    String(order?.city || "").trim(),
    String(order?.state || "").trim(),
    String(order?.zipCode || "").trim()
  ].filter(Boolean);
  return parts.join(", ");
}
var ReportOrderIssueService = class {
  async execute(orderId, userId, restaurantId, issueMessage) {
    const normalizedOrderId = Number(orderId);
    const normalizedUserId = Number(userId);
    const normalizedRestaurantId = Number(restaurantId || 0);
    const normalizedIssueMessage = String(issueMessage || "").replace(/\s+/g, " ").trim();
    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error("Pedido inv\xE1lido para relatar problema.");
    }
    if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
      throw new Error("Usu\xE1rio inv\xE1lido para relatar problema.");
    }
    if (normalizedIssueMessage.length > 600) {
      throw new Error("Mensagem muito longa. Use no m\xE1ximo 600 caracteres.");
    }
    const order = await prisma_default.order.findFirst({
      where: {
        id: normalizedOrderId,
        userId: normalizedUserId,
        ...Number.isFinite(normalizedRestaurantId) && normalizedRestaurantId > 0 ? {
          restaurantId: normalizedRestaurantId
        } : {}
      },
      select: {
        id: true,
        userId: true,
        status: true,
        type: true,
        paymentMethod: true,
        total: true,
        createdAt: true,
        restaurantId: true,
        address: true,
        number: true,
        district: true,
        city: true,
        state: true,
        zipCode: true,
        items: {
          select: {
            quantity: true,
            product: {
              select: {
                name: true
              }
            }
          }
        },
        user: {
          select: {
            name: true,
            phone: true
          }
        },
        restaurant: {
          select: {
            name: true,
            whatsapp: true
          }
        }
      }
    });
    if (!order) {
      throw new Error("Pedido n\xE3o encontrado para este usu\xE1rio.");
    }
    const orderAddressLabel = buildOrderAddressLabel(order);
    const orderItemsSummary = Array.isArray(order?.items) ? order.items.map((item) => {
      const quantity = Number(item?.quantity || 0);
      const productName = String(item?.product?.name || "Item").trim();
      if (!productName) {
        return "";
      }
      return quantity > 0 ? `${quantity}x ${productName}` : productName;
    }).filter(Boolean) : [];
    const existingThread = await getOrderIssueThread(order.id);
    if (!existingThread && normalizedIssueMessage.length < 10) {
      throw new Error("Descreva o problema com pelo menos 10 caracteres.");
    }
    if (existingThread && normalizedIssueMessage.length < 2) {
      throw new Error("Digite uma mensagem para continuar o chat.");
    }
    if (existingThread?.isResolved) {
      throw new Error("Este problema j\xE1 foi resolvido e o chat foi encerrado.");
    }
    await ensureOrderIssueThread({
      orderId: order.id,
      userId: order.userId,
      restaurantId: order.restaurantId,
      customerName: String(order?.user?.name || "Cliente").trim(),
      customerPhone: String(order?.user?.phone || "").trim(),
      orderStatus: String(order.status || ""),
      orderType: String(order.type || ""),
      paymentMethod: String(order.paymentMethod || ""),
      total: Number(order.total || 0),
      createdAt: order.createdAt.toISOString(),
      addressLabel: orderAddressLabel,
      itemsSummary: orderItemsSummary
    });
    const { thread, chatMessage } = await addOrderIssueMessage({
      orderId: order.id,
      senderType: "CLIENT",
      senderName: String(order?.user?.name || "Cliente"),
      message: normalizedIssueMessage
    });
    const threadPayload = toOrderIssueThreadPayload(thread);
    if (!threadPayload) {
      throw new Error("N\xE3o foi poss\xEDvel atualizar a conversa do pedido.");
    }
    const payload = {
      orderId: order.id,
      userId: order.userId,
      status: order.status,
      type: order.type,
      paymentMethod: order.paymentMethod,
      total: Number(order.total || 0),
      createdAt: order.createdAt,
      restaurantId: order.restaurantId,
      addressLabel: orderAddressLabel,
      itemsSummary: orderItemsSummary,
      customerName: String(order?.user?.name || "Cliente").trim(),
      customerPhone: String(order?.user?.phone || "").trim(),
      issueMessage: normalizedIssueMessage,
      reportedAt: chatMessage.sentAt,
      isResolved: threadPayload.isResolved,
      messages: threadPayload.messages
    };
    notifyRestaurantOrderIssueReported({
      restaurantWhatsapp: order?.restaurant?.whatsapp,
      restaurantName: order?.restaurant?.name,
      orderId: order.id,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      issueMessage: payload.issueMessage,
      orderStatus: payload.status,
      orderType: payload.type,
      paymentMethod: payload.paymentMethod,
      total: payload.total,
      addressLabel: payload.addressLabel,
      itemsSummary: payload.itemsSummary,
      createdAt: payload.createdAt?.toISOString?.() || null
    }).catch((error2) => {
      console.error(
        "[RESTAURANT_ORDER_ISSUE_NOTIFICATION_UNHANDLED]",
        error2 instanceof Error ? error2.message : String(error2)
      );
    });
    io.to(`restaurant:${order.restaurantId}:admin`).emit(
      "order:issue-reported",
      payload
    );
    io.to(`restaurant:${order.restaurantId}:admin`).emit(
      "order:issue-message",
      {
        ...threadPayload,
        message: chatMessage
      }
    );
    io.to(`user:${order.userId}`).emit("order:issue-message", {
      ...threadPayload,
      message: chatMessage
    });
    return {
      ...threadPayload,
      lastMessage: chatMessage,
      info: "Problema relatado para o admin com sucesso."
    };
  }
};
var ReportOrderIssueService_default = new ReportOrderIssueService();

// src/modules/orders/controllers/ReportOrderIssueController.ts
var ReportOrderIssueController = class {
  async handle(req, res) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { id: userId, restaurantId } = req.user;
      const { message } = req.body || {};
      const result = await ReportOrderIssueService_default.execute(
        id,
        userId,
        restaurantId,
        message
      );
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao relatar problema no pedido"
      });
    }
  }
};
var ReportOrderIssueController_default = new ReportOrderIssueController();

// src/modules/orders/services/ReplyOrderIssueService.ts
var ReplyOrderIssueService = class {
  async execute({
    orderId,
    restaurantId,
    adminUserId,
    replyMessage
  }) {
    const normalizedOrderId = Number(orderId);
    const normalizedRestaurantId = Number(restaurantId || 0);
    const normalizedAdminUserId = Number(adminUserId);
    const normalizedReplyMessage = String(replyMessage || "").replace(/\s+/g, " ").trim();
    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error("Pedido inv\xE1lido para responder.");
    }
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error("Restaurante inv\xE1lido para responder.");
    }
    if (!Number.isInteger(normalizedAdminUserId) || normalizedAdminUserId <= 0) {
      throw new Error("Admin inv\xE1lido para responder.");
    }
    if (normalizedReplyMessage.length < 2) {
      throw new Error("Digite uma resposta para o cliente.");
    }
    if (normalizedReplyMessage.length > 600) {
      throw new Error("Resposta muito longa. Use no m\xE1ximo 600 caracteres.");
    }
    const [order, adminUser] = await Promise.all([
      prisma_default.order.findFirst({
        where: {
          id: normalizedOrderId,
          restaurantId: normalizedRestaurantId
        },
        select: {
          id: true,
          restaurantId: true,
          userId: true,
          user: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma_default.user.findUnique({
        where: {
          id: normalizedAdminUserId
        },
        select: {
          name: true
        }
      })
    ]);
    if (!order) {
      throw new Error("Pedido n\xE3o encontrado para este restaurante.");
    }
    const existingThread = await getOrderIssueThread(order.id);
    if (!existingThread) {
      throw new Error("Cliente ainda n\xE3o iniciou conversa neste pedido.");
    }
    if (existingThread.isResolved) {
      throw new Error("Este problema j\xE1 foi resolvido e o chat foi encerrado.");
    }
    await ensureOrderIssueThread({
      orderId: order.id,
      userId: order.userId,
      restaurantId: order.restaurantId,
      customerName: String(order?.user?.name || "Cliente").trim(),
      customerPhone: existingThread.customerPhone || "",
      orderStatus: String(existingThread.orderStatus || ""),
      orderType: String(existingThread.orderType || ""),
      paymentMethod: String(existingThread.paymentMethod || ""),
      total: Number(existingThread.total || 0),
      createdAt: existingThread.orderCreatedAt.toISOString(),
      addressLabel: existingThread.addressLabel || "",
      itemsSummary: Array.isArray(existingThread.itemsSummary) ? existingThread.itemsSummary : []
    });
    const adminName = String(adminUser?.name || "Admin").trim() || "Admin";
    const { thread, chatMessage } = await addOrderIssueMessage({
      orderId: order.id,
      senderType: "ADMIN",
      senderName: adminName,
      message: normalizedReplyMessage
    });
    const threadPayload = toOrderIssueThreadPayload(thread);
    if (!threadPayload) {
      throw new Error("N\xE3o foi poss\xEDvel atualizar a conversa do pedido.");
    }
    io.to(`restaurant:${order.restaurantId}:admin`).emit(
      "order:issue-message",
      {
        ...threadPayload,
        message: chatMessage
      }
    );
    io.to(`user:${order.userId}`).emit("order:issue-message", {
      ...threadPayload,
      message: chatMessage
    });
    return {
      ...threadPayload,
      lastMessage: chatMessage,
      info: "Resposta enviada para o cliente com sucesso."
    };
  }
};
var ReplyOrderIssueService_default = new ReplyOrderIssueService();

// src/modules/orders/controllers/ReplyOrderIssueController.ts
var ReplyOrderIssueController = class {
  async handle(req, res) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { restaurantId, id: adminUserId } = req.user;
      const { message } = req.body || {};
      const result = await ReplyOrderIssueService_default.execute({
        orderId: id,
        restaurantId,
        adminUserId,
        replyMessage: message
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao responder problema do pedido"
      });
    }
  }
};
var ReplyOrderIssueController_default = new ReplyOrderIssueController();

// src/modules/orders/services/GetOrderIssueThreadService.ts
var GetOrderIssueThreadService = class {
  async execute({
    orderId,
    requesterUserId,
    requesterRole,
    requesterRestaurantId
  }) {
    const normalizedOrderId = Number(orderId);
    const normalizedUserId = Number(requesterUserId);
    const normalizedRestaurantId = Number(requesterRestaurantId || 0);
    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error("Pedido inv\xE1lido para carregar conversa.");
    }
    if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
      throw new Error("Usu\xE1rio inv\xE1lido para carregar conversa.");
    }
    const role = String(requesterRole || "").toUpperCase();
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
    if (isAdmin) {
      if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
        throw new Error("Restaurante inv\xE1lido para carregar conversa.");
      }
      const order2 = await prisma_default.order.findFirst({
        where: {
          id: normalizedOrderId,
          restaurantId: normalizedRestaurantId
        },
        select: {
          id: true,
          userId: true,
          status: true,
          type: true,
          paymentMethod: true,
          total: true,
          createdAt: true,
          restaurantId: true,
          address: true,
          number: true,
          district: true,
          city: true,
          state: true,
          zipCode: true,
          user: {
            select: {
              name: true,
              phone: true
            }
          },
          items: {
            select: {
              quantity: true,
              product: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });
      if (!order2) {
        throw new Error("Pedido n\xE3o encontrado para este restaurante.");
      }
      const thread2 = await getOrderIssueThread(order2.id);
      if (!thread2) {
        return {
          orderId: order2.id,
          isResolved: false,
          messages: []
        };
      }
      const payload2 = toOrderIssueThreadPayload(thread2);
      if (!payload2) {
        return {
          orderId: order2.id,
          isResolved: false,
          messages: []
        };
      }
      return payload2;
    }
    const order = await prisma_default.order.findFirst({
      where: {
        id: normalizedOrderId,
        userId: normalizedUserId
      },
      select: {
        id: true
      }
    });
    if (!order) {
      throw new Error("Pedido n\xE3o encontrado para este usu\xE1rio.");
    }
    const thread = await getOrderIssueThread(order.id);
    if (!thread) {
      return {
        orderId: order.id,
        isResolved: false,
        messages: []
      };
    }
    const payload = toOrderIssueThreadPayload(thread);
    if (!payload) {
      return {
        orderId: order.id,
        isResolved: false,
        messages: []
      };
    }
    return payload;
  }
};
var GetOrderIssueThreadService_default = new GetOrderIssueThreadService();

// src/modules/orders/controllers/GetOrderIssueThreadController.ts
var GetOrderIssueThreadController = class {
  async handle(req, res) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { id: requesterUserId, role, restaurantId } = req.user;
      const result = await GetOrderIssueThreadService_default.execute({
        orderId: id,
        requesterUserId,
        requesterRole: role,
        requesterRestaurantId: restaurantId
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao carregar conversa do problema do pedido"
      });
    }
  }
};
var GetOrderIssueThreadController_default = new GetOrderIssueThreadController();

// src/modules/orders/services/ResolveOrderIssueService.ts
var ResolveOrderIssueService = class {
  async execute({
    orderId,
    adminUserId,
    restaurantId
  }) {
    const normalizedOrderId = Number(orderId);
    const normalizedAdminUserId = Number(adminUserId);
    const normalizedRestaurantId = Number(restaurantId || 0);
    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error("Pedido inv\xE1lido para resolver conversa.");
    }
    if (!Number.isInteger(normalizedAdminUserId) || normalizedAdminUserId <= 0) {
      throw new Error("Admin inv\xE1lido para resolver conversa.");
    }
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error("Restaurante inv\xE1lido para resolver conversa.");
    }
    const [order, adminUser] = await Promise.all([
      prisma_default.order.findFirst({
        where: {
          id: normalizedOrderId,
          restaurantId: normalizedRestaurantId
        },
        select: {
          id: true,
          restaurantId: true,
          userId: true
        }
      }),
      prisma_default.user.findUnique({
        where: {
          id: normalizedAdminUserId
        },
        select: {
          name: true
        }
      })
    ]);
    if (!order) {
      throw new Error("Pedido n\xE3o encontrado para este restaurante.");
    }
    const resolvedByName = String(adminUser?.name || "Admin").trim() || "Admin";
    const thread = await resolveOrderIssueThread({
      orderId: order.id,
      resolvedByName
    });
    const threadPayload = toOrderIssueThreadPayload(thread);
    if (!threadPayload) {
      throw new Error("N\xE3o foi poss\xEDvel resolver a conversa do pedido.");
    }
    const resolvedPayload = {
      orderId: order.id,
      isResolved: true,
      resolvedAt: threadPayload.resolvedAt,
      resolvedByName
    };
    io.to(`restaurant:${order.restaurantId}:admin`).emit(
      "order:issue-resolved",
      resolvedPayload
    );
    io.to(`user:${order.userId}`).emit("order:issue-resolved", resolvedPayload);
    return {
      ...threadPayload,
      info: "Problema marcado como resolvido e chat encerrado."
    };
  }
};
var ResolveOrderIssueService_default = new ResolveOrderIssueService();

// src/modules/orders/controllers/ResolveOrderIssueController.ts
var ResolveOrderIssueController = class {
  async handle(req, res) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { restaurantId, id: adminUserId } = req.user;
      const result = await ResolveOrderIssueService_default.execute({
        orderId: id,
        restaurantId,
        adminUserId
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao resolver problema do pedido"
      });
    }
  }
};
var ResolveOrderIssueController_default = new ResolveOrderIssueController();

// src/modules/orders/services/RefundOrderByAdminService.ts
import { OrderStatus as OrderStatus9 } from "@prisma/client";
var REFUND_REQUEST_PATTERN = /(estorno|reembolso|devolver|devolucao|devolução|cancelar\s+pedido|quero\s+cancelar|quero\s+estorno|quero\s+reembolso)/i;
var RefundOrderByAdminService = class {
  hasClientRefundRequest(thread) {
    if (!thread) {
      return false;
    }
    return thread.messages.some((message) => {
      const senderType = String(message?.senderType || "").toUpperCase();
      const text = String(message?.message || "").replace(/\s+/g, " ").trim();
      return senderType === "CLIENT" && REFUND_REQUEST_PATTERN.test(text);
    });
  }
  async execute({
    orderId,
    restaurantId,
    adminUserId
  }) {
    const normalizedOrderId = Number(orderId);
    const normalizedRestaurantId = Number(restaurantId || 0);
    const normalizedAdminUserId = Number(adminUserId);
    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error("Pedido inv\xE1lido para estorno.");
    }
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error("Restaurante inv\xE1lido para estorno.");
    }
    if (!Number.isInteger(normalizedAdminUserId) || normalizedAdminUserId <= 0) {
      throw new Error("Admin inv\xE1lido para estorno.");
    }
    const [order, adminUser, issueThread] = await Promise.all([
      prisma_default.order.findFirst({
        where: {
          id: normalizedOrderId,
          restaurantId: normalizedRestaurantId
        },
        include: {
          user: {
            select: {
              name: true,
              phone: true
            }
          },
          restaurant: {
            select: {
              name: true,
              whatsapp: true
            }
          }
        }
      }),
      prisma_default.user.findUnique({
        where: {
          id: normalizedAdminUserId
        },
        select: {
          name: true
        }
      }),
      getOrderIssueThread(normalizedOrderId)
    ]);
    if (!order) {
      throw new Error("Pedido n\xE3o encontrado para este restaurante.");
    }
    if (order.status === OrderStatus9.CANCELADO) {
      throw new Error("Este pedido j\xE1 est\xE1 cancelado.");
    }
    if (!this.hasClientRefundRequest(issueThread)) {
      throw new Error(
        "O cliente ainda n\xE3o solicitou estorno no chat deste pedido."
      );
    }
    const wasPaid = order.paid === true;
    await RefundOrderPaymentService_default.execute(order);
    const updatedOrder = await prisma_default.$transaction(async (tx) => {
      await restoreOrderItemsStock(tx, order);
      return OrderRepository_default.updateStatus(
        order.id,
        OrderStatus9.CANCELADO,
        normalizedRestaurantId,
        tx
      );
    });
    const resolvedByName = String(adminUser?.name || "Admin").trim() || "Admin";
    const resolvedThread = await resolveOrderIssueThread({
      orderId: order.id,
      resolvedByName
    }).catch(() => null);
    const threadPayload = toOrderIssueThreadPayload(resolvedThread);
    const resolvedPayload = threadPayload ? {
      orderId: order.id,
      isResolved: true,
      resolvedAt: threadPayload.resolvedAt,
      resolvedByName
    } : null;
    notifyCustomerOrderStatusChanged({
      customerPhone: order?.user?.phone,
      customerName: order?.user?.name,
      restaurantName: order?.restaurant?.name,
      restaurantWhatsapp: order?.restaurant?.whatsapp,
      orderId: updatedOrder?.id,
      status: updatedOrder?.status
    }).catch((error2) => {
      console.error(
        "[CUSTOMER_STATUS_NOTIFICATION_UNHANDLED]",
        error2 instanceof Error ? error2.message : String(error2)
      );
    });
    io.to(`restaurant:${normalizedRestaurantId}`).emit(
      "order:status-changed",
      updatedOrder
    );
    io.to(`user:${order.userId}`).emit("order:status-changed", updatedOrder);
    if (resolvedPayload) {
      io.to(`restaurant:${normalizedRestaurantId}:admin`).emit(
        "order:issue-resolved",
        resolvedPayload
      );
      io.to(`user:${order.userId}`).emit(
        "order:issue-resolved",
        resolvedPayload
      );
    }
    return {
      order: updatedOrder,
      refunded: wasPaid,
      info: wasPaid ? "Solicita\xE7\xE3o de estorno atendida. Pedido estornado com sucesso." : "Solicita\xE7\xE3o de estorno atendida. Pedido cancelado com sucesso.",
      issueThread: threadPayload
    };
  }
};
var RefundOrderByAdminService_default = new RefundOrderByAdminService();

// src/modules/orders/controllers/RefundOrderByAdminController.ts
var RefundOrderByAdminController = class {
  async handle(req, res) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { restaurantId, id: adminUserId } = req.user;
      const result = await RefundOrderByAdminService_default.execute({
        orderId: id,
        restaurantId,
        adminUserId
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao estornar pedido"
      });
    }
  }
};
var RefundOrderByAdminController_default = new RefundOrderByAdminController();

// src/modules/categories/repositories/CategoryRepository.ts
var CategoryRepository = class {
  async create(data, restaurantId, db = prisma_default) {
    return db.category.create({
      data: {
        ...data,
        restaurantId
      }
    });
  }
  async findAll(restaurantId, db = prisma_default) {
    return db.category.findMany({
      where: {
        restaurantId
      },
      orderBy: {
        name: "asc"
      }
    });
  }
  async findById(id, restaurantId, db = prisma_default) {
    return db.category.findFirst({
      where: {
        id: Number(id),
        restaurantId
      }
    });
  }
  async findByName(name, restaurantId, db = prisma_default) {
    return db.category.findFirst({
      where: {
        restaurantId,
        name: {
          equals: String(name || "").trim(),
          mode: "insensitive"
        }
      }
    });
  }
  async update(id, data, restaurantId, db = prisma_default) {
    return db.category.updateMany({
      where: {
        id: Number(id),
        restaurantId
      },
      data
    });
  }
  async delete(id, restaurantId, db = prisma_default) {
    const categoryId = Number(id);
    const hasProducts = await db.product.findFirst({
      where: {
        categoryId,
        restaurantId
      }
    });
    if (hasProducts) {
      throw new Error(
        "N\xE3o \xE9 possivel excluir uma categoria que possui produtos!"
      );
    }
    return db.category.deleteMany({
      where: {
        id: categoryId,
        restaurantId
      }
    });
  }
  async deleteAllByRestaurant(restaurantId, db = prisma_default) {
    return db.category.deleteMany({
      where: {
        restaurantId
      }
    });
  }
};
var CategoryRepository_default = new CategoryRepository();

// src/modules/orders/services/ClearOrdersAndCategoriesService.ts
var ClearOrdersAndCategoriesService = class {
  async execute(restaurantId) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isFinite(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error("Restaurant inv\xE1lido!");
    }
    await prisma_default.$transaction(async (db) => {
      await OrderRepository_default.deleteAllByRestaurant(normalizedRestaurantId, db);
      await CategoryRepository_default.deleteAllByRestaurant(
        normalizedRestaurantId,
        db
      );
    });
  }
};
var ClearOrdersAndCategoriesService_default = new ClearOrdersAndCategoriesService();

// src/modules/orders/controllers/ClearOrdersAndCategoriesController.ts
var ClearOrdersAndCategoriesController = class {
  async handle(req, res) {
    try {
      const isEnabled = process.env.NODE_ENV !== "production" && String(process.env.ENABLE_DESTRUCTIVE_CLEANUP || "false") === "true";
      const confirmation = String(req.body?.confirmation || "").trim();
      if (!isEnabled) {
        return res.status(404).json({ error: "Opera\xE7\xE3o n\xE3o dispon\xEDvel." });
      }
      if (confirmation !== "EXCLUIR TODOS OS PEDIDOS") {
        return res.status(400).json({
          error: 'Confirma\xE7\xE3o inv\xE1lida. Informe "EXCLUIR TODOS OS PEDIDOS".'
        });
      }
      await ClearOrdersAndCategoriesService_default.execute(req.user.restaurantId);
      return res.status(200).json({
        message: "Pedidos e categorias exclu\xEDdos com sucesso!"
      });
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao excluir pedidos e categorias"
      });
    }
  }
};
var ClearOrdersAndCategoriesController_default = new ClearOrdersAndCategoriesController();

// src/modules/orders/services/FinalizeOrderCardPaymentService.ts
var FinalizeOrderCardPaymentService = class {
  async execute({
    orderId,
    checkoutSessionId,
    restaurantId,
    allowMissingOrder = false
  }) {
    const normalizedCheckoutSessionId = String(checkoutSessionId || "").trim();
    const normalizedRestaurantId = Number(restaurantId || 0) || void 0;
    const order = orderId ? await OrderRepository_default.findById(
      orderId,
      Number(normalizedRestaurantId || 0)
    ) : normalizedCheckoutSessionId ? await OrderRepository_default.findByCardCheckoutSessionId(
      normalizedCheckoutSessionId,
      normalizedRestaurantId
    ) : null;
    if (!order) {
      if (allowMissingOrder) {
        return null;
      }
      throw new Error("Pedido do cartao nao encontrado para esta sessao.");
    }
    if (order.paid === true) {
      return order;
    }
    const updatedOrder = await OrderRepository_default.confirmPayment(
      order.id,
      order.restaurantId
    );
    io.to(`restaurant:${updatedOrder.restaurantId}`).emit(
      "order:payment-confirmed",
      {
        orderId: updatedOrder.id,
        paid: true,
        paymentMethod: updatedOrder.paymentMethod
      }
    );
    io.to(`user:${updatedOrder.userId}`).emit("payment-confirmed", {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
      status: updatedOrder.status
    });
    io.to(`restaurant:${updatedOrder.restaurantId}`).emit(
      "new-order",
      updatedOrder
    );
    io.to(`restaurant:${updatedOrder.restaurantId}`).emit(
      "order:status-changed",
      updatedOrder
    );
    io.to(`user:${updatedOrder.userId}`).emit(
      "order:status-changed",
      updatedOrder
    );
    notifyCustomerPaymentConfirmed({
      customerPhone: updatedOrder?.user?.phone,
      customerName: updatedOrder?.user?.name,
      restaurantName: updatedOrder?.restaurant?.name,
      restaurantWhatsapp: updatedOrder?.restaurant?.whatsapp,
      orderId: updatedOrder?.id,
      total: updatedOrder?.total,
      paymentMethod: updatedOrder?.paymentMethod
    }).catch((error2) => {
      console.error(
        "[CUSTOMER_NOTIFICATION_UNHANDLED]",
        error2 instanceof Error ? error2.message : String(error2)
      );
    });
    return updatedOrder;
  }
};
var FinalizeOrderCardPaymentService_default = new FinalizeOrderCardPaymentService();

// src/modules/orders/controllers/MercadoPagoOrderWebhookController.ts
var APPROVED_STATUSES = /* @__PURE__ */ new Set(["approved", "accredited", "paid"]);
var MercadoPagoOrderWebhookController = class {
  async handle(req, res) {
    try {
      const paymentId = req.body?.data?.id || req.body?.id || req.query?.id;
      const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
      const hintedRestaurantId = Number(
        req.query?.restaurantId || req.body?.restaurantId || 0
      );
      if (!paymentId) {
        return res.sendStatus(200);
      }
      if ((!Number.isInteger(hintedRestaurantId) || hintedRestaurantId <= 0) && !allowGlobalFallback) {
        return res.status(400).json({
          error: "restaurantId obrigatorio no webhook Mercado Pago para ambiente multi-tenant."
        });
      }
      const paymentApi = await getMercadoPagoPaymentApi(
        Number.isInteger(hintedRestaurantId) && hintedRestaurantId > 0 ? hintedRestaurantId : void 0
      );
      const response = await paymentApi.get({
        id: String(paymentId)
      });
      const payment = typeof response === "object" && response !== null ? response.body ?? response : {};
      const status = String(
        payment.status || ""
      ).toLowerCase();
      if (!APPROVED_STATUSES.has(status)) {
        return res.sendStatus(200);
      }
      const externalReference = String(
        payment.external_reference || ""
      ).trim();
      const metadataRestaurantId = Number(
        payment.metadata?.restaurant_id || 0
      );
      const resolvedRestaurantId = Number.isInteger(hintedRestaurantId) && hintedRestaurantId > 0 ? hintedRestaurantId : Number.isInteger(metadataRestaurantId) && metadataRestaurantId > 0 ? metadataRestaurantId : void 0;
      if (externalReference.startsWith("ordercard:")) {
        const [, orderId = "", restaurantId = ""] = externalReference.split(":");
        const referenceRestaurantId = Number(restaurantId || 0);
        const normalizedPaymentId = String(paymentId || "").trim();
        if (!Number.isInteger(referenceRestaurantId) || referenceRestaurantId <= 0 || hintedRestaurantId > 0 && referenceRestaurantId !== hintedRestaurantId || metadataRestaurantId > 0 && referenceRestaurantId !== metadataRestaurantId) {
          return res.status(400).json({
            error: "Webhook Mercado Pago rejeitado: restaurante da transa\xE7\xE3o n\xE3o confere."
          });
        }
        if (orderId) {
          if (normalizedPaymentId) {
            await OrderRepository_default.setCardCheckoutSessionId(
              orderId,
              referenceRestaurantId,
              `mp_pay:${normalizedPaymentId}`
            );
          }
          await FinalizeOrderCardPaymentService_default.execute({
            orderId,
            restaurantId: referenceRestaurantId,
            allowMissingOrder: true
          });
        }
        return res.sendStatus(200);
      }
      await FinalizeOrderPixPaymentService_default.execute({
        paymentId: String(paymentId),
        restaurantId: resolvedRestaurantId,
        allowMissingOrder: true
      });
      return res.sendStatus(200);
    } catch (error2) {
      console.error(
        "[ORDER_PIX_WEBHOOK_ERROR]",
        error2 instanceof Error ? error2.message : String(error2)
      );
      return res.sendStatus(500);
    }
  }
};
var MercadoPagoOrderWebhookController_default = new MercadoPagoOrderWebhookController();

// src/modules/orders/controllers/StripeOrderWebhookController.ts
import Stripe3 from "stripe";
var StripeOrderWebhookController = class {
  async handle(req, res) {
    try {
      const allowInsecureWebhookInDev = process.env.ALLOW_INSECURE_STRIPE_WEBHOOK === "true";
      const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
      const stripeSignature = String(
        req.headers["stripe-signature"] || ""
      ).trim();
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}), "utf-8");
      const untrustedPayload = JSON.parse(rawBody.toString("utf-8") || "{}");
      const untrustedRestaurantId = Number(
        untrustedPayload?.data?.object?.metadata?.restaurantId || 0
      );
      const settings = Number.isInteger(untrustedRestaurantId) && untrustedRestaurantId > 0 ? await RestaurantSettingsRepository_default.findByRestaurantId(
        untrustedRestaurantId
      ) : null;
      const tenantWebhookSecret = String(
        settings?.stripeWebhookSecret || ""
      ).trim();
      const globalWebhookSecret = String(
        process.env.STRIPE_WEBHOOK_SECRET || ""
      ).trim();
      const stripeWebhookSecret = tenantWebhookSecret || (allowGlobalFallback || process.env.NODE_ENV !== "production" ? globalWebhookSecret : "");
      let eventPayload = {};
      if (stripeWebhookSecret) {
        if (!stripeSignature) {
          return res.status(400).json({
            error: "Assinatura Stripe ausente no webhook."
          });
        }
        const stripe = new Stripe3(process.env.STRIPE_SECRET_KEY || "");
        const event = stripe.webhooks.constructEvent(
          rawBody,
          stripeSignature,
          stripeWebhookSecret
        );
        eventPayload = event;
      } else {
        if (process.env.NODE_ENV === "production" && !allowInsecureWebhookInDev) {
          return res.status(503).json({
            error: "Webhook Stripe indisponivel sem STRIPE_WEBHOOK_SECRET em producao."
          });
        }
        eventPayload = untrustedPayload;
      }
      const eventType = String(eventPayload?.type || "").trim();
      const session = eventPayload?.data?.object || {};
      const sessionId = String(session?.id || "").trim();
      const paymentStatus = String(session?.payment_status || "").trim();
      const metadataOrderId = session?.metadata?.orderId || null;
      const metadataRestaurantId = Number(session?.metadata?.restaurantId || 0);
      if (!sessionId) {
        return res.sendStatus(200);
      }
      const allowedEventTypes = /* @__PURE__ */ new Set([
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded"
      ]);
      if (!allowedEventTypes.has(eventType) || paymentStatus !== "paid") {
        return res.sendStatus(200);
      }
      if (!metadataOrderId || !Number.isInteger(metadataRestaurantId) || metadataRestaurantId <= 0) {
        return res.status(400).json({
          error: "Webhook Stripe invalido: metadata orderId/restaurantId obrigatoria."
        });
      }
      await FinalizeOrderCardPaymentService_default.execute({
        orderId: metadataOrderId,
        checkoutSessionId: sessionId,
        restaurantId: metadataRestaurantId,
        allowMissingOrder: true
      });
      return res.sendStatus(200);
    } catch (error2) {
      console.error(
        "[ORDER_CARD_WEBHOOK_ERROR]",
        error2 instanceof Error ? error2.message : String(error2)
      );
      return res.sendStatus(500);
    }
  }
};
var StripeOrderWebhookController_default = new StripeOrderWebhookController();

// src/modules/orders/controllers/PagBankOrderWebhookController.ts
var APPROVED_TRANSACTION_STATUSES = /* @__PURE__ */ new Set(["3", "4"]);
var PagBankWebhookError = class extends Error {
  statusCode;
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
};
function normalizeEnvironment() {
  return "production";
}
async function getPagBankCredentials2(restaurantId) {
  const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
  if (!restaurantId && !allowGlobalFallback) {
    throw new PagBankWebhookError(
      "Webhook PagBank sem restaurantId. Configure notificationURL com restaurantId.",
      400
    );
  }
  const settings = restaurantId ? await RestaurantSettingsRepository_default.findByRestaurantId(restaurantId) : null;
  const settingsEmail = String(settings?.pagbankEmail || "").trim();
  const settingsToken = String(settings?.pagbankToken || "").trim();
  const globalEmail = String(
    process.env.PAGBANK_EMAIL || process.env.PAGSEGURO_EMAIL || ""
  ).trim();
  const globalToken = String(
    process.env.PAGBANK_TOKEN || process.env.PAGSEGURO_TOKEN || ""
  ).trim();
  const email = settingsEmail || (allowGlobalFallback ? globalEmail : "");
  const token = settingsToken || (allowGlobalFallback ? globalToken : "");
  const environment2 = normalizeEnvironment();
  if (!email || !token) {
    throw new PagBankWebhookError(
      "Webhook PagBank indisponivel. Configure email/token PagBank nas configuracoes do restaurante.",
      503
    );
  }
  return { email, token, environment: environment2 };
}
function resolvePagBankApiBaseUrl(environment2) {
  void environment2;
  return "https://ws.pagseguro.uol.com.br";
}
function extractXmlTagValue2(xml, tag) {
  const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, "i");
  const match = regex.exec(String(xml || ""));
  return String(match?.[1] || "").trim();
}
async function fetchPagBankTransactionByNotificationCode(notificationCode, restaurantId) {
  const { email, token, environment: environment2 } = await getPagBankCredentials2(restaurantId);
  const url = `${resolvePagBankApiBaseUrl(environment2)}/v3/transactions/notifications/${encodeURIComponent(notificationCode)}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  const response = await fetch(url, {
    method: "GET"
  });
  const responseText = await response.text();
  if (!response.ok) {
    const providerMessage = extractXmlTagValue2(responseText, "message") || extractXmlTagValue2(responseText, "error") || "Falha ao consultar notificacao no PagBank.";
    throw new PagBankWebhookError(`PagBank webhook: ${providerMessage}`, 502);
  }
  return {
    code: extractXmlTagValue2(responseText, "code"),
    status: extractXmlTagValue2(responseText, "status"),
    reference: extractXmlTagValue2(responseText, "reference")
  };
}
async function fetchPagBankTransactionByCode(transactionCode, restaurantId) {
  const { email, token, environment: environment2 } = await getPagBankCredentials2(restaurantId);
  const url = `${resolvePagBankApiBaseUrl(environment2)}/v3/transactions/${encodeURIComponent(transactionCode)}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  const response = await fetch(url, {
    method: "GET"
  });
  const responseText = await response.text();
  if (!response.ok) {
    const providerMessage = extractXmlTagValue2(responseText, "message") || extractXmlTagValue2(responseText, "error") || "Falha ao consultar transacao no PagBank.";
    throw new PagBankWebhookError(`PagBank webhook: ${providerMessage}`, 502);
  }
  return {
    code: extractXmlTagValue2(responseText, "code"),
    status: extractXmlTagValue2(responseText, "status"),
    reference: extractXmlTagValue2(responseText, "reference")
  };
}
var PagBankOrderWebhookController = class {
  async handle(req, res) {
    try {
      const notificationCode = String(
        req.body?.notificationCode || req.query?.notificationCode || ""
      ).trim();
      const transactionCode = String(
        req.body?.transactionCode || req.body?.code || req.query?.transactionCode || req.query?.code || ""
      ).trim();
      const restaurantIdHint = Number(req.body?.restaurantId || req.query?.restaurantId || 0) || void 0;
      const pagBankOrderId = String(
        req.body?.id || req.body?.order?.id || ""
      ).trim();
      const referenceId = String(
        req.body?.reference_id || req.body?.order?.reference_id || ""
      ).trim();
      const chargeStatuses = [
        ...Array.isArray(req.body?.charges) ? req.body.charges : [],
        ...Array.isArray(req.body?.order?.charges) ? req.body.order.charges : []
      ].map(
        (charge) => String(charge?.status || "").toUpperCase()
      );
      if (pagBankOrderId && referenceId.startsWith("orderpix:") && chargeStatuses.includes("PAID")) {
        await FinalizeOrderPixPaymentService_default.execute({
          paymentId: `pagbank:${pagBankOrderId}`,
          restaurantId: restaurantIdHint,
          allowMissingOrder: true
        });
        return res.sendStatus(200);
      }
      if (!restaurantIdHint && process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK !== "true") {
        return res.status(400).json({
          error: "restaurantId obrigatorio no webhook PagBank para ambiente multi-tenant."
        });
      }
      if (!notificationCode && !transactionCode) {
        return res.sendStatus(200);
      }
      const details = notificationCode ? await fetchPagBankTransactionByNotificationCode(
        notificationCode,
        restaurantIdHint
      ) : await fetchPagBankTransactionByCode(
        transactionCode,
        restaurantIdHint
      );
      if (!APPROVED_TRANSACTION_STATUSES.has(String(details.status || ""))) {
        return res.sendStatus(200);
      }
      const externalReference = String(details.reference || "").trim();
      if (externalReference.startsWith("ordercard:")) {
        const [, orderId = "", restaurantId = ""] = externalReference.split(":");
        const referenceRestaurantId = Number(restaurantId || 0);
        if (!Number.isInteger(referenceRestaurantId) || referenceRestaurantId <= 0 || restaurantIdHint && referenceRestaurantId !== restaurantIdHint) {
          return res.status(400).json({
            error: "Webhook PagBank rejeitado: restaurante da transa\xE7\xE3o n\xE3o confere."
          });
        }
        if (orderId) {
          if (details.code) {
            await OrderRepository_default.setCardCheckoutSessionId(
              orderId,
              referenceRestaurantId,
              `pagbank_tx:${details.code}`
            );
          }
          await FinalizeOrderCardPaymentService_default.execute({
            orderId,
            restaurantId: referenceRestaurantId,
            allowMissingOrder: true
          });
        }
      }
      return res.sendStatus(200);
    } catch (error2) {
      const statusCode = error2 instanceof PagBankWebhookError ? error2.statusCode : 500;
      const message = error2 instanceof Error ? error2.message : "Erro interno no webhook PagBank.";
      console.error("[ORDER_CARD_PAGBANK_WEBHOOK_ERROR]", message);
      return res.status(statusCode).json({ error: message });
    }
  }
};
var PagBankOrderWebhookController_default = new PagBankOrderWebhookController();

// src/modules/orders/services/GetCurrentTableOrderService.ts
var GetCurrentTableOrderService = class {
  async execute(tableId, restaurantId) {
    if (!Number(tableId) || !Number(restaurantId)) {
      return null;
    }
    return OrderRepository_default.findLatestByTable(tableId, restaurantId);
  }
};
var GetCurrentTableOrderService_default = new GetCurrentTableOrderService();

// src/modules/orders/controllers/GetCurrentTableOrderController.ts
var GetCurrentTableOrderController = class {
  async handle(req, res) {
    try {
      const tableId = req.tableSession?.tableId;
      const restaurantId = req.tableSession?.restaurantId;
      const order = await GetCurrentTableOrderService_default.execute(
        Number(tableId || 0),
        Number(restaurantId || 0)
      );
      return res.status(200).json({ order });
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao obter pedido atual da mesa"
      });
    }
  }
};
var GetCurrentTableOrderController_default = new GetCurrentTableOrderController();

// src/middlewares/staffMiddleware.ts
import { UserRole as UserRole12 } from "@prisma/client";
function staffMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "N\xE3o autenticado"
    });
  }
  const allowedRoles = [
    UserRole12.ADMIN,
    UserRole12.FUNCIONARIO,
    UserRole12.MOTOQUEIRO
  ];
  if (!allowedRoles.includes(
    String(req.user.role)
  )) {
    return res.status(403).json({
      error: "Acesso negado"
    });
  }
  return next();
}

// src/middlewares/billingMiddleware.ts
import { InvoiceStatus } from "@prisma/client";

// src/modules/billing/utils/dateUtils.ts
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
function addBusinessDays(date, businessDays) {
  const result = new Date(date);
  let added = 0;
  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (!isWeekend) {
      added += 1;
    }
  }
  return result;
}

// src/modules/billing/utils/billingRules.ts
function getGraceLimitDate(dueDate) {
  return addBusinessDays(dueDate, 5);
}
function isInvoiceBlocking(invoice, now = /* @__PURE__ */ new Date()) {
  if (invoice.status === "ATRASADO") {
    return true;
  }
  if (invoice.status !== "PENDENTE") {
    return false;
  }
  const graceLimitDate = getGraceLimitDate(invoice.dueDate);
  return now > graceLimitDate;
}
function hasBlockingInvoices(invoices = [], now = /* @__PURE__ */ new Date()) {
  return invoices.some((invoice) => isInvoiceBlocking(invoice, now));
}

// src/middlewares/billingMiddleware.ts
async function billingMiddleware(req, res, next) {
  try {
    const restaurantId = req.user.restaurantId;
    const openInvoices = await prisma_default.invoice.findMany({
      where: {
        restaurantId: Number(restaurantId),
        status: {
          in: [InvoiceStatus.PENDENTE, InvoiceStatus.ATRASADO]
        }
      },
      orderBy: {
        dueDate: "asc"
      }
    });
    if (!openInvoices.length) {
      return next();
    }
    const now = /* @__PURE__ */ new Date();
    const shouldBlock = hasBlockingInvoices(openInvoices, now);
    if (shouldBlock) {
      const blockingInvoices = openInvoices.filter(
        (invoice) => isInvoiceBlocking(invoice, now)
      );
      const blockingInvoice = blockingInvoices.find((invoice) => Boolean(invoice.paymentLink)) || blockingInvoices[0] || null;
      const pendingToOverdue = openInvoices.filter((invoice) => invoice.status === InvoiceStatus.PENDENTE).filter((invoice) => isInvoiceBlocking(invoice, now));
      if (pendingToOverdue.length) {
        await prisma_default.invoice.updateMany({
          where: {
            id: {
              in: pendingToOverdue.map((invoice) => invoice.id)
            }
          },
          data: {
            status: InvoiceStatus.ATRASADO
          }
        });
      }
      const subscription = await prisma_default.subscription.findUnique({
        where: {
          restaurantId: Number(restaurantId)
        }
      });
      if (subscription) {
        await prisma_default.subscription.update({
          where: { id: subscription.id },
          data: { status: "EXPIRADA" }
        });
      }
      await prisma_default.restaurant.update({
        where: { id: Number(restaurantId) },
        data: { active: false }
      });
      return res.status(403).json({
        code: "BILLING_BLOCKED",
        blocked: true,
        error: "Restaurante bloqueado por inadimpl\xEAncia",
        invoiceId: blockingInvoice?.id ?? null,
        paymentLink: blockingInvoice?.paymentLink ?? null,
        dueDate: blockingInvoice?.dueDate ?? null
      });
    }
    return next();
  } catch (_error) {
    return res.status(500).json({
      error: "Erro ao validar cobran\xE7a"
    });
  }
}

// src/middlewares/sessionMiddleware.ts
import { TableSessionStatus as TableSessionStatus3 } from "@prisma/client";
async function sessionMiddleware(req, res, next) {
  try {
    const rawSessionToken = req.headers["x-session-token"] || req.headers.authorization?.replace("Bearer ", "");
    const sessionToken = Array.isArray(rawSessionToken) ? rawSessionToken[0] : rawSessionToken;
    if (!sessionToken) {
      return res.status(401).json({
        error: "SessionToken n\xE3o informado"
      });
    }
    const session = await TableSessionRepository_default.findBySessionToken(sessionToken);
    if (!session) {
      return res.status(404).json({
        error: "Sess\xE3o n\xE3o encontrada"
      });
    }
    if (session.status !== TableSessionStatus3.OPEN) {
      return res.status(403).json({
        error: "Sess\xE3o encerrada"
      });
    }
    req.tableSession = {
      id: session.id,
      tableId: session.tableId,
      restaurantId: session.table.restaurantId
    };
    return next();
  } catch (error2) {
    return res.status(500).json({
      error: error2 instanceof Error ? error2.message : "Erro ao validar sessao"
    });
  }
}

// src/middlewares/orderAccessMiddleware.ts
async function orderAccessMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const sessionToken = req.headers["x-session-token"];
  const bodyRestaurantId = Number(req.body?.restaurantId || 0);
  const orderType = String(req.body?.type || "").toUpperCase();
  if (orderType === "MESA" && !sessionToken) {
    return res.status(401).json({
      error: "Sess\xE3o da mesa n\xE3o informada. Valide o PIN da mesa para continuar."
    });
  }
  if (orderType === "MESA" && sessionToken) {
    return sessionMiddleware(req, res, () => {
      const requestedTableId = Number(req.body?.tableId || 0);
      if (requestedTableId > 0 && requestedTableId !== Number(req.tableSession.tableId)) {
        return res.status(403).json({
          error: "Sess\xE3o da mesa inv\xE1lida para este pedido."
        });
      }
      req.body.tableId = Number(req.tableSession.tableId);
      req.user = {
        id: null,
        restaurantId: req.tableSession.restaurantId,
        role: "CLIENTE"
      };
      return next();
    });
  }
  if (authHeader) {
    return authMiddleware(req, res, next);
  }
  if (sessionToken) {
    return sessionMiddleware(req, res, () => {
      if (orderType === "MESA") {
        const requestedTableId = Number(req.body?.tableId || 0);
        if (requestedTableId > 0 && requestedTableId !== Number(req.tableSession.tableId)) {
          return res.status(403).json({
            error: "Sess\xE3o da mesa inv\xE1lida para este pedido."
          });
        }
        req.body.tableId = Number(req.tableSession.tableId);
      }
      req.user = {
        id: null,
        restaurantId: req.tableSession.restaurantId,
        role: "CLIENTE"
      };
      return next();
    });
  }
  if (Number.isInteger(bodyRestaurantId) && bodyRestaurantId > 0) {
    req.user = {
      id: null,
      restaurantId: bodyRestaurantId,
      role: "CLIENTE",
      isGuest: true
    };
    return next();
  }
  return res.status(401).json({ error: "Token n\xE3o informado!" });
}

// src/middlewares/security/orderPaymentRateLimitMiddleware.ts
import rateLimit3, { ipKeyGenerator as ipKeyGenerator3 } from "express-rate-limit";
function getOrderActorKey(req) {
  const orderId = String(req.params.id || "").trim().slice(0, 32);
  const userId = String(req.user?.id || "anonymous").slice(0, 32);
  const ip = ipKeyGenerator3(String(req.ip || "unknown").trim());
  return `${ip}:${userId}:${orderId || "no-order"}`;
}
var paymentPinAttemptRateLimitMiddleware = rateLimit3({
  windowMs: Number(
    process.env.PAYMENT_PIN_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1e3
  ),
  max: Number(process.env.PAYMENT_PIN_RATE_LIMIT_MAX_REQUESTS || 8),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: getOrderActorKey,
  message: {
    error: "Muitas tentativas de PIN para este pedido. Aguarde alguns minutos."
  }
});
var paymentPinRequestRateLimitMiddleware = rateLimit3({
  windowMs: Number(
    process.env.PAYMENT_PIN_REQUEST_RATE_LIMIT_WINDOW_MS || 60 * 1e3
  ),
  max: Number(process.env.PAYMENT_PIN_REQUEST_RATE_LIMIT_MAX_REQUESTS || 3),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getOrderActorKey,
  message: {
    error: "Muitas solicita\xE7\xF5es de PIN para este pedido. Aguarde um instante."
  }
});

// src/modules/orders/routes/orderRoutes.ts
var router3 = Router3();
router3.post("/webhook/mercadopago", MercadoPagoOrderWebhookController_default.handle);
router3.post("/webhook/stripe", StripeOrderWebhookController_default.handle);
router3.post("/webhook/pagbank", PagBankOrderWebhookController_default.handle);
router3.post("/", orderAccessMiddleware, billingMiddleware, (req, res) => {
  CreateOrderController_default.handle(req, res);
});
router3.post(
  "/pix/payment",
  orderAccessMiddleware,
  billingMiddleware,
  (req, res) => {
    CreateOrderPixPaymentController_default.handle(req, res);
  }
);
router3.post(
  "/card/checkout",
  orderAccessMiddleware,
  billingMiddleware,
  (req, res) => {
    CreateOrderCardCheckoutController_default.handle(req, res);
  }
);
router3.post(
  "/pix/payment/status",
  orderAccessMiddleware,
  billingMiddleware,
  (req, res) => {
    GetOrderPixPaymentStatusController_default.handle(req, res);
  }
);
router3.post(
  "/pix/payment/confirm",
  orderAccessMiddleware,
  billingMiddleware,
  (req, res) => {
    ConfirmOrderPixPaymentController_default.handle(req, res);
  }
);
router3.put("/:id/status", authMiddleware, staffMiddleware, (req, res) => {
  UpdateOrderStatusController_default.handle(req, res);
});
router3.patch("/:id/claim-delivery", authMiddleware, (req, res) => {
  ClaimOrderForDeliveryController_default.handle(req, res);
});
router3.patch(
  "/:id/confirm-payment",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    ConfirmOrderPaymentController_default.handle(req, res);
  }
);
router3.post(
  "/:id/payment-confirmation-pin",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    GenerateOrderPaymentConfirmationPinController_default.handle(req, res);
  }
);
router3.post(
  "/:id/request-payment-confirmation-pin",
  authMiddleware,
  staffMiddleware,
  paymentPinRequestRateLimitMiddleware,
  (req, res) => {
    RequestOrderPaymentConfirmationPinController_default.handle(req, res);
  }
);
router3.patch(
  "/:id/confirm-payment-with-pin",
  authMiddleware,
  staffMiddleware,
  paymentPinAttemptRateLimitMiddleware,
  (req, res) => {
    ConfirmOrderPaymentWithPinController_default.handle(req, res);
  }
);
router3.get("/", authMiddleware, staffMiddleware, (req, res) => {
  ListOrdersController_default.handle(req, res);
});
router3.get("/courier/finance", authMiddleware, (req, res) => {
  GetCourierFinanceController_default.handle(req, res);
});
router3.delete(
  "/cleanup/orders-categories",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    ClearOrdersAndCategoriesController_default.handle(req, res);
  }
);
router3.get("/my-orders", authMiddleware, (req, res) => {
  ListMyOrdersController_default.handle(req, res);
});
router3.get("/table/current", sessionMiddleware, (req, res) => {
  GetCurrentTableOrderController_default.handle(req, res);
});
router3.get("/:id/tracking", authMiddleware, (req, res) => {
  GetDeliveryTrackingController_default.handle(req, res);
});
router3.get("/:id", authMiddleware, staffMiddleware, (req, res) => {
  GetOrderByIdController_default.handle(req, res);
});
router3.patch("/:id/cancel", authMiddleware, (req, res) => {
  CancelOrderController_default.handle(req, res);
});
router3.post("/:id/report-issue", authMiddleware, (req, res) => {
  ReportOrderIssueController_default.handle(req, res);
});
router3.get("/:id/issue-thread", authMiddleware, (req, res) => {
  GetOrderIssueThreadController_default.handle(req, res);
});
router3.post("/:id/reply-issue", authMiddleware, adminMiddleware, (req, res) => {
  ReplyOrderIssueController_default.handle(req, res);
});
router3.patch(
  "/:id/resolve-issue",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    ResolveOrderIssueController_default.handle(req, res);
  }
);
router3.patch("/:id/refund", authMiddleware, adminMiddleware, (req, res) => {
  RefundOrderByAdminController_default.handle(req, res);
});
var orderRoutes_default = router3;

// src/modules/restaurants/routes/restaurantRoutes.ts
import { Router as Router4 } from "express";

// src/middlewares/superAdminMiddleware.ts
import { UserRole as UserRole13 } from "@prisma/client";
function superAdminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "N\xE3o autenticado" });
  }
  if (req.user.role !== UserRole13.SUPER_ADMIN) {
    return res.status(403).json({ message: "Acesso negado!" });
  }
  return next();
}

// src/modules/restaurants/services/CreateRestaurantService.ts
import bcrypt8 from "bcrypt";

// src/modules/subscription/repositories/SubscriptionRepository.ts
var SubscriptionRepository = class {
  async create(data, tx = prisma_default) {
    return tx.subscription.create({
      data
    });
  }
  async findByRestaurantId(restaurantId) {
    return prisma_default.subscription.findUnique({
      where: {
        restaurantId: Number(restaurantId)
      }
    });
  }
  async update(restaurantId, data, tx = prisma_default) {
    return tx.subscription.update({
      where: {
        restaurantId: Number(restaurantId)
      },
      data
    });
  }
};
var SubscriptionRepository_default = new SubscriptionRepository();

// src/modules/restaurants/services/CreateRestaurantService.ts
import { PlanType as PlanType2, SubscriptionStatus, UserRole as UserRole14 } from "@prisma/client";

// src/validators/RestaurantValidator.ts
import { z as z6 } from "zod";
var slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
var COMMON_EMAIL_DOMAIN_TYPOS = {
  "hotmali.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "gmil.com": "gmail.com",
  "gmai.com": "gmail.com",
  "yahho.com": "yahoo.com",
  "outlok.com": "outlook.com"
};
function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "").trim();
}
function validateEmailDomainTypos(value) {
  const domain = String(value || "").split("@")[1]?.trim().toLowerCase();
  if (!domain) {
    return { valid: true };
  }
  const suggestion = COMMON_EMAIL_DOMAIN_TYPOS[domain];
  if (!suggestion) {
    return { valid: true };
  }
  return {
    valid: false,
    message: `Dom\xEDnio de email inv\xE1lido (${domain}). Voc\xEA quis dizer ${suggestion}?`
  };
}
var createRestaurantSchema = z6.object({
  restaurant: z6.object({
    name: z6.string().trim().min(2, "Nome do restaurante deve ter no m\xEDnimo 2 caracteres!").max(120, "Nome do restaurante muito longo!"),
    slug: z6.string().trim().toLowerCase().min(3, "Slug deve ter no m\xEDnimo 3 caracteres!").max(60, "Slug muito longo!").regex(
      slugPattern,
      "Slug inv\xE1lido! Use apenas letras min\xFAsculas, n\xFAmeros e h\xEDfen."
    ),
    email: z6.string().trim().toLowerCase().email("Email do restaurante inv\xE1lido!").superRefine((value, context) => {
      const result = validateEmailDomainTypos(value);
      if (!result.valid) {
        context.addIssue({
          code: z6.ZodIssueCode.custom,
          message: result.message
        });
      }
    }),
    phone: z6.string().optional().transform((value) => normalizePhone(value || "")).refine(
      (value) => !value || /^\d{10,11}$/.test(value),
      "Telefone do restaurante inv\xE1lido!"
    ),
    whatsapp: z6.string().optional(),
    cnpj: z6.string().optional(),
    logo: z6.string().optional(),
    coverImage: z6.string().optional(),
    description: z6.string().optional(),
    address: z6.string().trim().optional(),
    city: z6.string().trim().optional().refine(
      (value) => !value || value.length >= 2,
      "Cidade deve ter no m\xEDnimo 2 caracteres!"
    ),
    state: z6.string().trim().toUpperCase().optional().refine(
      (value) => !value || /^[A-Z]{2}$/.test(value),
      "Estado deve conter exatamente 2 letras."
    ),
    zipCode: z6.string().optional(),
    openingHours: z6.string().optional()
  }),
  admin: z6.object({
    name: z6.string().trim().min(2, "Nome do admin deve ter no m\xEDnimo 2 caracteres!").max(120, "Nome do admin muito longo!"),
    email: z6.string().trim().toLowerCase().email("Email do admin inv\xE1lido!").superRefine((value, context) => {
      const result = validateEmailDomainTypos(value);
      if (!result.valid) {
        context.addIssue({
          code: z6.ZodIssueCode.custom,
          message: result.message
        });
      }
    }),
    password: z6.string().min(6, "Senha deve ter no m\xEDnimo 6 caracteres!").max(72, "Senha muito longa!")
  })
});

// src/modules/restaurants/services/CreateRestaurantService.ts
function requireDefined2(value, message) {
  if (value === null || value === void 0) {
    throw new Error(message);
  }
  return value;
}
var CreateRestaurantService = class {
  async execute({ restaurant, admin }) {
    const parsedPayloadResult = createRestaurantSchema.safeParse({
      restaurant,
      admin
    });
    if (!parsedPayloadResult.success) {
      const firstIssue = parsedPayloadResult.error.issues[0];
      throw new Error(firstIssue?.message || "Dados inv\xE1lidos para cadastro.");
    }
    const parsedPayload = parsedPayloadResult.data;
    const parsedRestaurant = parsedPayload.restaurant;
    const parsedAdmin = parsedPayload.admin;
    const restaurantExists = await RestaurantRepository_default.findByEmail(
      parsedRestaurant.email
    );
    if (restaurantExists) {
      throw new Error("J\xE1 existe um restaurante com esse e-mail.");
    }
    const slugExists = await RestaurantRepository_default.findBySlug(
      parsedRestaurant.slug
    );
    if (slugExists) {
      throw new Error("Esse slug j\xE1 existe. Escolha outro.");
    }
    const userExists = await UserRepository_default.findByEmail(parsedAdmin.email);
    if (userExists) {
      throw new Error("J\xE1 existe um admin com esse e-mail.");
    }
    return prisma_default.$transaction(async (tx) => {
      const requiredName = requireDefined2(
        parsedRestaurant.name,
        "Nome do restaurante \xE9 obrigat\xF3rio."
      );
      const requiredSlug = requireDefined2(
        parsedRestaurant.slug,
        "Slug do restaurante \xE9 obrigat\xF3rio."
      );
      const requiredEmail = requireDefined2(
        parsedRestaurant.email,
        "Email do restaurante \xE9 obrigat\xF3rio."
      );
      const restaurantCreateData = {
        ...parsedRestaurant,
        name: requiredName,
        slug: requiredSlug,
        email: requiredEmail
      };
      const createdRestaurant = await RestaurantRepository_default.create(
        restaurantCreateData,
        tx
      );
      const passwordHash = await bcrypt8.hash(parsedAdmin.password, 10);
      const createdAdmin = await UserRepository_default.create(
        {
          name: parsedAdmin.name,
          email: parsedAdmin.email,
          password: passwordHash,
          role: UserRole14.ADMIN,
          active: true,
          mustChangePassword: true,
          restaurantId: createdRestaurant.id
        },
        tx
      );
      const TRIAL_DAYS = 30;
      const today = /* @__PURE__ */ new Date();
      const trialEndsAt = new Date(today);
      trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
      await SubscriptionRepository_default.create(
        {
          restaurantId: createdRestaurant.id,
          plan: PlanType2.BASICO,
          status: SubscriptionStatus.TESTE,
          trialEndsAt,
          currentPeriodStart: today,
          currentPeriodEnd: trialEndsAt
        },
        tx
      );
      return {
        restaurant: createdRestaurant,
        admin: {
          id: createdAdmin.id,
          name: createdAdmin.name,
          email: createdAdmin.email
        }
      };
    });
  }
};
var CreateRestaurantService_default = new CreateRestaurantService();

// src/modules/restaurants/controllers/CreateRestaurantController.ts
var CreateRestaurantController = class {
  async handle(req, res) {
    try {
      const { restaurant, admin } = req.body;
      const result = await CreateRestaurantService_default.execute({
        restaurant,
        admin
      });
      return res.status(201).json(result);
    } catch (error2) {
      return res.status(400).json({
        message: error2 instanceof Error ? error2.message : "Erro ao criar restaurante"
      });
    }
  }
};
var CreateRestaurantController_default = new CreateRestaurantController();

// src/modules/restaurants/services/ListRestaurantsService.ts
var PLAN_PRICES = {
  BASICO: 299,
  PROFISSIONAL: 499,
  PREMIUM: 799
};
function getRestaurantStatus(restaurant) {
  if (!restaurant.active) {
    return "Bloqueado";
  }
  if (restaurant.subscription?.status === "EXPIRADA" || restaurant.subscription?.status === "CANCELADA") {
    return "Expirado";
  }
  if (!restaurant.subscription || restaurant.subscription?.status === "TESTE") {
    return "Aviso";
  }
  return "Ativo";
}
var ListRestaurantsService = class {
  async execute() {
    const restaurants = await RestaurantRepository_default.listAll();
    const now = /* @__PURE__ */ new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const revenueByRestaurant = await prisma_default.order.groupBy({
      by: ["restaurantId"],
      where: {
        paid: true,
        status: { not: "CANCELADO" },
        createdAt: {
          gte: periodStart,
          lt: periodEnd
        }
      },
      _sum: {
        total: true
      }
    });
    const revenueMap = new Map(
      revenueByRestaurant.map((item) => [
        item.restaurantId,
        Number(item._sum.total || 0)
      ])
    );
    return restaurants.map((restaurant) => ({
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      email: restaurant.email,
      city: restaurant.city,
      state: restaurant.state,
      cnpj: restaurant.cnpj,
      active: restaurant.active,
      createdAt: restaurant.createdAt,
      owner: restaurant.users?.[0] || null,
      subscription: restaurant.subscription || null,
      status: getRestaurantStatus(restaurant),
      uptime: restaurant.active ? 100 : 0,
      price: restaurant.subscription?.plan ? PLAN_PRICES[restaurant.subscription.plan] : 0,
      revenue: revenueMap.get(restaurant.id) || 0,
      nextBillingAt: restaurant.subscription?.currentPeriodEnd ?? null
    }));
  }
};
var ListRestaurantsService_default = new ListRestaurantsService();

// src/modules/restaurants/controllers/ListRestaurantsController.ts
var ListRestaurantsController = class {
  async handle(req, res) {
    try {
      const restaurants = await ListRestaurantsService_default.execute();
      return res.status(200).json(restaurants);
    } catch (error2) {
      return res.status(400).json({
        message: error2 instanceof Error ? error2.message : "Erro ao listar restaurantes"
      });
    }
  }
};
var ListRestaurantsController_default = new ListRestaurantsController();

// src/modules/restaurants/services/GetRestaurantsMetricsService.ts
function last6Months() {
  return Array.from({ length: 6 }, (_, i) => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const label = d.toLocaleString("pt-BR", { month: "short" });
    return { start, end, label };
  });
}
var GetRestaurantsMetricsService = class {
  async execute() {
    const months = last6Months();
    const [restaurants, paidOrders, invoices] = await Promise.all([
      prisma_default.restaurant.findMany({
        select: { id: true, active: true }
      }),
      prisma_default.order.findMany({
        where: { paid: true, status: { not: "CANCELADO" } },
        select: { total: true, systemFee: true }
      }),
      prisma_default.invoice.findMany({
        where: { status: { in: ["PENDENTE", "ATRASADO"] } },
        select: { id: true, total: true }
      })
    ]);
    const [monthlyGrowth, monthlyRevenue] = await Promise.all([
      Promise.all(
        months.map(async ({ end, label }) => {
          const count = await prisma_default.restaurant.count({
            where: { active: true, createdAt: { lte: end } }
          });
          return { label, count };
        })
      ),
      Promise.all(
        months.map(async ({ start, end, label }) => {
          const result = await prisma_default.order.aggregate({
            where: {
              paid: true,
              status: { not: "CANCELADO" },
              createdAt: { gte: start, lte: end }
            },
            _sum: { systemFee: true }
          });
          return { label, value: Number(result._sum.systemFee || 0) };
        })
      )
    ]);
    const totalGenerated = paidOrders.reduce(
      (acc, o) => acc + Number(o.total || 0),
      0
    );
    const totalReceivable = paidOrders.reduce(
      (acc, o) => acc + Number(o.systemFee || 0),
      0
    );
    const pendingInvoiceTotal = invoices.reduce(
      (acc, i) => acc + Number(i.total || 0),
      0
    );
    const activeRestaurants = restaurants.filter((r) => r.active).length;
    return {
      restaurantsTotal: restaurants.length,
      restaurantsActive: activeRestaurants,
      restaurantsInactive: restaurants.length - activeRestaurants,
      totalGenerated,
      totalReceivable,
      pendingInvoicesCount: invoices.length,
      pendingInvoicesTotal: pendingInvoiceTotal,
      monthlyGrowth,
      monthlyRevenue
    };
  }
};
var GetRestaurantsMetricsService_default = new GetRestaurantsMetricsService();

// src/modules/restaurants/controllers/GetRestaurantsMetricsController.ts
var GetRestaurantsMetricsController = class {
  async handle(req, res) {
    try {
      const metrics = await GetRestaurantsMetricsService_default.execute();
      return res.status(200).json(metrics);
    } catch (error2) {
      return res.status(400).json({
        message: error2 instanceof Error ? error2.message : "Erro ao buscar metricas de restaurantes"
      });
    }
  }
};
var GetRestaurantsMetricsController_default = new GetRestaurantsMetricsController();

// src/modules/restaurants/routes/restaurantRoutes.ts
var router4 = Router4();
router4.get("/", authMiddleware, superAdminMiddleware, (req, res) => {
  ListRestaurantsController_default.handle(req, res);
});
router4.get("/metrics", authMiddleware, superAdminMiddleware, (req, res) => {
  GetRestaurantsMetricsController_default.handle(req, res);
});
router4.post("/", authMiddleware, superAdminMiddleware, (req, res) => {
  CreateRestaurantController_default.handle(req, res);
});
var restaurantRoutes_default = router4;

// src/modules/categories/routes/CategoryRoutes.ts
import { Router as Router5 } from "express";

// src/validators/CategoryValidator.ts
import { z as z7 } from "zod";
var createCategorySchema = z7.object({
  name: z7.string().trim().min(1, "Nome \xE9 obrigat\xF3rio!").max(50, "Nome deve ter no m\xE1ximo 50 caracteres."),
  description: z7.string().trim().max(255, "Descri\xE7\xE3o deve ter no m\xE1ximo 255 caracteres.").optional(),
  image: z7.string().trim().optional(),
  active: z7.boolean().optional()
});

// src/modules/categories/services/CreateCategoryService.ts
var CreateCategoryService = class {
  async execute(data, restaurantId) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!normalizedRestaurantId) {
      throw new Error("Restaurante n\xE3o encontrado");
    }
    const parsed = createCategorySchema.parse(data);
    const normalizedName = String(parsed.name || "").trim();
    const existingCategory = await CategoryRepository_default.findByName(
      normalizedName,
      normalizedRestaurantId
    );
    if (existingCategory) {
      throw new Error("J\xE1 existe uma categoria com esse nome.");
    }
    const category = await CategoryRepository_default.create(
      {
        ...parsed,
        name: normalizedName
      },
      normalizedRestaurantId
    );
    return {
      category
    };
  }
};
var CreateCategoryService_default = new CreateCategoryService();

// src/modules/categories/controllers/CreateCategoryController.ts
var CreateCategoryController = class {
  async handle(req, res) {
    try {
      const { name, description, image, active } = req.body;
      const category = await CreateCategoryService_default.execute(
        {
          name,
          description,
          image,
          active
        },
        req.user.restaurantId
      );
      return res.status(201).json(category);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao criar categoria"
      });
    }
  }
};
var CreateCategoryController_default = new CreateCategoryController();

// src/modules/categories/services/DeleteCategoryService.ts
var DeleteCategoryService = class {
  async execute(id, restaurantId) {
    const normalizedRestaurantId = Number(restaurantId);
    const category = await CategoryRepository_default.findById(
      id,
      normalizedRestaurantId
    );
    if (!category) {
      throw new Error("Categoria n\xE3o encontrada!");
    }
    await CategoryRepository_default.delete(id, normalizedRestaurantId);
  }
};
var DeleteCategoryService_default = new DeleteCategoryService();

// src/modules/categories/controllers/DeleteCategoryController.ts
var DeleteCategoryController = class {
  async handle(req, res) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await DeleteCategoryService_default.execute(id, req.user.restaurantId);
      return res.status(200).json({ message: "Categoria deletada com sucesso!" });
    } catch (error2) {
      return res.status(400).json({
        message: error2 instanceof Error ? error2.message : "Erro ao deletar categoria"
      });
    }
  }
};
var DeleteCategoryController_default = new DeleteCategoryController();

// src/modules/categories/services/UpdateCategoryService.ts
var UpdateCategoryService = class {
  async execute(id, data, restaurantId) {
    const normalizedRestaurantId = Number(restaurantId);
    const parsedData = createCategorySchema.partial().parse(data);
    const category = await CategoryRepository_default.findById(
      id,
      normalizedRestaurantId
    );
    if (!category) {
      throw new Error("Categoria n\xE3o encontrada!");
    }
    const hasNameUpdate = Object.prototype.hasOwnProperty.call(
      parsedData,
      "name"
    );
    if (hasNameUpdate) {
      const normalizedName = String(parsedData.name || "").trim();
      if (!normalizedName) {
        throw new Error("Nome da categoria inv\xE1lido.");
      }
      const existingCategory = await CategoryRepository_default.findByName(
        normalizedName,
        normalizedRestaurantId
      );
      if (existingCategory && Number(existingCategory.id) !== Number(id)) {
        throw new Error("J\xE1 existe uma categoria com esse nome.");
      }
      parsedData.name = normalizedName;
    }
    return CategoryRepository_default.update(id, parsedData, normalizedRestaurantId);
  }
};
var UpdateCategoryService_default = new UpdateCategoryService();

// src/modules/categories/controllers/UpdateCategoryController.ts
var UpdateCategoryController = class {
  async handle(req, res) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const data = req.body;
      const category = await UpdateCategoryService_default.execute(
        id,
        data,
        req.user.restaurantId
      );
      return res.status(200).json(category);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao atualizar categoria"
      });
    }
  }
};
var UpdateCategoryController_default = new UpdateCategoryController();

// src/modules/categories/services/ListCategoryService.ts
var ListCategoryService = class {
  async execute(restaurantId) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!normalizedRestaurantId) {
      throw new Error("Restaurante n\xE3o encontrado!");
    }
    const categories = await CategoryRepository_default.findAll(normalizedRestaurantId);
    return {
      categories
    };
  }
};
var ListCategoryService_default = new ListCategoryService();

// src/modules/categories/controllers/ListCategoryController.ts
var ListCategoryController = class {
  async handle(req, res) {
    try {
      const categories = await ListCategoryService_default.execute(
        req.user.restaurantId
      );
      return res.status(200).json(categories);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao listar categorias"
      });
    }
  }
};
var ListCategoryController_default = new ListCategoryController();

// src/modules/categories/routes/CategoryRoutes.ts
var router5 = Router5();
router5.post("/", authMiddleware, adminMiddleware, (req, res) => {
  CreateCategoryController_default.handle(req, res);
});
router5.delete("/:id", authMiddleware, adminMiddleware, (req, res) => {
  DeleteCategoryController_default.handle(req, res);
});
router5.put("/:id", authMiddleware, adminMiddleware, (req, res) => {
  UpdateCategoryController_default.handle(req, res);
});
router5.get("/", authMiddleware, adminMiddleware, (req, res) => {
  ListCategoryController_default.handle(req, res);
});
var CategoryRoutes_default = router5;

// src/modules/employee/routes/EmployeeRoutes.ts
import { Router as Router6 } from "express";

// src/modules/employee/services/CreateEmployeeService.ts
import { UserRole as UserRole16 } from "@prisma/client";

// src/modules/employee/repositories/EmployeeRepository.ts
import { UserRole as UserRole15 } from "@prisma/client";
var EmployeeRepository = class {
  async findByEmail(email, db = prisma_default) {
    return db.user.findFirst({
      where: { email }
    });
  }
  async create(data, db = prisma_default) {
    return db.user.create({
      data
    });
  }
  async findAllByRestaurant(restaurantId, db = prisma_default) {
    return db.user.findMany({
      where: {
        restaurantId,
        role: {
          in: [UserRole15.FUNCIONARIO, UserRole15.MOTOQUEIRO]
        }
      }
    });
  }
  async findById(id, restaurantId, db = prisma_default) {
    return db.user.findFirst({
      where: {
        id: Number(id),
        restaurantId,
        role: {
          in: [UserRole15.FUNCIONARIO, UserRole15.MOTOQUEIRO]
        }
      }
    });
  }
  async update(id, data, restaurantId, db = prisma_default) {
    const employee = await this.findById(id, restaurantId, db);
    if (!employee) {
      throw new Error("Funcion\xE1rio n\xE3o encontrado!");
    }
    return db.user.update({
      where: {
        id: Number(id)
      },
      data
    });
  }
  async deactivate(id, restaurantId, db = prisma_default) {
    const employee = await this.findById(id, restaurantId, db);
    if (!employee) {
      throw new Error("Funcion\xE1rio n\xE3o encontrado!");
    }
    return db.user.update({
      where: {
        id: Number(id)
      },
      data: {
        active: false
      }
    });
  }
};
var EmployeeRepository_default = new EmployeeRepository();

// src/modules/employee/services/CreateEmployeeService.ts
import bcrypt9 from "bcrypt";
var CreateEmployeeService = class {
  async execute({
    name,
    email,
    password,
    phone,
    restaurantId,
    role,
    subRole,
    cpf
  }) {
    const exists = await EmployeeRepository_default.findByEmail(email);
    if (exists) {
      throw new Error("Email j\xE1 est\xE1 em uso!");
    }
    const passwordHash = await bcrypt9.hash(password, 10);
    const employee = await EmployeeRepository_default.create({
      name,
      email,
      password: passwordHash,
      phone,
      cpf: cpf ? String(cpf).replace(/\D/g, "") : void 0,
      restaurantId,
      role: role || UserRole16.FUNCIONARIO,
      subRole: subRole ?? null
    });
    return employee;
  }
};
var CreateEmployeeService_default = new CreateEmployeeService();

// src/validators/EmployeeSchema.ts
import { FuncionarioSubRole as FuncionarioSubRole2, UserRole as UserRole17 } from "@prisma/client";
import { z as z8 } from "zod";
var phoneRegex = /^(?:\+?55\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})\s?-?\s?(\d{4}))$/;
var EmployeeUserSchema = z8.object({
  name: z8.string().min(1, "Nome obrigat\xF3rio"),
  email: z8.string().email("Email inv\xE1lido"),
  password: z8.string().min(6, "Senha deve conter no m\xEDnimo 6 caracteres!"),
  confirmPassword: z8.string().min(6, "Confirma\xE7\xE3o de senha obrigat\xF3ria"),
  role: z8.nativeEnum(UserRole17).optional().refine(
    (value) => !value || value === UserRole17.FUNCIONARIO || value === UserRole17.MOTOQUEIRO,
    {
      message: "Cargo inv\xE1lido"
    }
  ),
  phone: z8.string().min(1, "Telefone obrigat\xF3rio").regex(phoneRegex, "N\xFAmero de telefone inv\xE1lido!"),
  subRole: z8.nativeEnum(FuncionarioSubRole2).optional().nullable(),
  cpf: z8.string().optional().refine(
    (value) => !value || /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(
      value.replace(/\D/g, "").replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")
    ),
    { message: "CPF inv\xE1lido" }
  )
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas n\xE3o conferem!",
  path: ["confirmPassword"]
});
var loginSchema2 = z8.object({
  email: z8.string().email("Email inv\xE1lido"),
  password: z8.string().min(1, "Senha obrigat\xF3ria")
});

// src/modules/employee/Controllers/CreateEmployeeController.ts
var CreateEmployeeController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const {
        name,
        email,
        password,
        confirmPassword,
        phone,
        role,
        cpf,
        subRole
      } = req.body;
      EmployeeUserSchema.parse({
        name,
        email,
        password,
        confirmPassword,
        phone,
        role,
        subRole,
        cpf
      });
      const employee = await CreateEmployeeService_default.execute({
        name,
        email,
        password,
        phone,
        role,
        subRole: subRole ?? null,
        cpf,
        restaurantId
      });
      return res.status(201).json(employee);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao criar funcionario"
      });
    }
  }
};
var CreateEmployeeController_default = new CreateEmployeeController();

// src/modules/employee/services/ListEmployeeService.ts
var ListEmployeeService = class {
  async execute(restaurantId) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!normalizedRestaurantId) {
      throw new Error("RestaurantId obrigat\xF3rio");
    }
    return EmployeeRepository_default.findAllByRestaurant(normalizedRestaurantId);
  }
};
var ListEmployeeService_default = new ListEmployeeService();

// src/modules/employee/Controllers/ListEmployeeController.ts
var ListEmployeeController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const employess = await ListEmployeeService_default.execute(restaurantId);
      return res.status(200).json(employess);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao listar funcionarios"
      });
    }
  }
};
var ListEmployeeController_default = new ListEmployeeController();

// src/modules/employee/services/UpdateEmployeeService.ts
var UpdateEmployeeService = class {
  async execute({
    id,
    restaurantId,
    name,
    phone,
    email,
    subRole
  }) {
    const employee = await EmployeeRepository_default.findById(id, restaurantId);
    if (!employee) {
      throw new Error("Funcion\xE1rio n\xE3o encontrado!");
    }
    const emailExists = await EmployeeRepository_default.findByEmail(email);
    if (emailExists && emailExists.id !== employee.id) {
      throw new Error("Email j\xE1 est\xE1 em uso!");
    }
    return EmployeeRepository_default.update(
      id,
      { name, phone, email, subRole: subRole ?? null },
      restaurantId
    );
  }
};
var UpdateEmployeeService_default = new UpdateEmployeeService();

// src/modules/employee/Controllers/UpdateEmployeeController.ts
var UpdateEmployeeController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { name, email, phone, subRole } = req.body;
      const employee = await UpdateEmployeeService_default.execute({
        id,
        restaurantId,
        name,
        email,
        phone,
        subRole: subRole ?? null
      });
      return res.status(200).json(employee);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao atualizar funcionario"
      });
    }
  }
};
var UpdateEmployeeController_default = new UpdateEmployeeController();

// src/modules/employee/services/DeactivateEmployeeService.ts
var DeactivateEmployeeService = class {
  async execute(id, restaurantId) {
    const employee = await EmployeeRepository_default.findById(id, restaurantId);
    if (!employee) {
      throw new Error("Funcion\xE1rio n\xE3o encontrado!");
    }
    return EmployeeRepository_default.deactivate(id, restaurantId);
  }
};
var DeactivateEmployeeService_default = new DeactivateEmployeeService();

// src/modules/employee/Controllers/DeactivateEmployeeController.ts
var DeactivateEmployeeController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const employee = await DeactivateEmployeeService_default.execute(
        id,
        restaurantId
      );
      return res.status(200).json(employee);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao desativar funcionario"
      });
    }
  }
};
var DeactivateEmployeeController_default = new DeactivateEmployeeController();

// src/modules/employee/routes/EmployeeRoutes.ts
var router6 = Router6();
router6.post("/", authMiddleware, adminMiddleware, (req, res) => {
  CreateEmployeeController_default.handle(req, res);
});
router6.get("/", authMiddleware, adminMiddleware, (req, res) => {
  ListEmployeeController_default.handle(req, res);
});
router6.put("/:id", authMiddleware, adminMiddleware, (req, res) => {
  UpdateEmployeeController_default.handle(req, res);
});
router6.patch("/:id", authMiddleware, adminMiddleware, (req, res) => {
  DeactivateEmployeeController_default.handle(req, res);
});
var EmployeeRoutes_default = router6;

// src/modules/tableSession/routes/SessionsTablesRoutes.ts
import { Router as Router7 } from "express";

// src/modules/table/repositories/TableRepository.ts
var TableRepository = class {
  async create(data, db = prisma_default) {
    return db.table.create({
      data
    });
  }
  async findById(id, db = prisma_default) {
    return db.table.findUnique({
      where: {
        id: Number(id)
      },
      include: {
        restaurant: true
      }
    });
  }
  async findByNumber(number, restaurantId, db = prisma_default) {
    return db.table.findFirst({
      where: {
        number: Number(number),
        restaurantId
      }
    });
  }
  async findAllByRestaurant(restaurantId, db = prisma_default) {
    return db.table.findMany({
      where: {
        restaurantId
      },
      include: {
        _count: {
          select: {
            orders: true,
            tableSessions: true
          }
        }
      },
      orderBy: {
        number: "asc"
      }
    });
  }
  async update(id, data) {
    return prisma_default.table.update({
      where: {
        id: Number(id)
      },
      data
    });
  }
  async deactivate(id, db = prisma_default) {
    return db.table.update({
      where: {
        id: Number(id)
      },
      data: {
        active: false
      }
    });
  }
};
var TableRepository_default = new TableRepository();

// src/modules/tableSession/services/OpenTableSessionService.ts
import bcrypt10 from "bcrypt";
import crypto7 from "crypto";
var OpenTableSessionService = class {
  async execute({
    tableId,
    restaurantId,
    openedById
  }) {
    const table = await TableRepository_default.findById(tableId);
    if (!table || table.restaurantId !== restaurantId || !table.active) {
      throw new Error("Mesa n\xE3o encontrada!");
    }
    const sessionOpened = await TableSessionRepository_default.findOpenedByTable(tableId);
    if (sessionOpened) {
      throw new Error("Essa mesa j\xE1 est\xE1 aberta!");
    }
    const pin = crypto7.randomInt(1e3, 1e4).toString();
    const pinHash = await bcrypt10.hash(pin, 10);
    const sessionToken = await crypto7.randomBytes(32).toString("hex");
    const normalizedTableId = Number(tableId);
    const normalizedOpenedById = Number(openedById);
    if (!Number.isInteger(normalizedTableId) || normalizedTableId <= 0) {
      throw new Error("Mesa inv\xE1lida para abrir sess\xE3o.");
    }
    if (!Number.isInteger(normalizedOpenedById) || normalizedOpenedById <= 0) {
      throw new Error("Usu\xE1rio inv\xE1lido para abrir sess\xE3o.");
    }
    const session = await TableSessionRepository_default.create({
      tableId: normalizedTableId,
      pinHash,
      sessionToken,
      openedById: normalizedOpenedById
    });
    return {
      session,
      pin
    };
  }
};
var OpenTableSessionService_default = new OpenTableSessionService();

// src/modules/tableSession/controllers/OpenTableSessionController.ts
var OpenTableSessionController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const openedById = req.user.id;
      const { tableId } = req.body;
      const result = await OpenTableSessionService_default.execute({
        tableId,
        restaurantId,
        openedById
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao abrir sessao de mesa"
      });
    }
  }
};
var OpenTableSessionController_default = new OpenTableSessionController();

// src/modules/tableSession/services/ValidatePinService.ts
import bcrypt11 from "bcrypt";
var ValidatePinService = class {
  async execute({ tableId, pin }) {
    const session = await TableSessionRepository_default.findOpenedByTable(tableId);
    if (!session) {
      throw new Error("Essa mesa n\xE3o est\xE1 aberta!");
    }
    const pinMatch = await bcrypt11.compare(pin, session.pinHash);
    if (!pinMatch) {
      throw new Error("PIN inv\xE1lido!");
    }
    return {
      sessionToken: session.sessionToken,
      sessionId: session.id,
      tableId: session.tableId,
      tableNumber: session.table?.number ?? null,
      restaurantId: session.table?.restaurantId ?? null
    };
  }
};
var ValidatePinService_default = new ValidatePinService();

// src/modules/tableSession/controllers/ValidatePinController.ts
var ValidatePinController = class {
  async handle(req, res) {
    try {
      const { tableId, pin } = req.body;
      const result = await ValidatePinService_default.execute({ tableId, pin });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao validar PIN"
      });
    }
  }
};
var ValidatePinController_default = new ValidatePinController();

// src/modules/tableSession/services/CloseTableSessionService.ts
import { TableSessionStatus as TableSessionStatus4 } from "@prisma/client";
var CloseTableSessionService = class {
  async execute({
    sessionId,
    closedById,
    restaurantId
  }) {
    const session = await TableSessionRepository_default.findById(sessionId);
    if (!session || session.table.restaurantId !== restaurantId) {
      throw new Error("Sess\xE3o n\xE3o encontrada!");
    }
    if (session.status === TableSessionStatus4.CLOSED) {
      throw new Error("Essa mesa j\xE1 est\xE1 fechada!");
    }
    const closedSession = await TableSessionRepository_default.close(
      sessionId,
      closedById
    );
    io.to(`table-session:${session.id}`).emit("table:session-closed", {
      sessionId: session.id,
      tableId: session.tableId,
      tableNumber: session?.table?.number ?? null,
      restaurantId: session?.table?.restaurantId ?? null,
      reason: "closed-by-staff"
    });
    return closedSession;
  }
};
var CloseTableSessionService_default = new CloseTableSessionService();

// src/modules/tableSession/controllers/CloseTableSessionController.ts
var CloseTableSessionController = class {
  async handle(req, res) {
    try {
      const closedById = req.user.id;
      const restaurantId = req.user.restaurantId;
      const sessionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const session = await CloseTableSessionService_default.execute({
        sessionId,
        closedById,
        restaurantId
      });
      return res.status(200).json(session);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao fechar sessao de mesa"
      });
    }
  }
};
var CloseTableSessionController_default = new CloseTableSessionController();

// src/modules/tableSession/services/ListOpenSessionService.ts
var ListOpenSessionService = class {
  async execute({ restaurantId }) {
    const sessions = await TableSessionRepository_default.listOpenByRestaurant(restaurantId);
    return sessions;
  }
};
var ListOpenSessionService_default = new ListOpenSessionService();

// src/modules/tableSession/controllers/ListOpenSessionsController.ts
var ListOpenSessionsController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const sessions = await ListOpenSessionService_default.execute({
        restaurantId
      });
      return res.status(200).json(sessions);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao listar sessoes abertas"
      });
    }
  }
};
var ListOpenSessionsController_default = new ListOpenSessionsController();

// src/modules/tableSession/services/RequestPinAssistanceService.ts
var RequestPinAssistanceService = class {
  async execute({ tableId }) {
    const parsedTableId = Number(tableId);
    if (!Number.isInteger(parsedTableId) || parsedTableId <= 0) {
      throw new Error("Mesa inv\xE1lida para solicitar o PIN.");
    }
    const table = await TableRepository_default.findById(parsedTableId);
    if (!table || !table.active) {
      throw new Error("Mesa n\xE3o encontrada.");
    }
    const payload = {
      tableId: table.id,
      tableNumber: table.number,
      restaurantId: table.restaurantId,
      requestedAt: (/* @__PURE__ */ new Date()).toISOString(),
      message: `Cliente na mesa ${table.number} solicitou o PIN.`
    };
    io.to(`restaurant:${table.restaurantId}`).emit(
      "table:pin-requested",
      payload
    );
    return {
      ok: true,
      ...payload
    };
  }
};
var RequestPinAssistanceService_default = new RequestPinAssistanceService();

// src/modules/tableSession/controllers/RequestPinAssistanceController.ts
var RequestPinAssistanceController = class {
  async handle(req, res) {
    try {
      const { tableId } = req.body;
      const result = await RequestPinAssistanceService_default.execute({ tableId });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao solicitar apoio de PIN"
      });
    }
  }
};
var RequestPinAssistanceController_default = new RequestPinAssistanceController();

// src/modules/tableSession/controllers/GetCurrentSessionController.ts
var GetCurrentSessionController = class {
  async handle(req, res) {
    try {
      return res.status(200).json({
        sessionId: req.tableSession.id,
        tableId: req.tableSession.tableId,
        restaurantId: req.tableSession.restaurantId
      });
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao obter sessao atual"
      });
    }
  }
};
var GetCurrentSessionController_default = new GetCurrentSessionController();

// src/middlewares/security/tableSessionRateLimitMiddleware.ts
import rateLimit4, { ipKeyGenerator as ipKeyGenerator4 } from "express-rate-limit";
function getTableKey(req) {
  const tableId = String(req.body?.tableId || "").trim().slice(0, 32);
  const ip = ipKeyGenerator4(String(req.ip || "unknown").trim());
  return `${ip}:${tableId || "no-table"}`;
}
var tablePinRateLimitMiddleware = rateLimit4({
  windowMs: Number(process.env.TABLE_PIN_RATE_LIMIT_WINDOW_MS || 5 * 60 * 1e3),
  max: Number(process.env.TABLE_PIN_RATE_LIMIT_MAX_REQUESTS || 10),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: getTableKey,
  message: {
    error: "Muitas tentativas de PIN. Aguarde alguns minutos."
  }
});
var tablePinAssistanceRateLimitMiddleware = rateLimit4({
  windowMs: Number(
    process.env.TABLE_PIN_ASSISTANCE_RATE_LIMIT_WINDOW_MS || 60 * 1e3
  ),
  max: Number(process.env.TABLE_PIN_ASSISTANCE_RATE_LIMIT_MAX_REQUESTS || 3),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getTableKey,
  message: {
    error: "Muitas solicita\xE7\xF5es de ajuda. Aguarde um instante."
  }
});

// src/modules/tableSession/routes/SessionsTablesRoutes.ts
var router7 = Router7();
router7.post(
  "/validate",
  tablePinRateLimitMiddleware,
  (req, res) => ValidatePinController_default.handle(req, res)
);
router7.post(
  "/request-pin",
  tablePinAssistanceRateLimitMiddleware,
  (req, res) => RequestPinAssistanceController_default.handle(req, res)
);
router7.get(
  "/current",
  sessionMiddleware,
  (req, res) => GetCurrentSessionController_default.handle(req, res)
);
router7.post(
  "/open",
  authMiddleware,
  staffMiddleware,
  (req, res) => OpenTableSessionController_default.handle(req, res)
);
router7.patch(
  "/:id/close",
  authMiddleware,
  staffMiddleware,
  (req, res) => CloseTableSessionController_default.handle(req, res)
);
router7.get(
  "/open",
  authMiddleware,
  staffMiddleware,
  (req, res) => ListOpenSessionsController_default.handle(req, res)
);
var SessionsTablesRoutes_default = router7;

// src/modules/table/routes/TablesRoutes.ts
import { Router as Router8 } from "express";

// src/modules/table/services/CreateTableService.ts
import crypto8 from "crypto";
var CreateTableService = class {
  async execute({ number, restaurantId }) {
    const tableExists = await TableRepository_default.findByNumber(
      number,
      restaurantId
    );
    if (tableExists) {
      throw new Error("J\xE1 existe uma mesa com esse n\xFAmero!");
    }
    const token = crypto8.randomBytes(16).toString("hex");
    return TableRepository_default.create({
      number: Number(number),
      restaurantId,
      token
    });
  }
};
var CreateTableService_default = new CreateTableService();

// src/modules/table/controllers/CreateTableController.ts
var CreateTableController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const { number } = req.body;
      const table = await CreateTableService_default.execute({
        number,
        restaurantId
      });
      return res.status(201).json(table);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao criar mesa"
      });
    }
  }
};
var CreateTableController_default = new CreateTableController();

// src/modules/table/services/ListTableService.ts
var ListTableService = class {
  async execute({ restaurantId }) {
    const tables = await TableRepository_default.findAllByRestaurant(restaurantId);
    return tables;
  }
};
var ListTableService_default = new ListTableService();

// src/modules/table/controllers/ListTableController.ts
var ListTableController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const tables = await ListTableService_default.execute({
        restaurantId
      });
      return res.status(200).json(tables);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao listar mesas"
      });
    }
  }
};
var ListTableController_default = new ListTableController();

// src/modules/table/services/GetTableByIdService.ts
var GetTableByIdService = class {
  async execute({ id, restaurantId }) {
    const table = await TableRepository_default.findById(id);
    if (!table || table.restaurantId !== restaurantId) {
      throw new Error("Mesa n\xE3o encontrada!");
    }
    return table;
  }
};
var GetTableByIdService_default = new GetTableByIdService();

// src/modules/table/controllers/GetTableByIdController.ts
var GetTableByIdController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const parsedId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const table = await GetTableByIdService_default.execute({
        id: parsedId,
        restaurantId
      });
      return res.status(200).json(table);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao buscar mesa"
      });
    }
  }
};
var GetTableByIdController_default = new GetTableByIdController();

// src/modules/table/services/UpdateTableService.ts
var UpdateTableService = class {
  async execute({ id, restaurantId, number, active }) {
    const table = await TableRepository_default.findById(id);
    if (!table || table.restaurantId !== restaurantId) {
      throw new Error("Mesa n\xE3o encontrada!");
    }
    if (number !== void 0 && number !== null && String(number).trim()) {
      const tableExists = await TableRepository_default.findByNumber(
        number,
        restaurantId
      );
      if (tableExists && tableExists.id !== table.id) {
        throw new Error("J\xE1 existe uma mesa com esse n\xFAmero!");
      }
    }
    const hasNumber = number !== void 0 && number !== null && String(number).trim() !== "";
    const hasActive = typeof active === "boolean";
    if (!hasNumber && !hasActive) {
      throw new Error("Informe n\xFAmero e/ou status ativo da mesa.");
    }
    const updateData = {};
    if (hasNumber) {
      updateData.number = Number(number);
    }
    if (hasActive) {
      updateData.active = Boolean(active);
    }
    return await TableRepository_default.update(id, {
      ...updateData
    });
  }
};
var UpdateTableService_default = new UpdateTableService();

// src/modules/table/controllers/UpdateTableController.ts
var UpdateTableController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const parsedId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { number, active } = req.body;
      const table = await UpdateTableService_default.execute({
        id: parsedId,
        restaurantId,
        number,
        active
      });
      return res.status(200).json(table);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao atualizar mesa"
      });
    }
  }
};
var UpdateTableController_default = new UpdateTableController();

// src/modules/table/services/DeactivateTableService.ts
var DeactivateTableService = class {
  async execute({ id, restaurantId }) {
    const table = await TableRepository_default.findById(id);
    if (!table || table.restaurantId !== restaurantId) {
      throw new Error("Mesa n\xE3o encontrada!");
    }
    return await TableRepository_default.deactivate(id);
  }
};
var DeactivateTableService_default = new DeactivateTableService();

// src/modules/table/controllers/DeactivateTableController.ts
var DeactivateTableController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const parsedId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const table = await DeactivateTableService_default.execute({
        id: parsedId,
        restaurantId
      });
      return res.status(200).json(table);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao desativar mesa"
      });
    }
  }
};
var DeactivateTableController_default = new DeactivateTableController();

// src/modules/table/routes/TablesRoutes.ts
var router8 = Router8();
router8.post(
  "/",
  authMiddleware,
  staffMiddleware,
  billingMiddleware,
  (req, res) => CreateTableController_default.handle(req, res)
);
router8.get(
  "/",
  authMiddleware,
  staffMiddleware,
  (req, res) => ListTableController_default.handle(req, res)
);
router8.get(
  "/:id",
  authMiddleware,
  staffMiddleware,
  (req, res) => GetTableByIdController_default.handle(req, res)
);
router8.put(
  "/:id",
  authMiddleware,
  staffMiddleware,
  (req, res) => UpdateTableController_default.handle(req, res)
);
router8.patch(
  "/:id",
  authMiddleware,
  staffMiddleware,
  (req, res) => DeactivateTableController_default.handle(req, res)
);
var TablesRoutes_default = router8;

// src/modules/restaurantSettings/routes/RestaurantSettingsRoutes.ts
import { Router as Router9 } from "express";

// src/modules/restaurantSettings/utils/normalizeRestaurantImage.ts
var MAX_PERSISTENT_IMAGE_LENGTH = 75e4;
function normalizeRestaurantImage(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  if (normalized.startsWith("blob:")) {
    throw new Error("A imagem enviada \xE9 tempor\xE1ria. Selecione o arquivo novamente.");
  }
  const isPersistentUrl = /^https?:\/\//i.test(normalized);
  const isPersistentImageData = /^data:image\/(jpeg|png|webp);base64,/i.test(normalized);
  if (!isPersistentUrl && !isPersistentImageData) {
    throw new Error("Formato de imagem inv\xE1lido.");
  }
  if (normalized.length > MAX_PERSISTENT_IMAGE_LENGTH) {
    throw new Error("A imagem ultrapassa o tamanho permitido.");
  }
  return normalized;
}

// src/modules/restaurantSettings/services/CreateRestaurantSettingsService.ts
var CreateRestaurantSettingsService = class {
  async execute({
    restaurantId,
    deliveryFee,
    courierFeePerDelivery,
    minimumOrder,
    pixProvider,
    pixKey,
    legalDocumentType,
    companyDocument,
    companyLegalName,
    companyTradeName,
    companyAddress,
    companyCnae,
    monthlyRevenue,
    ownerFullName,
    ownerCpf,
    ownerBirthDate,
    ownerEmail,
    ownerPhone,
    ownerAddress,
    bankName,
    bankCode,
    bankAccountType,
    bankBranch,
    bankAccount,
    bankHolderDocument,
    cardGateway,
    gatewayMerchantId,
    stripeSecretKey,
    stripeWebhookSecret,
    mercadoPagoAccessToken,
    picpayToken,
    asaasAccessToken,
    pagbankEmail,
    pagbankToken,
    pagbankEnvironment,
    ownerDocumentFileUrl,
    bankProofFileUrl,
    companyContractFileUrl,
    whatsapp,
    instagram,
    facebook,
    restaurantName,
    restaurantLogo,
    restaurantCoverImage
  }) {
    const settingsExists = await RestaurantSettingsRepository_default.findByRestaurantId(restaurantId);
    if (settingsExists) {
      throw new Error("Configura\xE7\xF5es j\xE1 existem para esse restaurante!");
    }
    const normalizedWhatsapp = whatsapp === void 0 ? void 0 : String(whatsapp || "").trim() || null;
    const normalizedRestaurantName = restaurantName === void 0 ? void 0 : String(restaurantName || "").trim();
    const normalizedRestaurantLogo = restaurantLogo === void 0 ? void 0 : normalizeRestaurantImage(restaurantLogo);
    const normalizedRestaurantCoverImage = restaurantCoverImage === void 0 ? void 0 : String(restaurantCoverImage || "").trim() || null;
    if (restaurantName !== void 0 && String(normalizedRestaurantName || "").length < 2) {
      throw new Error("Nome do restaurante inv\xE1lido.");
    }
    const normalizedLegalDocumentType = String(legalDocumentType || "").trim().toUpperCase();
    const normalizedCompanyDocument = String(companyDocument || "").replace(
      /\D/g,
      ""
    );
    const normalizedBankHolderDocument = String(
      bankHolderDocument || ""
    ).replace(/\D/g, "");
    const normalizedOwnerCpf = String(ownerCpf || "").replace(/\D/g, "");
    const normalizedOwnerPhone = String(ownerPhone || "").replace(/\D/g, "");
    if (normalizedLegalDocumentType === "CNPJ" && normalizedCompanyDocument.length > 0 && normalizedCompanyDocument.length !== 14) {
      throw new Error("CNPJ inv\xE1lido para cadastro da empresa.");
    }
    if (normalizedLegalDocumentType === "CPF" && normalizedCompanyDocument.length > 0 && normalizedCompanyDocument.length !== 11) {
      throw new Error("CPF inv\xE1lido para cadastro de aut\xF4nomo.");
    }
    if (normalizedCompanyDocument && normalizedBankHolderDocument && normalizedCompanyDocument !== normalizedBankHolderDocument) {
      throw new Error(
        "A titularidade da conta banc\xE1ria deve ser igual ao documento cadastrado (CPF/CNPJ)."
      );
    }
    const created = await RestaurantSettingsRepository_default.create({
      restaurantId: Number(restaurantId),
      deliveryFee,
      courierFeePerDelivery: Math.max(Number(courierFeePerDelivery || 0), 0),
      minimumOrder,
      pixProvider: String(pixProvider || "MERCADO_PAGO").trim().toUpperCase(),
      pixKey,
      legalDocumentType: normalizedLegalDocumentType || null,
      companyDocument: normalizedCompanyDocument || null,
      companyLegalName: String(companyLegalName || "").trim() || null,
      companyTradeName: String(companyTradeName || "").trim() || null,
      companyAddress: String(companyAddress || "").trim() || null,
      companyCnae: String(companyCnae || "").trim() || null,
      monthlyRevenue: monthlyRevenue === void 0 || monthlyRevenue === null ? null : Number(monthlyRevenue),
      ownerFullName: String(ownerFullName || "").trim() || null,
      ownerCpf: normalizedOwnerCpf || null,
      ownerBirthDate: ownerBirthDate ? new Date(ownerBirthDate) : null,
      ownerEmail: String(ownerEmail || "").trim() || null,
      ownerPhone: normalizedOwnerPhone || null,
      ownerAddress: String(ownerAddress || "").trim() || null,
      bankName: String(bankName || "").trim() || null,
      bankCode: String(bankCode || "").trim() || null,
      bankAccountType: String(bankAccountType || "").trim().toUpperCase() || null,
      bankBranch: String(bankBranch || "").trim() || null,
      bankAccount: String(bankAccount || "").trim() || null,
      bankHolderDocument: normalizedBankHolderDocument || null,
      cardGateway: String(cardGateway || "").trim() || null,
      gatewayMerchantId: String(gatewayMerchantId || "").trim() || null,
      stripeSecretKey: String(stripeSecretKey || "").trim() || null,
      stripeWebhookSecret: String(stripeWebhookSecret || "").trim() || null,
      mercadoPagoAccessToken: String(mercadoPagoAccessToken || "").trim() || null,
      picpayToken: String(picpayToken || "").trim() || null,
      asaasAccessToken: String(asaasAccessToken || "").trim() || null,
      pagbankEmail: String(pagbankEmail || "").trim() || null,
      pagbankToken: String(pagbankToken || "").trim() || null,
      pagbankEnvironment: "production",
      ownerDocumentFileUrl: String(ownerDocumentFileUrl || "").trim() || null,
      bankProofFileUrl: String(bankProofFileUrl || "").trim() || null,
      companyContractFileUrl: String(companyContractFileUrl || "").trim() || null,
      instagram,
      facebook
    });
    const restaurantData = {};
    if (normalizedWhatsapp !== void 0) {
      restaurantData.whatsapp = normalizedWhatsapp;
    }
    if (normalizedRestaurantName !== void 0) {
      restaurantData.name = normalizedRestaurantName;
    }
    if (normalizedRestaurantLogo !== void 0) {
      restaurantData.logo = normalizedRestaurantLogo;
    }
    if (normalizedRestaurantCoverImage !== void 0) {
      restaurantData.coverImage = normalizedRestaurantCoverImage;
    }
    if (Object.keys(restaurantData).length > 0) {
      await prisma_default.restaurant.update({
        where: {
          id: Number(restaurantId)
        },
        data: restaurantData
      });
    }
    return {
      ...created,
      stripeSecretKey: null,
      stripeWebhookSecret: null,
      mercadoPagoAccessToken: null,
      picpayToken: null,
      asaasAccessToken: null,
      pagbankToken: null,
      stripeSecretKeyConfigured: Boolean(
        String(created?.stripeSecretKey || "").trim()
      ),
      stripeWebhookSecretConfigured: Boolean(
        String(created?.stripeWebhookSecret || "").trim()
      ),
      mercadoPagoAccessTokenConfigured: Boolean(
        String(created?.mercadoPagoAccessToken || "").trim()
      ),
      picpayTokenConfigured: Boolean(String(created?.picpayToken || "").trim()),
      asaasAccessTokenConfigured: Boolean(
        String(created?.asaasAccessToken || "").trim()
      ),
      pagbankTokenConfigured: Boolean(
        String(created?.pagbankToken || "").trim()
      ),
      whatsapp: normalizedWhatsapp ?? null,
      restaurantName: normalizedRestaurantName ?? null,
      restaurantLogo: normalizedRestaurantLogo ?? null,
      restaurantCoverImage: normalizedRestaurantCoverImage ?? null
    };
  }
};
var CreateRestaurantSettingsService_default = new CreateRestaurantSettingsService();

// src/modules/restaurantSettings/controllers/CreateRestaurantSettingsController.ts
var CreateRestaurantSettingsController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const {
        deliveryFee,
        courierFeePerDelivery,
        minimumOrder,
        pixProvider,
        pixKey,
        legalDocumentType,
        companyDocument,
        companyLegalName,
        companyTradeName,
        companyAddress,
        companyCnae,
        monthlyRevenue,
        ownerFullName,
        ownerCpf,
        ownerBirthDate,
        ownerEmail,
        ownerPhone,
        ownerAddress,
        bankName,
        bankCode,
        bankAccountType,
        bankBranch,
        bankAccount,
        bankHolderDocument,
        cardGateway,
        gatewayMerchantId,
        stripeSecretKey,
        stripeWebhookSecret,
        mercadoPagoAccessToken,
        picpayToken,
        asaasAccessToken,
        pagbankEmail,
        pagbankToken,
        pagbankEnvironment,
        ownerDocumentFileUrl,
        bankProofFileUrl,
        companyContractFileUrl,
        whatsapp,
        instagram,
        facebook,
        restaurantName,
        restaurantLogo,
        restaurantCoverImage
      } = req.body;
      const settings = await CreateRestaurantSettingsService_default.execute({
        restaurantId,
        deliveryFee,
        courierFeePerDelivery,
        minimumOrder,
        pixProvider,
        pixKey,
        legalDocumentType,
        companyDocument,
        companyLegalName,
        companyTradeName,
        companyAddress,
        companyCnae,
        monthlyRevenue,
        ownerFullName,
        ownerCpf,
        ownerBirthDate,
        ownerEmail,
        ownerPhone,
        ownerAddress,
        bankName,
        bankCode,
        bankAccountType,
        bankBranch,
        bankAccount,
        bankHolderDocument,
        cardGateway,
        gatewayMerchantId,
        stripeSecretKey,
        stripeWebhookSecret,
        mercadoPagoAccessToken,
        picpayToken,
        asaasAccessToken,
        pagbankEmail,
        pagbankToken,
        pagbankEnvironment,
        ownerDocumentFileUrl,
        bankProofFileUrl,
        companyContractFileUrl,
        whatsapp,
        instagram,
        facebook,
        restaurantName,
        restaurantLogo,
        restaurantCoverImage
      });
      return res.status(201).json(settings);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao criar configuracoes do restaurante"
      });
    }
  }
};
var CreateRestaurantSettingsController_default = new CreateRestaurantSettingsController();

// src/modules/restaurantSettings/services/GetRestaurantSettingsService.ts
var GetRestaurantSettingsService = class {
  async execute({ restaurantId }) {
    const normalizedRestaurantId = Number(restaurantId);
    const settings = await RestaurantSettingsRepository_default.findByRestaurantId(
      normalizedRestaurantId
    );
    if (!settings) {
      const restaurant = await RestaurantSettingsRepository_default.findRestaurantById(
        normalizedRestaurantId
      );
      if (!restaurant) {
        throw new Error("Restaurante n\xE3o encontrado!");
      }
      const fallback = {
        id: null,
        restaurantId: normalizedRestaurantId,
        deliveryFee: 0,
        minimumOrder: 0,
        pixProvider: "MERCADO_PAGO",
        pixKey: null,
        legalDocumentType: null,
        companyDocument: null,
        companyLegalName: null,
        companyTradeName: null,
        companyAddress: null,
        companyCnae: null,
        monthlyRevenue: null,
        ownerFullName: null,
        ownerCpf: null,
        ownerBirthDate: null,
        ownerEmail: null,
        ownerPhone: null,
        ownerAddress: null,
        bankName: null,
        bankCode: null,
        bankAccountType: null,
        bankBranch: null,
        bankAccount: null,
        bankHolderDocument: null,
        cardGateway: null,
        gatewayMerchantId: null,
        stripeSecretKey: null,
        stripeWebhookSecret: null,
        mercadoPagoAccessToken: null,
        picpayToken: null,
        asaasAccessToken: null,
        pagbankEmail: null,
        pagbankToken: null,
        pagbankEnvironment: null,
        stripeSecretKeyConfigured: false,
        stripeWebhookSecretConfigured: false,
        mercadoPagoAccessTokenConfigured: false,
        picpayTokenConfigured: false,
        asaasAccessTokenConfigured: false,
        pagbankTokenConfigured: false,
        ownerDocumentFileUrl: null,
        bankProofFileUrl: null,
        companyContractFileUrl: null,
        instagram: null,
        facebook: null,
        whatsapp: String(restaurant.whatsapp || "").trim() || null,
        restaurant: {
          name: restaurant.name,
          logo: restaurant.logo,
          coverImage: restaurant.coverImage,
          whatsapp: String(restaurant.whatsapp || "").trim() || null
        }
      };
      return fallback;
    }
    return {
      ...settings,
      stripeSecretKey: null,
      stripeWebhookSecret: null,
      mercadoPagoAccessToken: null,
      picpayToken: null,
      asaasAccessToken: null,
      pagbankToken: null,
      stripeSecretKeyConfigured: Boolean(
        String(settings?.stripeSecretKey || "").trim()
      ),
      stripeWebhookSecretConfigured: Boolean(
        String(settings?.stripeWebhookSecret || "").trim()
      ),
      mercadoPagoAccessTokenConfigured: Boolean(
        String(settings?.mercadoPagoAccessToken || "").trim()
      ),
      picpayTokenConfigured: Boolean(
        String(settings?.picpayToken || "").trim()
      ),
      asaasAccessTokenConfigured: Boolean(
        String(settings?.asaasAccessToken || "").trim()
      ),
      pagbankTokenConfigured: Boolean(
        String(settings?.pagbankToken || "").trim()
      ),
      whatsapp: String(settings?.restaurant?.whatsapp || "").trim() || null
    };
  }
};
var GetRestaurantSettingsService_default = new GetRestaurantSettingsService();

// src/modules/restaurantSettings/controllers/GetRestaurantSettingsController.ts
var GetRestaurantSettingsController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const settings = await GetRestaurantSettingsService_default.execute({
        restaurantId
      });
      return res.status(200).json(settings);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao buscar configuracoes do restaurante"
      });
    }
  }
};
var GetRestaurantSettingsController_default = new GetRestaurantSettingsController();

// src/modules/restaurantSettings/services/UpdateRestaurantSettingsService.ts
var UpdateRestaurantSettingsService = class {
  getAsaasBaseUrl() {
    return String(process.env.ASAAS_API_BASE_URL || "https://api.asaas.com").trim().replace(/\/+$/, "");
  }
  async resolveAsaasWalletIdentifierByToken(token) {
    const normalizedToken = String(token || "").trim();
    if (!normalizedToken) {
      return "";
    }
    const response = await fetch(`${this.getAsaasBaseUrl()}/v3/myAccount`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        access_token: normalizedToken
      }
    });
    if (!response.ok) {
      return "";
    }
    const body = await response.json();
    return String(body?.walletId || body?.id || "").trim();
  }
  async execute({
    restaurantId,
    deliveryFee,
    courierFeePerDelivery,
    minimumOrder,
    pixProvider,
    pixKey,
    legalDocumentType,
    companyDocument,
    companyLegalName,
    companyTradeName,
    companyAddress,
    companyCnae,
    monthlyRevenue,
    ownerFullName,
    ownerCpf,
    ownerBirthDate,
    ownerEmail,
    ownerPhone,
    ownerAddress,
    bankName,
    bankCode,
    bankAccountType,
    bankBranch,
    bankAccount,
    bankHolderDocument,
    cardGateway,
    gatewayMerchantId,
    stripeSecretKey,
    stripeWebhookSecret,
    mercadoPagoAccessToken,
    picpayToken,
    asaasAccessToken,
    pagbankEmail,
    pagbankToken,
    pagbankEnvironment,
    ownerDocumentFileUrl,
    bankProofFileUrl,
    companyContractFileUrl,
    whatsapp,
    instagram,
    facebook,
    restaurantName,
    restaurantLogo,
    restaurantCoverImage
  }) {
    const settings = await RestaurantSettingsRepository_default.findByRestaurantId(restaurantId);
    if (!settings) {
      throw new Error("Configura\xE7\xF5es n\xE3o encontradas!");
    }
    const normalizedWhatsapp = whatsapp === void 0 ? void 0 : String(whatsapp || "").trim() || null;
    const normalizedRestaurantName = restaurantName === void 0 ? void 0 : String(restaurantName || "").trim();
    const normalizedRestaurantLogo = restaurantLogo === void 0 ? void 0 : normalizeRestaurantImage(restaurantLogo);
    const normalizedRestaurantCoverImage = restaurantCoverImage === void 0 ? void 0 : String(restaurantCoverImage || "").trim() || null;
    const normalizedBankName = bankName === void 0 ? void 0 : String(bankName || "").trim() || null;
    const normalizedBankBranch = bankBranch === void 0 ? void 0 : String(bankBranch || "").trim() || null;
    const normalizedBankAccount = bankAccount === void 0 ? void 0 : String(bankAccount || "").trim() || null;
    const normalizedCardGateway = cardGateway === void 0 ? void 0 : String(cardGateway || "").trim() || null;
    const normalizedGatewayMerchantId = gatewayMerchantId === void 0 ? void 0 : String(gatewayMerchantId || "").trim() || null;
    const normalizedStripeSecretKey = stripeSecretKey === void 0 ? void 0 : String(stripeSecretKey || "").trim() || null;
    const normalizedStripeWebhookSecret = stripeWebhookSecret === void 0 ? void 0 : String(stripeWebhookSecret || "").trim() || null;
    const normalizedMercadoPagoAccessToken = mercadoPagoAccessToken === void 0 ? void 0 : String(mercadoPagoAccessToken || "").trim() || null;
    const normalizedPicPayToken = picpayToken === void 0 ? void 0 : String(picpayToken || "").trim() || null;
    const normalizedAsaasAccessToken = asaasAccessToken === void 0 ? void 0 : String(asaasAccessToken || "").trim() || null;
    const normalizedPagBankEmail = pagbankEmail === void 0 ? void 0 : String(pagbankEmail || "").trim() || null;
    const normalizedPagBankToken = pagbankToken === void 0 ? void 0 : String(pagbankToken || "").trim() || null;
    const normalizedPagBankEnvironment = "production";
    const normalizedLegalDocumentType = legalDocumentType === void 0 ? void 0 : String(legalDocumentType || "").trim().toUpperCase() || null;
    const normalizedCompanyDocument = companyDocument === void 0 ? void 0 : String(companyDocument || "").replace(/\D/g, "") || null;
    const normalizedOwnerCpf = ownerCpf === void 0 ? void 0 : String(ownerCpf || "").replace(/\D/g, "") || null;
    const normalizedOwnerPhone = ownerPhone === void 0 ? void 0 : String(ownerPhone || "").replace(/\D/g, "") || null;
    const normalizedBankHolderDocument = bankHolderDocument === void 0 ? void 0 : String(bankHolderDocument || "").replace(/\D/g, "") || null;
    const normalizedOwnerBirthDate = ownerBirthDate === void 0 ? void 0 : ownerBirthDate ? new Date(ownerBirthDate) : null;
    const resolvedAsaasToken = normalizedAsaasAccessToken === void 0 ? String(settings.asaasAccessToken || "").trim() : String(normalizedAsaasAccessToken || "").trim();
    const resolvedPixProvider = String(
      pixProvider || settings.pixProvider || "MERCADO_PAGO"
    ).trim().toUpperCase();
    const resolvedCardGateway = normalizedCardGateway === void 0 ? String(settings.cardGateway || "").trim().toUpperCase() : String(normalizedCardGateway || "").trim().toUpperCase();
    let resolvedGatewayMerchantId = normalizedGatewayMerchantId === void 0 ? String(settings.gatewayMerchantId || "").trim() || null : normalizedGatewayMerchantId;
    let gatewayMerchantIdAutoResolved = false;
    let gatewayMerchantIdAutoResolvedSource = null;
    const shouldTryAutoResolveGatewayMerchantId = !resolvedGatewayMerchantId && Boolean(resolvedAsaasToken) && (resolvedPixProvider === "ASAAS" || resolvedCardGateway === "ASAAS");
    if (shouldTryAutoResolveGatewayMerchantId) {
      try {
        const autoWalletId = await this.resolveAsaasWalletIdentifierByToken(resolvedAsaasToken);
        if (autoWalletId) {
          resolvedGatewayMerchantId = autoWalletId;
          gatewayMerchantIdAutoResolved = true;
          gatewayMerchantIdAutoResolvedSource = "asaas_myAccount";
        }
      } catch {
      }
    }
    if (restaurantName !== void 0 && String(normalizedRestaurantName || "").length < 2) {
      throw new Error("Nome do restaurante inv\xE1lido.");
    }
    const resolvedDocumentType = normalizedLegalDocumentType || String(settings.legalDocumentType || "");
    const resolvedCompanyDocument = normalizedCompanyDocument || String(settings.companyDocument || "");
    const resolvedBankHolderDocument = normalizedBankHolderDocument || String(settings.bankHolderDocument || "");
    if (resolvedDocumentType === "CNPJ" && resolvedCompanyDocument && resolvedCompanyDocument.length !== 14) {
      throw new Error("CNPJ inv\xE1lido para cadastro da empresa.");
    }
    if (resolvedDocumentType === "CPF" && resolvedCompanyDocument && resolvedCompanyDocument.length !== 11) {
      throw new Error("CPF inv\xE1lido para cadastro de aut\xF4nomo.");
    }
    if (resolvedCompanyDocument && resolvedBankHolderDocument && resolvedCompanyDocument !== resolvedBankHolderDocument) {
      throw new Error(
        "A titularidade da conta banc\xE1ria deve ser igual ao documento cadastrado (CPF/CNPJ)."
      );
    }
    const updated = await RestaurantSettingsRepository_default.update(restaurantId, {
      deliveryFee,
      courierFeePerDelivery: courierFeePerDelivery === void 0 ? void 0 : Math.max(Number(courierFeePerDelivery || 0), 0),
      minimumOrder,
      pixProvider: resolvedPixProvider,
      pixKey,
      legalDocumentType: normalizedLegalDocumentType,
      companyDocument: normalizedCompanyDocument,
      companyLegalName: companyLegalName === void 0 ? void 0 : String(companyLegalName || "").trim() || null,
      companyTradeName: companyTradeName === void 0 ? void 0 : String(companyTradeName || "").trim() || null,
      companyAddress: companyAddress === void 0 ? void 0 : String(companyAddress || "").trim() || null,
      companyCnae: companyCnae === void 0 ? void 0 : String(companyCnae || "").trim() || null,
      monthlyRevenue: monthlyRevenue === void 0 ? void 0 : monthlyRevenue === null ? null : Number(monthlyRevenue),
      ownerFullName: ownerFullName === void 0 ? void 0 : String(ownerFullName || "").trim() || null,
      ownerCpf: normalizedOwnerCpf,
      ownerBirthDate: normalizedOwnerBirthDate,
      ownerEmail: ownerEmail === void 0 ? void 0 : String(ownerEmail || "").trim() || null,
      ownerPhone: normalizedOwnerPhone,
      ownerAddress: ownerAddress === void 0 ? void 0 : String(ownerAddress || "").trim() || null,
      bankName: normalizedBankName,
      bankCode: bankCode === void 0 ? void 0 : String(bankCode || "").trim() || null,
      bankAccountType: bankAccountType === void 0 ? void 0 : String(bankAccountType || "").trim().toUpperCase() || null,
      bankBranch: normalizedBankBranch,
      bankAccount: normalizedBankAccount,
      bankHolderDocument: normalizedBankHolderDocument,
      cardGateway: normalizedCardGateway,
      gatewayMerchantId: resolvedGatewayMerchantId,
      stripeSecretKey: normalizedStripeSecretKey,
      stripeWebhookSecret: normalizedStripeWebhookSecret,
      mercadoPagoAccessToken: normalizedMercadoPagoAccessToken,
      picpayToken: normalizedPicPayToken,
      asaasAccessToken: normalizedAsaasAccessToken,
      pagbankEmail: normalizedPagBankEmail,
      pagbankToken: normalizedPagBankToken,
      pagbankEnvironment: normalizedPagBankEnvironment,
      ownerDocumentFileUrl: ownerDocumentFileUrl === void 0 ? void 0 : String(ownerDocumentFileUrl || "").trim() || null,
      bankProofFileUrl: bankProofFileUrl === void 0 ? void 0 : String(bankProofFileUrl || "").trim() || null,
      companyContractFileUrl: companyContractFileUrl === void 0 ? void 0 : String(companyContractFileUrl || "").trim() || null,
      instagram,
      facebook
    });
    const restaurantData = {};
    if (normalizedWhatsapp !== void 0) {
      restaurantData.whatsapp = normalizedWhatsapp;
    }
    if (normalizedRestaurantName !== void 0) {
      restaurantData.name = normalizedRestaurantName;
    }
    if (normalizedRestaurantLogo !== void 0) {
      restaurantData.logo = normalizedRestaurantLogo;
    }
    if (normalizedRestaurantCoverImage !== void 0) {
      restaurantData.coverImage = normalizedRestaurantCoverImage;
    }
    if (Object.keys(restaurantData).length > 0) {
      await prisma_default.restaurant.update({
        where: {
          id: Number(restaurantId)
        },
        data: restaurantData
      });
    }
    return {
      ...updated,
      stripeSecretKey: null,
      stripeWebhookSecret: null,
      mercadoPagoAccessToken: null,
      picpayToken: null,
      asaasAccessToken: null,
      pagbankToken: null,
      stripeSecretKeyConfigured: Boolean(
        String(updated?.stripeSecretKey || "").trim()
      ),
      stripeWebhookSecretConfigured: Boolean(
        String(updated?.stripeWebhookSecret || "").trim()
      ),
      mercadoPagoAccessTokenConfigured: Boolean(
        String(updated?.mercadoPagoAccessToken || "").trim()
      ),
      picpayTokenConfigured: Boolean(String(updated?.picpayToken || "").trim()),
      asaasAccessTokenConfigured: Boolean(
        String(updated?.asaasAccessToken || "").trim()
      ),
      pagbankTokenConfigured: Boolean(
        String(updated?.pagbankToken || "").trim()
      ),
      whatsapp: whatsapp !== void 0 ? normalizedWhatsapp : String(settings?.restaurant?.whatsapp || "").trim() || null,
      restaurantName: restaurantName !== void 0 ? normalizedRestaurantName : String(settings?.restaurant?.name || "").trim() || null,
      restaurantLogo: restaurantLogo !== void 0 ? normalizedRestaurantLogo : String(settings?.restaurant?.logo || "").trim() || null,
      restaurantCoverImage: restaurantCoverImage !== void 0 ? normalizedRestaurantCoverImage : String(settings?.restaurant?.coverImage || "").trim() || null,
      gatewayMerchantIdConfigured: Boolean(
        String(updated?.gatewayMerchantId || "").trim()
      ),
      gatewayMerchantIdAutoResolved,
      gatewayMerchantIdAutoResolvedSource
    };
  }
};
var UpdateRestaurantSettingsService_default = new UpdateRestaurantSettingsService();

// src/modules/restaurantSettings/controllers/UpdateRestaurantSettingsController.ts
var UpdateRestaurantSettingsController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const {
        deliveryFee,
        courierFeePerDelivery,
        minimumOrder,
        pixProvider,
        pixKey,
        legalDocumentType,
        companyDocument,
        companyLegalName,
        companyTradeName,
        companyAddress,
        companyCnae,
        monthlyRevenue,
        ownerFullName,
        ownerCpf,
        ownerBirthDate,
        ownerEmail,
        ownerPhone,
        ownerAddress,
        bankName,
        bankCode,
        bankAccountType,
        bankBranch,
        bankAccount,
        bankHolderDocument,
        cardGateway,
        gatewayMerchantId,
        stripeSecretKey,
        stripeWebhookSecret,
        mercadoPagoAccessToken,
        picpayToken,
        asaasAccessToken,
        pagbankEmail,
        pagbankToken,
        pagbankEnvironment,
        ownerDocumentFileUrl,
        bankProofFileUrl,
        companyContractFileUrl,
        whatsapp,
        instagram,
        facebook,
        restaurantName,
        restaurantLogo,
        restaurantCoverImage
      } = req.body;
      const settings = await UpdateRestaurantSettingsService_default.execute({
        restaurantId,
        deliveryFee,
        courierFeePerDelivery,
        minimumOrder,
        pixProvider,
        pixKey,
        legalDocumentType,
        companyDocument,
        companyLegalName,
        companyTradeName,
        companyAddress,
        companyCnae,
        monthlyRevenue,
        ownerFullName,
        ownerCpf,
        ownerBirthDate,
        ownerEmail,
        ownerPhone,
        ownerAddress,
        bankName,
        bankCode,
        bankAccountType,
        bankBranch,
        bankAccount,
        bankHolderDocument,
        cardGateway,
        gatewayMerchantId,
        stripeSecretKey,
        stripeWebhookSecret,
        mercadoPagoAccessToken,
        picpayToken,
        asaasAccessToken,
        pagbankEmail,
        pagbankToken,
        pagbankEnvironment,
        ownerDocumentFileUrl,
        bankProofFileUrl,
        companyContractFileUrl,
        whatsapp,
        instagram,
        facebook,
        restaurantName,
        restaurantLogo,
        restaurantCoverImage
      });
      return res.status(200).json(settings);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao atualizar configuracoes do restaurante"
      });
    }
  }
};
var UpdateRestaurantSettingsController_default = new UpdateRestaurantSettingsController();

// src/modules/restaurantSettings/services/GetPublicRestaurantSettingsService.ts
var GetPublicRestaurantSettingsService = class {
  async execute({ restaurantId, slug }) {
    let normalizedRestaurantId = Number(restaurantId);
    if ((!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) && slug) {
      const restaurant = await RestaurantRepository_default.findBySlug(
        String(slug).trim()
      );
      normalizedRestaurantId = Number(restaurant?.id || 0);
    }
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error("Restaurante inv\xE1lido.");
    }
    const settings = await RestaurantSettingsRepository_default.findPublicByRestaurantId(
      normalizedRestaurantId
    );
    if (!settings) {
      const restaurant = await RestaurantSettingsRepository_default.findRestaurantById(
        normalizedRestaurantId
      );
      const fallback = {
        restaurantId: normalizedRestaurantId,
        deliveryFee: 0,
        minimumOrder: 0,
        pixProvider: "MERCADO_PAGO",
        pixKey: null,
        instagram: null,
        facebook: null,
        restaurant: {
          name: restaurant?.name || null,
          slug: restaurant?.slug || null,
          logo: restaurant?.logo || null,
          coverImage: restaurant?.coverImage || null,
          banners: restaurant?.banners || []
        }
      };
      return fallback;
    }
    return settings;
  }
};
var GetPublicRestaurantSettingsService_default = new GetPublicRestaurantSettingsService();

// src/modules/restaurantSettings/controllers/GetPublicRestaurantSettingsController.ts
var GetPublicRestaurantSettingsController = class {
  async handle(req, res) {
    try {
      const restaurantId = Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId;
      const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
      const settings = await GetPublicRestaurantSettingsService_default.execute({
        restaurantId,
        slug
      });
      return res.status(200).json(settings);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao buscar configuracoes publicas do restaurante"
      });
    }
  }
};
var GetPublicRestaurantSettingsController_default = new GetPublicRestaurantSettingsController();

// src/modules/restaurantSettings/services/OnboardRestaurantAsaasService.ts
var OnboardRestaurantAsaasService = class {
  normalizeDocument(value) {
    return String(value || "").replace(/\D/g, "");
  }
  resolveDocumentType(value) {
    if (value.length === 14) {
      return "CNPJ";
    }
    if (value.length === 11) {
      return "CPF";
    }
    return null;
  }
  getAsaasBaseUrl() {
    return String(process.env.ASAAS_API_BASE_URL || "https://api.asaas.com").trim().replace(/\/+$/, "");
  }
  getAsaasApiKey() {
    return String(process.env.ASAAS_API_KEY || "").trim();
  }
  extractWalletIdentifier(payload) {
    return String(payload?.walletId || payload?.id || "").trim();
  }
  extractAsaasToken(payload) {
    return String(payload?.accessToken || payload?.apiKey || "").trim();
  }
  extractProviderError(payload) {
    if (!Array.isArray(payload?.errors) || payload.errors.length === 0) {
      return "Falha ao criar conta no Asaas.";
    }
    const firstError = String(payload.errors[0]?.description || "").trim();
    return firstError || "Falha ao criar conta no Asaas.";
  }
  async execute({
    restaurantId,
    cnpj,
    cpf,
    restaurantName,
    pixKey
  }) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error("Restaurante invalido para onboarding Asaas.");
    }
    const normalizedCnpj = this.normalizeDocument(cnpj || "");
    const normalizedCpf = this.normalizeDocument(cpf || "");
    if (normalizedCnpj && normalizedCpf && normalizedCnpj !== normalizedCpf) {
      throw new Error("Informe apenas um documento valido: CPF ou CNPJ.");
    }
    const normalizedDocument = normalizedCnpj || normalizedCpf;
    const legalDocumentType = this.resolveDocumentType(normalizedDocument);
    const normalizedRestaurantName = String(restaurantName || "").trim();
    const normalizedPixKey = String(pixKey || "").trim();
    if (!legalDocumentType) {
      throw new Error(
        "Documento invalido. Informe CPF (11) ou CNPJ (14) digitos."
      );
    }
    if (normalizedRestaurantName.length < 2) {
      throw new Error("Nome do restaurante invalido.");
    }
    if (!normalizedPixKey) {
      throw new Error("Chave PIX obrigatoria para onboarding Asaas.");
    }
    const asaasApiKey = this.getAsaasApiKey();
    if (!asaasApiKey) {
      throw new Error("ASAAS_API_KEY nao configurada no backend.");
    }
    const asaasBaseUrl = this.getAsaasBaseUrl();
    const response = await fetch(`${asaasBaseUrl}/v3/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: asaasApiKey
      },
      body: JSON.stringify({
        cpfCnpj: normalizedDocument,
        name: normalizedRestaurantName
      })
    });
    const responseBody = await response.json();
    if (!response.ok) {
      throw new Error(this.extractProviderError(responseBody));
    }
    const walletIdentifier = this.extractWalletIdentifier(responseBody);
    if (!walletIdentifier) {
      throw new Error(
        "Asaas nao retornou identificador da conta/carteira da subconta."
      );
    }
    const asaasSubaccountToken = this.extractAsaasToken(responseBody);
    const existingSettings = await RestaurantSettingsRepository_default.findByRestaurantId(
      normalizedRestaurantId
    );
    if (existingSettings) {
      await RestaurantSettingsRepository_default.update(normalizedRestaurantId, {
        legalDocumentType,
        companyDocument: normalizedDocument,
        companyTradeName: normalizedRestaurantName,
        pixProvider: "ASAAS",
        pixKey: normalizedPixKey,
        gatewayMerchantId: walletIdentifier,
        ...asaasSubaccountToken ? {
          asaasAccessToken: asaasSubaccountToken
        } : {}
      });
    } else {
      await RestaurantSettingsRepository_default.create({
        restaurantId: normalizedRestaurantId,
        deliveryFee: 0,
        minimumOrder: 0,
        pixProvider: "ASAAS",
        pixKey: normalizedPixKey,
        legalDocumentType,
        companyDocument: normalizedDocument,
        companyTradeName: normalizedRestaurantName,
        gatewayMerchantId: walletIdentifier,
        asaasAccessToken: asaasSubaccountToken || null
      });
    }
    return {
      restaurantId: normalizedRestaurantId,
      walletId: walletIdentifier,
      pixKey: normalizedPixKey,
      asaasSubaccountTokenConfigured: Boolean(asaasSubaccountToken)
    };
  }
};
var OnboardRestaurantAsaasService_default = new OnboardRestaurantAsaasService();

// src/modules/restaurantSettings/controllers/OnboardRestaurantAsaasController.ts
var OnboardRestaurantAsaasController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user?.restaurantId;
      const { cnpj, cpf, restaurantName, pixKey } = req.body;
      const result = await OnboardRestaurantAsaasService_default.execute({
        restaurantId,
        cnpj,
        cpf,
        restaurantName,
        pixKey
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao criar subconta Asaas do restaurante."
      });
    }
  }
};
var OnboardRestaurantAsaasController_default = new OnboardRestaurantAsaasController();

// src/modules/restaurantSettings/services/GetAsaasWalletBalanceService.ts
var GetAsaasWalletBalanceService = class {
  getAsaasBaseUrl() {
    return String(process.env.ASAAS_API_BASE_URL || "https://api.asaas.com").trim().replace(/\/+$/, "");
  }
  extractProviderError(payload) {
    if (!Array.isArray(payload?.errors) || payload.errors.length === 0) {
      return "Falha ao consultar saldo no Asaas.";
    }
    const firstError = String(payload.errors[0]?.description || "").trim();
    return firstError || "Falha ao consultar saldo no Asaas.";
  }
  async execute({ restaurantId }) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error("Restaurante invalido para consultar carteira Asaas.");
    }
    const settings = await RestaurantSettingsRepository_default.findByRestaurantId(
      normalizedRestaurantId
    );
    const asaasToken = String(settings?.asaasAccessToken || "").trim();
    if (!asaasToken) {
      throw new Error(
        "Conta Asaas ainda nao vinculada. Finalize o onboarding para consultar saldo."
      );
    }
    const asaasBaseUrl = this.getAsaasBaseUrl();
    const response = await fetch(`${asaasBaseUrl}/v3/finance/balance`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        access_token: asaasToken
      }
    });
    const responseBody = await response.json();
    if (!response.ok) {
      throw new Error(this.extractProviderError(responseBody));
    }
    const balance = Number(responseBody?.balance || 0);
    const blockedBalance = Number(responseBody?.blockedBalance || 0);
    const pendingBalance = Number(responseBody?.pendingBalance || 0);
    return {
      balance: Number.isFinite(balance) ? balance : 0,
      blockedBalance: Number.isFinite(blockedBalance) ? blockedBalance : 0,
      pendingBalance: Number.isFinite(pendingBalance) ? pendingBalance : 0
    };
  }
};
var GetAsaasWalletBalanceService_default = new GetAsaasWalletBalanceService();

// src/modules/restaurantSettings/controllers/GetAsaasWalletBalanceController.ts
var GetAsaasWalletBalanceController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user?.restaurantId;
      const result = await GetAsaasWalletBalanceService_default.execute({
        restaurantId
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao consultar saldo da carteira Asaas."
      });
    }
  }
};
var GetAsaasWalletBalanceController_default = new GetAsaasWalletBalanceController();

// src/modules/restaurantSettings/services/WithdrawAsaasWalletService.ts
var WithdrawAsaasWalletService = class {
  getAsaasBaseUrl() {
    return String(process.env.ASAAS_API_BASE_URL || "https://api.asaas.com").trim().replace(/\/+$/, "");
  }
  extractProviderError(payload) {
    if (!Array.isArray(payload?.errors) || payload.errors.length === 0) {
      return "Falha ao solicitar saque no Asaas.";
    }
    const firstError = String(payload.errors[0]?.description || "").trim();
    return firstError || "Falha ao solicitar saque no Asaas.";
  }
  async execute({
    restaurantId,
    value,
    pixKey,
    description
  }) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error("Restaurante invalido para saque Asaas.");
    }
    const normalizedValue = Number(value);
    if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
      throw new Error("Valor de saque invalido.");
    }
    const settings = await RestaurantSettingsRepository_default.findByRestaurantId(
      normalizedRestaurantId
    );
    const asaasToken = String(settings?.asaasAccessToken || "").trim();
    if (!asaasToken) {
      throw new Error(
        "Conta Asaas ainda nao vinculada. Finalize o onboarding para sacar."
      );
    }
    const targetPixKey = String(pixKey || settings?.pixKey || "").trim();
    if (!targetPixKey) {
      throw new Error("Chave PIX obrigatoria para saque.");
    }
    const transferDescription = String(description || "Saque carteira Asaas").trim().slice(0, 150);
    const asaasBaseUrl = this.getAsaasBaseUrl();
    const response = await fetch(`${asaasBaseUrl}/v3/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: asaasToken
      },
      body: JSON.stringify({
        value: Number(normalizedValue.toFixed(2)),
        operationType: "PIX",
        pixAddressKey: targetPixKey,
        description: transferDescription
      })
    });
    const responseBody = await response.json();
    if (!response.ok) {
      throw new Error(this.extractProviderError(responseBody));
    }
    return {
      transferId: String(responseBody?.id || ""),
      status: String(responseBody?.status || "PENDING"),
      value: Number(responseBody?.value || normalizedValue),
      operationType: String(responseBody?.operationType || "PIX"),
      dateCreated: String(responseBody?.dateCreated || ""),
      pixKey: targetPixKey
    };
  }
};
var WithdrawAsaasWalletService_default = new WithdrawAsaasWalletService();

// src/modules/restaurantSettings/controllers/WithdrawAsaasWalletController.ts
var WithdrawAsaasWalletController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user?.restaurantId;
      const { value, pixKey, description } = req.body;
      const result = await WithdrawAsaasWalletService_default.execute({
        restaurantId,
        value: Number(value),
        pixKey,
        description
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao solicitar saque da carteira Asaas."
      });
    }
  }
};
var WithdrawAsaasWalletController_default = new WithdrawAsaasWalletController();

// src/modules/restaurantSettings/services/StartMercadoPagoOAuthService.ts
import jwt4 from "jsonwebtoken";
var StartMercadoPagoOAuthService = class {
  getBackendBaseUrl() {
    return String(
      process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3e3}`
    ).trim().replace(/\/+$/, "");
  }
  getRedirectUri() {
    return String(process.env.MP_OAUTH_REDIRECT_URI || "").trim();
  }
  getAuthBaseUrl() {
    return String(
      process.env.MP_OAUTH_AUTH_URL || "https://auth.mercadopago.com.br/authorization"
    ).trim().replace(/\/+$/, "");
  }
  getClientId() {
    return String(
      process.env.MP_OAUTH_CLIENT_ID || process.env.MP_CLIENT_ID || process.env.MERCADO_PAGO_CLIENT_ID || ""
    ).trim();
  }
  getJwtSecret() {
    return String(process.env.JWT_SECRET || "").trim();
  }
  async execute({ restaurantId, userId }) {
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedUserId = Number(userId);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error("Restaurante invalido para conectar Mercado Pago.");
    }
    if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
      throw new Error("Usuario invalido para conectar Mercado Pago.");
    }
    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error(
        "Client ID OAuth do Mercado Pago nao configurado. Defina MP_OAUTH_CLIENT_ID (ou MP_CLIENT_ID / MERCADO_PAGO_CLIENT_ID) no backend."
      );
    }
    const jwtSecret = this.getJwtSecret();
    if (jwtSecret.length < 32) {
      throw new Error("JWT_SECRET invalido para assinar estado OAuth.");
    }
    const backendBaseUrl = this.getBackendBaseUrl();
    const redirectUri = this.getRedirectUri() || `${backendBaseUrl}/settings/mercado-pago/oauth/callback`;
    const state = jwt4.sign(
      {
        restaurantId: normalizedRestaurantId,
        userId: normalizedUserId
      },
      jwtSecret,
      {
        expiresIn: "10m"
      }
    );
    const query = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      platform_id: "mp",
      state,
      redirect_uri: redirectUri
    });
    return {
      authorizationUrl: `${this.getAuthBaseUrl()}?${query.toString()}`
    };
  }
};
var StartMercadoPagoOAuthService_default = new StartMercadoPagoOAuthService();

// src/modules/restaurantSettings/controllers/StartMercadoPagoOAuthController.ts
var StartMercadoPagoOAuthController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user?.restaurantId;
      const userId = req.user?.id;
      const result = await StartMercadoPagoOAuthService_default.execute({
        restaurantId,
        userId
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao iniciar conexao com Mercado Pago."
      });
    }
  }
};
var StartMercadoPagoOAuthController_default = new StartMercadoPagoOAuthController();

// src/modules/restaurantSettings/services/CompleteMercadoPagoOAuthService.ts
import jwt5 from "jsonwebtoken";
var CompleteMercadoPagoOAuthService = class {
  getApiBaseUrl() {
    return String(
      process.env.MP_OAUTH_API_BASE_URL || "https://api.mercadopago.com"
    ).trim().replace(/\/+$/, "");
  }
  getBackendBaseUrl() {
    return String(
      process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3e3}`
    ).trim().replace(/\/+$/, "");
  }
  getRedirectUri() {
    return String(process.env.MP_OAUTH_REDIRECT_URI || "").trim();
  }
  getClientId() {
    return String(
      process.env.MP_OAUTH_CLIENT_ID || process.env.MP_CLIENT_ID || process.env.MERCADO_PAGO_CLIENT_ID || ""
    ).trim();
  }
  getClientSecret() {
    return String(
      process.env.MP_OAUTH_CLIENT_SECRET || process.env.MP_CLIENT_SECRET || process.env.MERCADO_PAGO_CLIENT_SECRET || ""
    ).trim();
  }
  getJwtSecret() {
    return String(process.env.JWT_SECRET || "").trim();
  }
  decodeState(rawState) {
    const jwtSecret = this.getJwtSecret();
    if (jwtSecret.length < 32) {
      throw new Error("JWT_SECRET invalido para validar estado OAuth.");
    }
    const decoded = jwt5.verify(rawState, jwtSecret);
    const restaurantId = Number(decoded?.restaurantId || 0);
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      throw new Error("Estado OAuth invalido para restaurante.");
    }
    return {
      restaurantId,
      userId: Number(decoded?.userId || 0)
    };
  }
  extractProviderError(response) {
    const apiError = String(response?.error || "").trim();
    const apiMessage = String(response?.message || "").trim();
    if (apiError || apiMessage) {
      return [apiError, apiMessage].filter(Boolean).join(": ");
    }
    return "Mercado Pago nao concluiu a autorizacao.";
  }
  async execute({
    code,
    state,
    providerError,
    providerErrorDescription
  }) {
    if (providerError) {
      const details = String(providerErrorDescription || "").trim();
      const baseMessage = `Mercado Pago recusou autorizacao (${providerError}).`;
      throw new Error(details ? `${baseMessage} ${details}` : baseMessage);
    }
    const normalizedCode = String(code || "").trim();
    if (!normalizedCode) {
      throw new Error("Codigo OAuth do Mercado Pago nao recebido.");
    }
    const normalizedState = String(state || "").trim();
    if (!normalizedState) {
      throw new Error("State OAuth do Mercado Pago nao recebido.");
    }
    const { restaurantId } = this.decodeState(normalizedState);
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    if (!clientId || !clientSecret) {
      throw new Error(
        "Credenciais OAuth do Mercado Pago nao configuradas. Defina MP_OAUTH_CLIENT_ID e MP_OAUTH_CLIENT_SECRET (ou aliases MP_CLIENT_ID/MP_CLIENT_SECRET)."
      );
    }
    const redirectUri = this.getRedirectUri() || `${this.getBackendBaseUrl()}/settings/mercado-pago/oauth/callback`;
    const tokenResponse = await fetch(`${this.getApiBaseUrl()}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: normalizedCode,
        redirect_uri: redirectUri
      })
    });
    const tokenBody = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(this.extractProviderError(tokenBody));
    }
    const accessToken = String(tokenBody?.access_token || "").trim();
    if (!accessToken) {
      throw new Error("Mercado Pago nao retornou access_token valido.");
    }
    const existingSettings = await RestaurantSettingsRepository_default.findByRestaurantId(restaurantId);
    if (existingSettings) {
      await RestaurantSettingsRepository_default.update(restaurantId, {
        pixProvider: "MERCADO_PAGO",
        cardGateway: "MERCADO_PAGO",
        mercadoPagoAccessToken: accessToken
      });
    } else {
      await RestaurantSettingsRepository_default.create({
        restaurantId,
        deliveryFee: 0,
        minimumOrder: 0,
        pixProvider: "MERCADO_PAGO",
        cardGateway: "MERCADO_PAGO",
        mercadoPagoAccessToken: accessToken
      });
    }
    return {
      restaurantId,
      connected: true
    };
  }
};
var CompleteMercadoPagoOAuthService_default = new CompleteMercadoPagoOAuthService();

// src/modules/restaurantSettings/controllers/MercadoPagoOAuthCallbackController.ts
var MercadoPagoOAuthCallbackController = class {
  getFrontendBaseUrl() {
    return String(process.env.FRONTEND_URL || "http://localhost:5173").trim().replace(/\/+$/, "");
  }
  buildAdminRedirect(status, message) {
    const query = new URLSearchParams({
      mp_oauth: status
    });
    const normalizedMessage = String(message || "").trim();
    if (normalizedMessage) {
      query.set("message", normalizedMessage);
    }
    return `${this.getFrontendBaseUrl()}/admin?${query.toString()}`;
  }
  async handle(req, res) {
    try {
      const code = String(req.query.code || "").trim();
      const state = String(req.query.state || "").trim();
      const providerError = String(req.query.error || "").trim();
      const providerErrorDescription = String(
        req.query.error_description || ""
      ).trim();
      await CompleteMercadoPagoOAuthService_default.execute({
        code,
        state,
        providerError,
        providerErrorDescription
      });
      return res.redirect(this.buildAdminRedirect("success"));
    } catch (error2) {
      const message = error2 instanceof Error ? error2.message : "Erro ao concluir conexao com Mercado Pago.";
      return res.redirect(this.buildAdminRedirect("error", message));
    }
  }
};
var MercadoPagoOAuthCallbackController_default = new MercadoPagoOAuthCallbackController();

// src/modules/restaurantSettings/services/StartPagBankOAuthService.ts
import jwt6 from "jsonwebtoken";
var StartPagBankOAuthService = class {
  async execute({ restaurantId, userId }) {
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedUserId = Number(userId);
    const clientId = String(process.env.PAGBANK_CONNECT_CLIENT_ID || "").trim();
    const jwtSecret = String(process.env.JWT_SECRET || "").trim();
    if (!normalizedRestaurantId || !normalizedUserId) {
      throw new Error("Restaurante ou administrador inv\xE1lido para conectar PagBank.");
    }
    if (!clientId) {
      throw new Error("PAGBANK_CONNECT_CLIENT_ID n\xE3o configurado no backend.");
    }
    if (jwtSecret.length < 32) {
      throw new Error("JWT_SECRET inv\xE1lido para iniciar conex\xE3o PagBank.");
    }
    const backendUrl = String(process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3e3}`).trim().replace(/\/+$/, "");
    const redirectUri = String(
      process.env.PAGBANK_CONNECT_REDIRECT_URI || `${backendUrl}/settings/pagbank/oauth/callback`
    ).trim();
    const state = jwt6.sign(
      { restaurantId: normalizedRestaurantId, userId: normalizedUserId },
      jwtSecret,
      { expiresIn: "10m" }
    );
    const authBaseUrl = String(
      process.env.PAGBANK_CONNECT_AUTH_URL || "https://connect.pagbank.com.br/oauth2/authorize"
    ).trim();
    const query = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "payments.read payments.create payments.refund checkout.create checkout.view",
      state
    });
    return { authorizationUrl: `${authBaseUrl}?${query.toString()}` };
  }
};
var StartPagBankOAuthService_default = new StartPagBankOAuthService();

// src/modules/restaurantSettings/controllers/StartPagBankOAuthController.ts
var StartPagBankOAuthController = class {
  async handle(req, res) {
    try {
      const result = await StartPagBankOAuthService_default.execute({
        restaurantId: req.user?.restaurantId,
        userId: req.user?.id
      });
      return res.json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao conectar PagBank."
      });
    }
  }
};
var StartPagBankOAuthController_default = new StartPagBankOAuthController();

// src/modules/restaurantSettings/services/CompletePagBankOAuthService.ts
import jwt7 from "jsonwebtoken";
var CompletePagBankOAuthService = class {
  async execute({ code, state }) {
    const normalizedCode = String(code || "").trim();
    const normalizedState = String(state || "").trim();
    const jwtSecret = String(process.env.JWT_SECRET || "").trim();
    if (!normalizedCode || !normalizedState) {
      throw new Error("C\xF3digo de autoriza\xE7\xE3o PagBank n\xE3o recebido.");
    }
    const decoded = jwt7.verify(normalizedState, jwtSecret);
    const restaurantId = Number(decoded.restaurantId || 0);
    if (!restaurantId) throw new Error("Estado OAuth PagBank inv\xE1lido.");
    const clientId = String(process.env.PAGBANK_CONNECT_CLIENT_ID || "").trim();
    const clientSecret = String(process.env.PAGBANK_CONNECT_CLIENT_SECRET || "").trim();
    const platformToken = String(process.env.PAGBANK_CONNECT_PLATFORM_TOKEN || "").trim();
    if (!clientId || !clientSecret || !platformToken) {
      throw new Error("Credenciais da aplica\xE7\xE3o PagBank Connect n\xE3o configuradas.");
    }
    const backendUrl = String(process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3e3}`).trim().replace(/\/+$/, "");
    const redirectUri = String(
      process.env.PAGBANK_CONNECT_REDIRECT_URI || `${backendUrl}/settings/pagbank/oauth/callback`
    ).trim();
    const apiBaseUrl = String(
      process.env.PAGBANK_CONNECT_API_URL || "https://api.pagseguro.com"
    ).trim().replace(/\/+$/, "");
    const response = await fetch(`${apiBaseUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${platformToken}`,
        X_CLIENT_ID: clientId,
        X_CLIENT_SECRET: clientSecret,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: normalizedCode,
        redirect_uri: redirectUri
      })
    });
    const body = await response.json();
    const accessToken = String(body.access_token || "").trim();
    if (!response.ok || !accessToken) {
      throw new Error(
        String(body.error_description || body.error || "PagBank recusou a conex\xE3o.")
      );
    }
    const refreshToken = String(body.refresh_token || "").trim() || null;
    const expiresIn = Number(body.expires_in || 0);
    const expiresAt = expiresIn > 0 ? new Date(Date.now() + Math.max(expiresIn - 300, 60) * 1e3) : null;
    const existing = await RestaurantSettingsRepository_default.findByRestaurantId(restaurantId);
    const data = {
      pixProvider: "PAGBANK",
      cardGateway: "PAGBANK",
      pagbankToken: accessToken,
      pagbankRefreshToken: refreshToken,
      pagbankTokenExpiresAt: expiresAt,
      pagbankEnvironment: "production"
    };
    if (existing) await RestaurantSettingsRepository_default.update(restaurantId, data);
    else await RestaurantSettingsRepository_default.create({
      restaurantId,
      deliveryFee: 0,
      minimumOrder: 0,
      ...data
    });
    return { restaurantId, connected: true };
  }
};
var CompletePagBankOAuthService_default = new CompletePagBankOAuthService();

// src/modules/restaurantSettings/controllers/PagBankOAuthCallbackController.ts
var PagBankOAuthCallbackController = class {
  async handle(req, res) {
    const frontendUrl = String(process.env.FRONTEND_URL || "http://localhost:5173").trim().replace(/\/+$/, "");
    try {
      if (req.query.error) {
        throw new Error(String(req.query.error_description || req.query.error));
      }
      await CompletePagBankOAuthService_default.execute({
        code: String(req.query.code || ""),
        state: String(req.query.state || "")
      });
      return res.redirect(`${frontendUrl}/admin?pagbank_oauth=success`);
    } catch (error2) {
      const query = new URLSearchParams({
        pagbank_oauth: "error",
        message: error2 instanceof Error ? error2.message : "Erro ao conectar PagBank."
      });
      return res.redirect(`${frontendUrl}/admin?${query.toString()}`);
    }
  }
};
var PagBankOAuthCallbackController_default = new PagBankOAuthCallbackController();

// src/modules/restaurantSettings/routes/RestaurantSettingsRoutes.ts
var router9 = Router9();
router9.get(
  "/public/slug/:slug",
  (req, res) => GetPublicRestaurantSettingsController_default.handle(req, res)
);
router9.get(
  "/public/:restaurantId",
  (req, res) => GetPublicRestaurantSettingsController_default.handle(req, res)
);
router9.post(
  "/",
  authMiddleware,
  adminMiddleware,
  (req, res) => CreateRestaurantSettingsController_default.handle(req, res)
);
router9.get(
  "/",
  authMiddleware,
  adminMiddleware,
  (req, res) => GetRestaurantSettingsController_default.handle(req, res)
);
router9.post(
  "/mercado-pago/oauth/start",
  authMiddleware,
  adminMiddleware,
  (req, res) => StartMercadoPagoOAuthController_default.handle(req, res)
);
router9.get(
  "/mercado-pago/oauth/callback",
  (req, res) => MercadoPagoOAuthCallbackController_default.handle(req, res)
);
router9.post(
  "/pagbank/oauth/start",
  authMiddleware,
  adminMiddleware,
  (req, res) => StartPagBankOAuthController_default.handle(req, res)
);
router9.get(
  "/pagbank/oauth/callback",
  (req, res) => PagBankOAuthCallbackController_default.handle(req, res)
);
router9.post(
  "/asaas/onboard",
  authMiddleware,
  adminMiddleware,
  (req, res) => OnboardRestaurantAsaasController_default.handle(req, res)
);
router9.get(
  "/asaas/wallet/balance",
  authMiddleware,
  adminMiddleware,
  (req, res) => GetAsaasWalletBalanceController_default.handle(req, res)
);
router9.post(
  "/asaas/wallet/withdraw",
  authMiddleware,
  adminMiddleware,
  (req, res) => WithdrawAsaasWalletController_default.handle(req, res)
);
router9.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  (req, res) => UpdateRestaurantSettingsController_default.handle(req, res)
);
var RestaurantSettingsRoutes_default = router9;

// src/modules/banner/routes/BannerRoutes.ts
import { Router as Router10 } from "express";

// src/modules/banner/repositories/BannerRepository.ts
var BannerRepository = class {
  async create(data) {
    return prisma_default.banner.create({
      data
    });
  }
  async findAllByRestaurant(restaurantId) {
    return prisma_default.banner.findMany({
      where: {
        restaurantId: Number(restaurantId)
      },
      orderBy: {
        id: "desc"
      }
    });
  }
  async findById(id, restaurantId) {
    return prisma_default.banner.findFirst({
      where: {
        id: Number(id),
        restaurantId: Number(restaurantId)
      }
    });
  }
  async update(id, restaurantId, data) {
    const result = await prisma_default.banner.updateMany({
      where: {
        id: Number(id),
        restaurantId: Number(restaurantId)
      },
      data
    });
    if (result.count === 0) {
      return null;
    }
    return this.findById(id, restaurantId);
  }
  async delete(id, restaurantId) {
    return prisma_default.banner.deleteMany({
      where: {
        id: Number(id),
        restaurantId: Number(restaurantId)
      }
    });
  }
};
var BannerRepository_default = new BannerRepository();

// src/modules/banner/services/CreateBannerService.ts
var CreateBannerService = class {
  async execute({ title, image, restaurantId }) {
    if (!title || !image) {
      throw new Error("T\xEDtulo e imagem s\xE3o obrigat\xF3rios");
    }
    return await BannerRepository_default.create({
      title,
      image,
      restaurantId: Number(restaurantId)
    });
  }
};
var CreateBannerService_default = new CreateBannerService();

// src/modules/banner/controllers/CreateBannerController.ts
var CreateBannerController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const { title, image } = req.body;
      const banner = await CreateBannerService_default.execute({
        title,
        image,
        restaurantId
      });
      return res.status(201).json(banner);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao criar banner"
      });
    }
  }
};
var CreateBannerController_default = new CreateBannerController();

// src/modules/banner/services/ListBannerService.ts
var ListBannerService = class {
  async execute({ restaurantId }) {
    return await BannerRepository_default.findAllByRestaurant(Number(restaurantId));
  }
};
var ListBannerService_default = new ListBannerService();

// src/modules/banner/controllers/ListBannerController.ts
var ListBannerController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const banners = await ListBannerService_default.execute({
        restaurantId
      });
      return res.status(200).json(banners);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao listar banners"
      });
    }
  }
};
var ListBannerController_default = new ListBannerController();

// src/modules/banner/services/UpdateBannerService.ts
var UpdateBannerService = class {
  async execute({ id, restaurantId, title, image }) {
    const banner = await BannerRepository_default.findById(id, restaurantId);
    if (!banner) {
      throw new Error("Banner n\xE3o encontrado");
    }
    return await BannerRepository_default.update(id, restaurantId, {
      title,
      image
    });
  }
};
var UpdateBannerService_default = new UpdateBannerService();

// src/modules/banner/controllers/UpdateBannerController.ts
var UpdateBannerController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { title, image } = req.body;
      const banner = await UpdateBannerService_default.execute({
        id,
        restaurantId,
        title,
        image
      });
      return res.status(200).json(banner);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao atualizar banner"
      });
    }
  }
};
var UpdateBannerController_default = new UpdateBannerController();

// src/modules/banner/services/DeleteBannerService.ts
var DeleteBannerService = class {
  async execute({ id, restaurantId }) {
    const banner = await BannerRepository_default.findById(id, restaurantId);
    if (!banner) {
      throw new Error("Banner n\xE3o encontrado");
    }
    await BannerRepository_default.delete(id, restaurantId);
    return { message: "Banner removido com sucesso" };
  }
};
var DeleteBannerService_default = new DeleteBannerService();

// src/modules/banner/controllers/DeleteBannerController.ts
var DeleteBannerController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await DeleteBannerService_default.execute({
        id,
        restaurantId
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao remover banner"
      });
    }
  }
};
var DeleteBannerController_default = new DeleteBannerController();

// src/modules/banner/routes/BannerRoutes.ts
var router10 = Router10();
router10.post(
  "/",
  authMiddleware,
  adminMiddleware,
  billingMiddleware,
  (req, res) => CreateBannerController_default.handle(req, res)
);
router10.get(
  "/",
  authMiddleware,
  adminMiddleware,
  (req, res) => ListBannerController_default.handle(req, res)
);
router10.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  (req, res) => UpdateBannerController_default.handle(req, res)
);
router10.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  (req, res) => DeleteBannerController_default.handle(req, res)
);
var BannerRoutes_default = router10;

// src/modules/coupon/routes/CouponRoutes.ts
import { Router as Router11 } from "express";

// src/modules/coupon/repositories/CouponRepository.ts
var CouponRepository = class {
  async create(data) {
    return prisma_default.coupon.create({
      data
    });
  }
  async findAllByRestaurant(restaurantId) {
    return prisma_default.coupon.findMany({
      where: {
        restaurantId: Number(restaurantId)
      },
      orderBy: {
        id: "desc"
      }
    });
  }
  async findById(id, restaurantId) {
    return prisma_default.coupon.findFirst({
      where: {
        id: Number(id),
        restaurantId: Number(restaurantId)
      }
    });
  }
  async findByCode(code, restaurantId) {
    return prisma_default.coupon.findFirst({
      where: {
        code,
        restaurantId: Number(restaurantId)
      }
    });
  }
  async update(id, restaurantId, data) {
    const result = await prisma_default.coupon.updateMany({
      where: {
        id: Number(id),
        restaurantId: Number(restaurantId)
      },
      data
    });
    if (result.count === 0) {
      return null;
    }
    return this.findById(id, restaurantId);
  }
  async delete(id, restaurantId) {
    return prisma_default.coupon.deleteMany({
      where: {
        id: Number(id),
        restaurantId: Number(restaurantId)
      }
    });
  }
};
var CouponRepository_default = new CouponRepository();

// src/modules/coupon/services/CreateCouponService.ts
var CreateCouponService = class {
  async execute({
    code,
    discount,
    expiration,
    restaurantId
  }) {
    const exists = await CouponRepository_default.findByCode(code, restaurantId);
    if (exists) {
      throw new Error("Cupom j\xE1 existe!");
    }
    return await CouponRepository_default.create({
      code,
      discount,
      expiration,
      restaurantId
    });
  }
};
var CreateCouponService_default = new CreateCouponService();

// src/modules/coupon/controllers/CreateCouponController.ts
var CreateCouponController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const { code, discount, expiration } = req.body;
      const coupon = await CreateCouponService_default.execute({
        code,
        discount,
        expiration,
        restaurantId
      });
      return res.status(201).json(coupon);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao criar cupom"
      });
    }
  }
};
var CreateCouponController_default = new CreateCouponController();

// src/modules/coupon/services/ListCouponService.ts
var ListCouponService = class {
  async execute({ restaurantId }) {
    return await CouponRepository_default.findAllByRestaurant(restaurantId);
  }
};
var ListCouponService_default = new ListCouponService();

// src/modules/coupon/controllers/ListCouponController.ts
var ListCouponController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const coupons = await ListCouponService_default.execute({
        restaurantId
      });
      return res.status(200).json(coupons);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao listar cupons"
      });
    }
  }
};
var ListCouponController_default = new ListCouponController();

// src/modules/coupon/services/UpdateCouponService.ts
var UpdateCouponService = class {
  async execute({
    id,
    restaurantId,
    code,
    discount,
    expiration
  }) {
    const normalizedId = Array.isArray(id) ? id[0] : id;
    const coupon = await CouponRepository_default.findById(normalizedId, restaurantId);
    if (!coupon) {
      throw new Error("Cupom n\xE3o encontrado");
    }
    return await CouponRepository_default.update(normalizedId, restaurantId, {
      code,
      discount,
      expiration
    });
  }
};
var UpdateCouponService_default = new UpdateCouponService();

// src/modules/coupon/controllers/UpdateCouponController.ts
var UpdateCouponController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const { id } = req.params;
      const { code, discount, expiration } = req.body;
      const coupon = await UpdateCouponService_default.execute({
        id,
        restaurantId,
        code,
        discount,
        expiration
      });
      return res.status(200).json(coupon);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao atualizar cupom"
      });
    }
  }
};
var UpdateCouponController_default = new UpdateCouponController();

// src/modules/coupon/services/DeleteCouponService.ts
var DeleteCouponService = class {
  async execute({ id, restaurantId }) {
    const normalizedId = Array.isArray(id) ? id[0] : id;
    const coupon = await CouponRepository_default.findById(normalizedId, restaurantId);
    if (!coupon) {
      throw new Error("Cupom n\xE3o encontrado");
    }
    await CouponRepository_default.delete(normalizedId, restaurantId);
    return { message: "Cupom removido com sucesso" };
  }
};
var DeleteCouponService_default = new DeleteCouponService();

// src/modules/coupon/controllers/DeleteCouponController.ts
var DeleteCouponController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const { id } = req.params;
      const result = await DeleteCouponService_default.execute({
        id,
        restaurantId
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao remover cupom"
      });
    }
  }
};
var DeleteCouponController_default = new DeleteCouponController();

// src/modules/coupon/routes/CouponRoutes.ts
var router11 = Router11();
router11.post(
  "/",
  authMiddleware,
  adminMiddleware,
  billingMiddleware,
  (req, res) => CreateCouponController_default.handle(req, res)
);
router11.get(
  "/",
  authMiddleware,
  adminMiddleware,
  (req, res) => ListCouponController_default.handle(req, res)
);
router11.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  (req, res) => UpdateCouponController_default.handle(req, res)
);
router11.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  (req, res) => DeleteCouponController_default.handle(req, res)
);
var CouponRoutes_default = router11;

// src/modules/subscription/routes/SubscriptionRoutes.ts
import { Router as Router12 } from "express";

// src/modules/subscription/services/CreateSubscriptionService.ts
var CreateSubscriptionService = class {
  async execute({
    restaurantId,
    plan,
    status,
    trialEndsAt
  }) {
    const exists = await SubscriptionRepository_default.findByRestaurantId(restaurantId);
    if (exists) {
      throw new Error("Assinatura j\xE1 existe para esse restaurante!");
    }
    return await SubscriptionRepository_default.create({
      restaurantId: Number(restaurantId),
      plan,
      status,
      trialEndsAt
    });
  }
};
var CreateSubscriptionService_default = new CreateSubscriptionService();

// src/modules/subscription/controllers/CreateSubscriptionController.ts
var CreateSubscriptionController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const { plan, status, trialEndsAt } = req.body;
      const subscription = await CreateSubscriptionService_default.execute({
        restaurantId,
        plan,
        status,
        trialEndsAt
      });
      return res.status(201).json(subscription);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao criar assinatura"
      });
    }
  }
};
var CreateSubscriptionController_default = new CreateSubscriptionController();

// src/modules/subscription/services/GetSubscriptionService.ts
var GetSubscriptionService = class {
  async execute({ restaurantId }) {
    const subscription = await SubscriptionRepository_default.findByRestaurantId(restaurantId);
    if (!subscription) {
      throw new Error("Assinatura n\xE3o encontrada!");
    }
    return subscription;
  }
};
var GetSubscriptionService_default = new GetSubscriptionService();

// src/modules/subscription/controllers/GetSubscriptionController.ts
var GetSubscriptionController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const subscription = await GetSubscriptionService_default.execute({
        restaurantId
      });
      return res.status(200).json(subscription);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao buscar assinatura"
      });
    }
  }
};
var GetSubscriptionController_default = new GetSubscriptionController();

// src/modules/subscription/services/UpdateSubscriptionService.ts
var UpdateSubscriptionService = class {
  async execute({
    restaurantId,
    plan,
    status,
    trialEndsAt
  }) {
    const subscription = await SubscriptionRepository_default.findByRestaurantId(restaurantId);
    if (!subscription) {
      throw new Error("Assinatura n\xE3o encontrada!");
    }
    return await SubscriptionRepository_default.update(restaurantId, {
      plan,
      status,
      trialEndsAt
    });
  }
};
var UpdateSubscriptionService_default = new UpdateSubscriptionService();

// src/modules/subscription/controllers/UpdateSubscriptionController.ts
var UpdateSubscriptionController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const { plan, status, trialEndsAt } = req.body;
      const subscription = await UpdateSubscriptionService_default.execute({
        restaurantId,
        plan,
        status,
        trialEndsAt
      });
      return res.status(200).json(subscription);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao atualizar assinatura"
      });
    }
  }
};
var UpdateSubscriptionController_default = new UpdateSubscriptionController();

// src/modules/subscription/controllers/RequestPlanChangeController.ts
import { PlanType as PlanType4 } from "@prisma/client";

// src/modules/subscription/services/RequestPlanChangeService.ts
import { PlanType as PlanType3 } from "@prisma/client";
function getNextMonthPeriod(fromDate) {
  const next = new Date(fromDate);
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const lockUntil = new Date(next);
  lockUntil.setMonth(lockUntil.getMonth() + 1);
  return {
    month: next.getMonth() + 1,
    year: next.getFullYear(),
    lockUntil
  };
}
var RequestPlanChangeService = class {
  async execute({ restaurantId, plan }) {
    if (!Object.values(PlanType3).includes(plan)) {
      throw new Error("Plano invalido para troca.");
    }
    const subscription = await SubscriptionRepository_default.findByRestaurantId(restaurantId);
    if (!subscription) {
      throw new Error("Assinatura nao encontrada.");
    }
    const now = /* @__PURE__ */ new Date();
    const invoices = await BillingRepository_default.findInvoicesByRestaurantId(
      Number(restaurantId)
    );
    const latestInvoice = invoices[0] || null;
    if (!latestInvoice || latestInvoice.status !== "PAGO") {
      throw new Error(
        "Para trocar de plano, a ultima fatura precisa estar paga."
      );
    }
    const hasOpenInvoice = invoices.some(
      (invoice) => ["PENDENTE", "ATRASADO", "VENCIDO"].includes(
        String(invoice.status || "").toUpperCase()
      )
    );
    if (hasOpenInvoice) {
      throw new Error(
        "Regularize as faturas pendentes para liberar a troca de plano."
      );
    }
    const referenceDate = latestInvoice.paidAt ? new Date(latestInvoice.paidAt) : new Date(latestInvoice.createdAt);
    const planChangeDeadline = new Date(referenceDate);
    planChangeDeadline.setDate(planChangeDeadline.getDate() + 30);
    if (now > planChangeDeadline) {
      throw new Error(
        `A troca de plano so pode ser solicitada em ate 30 dias apos o pagamento da fatura. Prazo encerrado em ${planChangeDeadline.toLocaleDateString("pt-BR")}.`
      );
    }
    if (subscription.planChangeLockedUntil && now < new Date(subscription.planChangeLockedUntil)) {
      throw new Error(
        `Voce ja solicitou uma troca. Nova alteracao disponivel apos ${new Date(subscription.planChangeLockedUntil).toLocaleDateString("pt-BR")}.`
      );
    }
    if (subscription.plan === plan) {
      throw new Error("Esse ja e o plano atual da assinatura.");
    }
    if (subscription.scheduledPlan) {
      throw new Error(
        "Ja existe uma troca de plano agendada para o proximo ciclo."
      );
    }
    const nextPeriod = getNextMonthPeriod(now);
    const updated = await SubscriptionRepository_default.update(restaurantId, {
      scheduledPlan: plan,
      scheduledPlanEffectiveMonth: nextPeriod.month,
      scheduledPlanEffectiveYear: nextPeriod.year,
      planChangeLockedUntil: nextPeriod.lockUntil
    });
    return {
      ...updated,
      message: "Troca de plano agendada para o proximo ciclo de faturamento."
    };
  }
};
var RequestPlanChangeService_default = new RequestPlanChangeService();

// src/modules/subscription/controllers/RequestPlanChangeController.ts
var RequestPlanChangeController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const { plan } = req.body;
      if (!restaurantId) {
        return res.status(400).json({
          error: "Restaurant ID not found in user context"
        });
      }
      if (!plan || !Object.values(PlanType4).includes(plan)) {
        return res.status(400).json({
          error: "Plano invalido."
        });
      }
      const subscription = await RequestPlanChangeService_default.execute({
        restaurantId,
        plan
      });
      return res.status(200).json(subscription);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao solicitar troca de plano"
      });
    }
  }
};
var RequestPlanChangeController_default = new RequestPlanChangeController();

// src/modules/subscription/routes/SubscriptionRoutes.ts
var router12 = Router12();
router12.post(
  "/",
  authMiddleware,
  adminMiddleware,
  (req, res) => CreateSubscriptionController_default.handle(req, res)
);
router12.get(
  "/",
  authMiddleware,
  adminMiddleware,
  (req, res) => GetSubscriptionController_default.handle(req, res)
);
router12.put(
  "/",
  authMiddleware,
  adminMiddleware,
  (req, res) => UpdateSubscriptionController_default.handle(req, res)
);
router12.post(
  "/change-plan",
  authMiddleware,
  adminMiddleware,
  (req, res) => RequestPlanChangeController_default.handle(req, res)
);
var SubscriptionRoutes_default = router12;

// src/modules/aiSupport/routes/AiSupportRoutes.ts
import { Router as Router13 } from "express";

// src/modules/aiSupport/services/ListSupportChatMessagesService.ts
var ListSupportChatMessagesService = class {
  async execute(input) {
    const normalizedRole = String(input.requesterRole || "").toUpperCase();
    const isAdmin = normalizedRole === "ADMIN";
    const isSuperAdmin = normalizedRole === "SUPER_ADMIN";
    if (!isAdmin && !isSuperAdmin) {
      throw new Error("Sem permiss\xE3o para acessar o chat de suporte.");
    }
    const requesterRestaurantId = Number(input.requesterRestaurantId || 0);
    const queryRestaurantId = Number(input.queryRestaurantId || 0);
    const restaurantId = isSuperAdmin ? queryRestaurantId : requesterRestaurantId;
    const beforeId = Number(input.queryBeforeId || 0);
    const requestedLimit = Number(input.queryLimit || 0);
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 40;
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      throw new Error("Restaurante inv\xE1lido para carregar hist\xF3rico.");
    }
    const messages = await prisma_default.$queryRaw`
      SELECT
        "id",
        "message",
        "senderRole",
        "senderUserId",
        "senderLabel",
        "restaurantId",
        "sentAt"
      FROM "SupportChatMessage"
      WHERE
        "restaurantId" = ${restaurantId}
        AND (${beforeId} <= 0 OR "id" < ${beforeId})
      ORDER BY "id" DESC
      LIMIT ${limit + 1}
    `;
    const hasMore = messages.length > limit;
    const slicedMessages = hasMore ? messages.slice(0, limit) : messages;
    const oldestMessage = slicedMessages[slicedMessages.length - 1] || null;
    return {
      restaurantId,
      hasMore,
      nextBeforeId: oldestMessage ? String(oldestMessage.id) : null,
      messages: slicedMessages.slice().reverse().map((item) => ({
        id: String(item.id),
        message: item.message,
        senderRole: item.senderRole,
        senderUserId: Number(item.senderUserId || 0) || 0,
        senderLabel: item.senderLabel,
        restaurantId: item.restaurantId,
        sentAt: item.sentAt?.toISOString?.() || null
      }))
    };
  }
};
var ListSupportChatMessagesService_default = new ListSupportChatMessagesService();

// src/modules/aiSupport/controllers/ListSupportChatMessagesController.ts
var ListSupportChatMessagesController = class {
  async handle(req, res) {
    try {
      const { role, restaurantId } = req.user;
      const rawRestaurantId = Array.isArray(req.query.restaurantId) && req.query.restaurantId.length > 0 ? req.query.restaurantId[0] : req.query.restaurantId || null;
      const queryRestaurantId = typeof rawRestaurantId === "string" || typeof rawRestaurantId === "number" ? rawRestaurantId : null;
      const rawBeforeId = Array.isArray(req.query.beforeId) && req.query.beforeId.length > 0 ? req.query.beforeId[0] : req.query.beforeId || null;
      const queryBeforeId = typeof rawBeforeId === "string" || typeof rawBeforeId === "number" ? rawBeforeId : null;
      const rawLimit = Array.isArray(req.query.limit) && req.query.limit.length > 0 ? req.query.limit[0] : req.query.limit || null;
      const queryLimit = typeof rawLimit === "string" || typeof rawLimit === "number" ? rawLimit : null;
      const result = await ListSupportChatMessagesService_default.execute({
        requesterRole: role,
        requesterRestaurantId: restaurantId,
        queryRestaurantId,
        queryBeforeId,
        queryLimit
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao carregar hist\xF3rico do chat de suporte."
      });
    }
  }
};
var ListSupportChatMessagesController_default = new ListSupportChatMessagesController();

// src/modules/aiSupport/controllers/GetAllSupportTicketsController.ts
function formatElapsed(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 6e4);
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ${diffMin % 60}min`;
  return `${Math.floor(diffH / 24)}d`;
}
var GetAllSupportTicketsController = class {
  async handle(_req, res) {
    try {
      const grouped = await prisma_default.supportChatMessage.groupBy({
        by: ["restaurantId"],
        _max: { sentAt: true },
        _count: { id: true },
        orderBy: { _max: { sentAt: "desc" } },
        take: 100
      });
      if (grouped.length === 0) return res.status(200).json([]);
      const restaurantIds = grouped.map((g) => g.restaurantId);
      const [restaurants, firstMessages] = await Promise.all([
        prisma_default.restaurant.findMany({
          where: { id: { in: restaurantIds } },
          select: { id: true, name: true }
        }),
        prisma_default.supportChatMessage.findMany({
          where: {
            restaurantId: { in: restaurantIds },
            senderRole: { not: "SUPER_ADMIN" }
          },
          orderBy: { sentAt: "asc" },
          select: { restaurantId: true, message: true },
          distinct: ["restaurantId"]
        })
      ]);
      const restaurantMap = new Map(restaurants.map((r) => [r.id, r.name]));
      const subjectMap = new Map(
        firstMessages.map((m) => [m.restaurantId, m.message])
      );
      const tickets = grouped.map((g) => ({
        id: `#SUP-${String(g.restaurantId).padStart(4, "0")}`,
        restaurant: restaurantMap.get(g.restaurantId) ?? "Desconhecido",
        subject: (subjectMap.get(g.restaurantId) ?? "Sem mensagem").slice(
          0,
          60
        ),
        priority: "MEDIUM",
        status: "OPEN",
        responsible: "Suporte",
        elapsed: g._max.sentAt ? formatElapsed(g._max.sentAt) : "\u2014"
      }));
      return res.status(200).json(tickets);
    } catch (error2) {
      return res.status(400).json({
        message: error2 instanceof Error ? error2.message : "Erro ao listar tickets"
      });
    }
  }
};
var GetAllSupportTicketsController_default = new GetAllSupportTicketsController();

// src/modules/aiSupport/routes/AiSupportRoutes.ts
var router13 = Router13();
router13.get("/messages", authMiddleware, (req, res) => {
  ListSupportChatMessagesController_default.handle(req, res);
});
router13.get("/tickets/all", authMiddleware, superAdminMiddleware, (req, res) => {
  GetAllSupportTicketsController_default.handle(req, res);
});
var AiSupportRoutes_default = router13;

// src/modules/menuImport/routes/MenuImportRoutes.ts
import { Router as Router14 } from "express";

// src/modules/menuImport/services/ImportIfoodMenuScraperService.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { z as z9 } from "zod";
var scrapeInputSchema = z9.object({
  url: z9.string().trim().url("Informe uma URL v\xE1lida do iFood."),
  restaurantId: z9.union([z9.number(), z9.string()])
});
function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}
function normalizeComparableName(value) {
  return normalizeText(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function buildUserAgent() {
  return [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "AppleWebKit/537.36 (KHTML, like Gecko)",
    "Chrome/126.0.0.0 Safari/537.36"
  ].join(" ");
}
function parsePrice(raw) {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  const text = normalizeText(raw);
  if (!text) {
    return null;
  }
  const normalized = text.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(/,(?=\d{1,2}$)/g, ".").replace(/,/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
function extractStructuredData($) {
  const collected = [];
  $("script[type='application/ld+json']").each((_, element) => {
    const raw = normalizeText($(element).text());
    if (!raw) {
      return;
    }
    try {
      collected.push(JSON.parse(raw));
    } catch {
    }
  });
  return collected;
}
function collectTextCandidates($, selectors) {
  const values = /* @__PURE__ */ new Set();
  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const text = normalizeText($(element).text());
      if (text) {
        values.add(text);
      }
    });
  }
  return Array.from(values);
}
function looksLikePrice(value) {
  return /\d+[,.]\d{1,2}|\bR\$\b/i.test(String(value || ""));
}
function extractRestaurantName($) {
  const candidates = [
    $("h1").first().text(),
    $("meta[property='og:title']").attr("content"),
    $("title").text()
  ].map((item) => normalizeText(item)).filter(Boolean);
  return candidates[0] || null;
}
function extractMenuFromCheerio($) {
  const items = [];
  const restaurantName = extractRestaurantName($);
  const structuredData = extractStructuredData($);
  const categoryHints = collectTextCandidates($, [
    "h2",
    "h3",
    "[data-testid*='category']",
    "[class*='category']"
  ]);
  const productHints = collectTextCandidates($, [
    "h4",
    "h5",
    "[data-testid*='product']",
    "[class*='product']",
    "button",
    "article",
    "li"
  ]);
  const priceHints = collectTextCandidates($, [
    "[class*='price']",
    "[data-testid*='price']",
    "span",
    "div"
  ]).filter(looksLikePrice);
  const itemNodes = $("article, [data-testid*='product'], [class*='product']");
  itemNodes.each((_, node) => {
    const root = $(node);
    const productName = normalizeText(
      root.find("h3, h4, h5, [class*='name'], [data-testid*='name']").first().text() || root.text()
    );
    const description = normalizeText(
      root.find("p, [class*='description'], [data-testid*='description']").first().text()
    );
    const priceText = normalizeText(
      root.find("[class*='price'], [data-testid*='price'], span").filter((_2, el) => looksLikePrice($(el).text())).first().text()
    );
    const price = parsePrice(priceText);
    if (!productName || !price) {
      return;
    }
    const categoryName = normalizeText(
      root.closest("section, [class*='category'], [data-testid*='category']").find("h2, h3, [class*='category']").first().text()
    );
    items.push({
      categoryName: categoryName || "Card\xE1pio iFood",
      productName,
      description: description || null,
      price
    });
  });
  if (!items.length && structuredData.length) {
    for (const entry of structuredData) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const typedEntry = entry;
      const graph = Array.isArray(typedEntry.graph) ? typedEntry.graph : Array.isArray(typedEntry["@graph"]) ? typedEntry["@graph"] : [];
      for (const graphItem of graph) {
        if (!graphItem || typeof graphItem !== "object") {
          continue;
        }
        const name = normalizeText(
          graphItem.name
        );
        const description = normalizeText(
          graphItem.description
        );
        const priceValue = parsePrice(
          graphItem.price
        );
        if (name && priceValue) {
          items.push({
            categoryName: "Card\xE1pio iFood",
            productName: name,
            description: description || null,
            price: priceValue
          });
        }
      }
    }
  }
  if (!items.length) {
    const fallbackCategory = categoryHints[0] || "Card\xE1pio iFood";
    const candidateNames = productHints.filter(
      (candidate) => !looksLikePrice(candidate)
    );
    for (let index = 0; index < candidateNames.length; index += 1) {
      const productName = candidateNames[index];
      const pairedPrice = priceHints[index] || priceHints[0] || null;
      const price = parsePrice(pairedPrice);
      if (!productName || !price) {
        continue;
      }
      items.push({
        categoryName: fallbackCategory,
        productName,
        description: null,
        price
      });
    }
  }
  const dedupedItems = Array.from(
    new Map(
      items.map((item) => [
        `${normalizeComparableName(item.categoryName)}::${normalizeComparableName(item.productName)}`,
        item
      ])
    ).values()
  );
  return {
    restaurantName,
    items: dedupedItems
  };
}
var ImportIfoodMenuScraperService = class {
  async execute(input) {
    const parsedInput = scrapeInputSchema.parse(input);
    const restaurantId = Number(parsedInput.restaurantId);
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      throw new Error("restauranteId inv\xE1lido.");
    }
    const response = await axios.get(parsedInput.url, {
      headers: {
        "User-Agent": buildUserAgent(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        Referer: "https://www.ifood.com.br/",
        "Cache-Control": "no-cache",
        Pragma: "no-cache"
      },
      timeout: 15e3,
      maxRedirects: 5
    });
    const html = String(response.data || "");
    if (!html.trim()) {
      throw new Error("N\xE3o foi poss\xEDvel carregar o HTML da p\xE1gina informada.");
    }
    const $ = cheerio.load(html);
    const parsedMenu = extractMenuFromCheerio($);
    if (!parsedMenu.items.length) {
      throw new Error(
        "N\xE3o foi poss\xEDvel identificar categorias e produtos na p\xE1gina p\xFAblica do iFood."
      );
    }
    const summary = await prisma_default.$transaction(async (db) => {
      const createdCategories = [];
      const createdProducts = [];
      for (const item of parsedMenu.items) {
        const categoryName = normalizeText(item.categoryName);
        const productName = normalizeText(item.productName);
        let category = await CategoryRepository_default.findByName(
          categoryName,
          restaurantId,
          db
        );
        if (!category) {
          category = await CategoryRepository_default.create(
            {
              name: categoryName,
              description: null,
              image: null,
              active: true
            },
            restaurantId,
            db
          );
          createdCategories.push({
            id: Number(category.id),
            name: category.name
          });
        }
        const existingProduct = await ProductRepository_default.findByName(
          productName,
          restaurantId,
          db
        );
        if (existingProduct) {
          continue;
        }
        const createdProduct = await ProductRepository_default.create(
          {
            name: productName,
            description: item.description || void 0,
            image: null,
            price: item.price,
            categoryId: Number(category.id),
            featured: false,
            active: true,
            stock: void 0,
            preparationTime: void 0
          },
          restaurantId,
          db
        );
        createdProducts.push({
          id: Number(createdProduct.id),
          name: createdProduct.name
        });
      }
      return {
        restaurantName: parsedMenu.restaurantName || null,
        sourceUrl: parsedInput.url,
        categoriesCreated: createdCategories.length,
        productsCreated: createdProducts.length,
        createdCategories,
        createdProducts
      };
    });
    return summary;
  }
};
var ImportIfoodMenuScraperService_default = new ImportIfoodMenuScraperService();

// src/modules/menuImport/controllers/ImportIfoodMenuController.ts
var ImportIfoodMenuController = class {
  async handle(req, res) {
    try {
      const { url, restaurantId: bodyRestaurantId } = req.body;
      const resolvedRestaurantId = Number(
        req.user?.restaurantId || bodyRestaurantId || 0
      );
      const summary = await ImportIfoodMenuScraperService_default.execute({
        url,
        restaurantId: resolvedRestaurantId
      });
      return res.status(201).json(summary);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao importar cardapio do iFood"
      });
    }
  }
};
var ImportIfoodMenuController_default = new ImportIfoodMenuController();

// src/modules/menuImport/services/ImportMenuFromImageService.ts
import OpenAI from "openai";
import { z as z10 } from "zod";
var importedMenuItemSchema = z10.object({
  name: z10.string().trim().min(1, "Nome do item invalido."),
  description: z10.string().trim().nullable().optional(),
  price: z10.union([z10.number(), z10.string()]),
  imageUrl: z10.string().trim().url().nullable().optional()
});
var importedMenuCategorySchema = z10.object({
  name: z10.string().trim().min(1, "Nome da categoria invalido."),
  items: z10.array(importedMenuItemSchema).min(1, "Categoria sem itens.")
});
var importedMenuResponseSchema = z10.object({
  restaurantName: z10.string().trim().nullable().optional(),
  categories: z10.array(importedMenuCategorySchema).min(1, "Cardapio vazio.")
});
var importInputSchema = z10.object({
  imageUrl: z10.string().trim().url("Informe uma URL valida da imagem."),
  restaurantId: z10.union([z10.number(), z10.string()])
});
function normalizeText2(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}
function parsePrice2(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const text = normalizeText2(value);
  if (!text) {
    return null;
  }
  const normalized = text.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(/,(?=\d{1,2}$)/g, ".").replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
function stripCodeFences(value) {
  return value.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}
function buildPrompt() {
  return [
    "Voc\xEA \xE9 um extrator de card\xE1pios a partir de imagem.",
    "Leia a imagem e retorne SOMENTE um JSON v\xE1lido, sem markdown, sem coment\xE1rios e sem texto extra.",
    "Estrutura obrigat\xF3ria:",
    "{",
    '  "restaurantName": string | null,',
    '  "categories": [',
    "    {",
    '      "name": string,',
    '      "items": [',
    "        {",
    '          "name": string,',
    '          "description": string | null,',
    '          "price": number,',
    '          "imageUrl": string | null',
    "        }",
    "      ]",
    "    }",
    "  ]",
    "}",
    "Regras:",
    "- price deve ser number em BRL, sem simbolo de moeda.",
    "- Se a descricao nao existir, use null.",
    "- imageUrl deve ser URL publica valida da foto do item quando existir na imagem/origem; se nao existir, use null.",
    "- Se houver varios grupos na imagem, organize em categorias coerentes.",
    "- Nao invente itens que nao estejam visiveis.",
    "- Se nao conseguir ler a imagem, retorne categories como array vazio."
  ].join("\n");
}
function isValidHttpUrl(value) {
  const text = normalizeText2(value);
  if (!text) {
    return false;
  }
  try {
    const parsed = new URL(text);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
function createOpenAiClient() {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY nao configurada. Adicione a chave no ambiente antes de usar o importador por imagem."
    );
  }
  return new OpenAI({ apiKey });
}
function parseImportedMenuContent(rawContent) {
  const cleanedContent = stripCodeFences(normalizeText2(rawContent));
  let parsed;
  try {
    parsed = JSON.parse(cleanedContent);
  } catch {
    throw new Error("A OpenAI retornou um JSON invalido.");
  }
  const validated = importedMenuResponseSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("A resposta da OpenAI nao seguiu a estrutura esperada.");
  }
  return {
    restaurantName: validated.data.restaurantName || null,
    categories: validated.data.categories.map((category) => ({
      name: normalizeText2(category.name),
      items: category.items.map((item) => {
        const price = parsePrice2(item.price);
        if (price === null) {
          throw new Error(
            `Preco invalido retornado pela OpenAI no item "${normalizeText2(item.name)}".`
          );
        }
        return {
          name: normalizeText2(item.name),
          description: normalizeText2(item.description) || null,
          price,
          imageUrl: isValidHttpUrl(item.imageUrl) ? normalizeText2(item.imageUrl) : null
        };
      })
    }))
  };
}
var ImportMenuFromImageService = class {
  async execute(input) {
    const parsedInput = importInputSchema.parse(input);
    const restaurantId = Number(parsedInput.restaurantId);
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      throw new Error("restauranteId invalido.");
    }
    const openai = createOpenAiClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildPrompt()
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extraia o cardapio desta imagem e retorne somente o JSON estruturado."
            },
            {
              type: "image_url",
              image_url: {
                url: parsedInput.imageUrl
              }
            }
          ]
        }
      ]
    });
    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("A OpenAI nao retornou conteudo para ser processado.");
    }
    const menu = parseImportedMenuContent(rawContent);
    if (!menu.categories.length) {
      throw new Error("Nenhuma categoria foi identificada na imagem enviada.");
    }
    const summary = await prisma_default.$transaction(async (db) => {
      const createdCategories = [];
      const createdProducts = [];
      for (const categoryInput of menu.categories) {
        const categoryName = normalizeText2(categoryInput.name);
        if (!categoryName) {
          continue;
        }
        let category = await CategoryRepository_default.findByName(
          categoryName,
          restaurantId,
          db
        );
        if (!category) {
          category = await CategoryRepository_default.create(
            {
              name: categoryName,
              description: null,
              image: null,
              active: true
            },
            restaurantId,
            db
          );
          createdCategories.push({
            id: Number(category.id),
            name: category.name
          });
        }
        for (const itemInput of categoryInput.items) {
          const productName = normalizeText2(itemInput.name);
          const description = normalizeText2(itemInput.description) || null;
          const price = parsePrice2(itemInput.price);
          const imageUrl = isValidHttpUrl(itemInput.imageUrl) ? normalizeText2(itemInput.imageUrl) : null;
          if (!productName || price === null) {
            continue;
          }
          const existingProduct = await ProductRepository_default.findByName(
            productName,
            restaurantId,
            db
          );
          if (existingProduct) {
            continue;
          }
          const createdProduct = await ProductRepository_default.create(
            {
              name: productName,
              description,
              image: imageUrl,
              price,
              categoryId: Number(category.id),
              featured: false,
              active: true,
              stock: void 0,
              preparationTime: void 0
            },
            restaurantId,
            db
          );
          createdProducts.push({
            id: Number(createdProduct.id),
            name: createdProduct.name
          });
        }
      }
      return {
        restaurantName: menu.restaurantName || null,
        sourceImageUrl: parsedInput.imageUrl,
        categoriesCreated: createdCategories.length,
        productsCreated: createdProducts.length,
        createdCategories,
        createdProducts
      };
    });
    return summary;
  }
};
var ImportMenuFromImageService_default = new ImportMenuFromImageService();

// src/modules/menuImport/controllers/ImportMenuFromImageController.ts
var ImportMenuFromImageController = class {
  async handle(req, res) {
    try {
      const { imageUrl, restaurantId: bodyRestaurantId } = req.body;
      const resolvedRestaurantId = Number(
        req.user?.restaurantId || bodyRestaurantId || 0
      );
      const summary = await ImportMenuFromImageService_default.execute({
        imageUrl,
        restaurantId: resolvedRestaurantId
      });
      return res.status(201).json(summary);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao importar cardapio a partir da imagem"
      });
    }
  }
};
var ImportMenuFromImageController_default = new ImportMenuFromImageController();

// src/modules/menuImport/routes/MenuImportRoutes.ts
var router14 = Router14();
router14.post("/ifood", authMiddleware, adminMiddleware, (req, res) => {
  ImportIfoodMenuController_default.handle(req, res);
});
router14.post("/image", authMiddleware, adminMiddleware, (req, res) => {
  ImportMenuFromImageController_default.handle(req, res);
});
var MenuImportRoutes_default = router14;

// src/modules/audit/routes/AuditRoutes.ts
import { Router as Router15 } from "express";

// src/modules/audit/controllers/GetAuditLogsController.ts
var GetAuditLogsController = class {
  async handle(_req, res) {
    try {
      const logs = await prisma_default.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 200
      });
      const result = logs.map((log2) => ({
        id: `AUD-${String(log2.id).padStart(4, "0")}`,
        date: log2.createdAt.toLocaleString("pt-BR"),
        user: log2.userName ?? "\u2014",
        role: log2.userRole ?? "\u2014",
        restaurant: log2.restaurantName ?? "\u2014",
        action: log2.action,
        resource: log2.resource ?? "\u2014",
        ip: log2.ipAddress ?? "\u2014",
        result: log2.result
      }));
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        message: error2 instanceof Error ? error2.message : "Erro ao listar logs de auditoria"
      });
    }
  }
};
var GetAuditLogsController_default = new GetAuditLogsController();

// src/modules/audit/routes/AuditRoutes.ts
var router15 = Router15();
router15.get(
  "/",
  authMiddleware,
  superAdminMiddleware,
  (req, res) => GetAuditLogsController_default.handle(req, res)
);
var AuditRoutes_default = router15;

// src/modules/favorites/routes/FavoriteRoutes.ts
import { Router as Router16 } from "express";
var router16 = Router16();
function clientContext(req, res) {
  if (req.user.role !== "CLIENTE" || !req.user.id) {
    res.status(403).json({ error: "Favoritos s\xE3o exclusivos para clientes." });
    return null;
  }
  return { userId: Number(req.user.id) };
}
router16.get("/", authMiddleware, async (req, res) => {
  const context = clientContext(req, res);
  if (!context) return;
  const restaurantId = Number(req.query.restaurantId);
  const favorites = await prisma_default.productFavorite.findMany({
    where: {
      userId: context.userId,
      ...Number.isInteger(restaurantId) && restaurantId > 0 ? { restaurantId } : {}
    },
    include: { product: { include: { category: true } } },
    orderBy: { createdAt: "desc" }
  });
  res.json({ favorites: favorites.map((item) => item.product) });
});
router16.post("/:productId", authMiddleware, async (req, res) => {
  const context = clientContext(req, res);
  if (!context) return;
  const productId = Number(req.params.productId);
  const product = await prisma_default.product.findFirst({
    where: { id: productId, active: true }
  });
  if (!product) {
    res.status(404).json({ error: "Produto n\xE3o encontrado." });
    return;
  }
  await prisma_default.productFavorite.upsert({
    where: { userId_productId: { userId: context.userId, productId } },
    update: { restaurantId: product.restaurantId },
    create: {
      userId: context.userId,
      productId,
      restaurantId: product.restaurantId
    }
  });
  res.status(201).json({ favorite: true, product });
});
router16.delete("/:productId", authMiddleware, async (req, res) => {
  const context = clientContext(req, res);
  if (!context) return;
  await prisma_default.productFavorite.deleteMany({
    where: { userId: context.userId, productId: Number(req.params.productId) }
  });
  res.json({ favorite: false });
});
var FavoriteRoutes_default = router16;

// src/modules/orders/controllers/AsaasOrderWebhookController.ts
var AsaasOrderWebhookController = class {
  async handle(req, res) {
    try {
      const tokenFromHeader = String(
        req.header("asaas-access-token") || ""
      ).trim();
      const expectedToken = String(
        process.env.ASAAS_WEBHOOK_TOKEN || ""
      ).trim();
      if (!expectedToken || tokenFromHeader !== expectedToken) {
        return res.status(401).json({ error: "Token de webhook invalido." });
      }
      const payload = req.body;
      const event = String(payload?.event || "").trim().toUpperCase();
      if (event !== "PAYMENT_RECEIVED") {
        return res.status(200).json({ received: true, ignored: true });
      }
      const payment = payload?.payment;
      const externalReference = String(payment?.externalReference || "").trim();
      const asaasPaymentId = String(payment?.id || "").trim();
      const paymentValue = Number(payment?.value);
      const walletId = String(payment?.walletId || "").trim();
      const hasRequiredPaymentFields = Boolean(asaasPaymentId) && Boolean(externalReference) && Number.isFinite(paymentValue) && paymentValue >= 0 && Boolean(walletId);
      if (!hasRequiredPaymentFields) {
        return res.status(200).json({ received: true, ignored: true });
      }
      const orderId = Number(externalReference);
      if (!Number.isInteger(orderId) || orderId <= 0) {
        return res.status(200).json({ received: true, ignored: true });
      }
      const order = await prisma_default.order.findUnique({
        where: {
          id: orderId
        },
        select: {
          id: true,
          restaurantId: true,
          userId: true,
          paid: true,
          paymentMethod: true,
          pixPaymentId: true
        }
      });
      if (!order) {
        return res.status(200).json({ received: true, ignored: true });
      }
      const normalizedPaymentMethod = String(order.paymentMethod || "").trim().toUpperCase();
      const isSupportedAutomaticMethod = normalizedPaymentMethod === "PIX" || normalizedPaymentMethod === "CARTAO";
      if (!isSupportedAutomaticMethod) {
        return res.status(200).json({ received: true, ignored: true });
      }
      if (walletId) {
        try {
          await prisma_default.restaurantSettings.updateMany({
            where: {
              restaurantId: order.restaurantId,
              OR: [{ gatewayMerchantId: null }, { gatewayMerchantId: "" }]
            },
            data: {
              gatewayMerchantId: walletId
            }
          });
        } catch (settingsUpdateError) {
          console.warn(
            "[ASAAS_WEBHOOK_GATEWAY_ID_BACKFILL_ERROR]",
            settingsUpdateError instanceof Error ? settingsUpdateError.message : String(settingsUpdateError)
          );
        }
      }
      if (!order.paid) {
        if (asaasPaymentId && !String(order.pixPaymentId || "").trim()) {
          await prisma_default.order.update({
            where: {
              id: order.id
            },
            data: {
              pixPaymentId: asaasPaymentId
            }
          });
        }
        const updatedOrder = await OrderRepository_default.confirmPayment(
          order.id,
          order.restaurantId
        );
        io.to(`restaurant:${updatedOrder.restaurantId}`).emit(
          "order:payment-confirmed",
          {
            orderId: updatedOrder.id,
            paid: true,
            paymentMethod: updatedOrder.paymentMethod
          }
        );
        io.to(`restaurant:${updatedOrder.restaurantId}`).emit(
          "new-order",
          updatedOrder
        );
        io.to(`restaurant:${updatedOrder.restaurantId}`).emit(
          "order:status-changed",
          updatedOrder
        );
        io.to(`restaurant:${updatedOrder.restaurantId}:kitchen`).emit(
          "kitchen:order-paid",
          {
            orderId: updatedOrder.id,
            restaurantId: updatedOrder.restaurantId,
            paid: true
          }
        );
        io.to(`user:${updatedOrder.userId}`).emit("payment-confirmed", {
          orderId: updatedOrder.id,
          paid: true,
          paymentMethod: updatedOrder.paymentMethod,
          status: updatedOrder.status
        });
      }
      return res.status(200).json({ received: true, processed: true });
    } catch (error2) {
      console.error(
        "[ASAAS_WEBHOOK_ERROR]",
        error2 instanceof Error ? error2.message : String(error2)
      );
      return res.status(200).json({ received: true, processed: false });
    }
  }
};
var AsaasOrderWebhookController_default = new AsaasOrderWebhookController();

// src/modules/restaurantSettings/controllers/AsaasWithdrawValidationWebhookController.ts
var AsaasWithdrawValidationWebhookController = class {
  async handle(req, res) {
    try {
      const tokenFromHeader = String(
        req.header("asaas-access-token") || ""
      ).trim();
      const expectedToken = String(
        process.env.ASAAS_WITHDRAW_WEBHOOK_TOKEN || process.env.ASAAS_WEBHOOK_TOKEN || ""
      ).trim();
      if (!expectedToken || tokenFromHeader !== expectedToken) {
        return res.status(401).json({
          status: "REFUSED",
          refuseReason: "Token de webhook invalido."
        });
      }
      const payload = req.body;
      const normalizedType = String(payload?.type || "").trim().toUpperCase();
      if (!normalizedType) {
        return res.status(200).json({
          status: "REFUSED",
          refuseReason: "Payload sem tipo de operacao."
        });
      }
      return res.status(200).json({ status: "APPROVED" });
    } catch (error2) {
      console.error(
        "[ASAAS_WITHDRAW_VALIDATION_WEBHOOK_ERROR]",
        error2 instanceof Error ? error2.message : String(error2)
      );
      return res.status(200).json({
        status: "REFUSED",
        refuseReason: "Falha interna na validacao de saque."
      });
    }
  }
};
var AsaasWithdrawValidationWebhookController_default = new AsaasWithdrawValidationWebhookController();

// src/routes/index.ts
var router17 = Router17();
router17.post("/api/webhooks/asaas", (req, res) => {
  AsaasOrderWebhookController_default.handle(req, res);
});
router17.post("/api/webhooks/asaas/withdraw-validation", (req, res) => {
  AsaasWithdrawValidationWebhookController_default.handle(req, res);
});
router17.use("/auth", authRoutes_default);
router17.use("/restaurants", restaurantRoutes_default);
router17.use("/categories", CategoryRoutes_default);
router17.use("/products", productsRoutes_default);
router17.use("/orders", orderRoutes_default);
router17.use("/employees", EmployeeRoutes_default);
router17.use("/table-sessions", SessionsTablesRoutes_default);
router17.use("/tables", TablesRoutes_default);
router17.use("/settings", RestaurantSettingsRoutes_default);
router17.use("/banners", BannerRoutes_default);
router17.use("/coupons", CouponRoutes_default);
router17.use("/subscription", SubscriptionRoutes_default);
router17.use("/ai-support", AiSupportRoutes_default);
router17.use("/menu-import", MenuImportRoutes_default);
router17.use("/audit-logs", AuditRoutes_default);
router17.use("/favorites", FavoriteRoutes_default);
router17.get("/profile", authMiddleware, (req, res) => {
  return res.json({
    message: "Rota protegida!",
    user: req.user
  });
});
var routes_default = router17;

// src/modules/billing/routes/BillingRoutes.ts
import { Router as Router18 } from "express";

// src/modules/billing/controllers/MercadoPagoWebhookController.ts
import { MercadoPagoConfig as MercadoPagoConfig3, Payment as Payment3 } from "mercadopago";

// src/modules/billing/utils/billingLogger.ts
var DEBUG_ENABLED = process.env.BILLING_DEBUG === "true";
function formatMeta(meta) {
  if (!meta) {
    return "";
  }
  return ` ${JSON.stringify(meta)}`;
}
function log(level, message, meta) {
  const line = `[billing] ${level} ${message}${formatMeta(meta)}`;
  if (level === "ERROR") {
    console.error(line);
    return;
  }
  if (level === "WARN") {
    console.warn(line);
    return;
  }
  console.log(line);
}
function info(message, meta) {
  log("INFO", message, meta);
}
function warn(message, meta) {
  log("WARN", message, meta);
}
function error(message, meta) {
  log("ERROR", message, meta);
}
function debug(message, meta) {
  if (!DEBUG_ENABLED) {
    return;
  }
  log("DEBUG", message, meta);
}

// src/modules/billing/services/ProcessPaymentService.ts
var ProcessPaymentService = class {
  async execute({ invoiceId }) {
    const normalizedInvoiceId = Number(invoiceId);
    if (!Number.isInteger(normalizedInvoiceId) || normalizedInvoiceId <= 0) {
      throw new Error("Fatura inv\xE1lida.");
    }
    const result = await prisma_default.$transaction(async (tx) => {
      const existingInvoice = await BillingRepository_default.findInvoiceById(
        normalizedInvoiceId,
        tx
      );
      if (!existingInvoice) {
        throw new Error("Fatura n\xE3o encontrada.");
      }
      const invoice = existingInvoice.status === "PAGO" ? existingInvoice : await BillingRepository_default.updateInvoice(
        normalizedInvoiceId,
        {
          status: "PAGO",
          paidAt: /* @__PURE__ */ new Date()
        },
        tx
      );
      const subscription = await BillingRepository_default.findSubscriptionByRestaurantId(
        invoice.restaurantId,
        tx
      );
      const openInvoices = await tx.invoice.findMany({
        where: {
          restaurantId: invoice.restaurantId,
          status: {
            in: ["PENDENTE", "ATRASADO"]
          }
        }
      });
      const remainsBlocked = hasBlockingInvoices(openInvoices, /* @__PURE__ */ new Date());
      if (subscription) {
        await BillingRepository_default.updateSubscription(
          subscription.id,
          { status: remainsBlocked ? "EXPIRADA" : "ATIVA" },
          tx
        );
      }
      if (remainsBlocked) {
        await BillingRepository_default.deactivateRestaurant(invoice.restaurantId, tx);
      } else {
        await BillingRepository_default.activateRestaurant(invoice.restaurantId, tx);
      }
      return { invoice, remainsBlocked };
    });
    info(
      result.remainsBlocked ? "payment processed but restaurant remains blocked" : "payment processed and restaurant activated",
      {
        invoiceId: normalizedInvoiceId,
        restaurantId: result.invoice.restaurantId
      }
    );
    return result.invoice;
  }
};
var ProcessPaymentService_default = new ProcessPaymentService();

// src/modules/billing/utils/webhookUtils.ts
var APPROVED_STATUSES2 = /* @__PURE__ */ new Set([
  "approved",
  "paid",
  "authorized",
  "settled"
]);
function normalizePaymentStatus(status) {
  return String(status || "").trim().toLowerCase();
}
function isApprovedPaymentStatus(status) {
  return APPROVED_STATUSES2.has(normalizePaymentStatus(status));
}
function readFirstDefined(...values) {
  for (const value of values) {
    if (value === void 0 || value === null || value === "") {
      continue;
    }
    return value;
  }
  return null;
}
function extractInvoiceId(payload = {}, paymentDetails = {}) {
  const payloadData = payload;
  const detailsData = paymentDetails;
  const candidates = [
    readFirstDefined(
      payloadData.data?.external_reference,
      payloadData.external_reference,
      payloadData.externalReference,
      payloadData.metadata?.invoice_id,
      payloadData.metadata?.invoiceId,
      payloadData.invoice_id,
      payloadData.invoiceId,
      detailsData.external_reference,
      detailsData.body?.external_reference,
      detailsData.metadata?.invoice_id,
      detailsData.metadata?.invoiceId,
      detailsData.invoice_id,
      detailsData.invoiceId
    ),
    payloadData.resource?.external_reference,
    detailsData.resource?.external_reference
  ];
  for (const candidate of candidates) {
    if (candidate === null || candidate === void 0 || candidate === "") {
      continue;
    }
    const numericCandidate = Number(String(candidate).trim());
    if (!Number.isNaN(numericCandidate)) {
      return numericCandidate;
    }
    const match = String(candidate).match(/(\d+)/);
    if (match) {
      return Number(match[1]);
    }
  }
  return null;
}

// src/modules/billing/controllers/MercadoPagoWebhookController.ts
var client = new MercadoPagoConfig3({
  accessToken: process.env.MP_ACCESS_TOKEN
});
var MercadoPagoWebhookController = class {
  async handle(req, res) {
    try {
      const paymentId = req.body?.data?.id || req.body?.id || req.query?.id;
      debug("MP webhook received", { paymentId });
      if (!paymentId) {
        debug("webhook ignored: missing paymentId");
        return res.sendStatus(200);
      }
      const paymentApi = new Payment3(client);
      const payment = await paymentApi.get({ id: paymentId });
      const paymentDetails = typeof payment === "object" && payment !== null ? payment.body ?? payment : {};
      const paymentDetailsRecord = typeof paymentDetails === "object" && paymentDetails !== null ? paymentDetails : {};
      const payloadRecord = typeof req.body === "object" && req.body !== null ? req.body : {};
      const payloadData = typeof payloadRecord["data"] === "object" && payloadRecord["data"] !== null ? payloadRecord["data"] : {};
      const status = paymentDetailsRecord["status"] || payloadRecord["status"] || payloadData["status"];
      debug("MP payment status", { status });
      if (!isApprovedPaymentStatus(status)) {
        debug("webhook ignored: payment not approved");
        return res.sendStatus(200);
      }
      const invoiceId = extractInvoiceId(payloadRecord, paymentDetailsRecord);
      debug("webhook extracted invoice", { invoiceId });
      if (!invoiceId) {
        debug("webhook ignored: missing invoiceId");
        return res.sendStatus(200);
      }
      await ProcessPaymentService_default.execute({ invoiceId });
      info("webhook processed", { invoiceId });
      return res.sendStatus(200);
    } catch (err) {
      error("webhook processing failed", {
        message: err instanceof Error ? err.message : String(err)
      });
      return res.sendStatus(500);
    }
  }
};
var MercadoPagoWebhookController_default = new MercadoPagoWebhookController();

// src/modules/billing/controllers/BillingWebhookController.ts
import crypto9 from "crypto";
var BillingWebhookController = class {
  async handle(req, res) {
    try {
      const isEnabled = process.env.NODE_ENV !== "production" && String(
        process.env.ENABLE_TEST_PAYMENT_WEBHOOK || "false"
      ).toLowerCase() === "true";
      const configuredSecret = String(
        process.env.TEST_PAYMENT_WEBHOOK_SECRET || ""
      ).trim();
      const receivedSecret = String(
        req.headers["x-test-webhook-secret"] || ""
      ).trim();
      if (!isEnabled || !configuredSecret || !receivedSecret) {
        return res.sendStatus(404);
      }
      const configuredBuffer = Buffer.from(configuredSecret);
      const receivedBuffer = Buffer.from(receivedSecret);
      const secretMatches = configuredBuffer.length === receivedBuffer.length && crypto9.timingSafeEqual(configuredBuffer, receivedBuffer);
      if (!secretMatches) {
        return res.sendStatus(404);
      }
      const payment = req.body;
      const paymentId = payment.data?.id || payment.id || payment.data?.payment_id;
      debug("test webhook received", { paymentId });
      if (!paymentId) {
        debug("test webhook ignored: missing paymentId");
        return res.sendStatus(200);
      }
      const paymentStatus = payment.status || payment.data?.status || payment.action;
      if (!isApprovedPaymentStatus(paymentStatus)) {
        debug("test webhook ignored: payment not approved", {
          paymentStatus
        });
        return res.sendStatus(200);
      }
      const invoiceId = extractInvoiceId(payment);
      if (!invoiceId) {
        debug("test webhook ignored: missing invoiceId");
        return res.sendStatus(200);
      }
      const invoice = await BillingRepository_default.findInvoiceById(invoiceId);
      if (!invoice) {
        debug("test webhook ignored: invoice not found");
        return res.sendStatus(200);
      }
      if (invoice.status === "PAGO") {
        debug("test webhook ignored: invoice already paid");
        return res.sendStatus(200);
      }
      await ProcessPaymentService_default.execute({ invoiceId });
      info("test webhook processed", { invoiceId });
      return res.sendStatus(200);
    } catch (error2) {
      error("test webhook failed", {
        message: error2 instanceof Error ? error2.message : String(error2)
      });
      return res.sendStatus(200);
    }
  }
};
var BillingWebhookController_default = new BillingWebhookController();

// src/modules/billing/controllers/GetInvoicesController.ts
var GetInvoicesController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      if (!restaurantId) {
        return res.status(400).json({
          error: "Restaurant ID not found in user context"
        });
      }
      const invoices = await BillingRepository_default.findInvoicesByRestaurantId(restaurantId);
      const subscription = await BillingRepository_default.findSubscriptionByRestaurantId(
        Number(restaurantId)
      );
      const subscriptionStatus = String(
        subscription?.status || ""
      ).toUpperCase();
      const isPlanActive = subscriptionStatus === "ATIVA" || subscriptionStatus === "TESTE";
      const billing = {
        plan: String(subscription?.plan || "BASICO").toUpperCase(),
        subscriptionStatus,
        isPlanActive
      };
      return res.status(200).json({
        invoices,
        billing
      });
    } catch (error2) {
      console.error("Error fetching invoices:", error2);
      return res.status(500).json({
        error: error2 instanceof Error ? error2.message : "Failed to fetch invoices"
      });
    }
  }
};
var GetInvoicesController_default = new GetInvoicesController();

// src/modules/billing/controllers/GetAllInvoicesController.ts
var STATUS_MAP = {
  PAGO: "PAID",
  PENDENTE: "PENDING",
  ATRASADO: "OVERDUE",
  CANCELADO: "REFUNDED"
};
var GetAllInvoicesController = class {
  async handle(_req, res) {
    try {
      const invoices = await prisma_default.invoice.findMany({
        include: {
          restaurant: { select: { name: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 200
      });
      const result = invoices.map((inv) => ({
        id: `#FAT-${String(inv.id).padStart(4, "0")}`,
        restaurant: inv.restaurant.name,
        dueDate: inv.dueDate.toLocaleDateString("pt-BR"),
        value: Number(inv.total),
        method: "Sistema",
        status: STATUS_MAP[inv.status] ?? "PENDING"
      }));
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        message: error2 instanceof Error ? error2.message : "Erro ao listar faturas"
      });
    }
  }
};
var GetAllInvoicesController_default = new GetAllInvoicesController();

// src/modules/billing/controllers/GetPlansController.ts
var GetPlansController = class {
  handle(_req, res) {
    const plans = Object.entries(PLAN_CONFIG).map(([key, config]) => ({
      plan: key,
      name: config.name,
      monthlyFee: config.monthlyFee,
      trialDays: config.trialDays
    }));
    return res.status(200).json(plans);
  }
};
var GetPlansController_default = new GetPlansController();

// src/modules/billing/services/MercadoPagoClient.ts
import { MercadoPagoConfig as MercadoPagoConfig4, Preference as Preference2 } from "mercadopago";
var client2 = new MercadoPagoConfig4({
  accessToken: process.env.MP_ACCESS_TOKEN
});
var preference = new Preference2(client2);

// src/modules/billing/services/MercadoPagoService.ts
var MercadoPagoService = class {
  async createPayment({
    invoiceId,
    title,
    description,
    amount
  }) {
    const isProduction3 = process.env.NODE_ENV === "production";
    const port2 = process.env.PORT || 3e3;
    const backendBaseUrl = String(process.env.BACKEND_URL || "").trim();
    const fallbackNotificationUrl = backendBaseUrl ? `${backendBaseUrl}/billing/webhook/mercadopago` : `http://localhost:${port2}/billing/webhook/mercadopago`;
    const notificationUrl = String(
      process.env.MP_NOTIFICATION_URL || fallbackNotificationUrl
    ).trim();
    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    if (isProduction3 && (!notificationUrl || notificationUrl.includes("localhost"))) {
      throw new Error(
        "Webhook Mercado Pago invalido para producao. Configure MP_NOTIFICATION_URL com uma URL publica HTTPS."
      );
    }
    const body = {
      items: [
        {
          id: String(invoiceId),
          title,
          quantity: 1,
          unit_price: Number(amount),
          currency_id: "BRL"
        }
      ],
      external_reference: String(invoiceId),
      additional_info: description,
      notification_url: notificationUrl,
      back_urls: {
        success: `${frontendBaseUrl}/pagamento-sucesso`,
        failure: `${frontendBaseUrl}/pagamento-erro`,
        pending: `${frontendBaseUrl}/pagamento-pendente`
      }
    };
    debug("creating MP preference", {
      invoiceId,
      amount: Number(amount)
    });
    try {
      const response = await preference.create({ body });
      debug("MP preference created", { id: response?.id });
      if (!response?.init_point) {
        throw new Error("Mercado Pago n\xE3o retornou init_point");
      }
      debug("MP init_point generated", { invoiceId });
      return response;
    } catch (err) {
      error("failed to create MP preference", {
        invoiceId,
        message: err instanceof Error ? err.message : String(err)
      });
      throw err;
    }
  }
};
var MercadoPagoService_default = new MercadoPagoService();

// src/modules/billing/services/RegenerateInvoicePaymentLinkService.ts
var RegenerateInvoicePaymentLinkService = class {
  async execute({
    invoiceId,
    restaurantId
  }) {
    const invoice = await BillingRepository_default.findInvoiceByIdAndRestaurantId(
      invoiceId,
      restaurantId
    );
    if (!invoice) {
      throw new Error("Fatura n\xE3o encontrada para este restaurante.");
    }
    const payment = await MercadoPagoService_default.createPayment({
      invoiceId: invoice.id,
      title: `Mensalidade restaurante ${invoice.restaurantId}`,
      description: `Fatura ${invoice.month}/${invoice.year}`,
      amount: invoice.total
    });
    const updatedInvoice = await BillingRepository_default.updateInvoice(invoice.id, {
      paymentLink: payment.init_point
    });
    return {
      invoice: updatedInvoice,
      paymentLink: payment.init_point
    };
  }
};
var RegenerateInvoicePaymentLinkService_default = new RegenerateInvoicePaymentLinkService();

// src/modules/billing/controllers/RegenerateInvoicePaymentLinkController.ts
var RegenerateInvoicePaymentLinkController = class {
  async handle(req, res) {
    try {
      const invoiceId = Number(req.params.id);
      const restaurantId = Number(req.user.restaurantId);
      if (!invoiceId) {
        return res.status(400).json({ error: "Invoice ID inv\xE1lido." });
      }
      const result = await RegenerateInvoicePaymentLinkService_default.execute({
        invoiceId,
        restaurantId
      });
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao regenerar link de pagamento."
      });
    }
  }
};
var RegenerateInvoicePaymentLinkController_default = new RegenerateInvoicePaymentLinkController();

// src/modules/billing/routes/BillingRoutes.ts
var router18 = Router18();
router18.post("/webhook/mercadopago", MercadoPagoWebhookController_default.handle);
router18.post("/webhook/mercadopago/test", BillingWebhookController_default.handle);
router18.get(
  "/plans",
  authMiddleware,
  adminMiddleware,
  (req, res) => GetPlansController_default.handle(req, res)
);
router18.get(
  "/invoices",
  authMiddleware,
  adminMiddleware,
  (req, res) => GetInvoicesController_default.handle(req, res)
);
router18.get(
  "/invoices/all",
  authMiddleware,
  superAdminMiddleware,
  (req, res) => GetAllInvoicesController_default.handle(req, res)
);
router18.post(
  "/invoices/:id/regenerate-link",
  authMiddleware,
  adminMiddleware,
  (req, res) => RegenerateInvoicePaymentLinkController_default.handle(req, res)
);
var BillingRoutes_default = router18;

// src/middlewares/security/requestIdMiddleware.ts
import crypto10 from "crypto";
function requestIdMiddleware(req, res, next) {
  const rawRequestId = req.headers["x-request-id"];
  const requestId = Array.isArray(rawRequestId) ? rawRequestId[0] : rawRequestId || crypto10.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}

// src/middlewares/security/notFoundMiddleware.ts
function notFoundMiddleware(req, res) {
  return res.status(404).json({
    error: "Rota nao encontrada",
    requestId: req.requestId
  });
}

// src/middlewares/security/errorHandlerMiddleware.ts
import * as Sentry from "@sentry/node";

// src/services/alertNotifier.ts
import nodemailer3 from "nodemailer";
var alertWebhookUrl = process.env.ALERT_WEBHOOK_URL || "";
var configuredProvider2 = (process.env.ALERT_PROVIDER || "generic").trim().toLowerCase();
var alertEmailTo = process.env.ALERT_EMAIL_TO || "";
var alertEmailFrom = process.env.ALERT_EMAIL_FROM || "";
var smtpHost = process.env.SMTP_HOST || "";
var smtpPort = Number(process.env.SMTP_PORT || 587);
var smtpSecure = process.env.SMTP_SECURE === "true";
var smtpUser = process.env.SMTP_USER || "";
var smtpPass = process.env.SMTP_PASS || "";
var cachedTransporter = null;
function resolveProvider2() {
  if (configuredProvider2 !== "generic") {
    return configuredProvider2;
  }
  if (smtpHost && alertEmailTo) {
    return "email";
  }
  if (alertWebhookUrl.includes("discord.com/api/webhooks")) {
    return "discord";
  }
  if (alertWebhookUrl.includes("hooks.slack.com/services/")) {
    return "slack";
  }
  if (alertWebhookUrl.includes("chat.googleapis.com/")) {
    return "google_chat";
  }
  return "generic";
}
function canSendEmail() {
  return Boolean(
    smtpHost && smtpPort > 0 && smtpUser && smtpPass && alertEmailTo && alertEmailFrom
  );
}
function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }
  cachedTransporter = nodemailer3.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
  return cachedTransporter;
}
function formatDetails(details) {
  if (typeof details === "string") {
    return details;
  }
  return JSON.stringify(details, null, 2);
}
async function sendEmailAlert(title, details) {
  if (!canSendEmail()) {
    return false;
  }
  try {
    await getTransporter().sendMail({
      from: alertEmailFrom,
      to: alertEmailTo,
      subject: `[ALERTA] ${title}`,
      text: `${title}

${formatDetails(details)}`
    });
    return true;
  } catch (emailError) {
    console.error(
      "[ALERT_EMAIL_ERROR]",
      emailError instanceof Error ? emailError.message : String(emailError)
    );
    return false;
  }
}
function buildPayload(title, details) {
  const provider = resolveProvider2();
  const message = `${title}
${formatDetails(details)}`;
  if (provider === "discord") {
    return {
      content: message
    };
  }
  if (provider === "slack") {
    return {
      text: `*${title}*
${details}`
    };
  }
  if (provider === "google_chat") {
    return {
      text: message
    };
  }
  return {
    text: message
  };
}
async function notifyCriticalError(title, details) {
  const provider = resolveProvider2();
  if (provider === "email") {
    const sentByEmail = await sendEmailAlert(title, details);
    if (sentByEmail) {
      return;
    }
  }
  if (!alertWebhookUrl) {
    return;
  }
  try {
    await fetch(alertWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildPayload(title, details))
    });
  } catch (notificationError) {
    console.error(
      "[ALERT_WEBHOOK_ERROR]",
      notificationError instanceof Error ? notificationError.message : String(notificationError)
    );
  }
}

// src/middlewares/security/errorHandlerMiddleware.ts
var INTERNAL_SERVER_ERROR_MESSAGE = "Erro interno do servidor";
var errorHandlerMiddleware = (err, req, res, _next) => {
  const errObj = typeof err === "object" && err !== null ? err : {};
  const statusCode = Number(errObj.status || errObj.statusCode || 500);
  const safeStatusCode = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
  if (safeStatusCode >= 500) {
    console.error("[API_ERROR]", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      message: errObj.message,
      stack: errObj.stack
    });
    notifyCriticalError(
      "[CRITICAL_API_ERROR]",
      `requestId=${req.requestId} method=${req.method} path=${req.originalUrl} message=${errObj.message || "unknown"}`
    );
  }
  Sentry.withScope((scope) => {
    scope.setTag("request_id", req.requestId || "unknown");
    scope.setTag("method", req.method || "unknown");
    scope.setTag("path", req.originalUrl || "unknown");
    scope.setContext("request", {
      headers: req.headers,
      query: req.query,
      params: req.params
    });
    Sentry.captureException(err);
  });
  const message = safeStatusCode >= 500 ? INTERNAL_SERVER_ERROR_MESSAGE : errObj.message || "Erro na requisicao";
  return res.status(safeStatusCode).json({
    error: message,
    requestId: req.requestId
  });
};

// src/app.ts
var app = express();
var isProduction = process.env.NODE_ENV === "production";
var normalizeOrigin = (value) => value.trim().replace(/\/+$/, "");
var allowedOrigins = [
  process.env.CORS_ORIGINS || "",
  process.env.FRONTEND_URL || ""
].flatMap((value) => value.split(",")).map((origin) => normalizeOrigin(origin)).filter(Boolean);
var rateLimitWindowMs = Number(
  process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1e3
);
var rateLimitMax = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 300);
var globalRateLimit = rateLimit5({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas requisicoes. Tente novamente em instantes."
  }
});
var authRateLimit = rateLimit5({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1e3),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 50),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas tentativas de autenticacao. Aguarde alguns minutos."
  }
});
app.set("trust proxy", 1);
app.use(requestIdMiddleware);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);
app.use(globalRateLimit);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalizedOrigin = normalizeOrigin(origin);
      if (!isProduction || allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use("/orders/webhook/stripe", express.raw({ type: "application/json" }));
app.use(express.json({ limit: process.env.MAX_JSON_BODY_SIZE || "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.get("/health", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "pizza-ia-backend",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.use("/auth", authRateLimit);
app.use("/billing", BillingRoutes_default);
app.use(routes_default);
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);
var app_default = app;

// src/server.ts
import http from "http";
import { Server } from "socket.io";

// src/config/sentry.ts
import * as Sentry2 from "@sentry/node";
var dsn = process.env.SENTRY_DSN || "";
var environment = process.env.NODE_ENV || "development";
if (dsn) {
  Sentry2.init({
    dsn,
    environment,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0)
  });
}

// src/socket/socketAuth.ts
import jwt8 from "jsonwebtoken";
import { TableSessionStatus as TableSessionStatus5 } from "@prisma/client";
async function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    const sessionToken = socket.handshake.auth?.sessionToken;
    if (token) {
      const decoded = jwt8.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      socket.authType = "user";
      return next();
    }
    if (sessionToken) {
      const session = await TableSessionRepository_default.findBySessionToken(sessionToken);
      if (!session || session.status !== TableSessionStatus5.OPEN) {
        return next(new Error("Sess\xE3o da mesa inv\xE1lida"));
      }
      socket.authType = "table-session";
      socket.tableSession = {
        id: session.id,
        tableId: session.tableId,
        tableNumber: session?.table?.number ?? null,
        restaurantId: session?.table?.restaurantId ?? null
      };
      return next();
    }
    return next(new Error("Token n\xE3o enviado"));
  } catch (_error) {
    return next(new Error("Token inv\xE1lido"));
  }
}

// src/socket/socketHandler.ts
function socketHandler(socket) {
  console.log("\u{1F50C} conectado:", socket.id);
  if (socket.authType === "table-session" && socket.tableSession) {
    const { id: id2, tableId, restaurantId: restaurantId2 } = socket.tableSession;
    socket.join(`restaurant:${restaurantId2}`);
    socket.join(`table:${tableId}`);
    socket.join(`table-session:${id2}`);
    socket.on("disconnect", () => {
      console.log("\u274C desconectado:", socket.id);
    });
    return;
  }
  const user = socket.user;
  if (!user) {
    socket.disconnect(true);
    return;
  }
  const { id, role, restaurantId } = user;
  let lastLocationStoredAt = 0;
  socket.join(`restaurant:${restaurantId}`);
  socket.join(`user:${id}`);
  if (role === "FUNCIONARIO") {
    socket.join("kitchen");
    socket.join(`restaurant:${restaurantId}:kitchen`);
  }
  if (role === "MOTOQUEIRO") {
    socket.join("courier");
    socket.join(`restaurant:${restaurantId}:courier`);
  }
  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    socket.join("admin");
    socket.join(`restaurant:${restaurantId}:admin`);
  }
  if (role === "SUPER_ADMIN") {
    socket.join("super_admin");
  }
  socket.on("delivery:location:update", async (rawPayload, ack) => {
    const reply = typeof ack === "function" ? ack : (_result) => {
    };
    if (String(role || "").toUpperCase() !== "MOTOQUEIRO") {
      reply({
        ok: false,
        error: "Somente motoqueiros podem enviar localiza\xE7\xE3o."
      });
      return;
    }
    const receivedAt = Date.now();
    if (receivedAt - lastLocationStoredAt < 3e3) {
      reply({ ok: true });
      return;
    }
    const orderId = Number(rawPayload?.orderId || 0);
    const latitude = Number(rawPayload?.latitude);
    const longitude = Number(rawPayload?.longitude);
    const heading = Number(rawPayload?.heading);
    const speed = Number(rawPayload?.speed);
    const accuracy = Number(rawPayload?.accuracy);
    const sentAt = typeof rawPayload?.sentAt === "string" && rawPayload.sentAt ? rawPayload.sentAt : (/* @__PURE__ */ new Date()).toISOString();
    if (!Number.isInteger(orderId) || orderId <= 0) {
      reply({ ok: false, error: "Pedido inv\xE1lido para rastreio." });
      return;
    }
    const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
    if (!hasValidCoordinates) {
      reply({ ok: false, error: "Coordenadas inv\xE1lidas." });
      return;
    }
    const order = await prisma_default.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        restaurantId: true,
        type: true,
        status: true,
        assignedCourierId: true
      }
    });
    if (!order) {
      reply({ ok: false, error: "Pedido n\xE3o encontrado." });
      return;
    }
    if (Number(order.restaurantId || 0) !== Number(restaurantId || 0)) {
      reply({ ok: false, error: "Pedido n\xE3o pertence ao seu restaurante." });
      return;
    }
    if (String(order.type || "").toUpperCase() !== "DELIVERY") {
      reply({ ok: false, error: "Rastreio dispon\xEDvel apenas para delivery." });
      return;
    }
    if (String(order.status || "").toUpperCase() !== "SAIU_PARA_ENTREGA") {
      reply({ ok: false, error: "Rastreio dispon\xEDvel apenas em entrega." });
      return;
    }
    if (Number(order.assignedCourierId || 0) !== Number(id || 0)) {
      reply({ ok: false, error: "Esta entrega n\xE3o est\xE1 atribu\xEDda a voc\xEA." });
      return;
    }
    const payload = {
      orderId: order.id,
      latitude,
      longitude,
      heading: Number.isFinite(heading) ? heading : null,
      speed: Number.isFinite(speed) ? speed : null,
      accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? Math.round(accuracy) : null,
      sentAt,
      recordedAt: sentAt,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await prisma_default.deliveryLocation.create({
      data: {
        orderId: order.id,
        courierId: Number(id),
        latitude,
        longitude,
        heading: Number.isFinite(heading) ? heading : null,
        speed: Number.isFinite(speed) ? speed : null,
        accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
        recordedAt: new Date(sentAt)
      }
    });
    lastLocationStoredAt = receivedAt;
    socket.to(`user:${order.userId}`).emit("order:delivery-location", payload);
    socket.to(`restaurant:${order.restaurantId}`).emit("order:delivery-location", payload);
    reply({ ok: true });
  });
  socket.on("support:chat-send", async (rawPayload, ack) => {
    const reply = typeof ack === "function" ? ack : (_result) => {
    };
    const normalizedRole = String(role || "").toUpperCase();
    const isAdminRole = normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN";
    if (!isAdminRole) {
      reply({ ok: false, error: "Sem permiss\xE3o para usar este chat." });
      return;
    }
    const normalizedMessage = String(rawPayload?.message || "").replace(/\s+/g, " ").trim();
    if (normalizedMessage.length < 2) {
      reply({ ok: false, error: "Digite uma mensagem v\xE1lida." });
      return;
    }
    if (normalizedMessage.length > 1200) {
      reply({ ok: false, error: "Mensagem muito longa (m\xE1x. 1200)." });
      return;
    }
    let targetRestaurantId = Number(restaurantId || 0);
    if (normalizedRole === "SUPER_ADMIN") {
      targetRestaurantId = Number(rawPayload?.restaurantId || 0);
      if (!Number.isInteger(targetRestaurantId) || targetRestaurantId <= 0) {
        reply({
          ok: false,
          error: "Informe o restaurante para falar com o admin."
        });
        return;
      }
    }
    if (!Number.isInteger(targetRestaurantId) || targetRestaurantId <= 0) {
      reply({ ok: false, error: "Restaurante inv\xE1lido para este chat." });
      return;
    }
    const subscription = await prisma_default.subscription.findUnique({
      where: {
        restaurantId: targetRestaurantId
      },
      select: {
        plan: true
      }
    });
    const plan = String(subscription?.plan || "").toUpperCase();
    const supportChatEnabledPlan = plan === "PROFISSIONAL" || plan === "PREMIUM";
    if (!supportChatEnabledPlan) {
      reply({
        ok: false,
        error: "Chat com Super Admin dispon\xEDvel apenas para planos Profissional e Premium."
      });
      return;
    }
    let savedMessage;
    const senderRoleValue = normalizedRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";
    const senderLabelValue = normalizedRole === "SUPER_ADMIN" ? "Super Admin" : "Admin";
    try {
      const insertedRows = await prisma_default.$queryRaw`
        INSERT INTO "SupportChatMessage" (
          "restaurantId",
          "senderUserId",
          "senderRole",
          "senderLabel",
          "message"
        )
        VALUES (
          ${targetRestaurantId},
          ${Number(id || 0) || null},
          CAST(${senderRoleValue} AS "SupportChatSenderRole"),
          ${senderLabelValue},
          ${normalizedMessage}
        )
        RETURNING
          "id",
          "message",
          "senderRole",
          "senderUserId",
          "senderLabel",
          "restaurantId",
          "sentAt"
      `;
      savedMessage = insertedRows[0] || null;
      if (!savedMessage) {
        reply({ ok: false, error: "N\xE3o foi poss\xEDvel salvar a mensagem." });
        return;
      }
    } catch (error2) {
      console.error("Erro ao salvar support chat message:", error2);
      reply({ ok: false, error: "N\xE3o foi poss\xEDvel salvar a mensagem." });
      return;
    }
    const payload = {
      id: String(savedMessage.id),
      message: savedMessage.message,
      senderRole: savedMessage.senderRole,
      senderUserId: Number(savedMessage.senderUserId || 0) || 0,
      senderLabel: savedMessage.senderLabel,
      restaurantId: savedMessage.restaurantId,
      sentAt: savedMessage.sentAt?.toISOString?.() || (/* @__PURE__ */ new Date()).toISOString()
    };
    socket.to(`user:${id}`).emit("support:chat-message", payload);
    socket.emit("support:chat-message", payload);
    if (normalizedRole === "ADMIN") {
      socket.to("super_admin").emit("support:chat-message", payload);
      reply({ ok: true });
      return;
    }
    socket.to(`restaurant:${targetRestaurantId}:admin`).emit("support:chat-message", payload);
    socket.to("super_admin").emit("support:chat-message", payload);
    reply({ ok: true });
  });
  socket.on("disconnect", () => {
    console.log("\u274C desconectado:", socket.id);
  });
}

// src/modules/billing/jobs/scheduler.ts
import cron from "node-cron";

// src/modules/billing/services/InvoiceService.ts
var InvoiceService = class {
  async execute({
    restaurantId,
    month,
    year,
    startDate,
    endDate
  }) {
    const subscription = await BillingRepository_default.findSubscriptionByRestaurantId(restaurantId);
    if (!subscription) {
      throw new Error("Assinatura n\xE3o encontrada.");
    }
    let activePlan = subscription.plan;
    const shouldApplyScheduledPlan = subscription.scheduledPlan && subscription.scheduledPlanEffectiveMonth === month && subscription.scheduledPlanEffectiveYear === year;
    if (shouldApplyScheduledPlan) {
      const updatedSubscription = await BillingRepository_default.updateSubscription(
        subscription.id,
        {
          plan: subscription.scheduledPlan,
          scheduledPlan: null,
          scheduledPlanEffectiveMonth: null,
          scheduledPlanEffectiveYear: null
        }
      );
      activePlan = updatedSubscription.plan;
    }
    const plan = PLAN_CONFIG[activePlan];
    if (!plan) {
      throw new Error("Plano inv\xE1lido.");
    }
    const invoiceExists = await BillingRepository_default.findInvoiceByMonth(
      restaurantId,
      month,
      year
    );
    if (invoiceExists) {
      return invoiceExists;
    }
    const total = plan.monthlyFee;
    const trialEndsAtDate = subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null;
    const dueDate = subscription.status === "TESTE" && trialEndsAtDate && !Number.isNaN(trialEndsAtDate.getTime()) ? trialEndsAtDate : addDays(/* @__PURE__ */ new Date(), 30);
    const invoice = await BillingRepository_default.createInvoice({
      restaurantId,
      month,
      year,
      monthlyFee: plan.monthlyFee,
      systemFees: 0,
      total,
      dueDate,
      status: "PENDENTE"
    });
    try {
      const payment = await MercadoPagoService_default.createPayment({
        invoiceId: invoice.id,
        title: `Plano ${activePlan}`,
        description: `Mensalidade ${month}/${year}`,
        amount: invoice.total
      });
      const updatedInvoice = await BillingRepository_default.updateInvoice(invoice.id, {
        paymentLink: payment.init_point
      });
      console.log(`Link Mercado Pago criado para invoice ${invoice.id}`);
      return updatedInvoice;
    } catch (error2) {
      console.error(
        "Erro ao criar pagamento Mercado Pago:",
        error2 instanceof Error ? error2.message : String(error2)
      );
      return invoice;
    }
  }
};
var InvoiceService_default = new InvoiceService();

// src/modules/billing/services/TrialService.ts
var TrialService = class {
  async execute() {
    const subscriptions = await BillingRepository_default.findExpiredTrials();
    for (const subscription of subscriptions) {
      const today = /* @__PURE__ */ new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      await InvoiceService_default.execute({
        restaurantId: subscription.restaurantId,
        month,
        year,
        startDate,
        endDate
      });
      await BillingRepository_default.updateSubscription(subscription.id, {
        status: "ATIVA"
      });
    }
  }
};
var TrialService_default = new TrialService();

// src/modules/billing/jobs/BillingJob.ts
var BillingJob = class {
  async execute() {
    info("BillingJob started");
    const now = /* @__PURE__ */ new Date();
    try {
      await TrialService_default.execute();
    } catch (err) {
      error("failed to process trial service", {
        message: err?.message || String(err)
      });
    }
    const activeSubscriptions = await prisma_default.subscription.findMany({
      where: { status: "ATIVA" }
    });
    debug("active subscriptions to process", {
      count: activeSubscriptions.length
    });
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    for (const sub of activeSubscriptions) {
      try {
        await InvoiceService_default.execute({
          restaurantId: sub.restaurantId,
          month,
          year,
          startDate,
          endDate
        });
      } catch (err) {
        error("failed to process restaurant billing", {
          restaurantId: sub.restaurantId,
          message: err?.message || String(err)
        });
      }
    }
    try {
      const pendingInvoices = await BillingRepository_default.findPendingInvoices();
      for (const invoice of pendingInvoices) {
        const shouldBlock = isInvoiceBlocking(invoice, now);
        if (!shouldBlock) {
          continue;
        }
        warn("applying block for overdue invoice", {
          invoiceId: invoice.id,
          dueDate: invoice.dueDate
        });
        await BillingRepository_default.updateInvoice(invoice.id, {
          status: "ATRASADO"
        });
        const subscription = await BillingRepository_default.findSubscriptionByRestaurantId(
          invoice.restaurantId
        );
        if (subscription) {
          await BillingRepository_default.updateSubscription(subscription.id, {
            status: "EXPIRADA"
          });
        }
        await BillingRepository_default.deactivateRestaurant(invoice.restaurantId);
      }
    } catch (err) {
      error("failed to process overdue invoices", {
        message: err?.message || String(err)
      });
    }
    info("BillingJob finished");
  }
};
var BillingJob_default = new BillingJob();

// src/modules/billing/services/ReconcileMercadoPagoInvoicesService.ts
var ReconcileMercadoPagoInvoicesService = class {
  isEnabled() {
    const enabled = String(
      process.env.MP_AUTO_RECONCILE_ENABLED || "true"
    ).toLowerCase();
    return enabled !== "false";
  }
  getAccessToken() {
    return String(process.env.MP_ACCESS_TOKEN || "").trim();
  }
  getApiBaseUrl() {
    return String(
      process.env.MP_API_BASE_URL || "https://api.mercadopago.com"
    ).trim();
  }
  getMaxInvoices() {
    const parsed = Number(process.env.MP_AUTO_RECONCILE_MAX_INVOICES || 50);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 50;
    }
    return Math.floor(parsed);
  }
  async fetchLatestPaymentStatus(invoiceId, accessToken) {
    const searchUrl = new URL(`${this.getApiBaseUrl()}/v1/payments/search`);
    searchUrl.searchParams.set("external_reference", String(invoiceId));
    searchUrl.searchParams.set("sort", "date_created");
    searchUrl.searchParams.set("criteria", "desc");
    searchUrl.searchParams.set("limit", "1");
    const response = await fetch(searchUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        `MP search failed [${response.status}] for invoice ${invoiceId}`
      );
    }
    return {
      paymentId: payload?.results?.[0]?.id || null,
      status: String(payload?.results?.[0]?.status || "").trim()
    };
  }
  async execute() {
    if (!this.isEnabled()) {
      debug("MP auto reconciliation disabled");
      return;
    }
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      warn("MP auto reconciliation skipped: missing MP_ACCESS_TOKEN");
      return;
    }
    const pendingInvoices = await BillingRepository_default.findPendingInvoices();
    const invoicesToProcess = pendingInvoices.filter((invoice) => String(invoice.paymentLink || "").trim()).slice(0, this.getMaxInvoices());
    if (!invoicesToProcess.length) {
      debug("MP auto reconciliation: no pending invoices");
      return;
    }
    info("MP auto reconciliation started", {
      pendingCount: pendingInvoices.length,
      processingCount: invoicesToProcess.length
    });
    for (const invoice of invoicesToProcess) {
      try {
        const payment = await this.fetchLatestPaymentStatus(
          invoice.id,
          accessToken
        );
        if (!payment.paymentId) {
          debug("MP auto reconciliation: payment not found", {
            invoiceId: invoice.id
          });
          continue;
        }
        if (!isApprovedPaymentStatus(payment.status)) {
          debug("MP auto reconciliation: payment not approved", {
            invoiceId: invoice.id,
            paymentId: payment.paymentId,
            status: payment.status
          });
          continue;
        }
        await ProcessPaymentService_default.execute({ invoiceId: invoice.id });
        info("MP auto reconciliation: invoice paid", {
          invoiceId: invoice.id,
          paymentId: payment.paymentId,
          status: payment.status
        });
      } catch (err) {
        error("MP auto reconciliation failed for invoice", {
          invoiceId: invoice.id,
          message: err instanceof Error ? err.message : String(err)
        });
      }
    }
    info("MP auto reconciliation finished");
  }
};
var ReconcileMercadoPagoInvoicesService_default = new ReconcileMercadoPagoInvoicesService();

// src/modules/orders/jobs/DeliveryLocationCleanupJob.ts
var DeliveryLocationCleanupJob = class {
  async execute() {
    const configuredDays = Number(
      process.env.DELIVERY_LOCATION_RETENTION_DAYS || 30
    );
    const retentionDays = Number.isFinite(configuredDays) ? Math.min(Math.max(Math.floor(configuredDays), 1), 365) : 30;
    const cutoff = new Date(Date.now() - retentionDays * 864e5);
    return prisma_default.deliveryLocation.deleteMany({
      where: { recordedAt: { lt: cutoff } }
    });
  }
};
var DeliveryLocationCleanupJob_default = new DeliveryLocationCleanupJob();

// src/modules/billing/jobs/scheduler.ts
function startJobs() {
  cron.schedule(
    "0 0 * * *",
    async () => {
      info("scheduler triggered BillingJob");
      try {
        await BillingJob_default.execute();
      } catch (err) {
        error("BillingJob execution failed", {
          message: err?.message || String(err)
        });
      }
    },
    {
      timezone: "America/Sao_Paulo"
    }
  );
  cron.schedule(
    process.env.BILLING_MP_RECONCILE_CRON || "*/5 * * * *",
    async () => {
      info("scheduler triggered MP auto reconciliation");
      try {
        await ReconcileMercadoPagoInvoicesService_default.execute();
      } catch (err) {
        error("MP auto reconciliation execution failed", {
          message: err?.message || String(err)
        });
      }
    },
    {
      timezone: "America/Sao_Paulo"
    }
  );
  cron.schedule(
    "30 3 * * *",
    async () => {
      try {
        const result = await DeliveryLocationCleanupJob_default.execute();
        info("old delivery locations removed", { count: result.count });
      } catch (err) {
        error("delivery location cleanup failed", {
          message: err instanceof Error ? err.message : String(err)
        });
      }
    },
    { timezone: "America/Sao_Paulo" }
  );
}

// src/config/validateEnv.ts
function asNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function validateCriticalEnv() {
  const isProduction3 = process.env.NODE_ENV === "production";
  if (!isProduction3) {
    return;
  }
  const errors = [];
  const jwtSecret = String(process.env.JWT_SECRET || "").trim();
  if (jwtSecret.length < 32) {
    errors.push("JWT_SECRET deve ter pelo menos 32 caracteres em producao.");
  }
  const jwtRefreshSecret = String(
    process.env.JWT_REFRESH_SECRET || jwtSecret
  ).trim();
  if (jwtRefreshSecret.length < 32) {
    errors.push(
      "JWT_REFRESH_SECRET deve ter pelo menos 32 caracteres em producao."
    );
  }
  const rateLimitMax2 = asNumber(
    String(process.env.RATE_LIMIT_MAX_REQUESTS || "300"),
    300
  );
  if (rateLimitMax2 <= 0) {
    errors.push("RATE_LIMIT_MAX_REQUESTS deve ser maior que zero.");
  }
  const authRateLimitMax = asNumber(
    String(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || "50"),
    50
  );
  if (authRateLimitMax <= 0) {
    errors.push("AUTH_RATE_LIMIT_MAX_REQUESTS deve ser maior que zero.");
  }
  const loginLockoutAfterFailures = asNumber(
    String(process.env.LOGIN_LOCKOUT_AFTER_FAILURES || "5"),
    5
  );
  if (loginLockoutAfterFailures < 3) {
    errors.push("LOGIN_LOCKOUT_AFTER_FAILURES deve ser >= 3 em producao.");
  }
  const loginLockoutBaseSeconds = asNumber(
    String(process.env.LOGIN_LOCKOUT_BASE_SECONDS || "60"),
    60
  );
  if (loginLockoutBaseSeconds < 30) {
    errors.push("LOGIN_LOCKOUT_BASE_SECONDS deve ser >= 30 em producao.");
  }
  const mfaRoles = String(process.env.MFA_REQUIRED_ROLES || "ADMIN,SUPER_ADMIN").split(",").map((item) => item.trim()).filter(Boolean);
  if (mfaRoles.length > 0) {
    const jwtMfaSecret = String(process.env.JWT_MFA_SECRET || jwtSecret).trim();
    if (jwtMfaSecret.length < 32) {
      errors.push(
        "JWT_MFA_SECRET deve ter pelo menos 32 caracteres em producao."
      );
    }
  }
  const allowInsecureStripe = String(process.env.ALLOW_INSECURE_STRIPE_WEBHOOK || "false").trim() === "true";
  if (allowInsecureStripe) {
    errors.push("ALLOW_INSECURE_STRIPE_WEBHOOK nao pode ser true em producao.");
  }
  const allowGlobalFallback = String(process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK || "false").trim() === "true";
  if (allowGlobalFallback) {
    errors.push(
      "ALLOW_GLOBAL_PAYMENT_FALLBACK nao pode ser true em producao multi-tenant."
    );
  }
  const paymentPinSecret = String(
    process.env.PAYMENT_PIN_SECRET || process.env.JWT_MFA_SECRET || jwtSecret
  ).trim();
  if (paymentPinSecret.length < 32) {
    errors.push(
      "PAYMENT_PIN_SECRET deve ter pelo menos 32 caracteres em producao."
    );
  }
  const enableTestPaymentWebhook = String(process.env.ENABLE_TEST_PAYMENT_WEBHOOK || "false").trim() === "true";
  if (enableTestPaymentWebhook) {
    errors.push(
      "ENABLE_TEST_PAYMENT_WEBHOOK nao pode ser true em producao."
    );
  }
  const enableDestructiveCleanup = String(process.env.ENABLE_DESTRUCTIVE_CLEANUP || "false").trim() === "true";
  if (enableDestructiveCleanup) {
    errors.push("ENABLE_DESTRUCTIVE_CLEANUP nao pode ser true em producao.");
  }
  if (errors.length) {
    throw new Error(`Falha na validacao de ambiente: ${errors.join(" ")}`);
  }
}

// src/server.ts
validateCriticalEnv();
var server = http.createServer(app_default);
var port = Number(process.env.PORT) || 3e3;
var isProduction2 = process.env.NODE_ENV === "production";
var normalizeOrigin2 = (value) => value.trim().replace(/\/+$/, "");
var socketAllowedOrigins = [
  process.env.SOCKET_CORS_ORIGINS || "",
  process.env.CORS_ORIGINS || "",
  process.env.FRONTEND_URL || ""
].flatMap((value) => value.split(",")).map((origin) => normalizeOrigin2(origin)).filter(Boolean);
var io = new Server(server, {
  cors: {
    origin: isProduction2 ? socketAllowedOrigins : "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["polling", "websocket"]
});
io.use(socketAuth);
io.on("connection", socketHandler);
server.listen(port, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${port}`);
  startJobs();
  BillingJob_default.execute().catch((error2) => {
    console.error(error2);
    Sentry2.captureException(error2);
  });
  ReconcileMercadoPagoInvoicesService_default.execute().catch((error2) => {
    console.error(error2);
    Sentry2.captureException(error2);
  });
});
process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED_REJECTION]", reason);
  Sentry2.captureException(
    reason instanceof Error ? reason : new Error(String(reason))
  );
  notifyCriticalError("[UNHANDLED_REJECTION]", String(reason));
});
process.on("uncaughtException", (error2) => {
  console.error("[UNCAUGHT_EXCEPTION]", error2);
  Sentry2.captureException(error2);
  notifyCriticalError("[UNCAUGHT_EXCEPTION]", error2?.message || "unknown");
});
export {
  io
};
