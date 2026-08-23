// src/server.ts
import "dotenv/config";

// src/app.ts
import express from "express";
import helmet from "helmet";
import rateLimit6 from "express-rate-limit";

// src/routes/index.ts
import { Router as Router20 } from "express";

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
        mfaEnabled: true,
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
        mfaEnabled: true,
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
  async updateMfaEnabled(id, mfaEnabled, db = prisma_default) {
    return db.user.update({
      where: { id: Number(id) },
      data: { mfaEnabled },
      select: {
        id: true,
        mfaEnabled: true
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
var LOCKOUT_AFTER_FAILURES = Number(process.env.LOGIN_LOCKOUT_AFTER_FAILURES || 5);
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
    const lockSeconds = Math.min(MAX_LOCK_SECONDS, BASE_LOCK_SECONDS * 2 ** exponent);
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
function requiresMfa(user) {
  return Boolean(user.mfaEnabled) || getRequiredMfaRoles().has(
    String(user.role || "").trim().toUpperCase()
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
    avatar: user.avatar,
    restaurantId: user.restaurantId,
    mfaEnabled: Boolean(user.mfaEnabled)
  };
}
var LoginMfaService = class {
  async beginIfRequired(user) {
    if (!requiresMfa(user)) {
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
      const from = String(process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER || "").trim() || "no-reply@pizzaia.local";
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
      console.warn(`[login-2fa] SMTP nao configurado. Codigo para ${user.email}: ${code}`);
    }
    return {
      mfaRequired: true,
      mfaToken: token,
      message: "Codigo de verificacao enviado para o e-mail cadastrado."
    };
  }
  async verifyAndIssueTokens({ mfaToken, code }) {
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
      throw new Error(`Muitas tentativas de login. Tente novamente em ${lockStatus.waitSeconds}s.`);
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
        throw new Error(`Muitas tentativas de login. Tente novamente em ${failure.waitSeconds}s.`);
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
        avatar: user.avatar
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
    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({
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
        mfaEnabled: user.mfaEnabled,
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
var checkedRequests = /* @__PURE__ */ new WeakSet();
async function billingMiddleware(req, res, next) {
  try {
    if (checkedRequests.has(req)) {
      return next();
    }
    checkedRequests.add(req);
    const restaurantId = req.user.restaurantId;
    if (String(req.user.role || "").toUpperCase() === "SUPER_ADMIN" || !restaurantId) {
      return next();
    }
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
      const blockingInvoices = openInvoices.filter((invoice) => isInvoiceBlocking(invoice, now));
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

// src/middlewares/authMiddleware.ts
function canBypassBillingCheck(req) {
  const role = String(req.user?.role || "").toUpperCase();
  if (role === "SUPER_ADMIN") {
    return true;
  }
  if (req.baseUrl === "/auth" && req.path === "/me") {
    return true;
  }
  return req.baseUrl === "/billing" || req.path.startsWith("/billing/");
}
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
    if (canBypassBillingCheck(req)) {
      return next();
    }
    return billingMiddleware(req, res, next);
  } catch (_error) {
    return res.status(401).json({ error: "Token inv\xE1lido!" });
  }
}

// src/modules/auth/services/UpdatePasswordService.ts
import bcrypt5 from "bcrypt";
var UpdatePasswordService = class {
  async execute(userId, oldPassword, newPassword) {
    if (typeof oldPassword !== "string" || typeof newPassword !== "string" || !oldPassword || newPassword.length < 6) {
      throw new Error("Informe a senha atual e uma nova senha com ao menos 6 caracteres");
    }
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
    const hasField = (field) => Object.prototype.hasOwnProperty.call(profileData, field);
    const nextEmail = hasField("email") ? String(profileData.email || "").trim().toLowerCase() : currentUser.email;
    if (nextEmail && nextEmail !== currentUser.email) {
      const emailInUse = await UserRepository_default.findByEmail(nextEmail);
      if (emailInUse && Number(emailInUse.id) !== Number(userId)) {
        throw new Error("Este e-mail j\xE1 est\xE1 em uso!");
      }
    }
    const updates = {};
    if (hasField("name")) updates.name = String(profileData.name || "").trim();
    if (hasField("email")) updates.email = nextEmail;
    if (hasField("phone")) updates.phone = String(profileData.phone || "").trim() || null;
    if (hasField("cpf")) updates.cpf = String(profileData.cpf || "").replace(/\D/g, "") || null;
    if (hasField("address")) updates.address = String(profileData.address || "").trim() || null;
    if (hasField("number")) updates.number = String(profileData.number || "").trim() || null;
    if (hasField("district")) updates.district = String(profileData.district || "").trim() || null;
    if (hasField("city")) updates.city = String(profileData.city || "").trim() || null;
    if (hasField("state")) updates.state = String(profileData.state || "").trim() || null;
    if (hasField("zipCode")) updates.zipCode = String(profileData.zipCode || "").trim() || null;
    if (hasField("complement"))
      updates.complement = String(profileData.complement || "").trim() || null;
    if (hasField("avatar")) updates.avatar = String(profileData.avatar || "").trim() || null;
    return UserRepository_default.updateProfile(userId, updates);
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
function canLogPasswordResetCode(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv !== "production";
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
    const frontendUrl = String(process.env.FRONTEND_URL || "http://localhost:5173").replace(
      /\/$/,
      ""
    );
    const transporter = createTransporter2();
    if (transporter) {
      const from = String(process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER || "").trim() || "no-reply@pizzaia.local";
      try {
        await transporter.sendMail({
          from,
          to: user.email,
          subject: "Recuperacao de senha - Peca ja food",
          text: `Seu codigo para redefinir a senha e: ${code}. Ele expira em 15 minutos.

Se preferir, abra: ${frontendUrl}/recover-password`
        });
      } catch (error2) {
        if (process.env.NODE_ENV === "production") {
          console.error("[password-reset] Nao foi possivel enviar o e-mail de recuperacao.");
          return { message: safeMessage };
        }
        if (isBasicAuthDisabledError2(error2)) {
          throw new Error(
            "Falha no SMTP: o provedor bloqueou login por usuario/senha (basic auth). Configure SMTP_AUTH_TYPE=oauth2 com credenciais OAuth2 ou use um provedor com app password."
          );
        }
        throw error2;
      }
    } else if (canLogPasswordResetCode()) {
      console.warn(`[password-reset] SMTP nao configurado. Codigo para ${user.email}: ${code}`);
    } else {
      return { message: safeMessage };
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
var windowMs = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1e3);
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

// src/modules/auth/services/UpdateMfaPreferenceService.ts
var UpdateMfaPreferenceService = class {
  async execute(userId, enabled) {
    if (typeof enabled !== "boolean") {
      throw new Error("A preferencia de verificacao em duas etapas e obrigatoria");
    }
    const user = await UserRepository_default.findById(userId);
    if (!user) {
      throw new Error("Usuario nao encontrado");
    }
    return UserRepository_default.updateMfaEnabled(userId, enabled);
  }
};
var UpdateMfaPreferenceService_default = new UpdateMfaPreferenceService();

// src/modules/auth/controllers/UpdateMfaPreferenceController.ts
var UpdateMfaPreferenceController = class {
  async handle(req, res) {
    try {
      const result = await UpdateMfaPreferenceService_default.execute(req.user.id, req.body?.enabled);
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao atualizar verificacao em duas etapas"
      });
    }
  }
};
var UpdateMfaPreferenceController_default = new UpdateMfaPreferenceController();

// src/middlewares/security/accountActionRateLimitMiddleware.ts
import rateLimit2, { ipKeyGenerator as ipKeyGenerator2 } from "express-rate-limit";
function getEmailKey(req) {
  const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 255);
  const ip = ipKeyGenerator2(String(req.ip || "unknown").trim());
  return `${ip}:${email || "no-email"}`;
}
var passwordResetRateLimitMiddleware = rateLimit2({
  windowMs: Number(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1e3),
  max: Number(process.env.PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS || 5),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getEmailKey,
  message: {
    error: "Muitas solicita\xE7\xF5es de recupera\xE7\xE3o. Aguarde antes de tentar novamente."
  }
});
var registrationRateLimitMiddleware = rateLimit2({
  windowMs: Number(process.env.REGISTRATION_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1e3),
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
router.patch("/mfa", authMiddleware, (req, res) => {
  UpdateMfaPreferenceController_default.handle(req, res);
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

// src/validators/ProductValidator.ts
import { z as z4 } from "zod";
var ingredientSchema = z4.object({
  id: z4.number().int().positive().optional(),
  name: z4.string().trim().min(1, "Nome do ingrediente \xE9 obrigat\xF3rio.").max(80),
  price: z4.number().min(0, "O adicional n\xE3o pode ser negativo.").max(9999),
  required: z4.boolean().optional(),
  active: z4.boolean().optional()
});
var optionSchema = z4.object({
  id: z4.number().int().positive().optional(),
  ingredientId: z4.number().int().positive("Ingrediente inv\xE1lido."),
  active: z4.boolean().optional()
});
var productOptionGroupSchema = z4.object({
  id: z4.number().int().positive().optional(),
  name: z4.string().trim().min(1, "Nome do grupo \xE9 obrigat\xF3rio.").max(80),
  description: z4.string().trim().max(240).optional(),
  required: z4.boolean().default(false),
  selectionType: z4.enum(["SINGLE", "MULTIPLE"]),
  minSelections: z4.number().int().min(0).max(40),
  maxSelections: z4.number().int().min(1).max(40),
  options: z4.array(optionSchema).min(1, "Adicione ao menos uma op\xE7\xE3o ao grupo.").max(40)
}).superRefine((group, ctx) => {
  if (group.minSelections > group.maxSelections) {
    ctx.addIssue({
      code: z4.ZodIssueCode.custom,
      path: ["minSelections"],
      message: "O m\xEDnimo de escolhas n\xE3o pode superar o m\xE1ximo."
    });
  }
  if (group.required && group.minSelections < 1) {
    ctx.addIssue({
      code: z4.ZodIssueCode.custom,
      path: ["minSelections"],
      message: "Um grupo obrigat\xF3rio deve exigir ao menos uma escolha."
    });
  }
  if (!group.required && group.minSelections !== 0) {
    ctx.addIssue({
      code: z4.ZodIssueCode.custom,
      path: ["minSelections"],
      message: "Uma categoria opcional deve permitir continuar sem nenhuma escolha."
    });
  }
  if (group.selectionType === "SINGLE" && group.maxSelections !== 1) {
    ctx.addIssue({
      code: z4.ZodIssueCode.custom,
      path: ["maxSelections"],
      message: "Grupos de escolha \xFAnica devem permitir exatamente uma op\xE7\xE3o."
    });
  }
  const uniqueIngredientIds = new Set(group.options.map((option) => option.ingredientId));
  if (uniqueIngredientIds.size !== group.options.length) {
    ctx.addIssue({
      code: z4.ZodIssueCode.custom,
      path: ["options"],
      message: "Um ingrediente n\xE3o pode aparecer duas vezes no mesmo grupo."
    });
  }
  const enabledOptions = group.options.filter((option) => option.active !== false).length;
  if (enabledOptions < group.maxSelections) {
    ctx.addIssue({
      code: z4.ZodIssueCode.custom,
      path: ["maxSelections"],
      message: "O m\xE1ximo de escolhas n\xE3o pode superar as op\xE7\xF5es ativas do grupo."
    });
  }
});
var productSchema = z4.object({
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
  saleMode: z4.enum(["COMPLETE", "BUILDABLE"]).optional(),
  ingredients: z4.array(ingredientSchema).max(40).optional(),
  optionGroups: z4.array(productOptionGroupSchema).max(20, "Cada produto pode ter no m\xE1ximo 20 grupos de op\xE7\xF5es.").optional(),
  categoryId: z4.number({
    invalid_type_error: "Categoria \xE9 obrigat\xF3ria.",
    required_error: "Categoria \xE9 obrigat\xF3ria."
  }).int()
});
function validateUniqueGroupNames(product, ctx) {
  if (!product.optionGroups) {
    return;
  }
  const normalizedNames = product.optionGroups.map((group) => group.name.trim().toLocaleLowerCase());
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    ctx.addIssue({
      code: z4.ZodIssueCode.custom,
      path: ["optionGroups"],
      message: "Os grupos de op\xE7\xF5es do produto precisam ter nomes diferentes."
    });
  }
}
var createProductSchema = productSchema.superRefine(validateUniqueGroupNames);
var updateProductSchema = productSchema.partial().superRefine(validateUniqueGroupNames);

// src/modules/products/utils/productOptionGroups.ts
async function buildProductOptionGroupsCreate(tx, restaurantId, groups) {
  const ingredientIds = [
    ...new Set(groups.flatMap((group) => group.options.map((option) => option.ingredientId)))
  ];
  const ingredients = ingredientIds.length ? await tx.ingredient.findMany({
    where: {
      restaurantId,
      id: { in: ingredientIds }
    },
    select: { id: true }
  }) : [];
  if (ingredients.length !== ingredientIds.length) {
    throw new Error("Um ou mais ingredientes n\xE3o pertencem a este restaurante.");
  }
  return groups.map((group, groupIndex) => ({
    restaurantId,
    name: group.name.trim(),
    description: String(group.description || "").trim() || null,
    required: group.required,
    selectionType: group.selectionType,
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    position: groupIndex,
    active: true,
    options: {
      create: group.options.map((option, optionIndex) => ({
        ingredientId: option.ingredientId,
        active: option.active !== false,
        position: optionIndex
      }))
    }
  }));
}

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
    const requiredName = requireDefined(parsedData.name, "Nome do produto \xE9 obrigat\xF3rio.");
    const requiredPrice = requireDefined(parsedData.price, "Pre\xE7o do produto \xE9 obrigat\xF3rio.");
    const requiredCategoryId = requireDefined(
      parsedData.categoryId,
      "Categoria do produto \xE9 obrigat\xF3ria."
    );
    const { ingredients: _legacyIngredients, optionGroups = [], saleMode: _saleMode, ...productData } = parsedData;
    if (optionGroups.length === 0) {
      throw new Error("Adicione ao menos um grupo de op\xE7\xF5es para montar o produto.");
    }
    const product = await prisma_default.$transaction(async (tx) => {
      const category = await tx.category.findFirst({
        where: { id: requiredCategoryId, restaurantId },
        select: { id: true }
      });
      if (!category) {
        throw new Error("A categoria informada n\xE3o pertence a este restaurante.");
      }
      const normalizedGroups = await buildProductOptionGroupsCreate(
        tx,
        restaurantId,
        optionGroups
      );
      return tx.product.create({
        data: {
          ...productData,
          name: requiredName,
          price: requiredPrice,
          categoryId: requiredCategoryId,
          restaurantId,
          saleMode: "BUILDABLE",
          active: activeFromStock && parsedData.active !== false,
          optionGroups: { create: normalizedGroups }
        },
        include: {
          category: true,
          optionGroups: {
            orderBy: [{ position: "asc" }, { id: "asc" }],
            include: {
              options: {
                orderBy: [{ position: "asc" }, { id: "asc" }],
                include: { ingredient: true }
              }
            }
          }
        }
      });
    });
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
        stock,
        optionGroups
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
          stock,
          optionGroups
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

// src/modules/products/repositories/ProductRepository.ts
var productConfigurationInclude = {
  category: true,
  discount: true,
  ingredients: { orderBy: { id: "asc" } },
  optionGroups: {
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: {
      options: {
        orderBy: [{ position: "asc" }, { id: "asc" }],
        include: {
          ingredient: true
        }
      }
    }
  }
};
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
        ...productConfigurationInclude
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
        ...productConfigurationInclude
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
      throw new Error("N\xE3o \xE9 poss\xEDvel excluir um produto que j\xE1 possui pedidos.");
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
        userRatings.map((item) => [Number(item.productId), Number(item.rating)])
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

// src/modules/products/services/UpdateProductService.ts
var UpdateProductService = class {
  async execute(id, data, restaurantId) {
    const parsedData = updateProductSchema.parse(data);
    const product = await ProductRepository_default.findById(id, restaurantId);
    if (!product) {
      throw new Error("Produto n\xE3o encontrado!");
    }
    const stockWasProvided = Object.prototype.hasOwnProperty.call(data, "stock");
    const normalizedStock = parsedData.stock === null || parsedData.stock === void 0 ? null : Number(parsedData.stock);
    let nextActive = parsedData.active;
    if (stockWasProvided) {
      nextActive = normalizedStock === null || normalizedStock > 0;
    }
    const payload = {
      ...parsedData,
      active: nextActive
    };
    const {
      ingredients: _legacyIngredients,
      optionGroups,
      saleMode: _saleMode,
      ...productData
    } = payload;
    if (optionGroups && optionGroups.length === 0) {
      throw new Error("Adicione ao menos um grupo de op\xE7\xF5es para montar o produto.");
    }
    return prisma_default.$transaction(async (tx) => {
      if (productData.categoryId !== void 0) {
        const category = await tx.category.findFirst({
          where: { id: productData.categoryId, restaurantId },
          select: { id: true }
        });
        if (!category) {
          throw new Error("A categoria informada n\xE3o pertence a este restaurante.");
        }
      }
      const normalizedGroups = optionGroups ? await buildProductOptionGroupsCreate(tx, restaurantId, optionGroups) : null;
      if (normalizedGroups) {
        await tx.productOptionGroup.deleteMany({ where: { productId: product.id, restaurantId } });
      }
      return tx.product.update({
        where: { id: product.id },
        data: {
          ...productData,
          saleMode: "BUILDABLE",
          ...normalizedGroups ? { optionGroups: { create: normalizedGroups } } : {}
        },
        include: {
          category: true,
          optionGroups: {
            orderBy: [{ position: "asc" }, { id: "asc" }],
            include: {
              options: {
                orderBy: [{ position: "asc" }, { id: "asc" }],
                include: { ingredient: true }
              }
            }
          }
        }
      });
    });
  }
};
var UpdateProductService_default = new UpdateProductService();

// src/modules/products/controllers/UpdateProductController.ts
var UpdateProductController = class {
  async handle(req, res) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const data = req.body;
      const updatedProduct = await UpdateProductService_default.execute(id, data, req.user.restaurantId);
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

// src/modules/products/utils/productDiscount.ts
function roundMoney(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error("Valor monet\xE1rio inv\xE1lido.");
  }
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
}
function validDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function resolveProductBasePricing(product, now = /* @__PURE__ */ new Date()) {
  const originalBasePrice = Math.max(roundMoney(product.price), 0);
  const discount = product.discount;
  const startsAt = validDate(discount?.startsAt);
  const endsAt = validDate(discount?.endsAt);
  const isWithinPeriod = (!startsAt || startsAt <= now) && (!endsAt || endsAt > now);
  const configuredValue = Number(discount?.value || 0);
  const kind = String(discount?.kind || "").toUpperCase();
  const hasValidConfiguration = discount?.active === true && isWithinPeriod && Number.isFinite(configuredValue) && configuredValue > 0 && (kind === "FIXED" || kind === "PERCENTAGE");
  let discountAmount = 0;
  if (hasValidConfiguration) {
    discountAmount = kind === "PERCENTAGE" ? roundMoney(originalBasePrice * (Math.min(configuredValue, 100) / 100)) : roundMoney(Math.min(configuredValue, originalBasePrice));
  }
  const effectiveBasePrice = roundMoney(Math.max(originalBasePrice - discountAmount, 0));
  const discountPercentage = originalBasePrice > 0 ? roundMoney(discountAmount / originalBasePrice * 100) : 0;
  const active = discountAmount > 0;
  const configuredLabel = String(discount?.label || "").trim();
  return {
    originalBasePrice,
    effectiveBasePrice,
    discountAmount,
    discountPercentage,
    badgeLabel: active ? configuredLabel || `${Math.max(Math.round(discountPercentage), 1)}% OFF` : null,
    active,
    endsAt: active && endsAt ? endsAt : null
  };
}

// src/modules/products/services/ListProductService.ts
var ListProductsService = class {
  async execute({ restaurantId, slug }) {
    let normalizedRestaurantId = Number(restaurantId);
    if ((!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) && slug) {
      const restaurant = await RestaurantRepository_default.findBySlug(String(slug).trim());
      normalizedRestaurantId = Number(restaurant?.id || 0);
    }
    if (!normalizedRestaurantId) {
      throw new Error("Restaurante n\xE3o encontrado");
    }
    const products = await ProductRepository_default.findAll(normalizedRestaurantId);
    const normalizedProducts = products.map((product) => {
      const stockValue = product?.stock === null || product?.stock === void 0 ? null : Number(product.stock);
      const pricing = resolveProductBasePricing(product);
      if (Number.isFinite(stockValue) && stockValue <= 0) {
        return {
          ...product,
          active: false,
          pricing
        };
      }
      return {
        ...product,
        pricing
      };
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
      const result = await ListProductRatingsService_default.execute(restaurantId, clientKey);
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
  async execute({ productId, restaurantId, clientKey, rating }) {
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
    const product = await ProductRepository_default.findById(normalizedProductId, normalizedRestaurantId);
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

// src/validators/ProductDiscountValidator.ts
import { z as z5 } from "zod";
var optionalDate = z5.union([z5.string().datetime({ offset: true }), z5.date(), z5.null()]).optional().transform((value) => {
  if (value === null || value === void 0) return null;
  return value instanceof Date ? value : new Date(value);
});
var upsertProductDiscountSchema = z5.object({
  kind: z5.enum(["FIXED", "PERCENTAGE"]),
  value: z5.coerce.number().positive("Informe um desconto maior que zero.").max(999999),
  label: z5.string().trim().max(40, "O aviso pode ter no m\xE1ximo 40 caracteres.").optional(),
  active: z5.boolean().optional().default(true),
  startsAt: optionalDate,
  endsAt: optionalDate
}).superRefine((data, ctx) => {
  if (data.kind === "PERCENTAGE" && data.value >= 100) {
    ctx.addIssue({
      code: z5.ZodIssueCode.custom,
      path: ["value"],
      message: "O desconto percentual deve ser menor que 100%."
    });
  }
  if (data.startsAt && data.endsAt && data.startsAt >= data.endsAt) {
    ctx.addIssue({
      code: z5.ZodIssueCode.custom,
      path: ["endsAt"],
      message: "O t\xE9rmino da oferta deve ser posterior ao in\xEDcio."
    });
  }
});

// src/modules/products/services/UpsertProductDiscountService.ts
var UpsertProductDiscountService = class {
  async execute({
    productId,
    restaurantId,
    input
  }) {
    const normalizedProductId = Number(productId);
    const normalizedRestaurantId = Number(restaurantId || 0);
    if (!Number.isInteger(normalizedProductId) || normalizedProductId <= 0) {
      throw new Error("Produto inv\xE1lido.");
    }
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error("Restaurante inv\xE1lido.");
    }
    const data = upsertProductDiscountSchema.parse(input);
    const product = await prisma_default.product.findFirst({
      where: { id: normalizedProductId, restaurantId: normalizedRestaurantId },
      select: { id: true, price: true }
    });
    if (!product) {
      throw new Error("Produto n\xE3o encontrado neste restaurante.");
    }
    if (data.kind === "FIXED" && data.value >= Number(product.price)) {
      throw new Error("O desconto fixo deve ser menor que o pre\xE7o-base do produto.");
    }
    return prisma_default.productDiscount.upsert({
      where: { productId: normalizedProductId },
      update: {
        kind: data.kind,
        value: data.value,
        label: data.label || null,
        active: data.active,
        startsAt: data.startsAt,
        endsAt: data.endsAt
      },
      create: {
        restaurantId: normalizedRestaurantId,
        productId: normalizedProductId,
        kind: data.kind,
        value: data.value,
        label: data.label || null,
        active: data.active,
        startsAt: data.startsAt,
        endsAt: data.endsAt
      }
    });
  }
};
var UpsertProductDiscountService_default = new UpsertProductDiscountService();

// src/modules/products/controllers/UpsertProductDiscountController.ts
var UpsertProductDiscountController = class {
  async handle(req, res) {
    try {
      const discount = await UpsertProductDiscountService_default.execute({
        productId: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
        restaurantId: req.user.restaurantId,
        input: req.body
      });
      return res.status(200).json(discount);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "N\xE3o foi poss\xEDvel salvar o desconto."
      });
    }
  }
};
var UpsertProductDiscountController_default = new UpsertProductDiscountController();

// src/modules/products/services/DeleteProductDiscountService.ts
var DeleteProductDiscountService = class {
  async execute(productId, restaurantId) {
    const normalizedProductId = Number(productId);
    const normalizedRestaurantId = Number(restaurantId || 0);
    if (!Number.isInteger(normalizedProductId) || normalizedProductId <= 0) {
      throw new Error("Produto inv\xE1lido.");
    }
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error("Restaurante inv\xE1lido.");
    }
    const product = await prisma_default.product.findFirst({
      where: { id: normalizedProductId, restaurantId: normalizedRestaurantId },
      select: { id: true }
    });
    if (!product) {
      throw new Error("Produto n\xE3o encontrado neste restaurante.");
    }
    await prisma_default.productDiscount.deleteMany({
      where: { productId: normalizedProductId, restaurantId: normalizedRestaurantId }
    });
    return { message: "Desconto removido com sucesso." };
  }
};
var DeleteProductDiscountService_default = new DeleteProductDiscountService();

// src/modules/products/controllers/DeleteProductDiscountController.ts
var DeleteProductDiscountController = class {
  async handle(req, res) {
    try {
      const result = await DeleteProductDiscountService_default.execute(
        Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
        req.user.restaurantId
      );
      return res.status(200).json(result);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "N\xE3o foi poss\xEDvel remover o desconto."
      });
    }
  }
};
var DeleteProductDiscountController_default = new DeleteProductDiscountController();

// src/middlewares/adminMiddleware.ts
import { UserRole as UserRole4 } from "@prisma/client";
function adminMiddleware(req, res, next) {
  if (req.user.role !== UserRole4.ADMIN) {
    return res.status(403).json({ error: "Acesso negado!" });
  }
  return next();
}

// src/middlewares/publicRestaurantBillingMiddleware.ts
import { InvoiceStatus as InvoiceStatus2 } from "@prisma/client";
async function resolveRestaurantId(req) {
  const directId = Number(
    req.params.restaurantId || req.query.restaurantId || req.body?.restaurantId || 0
  );
  if (Number.isInteger(directId) && directId > 0) {
    return directId;
  }
  const slug = String(req.params.slug || req.query.slug || "").trim();
  if (slug) {
    const restaurant = await prisma_default.restaurant.findUnique({
      where: { slug },
      select: { id: true }
    });
    return restaurant?.id || null;
  }
  if (req.path.endsWith("/default")) {
    const restaurant = await prisma_default.restaurant.findFirst({
      select: { id: true },
      orderBy: { id: "asc" }
    });
    return restaurant?.id || null;
  }
  return null;
}
async function publicRestaurantBillingMiddleware(req, res, next) {
  try {
    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return next();
    }
    const openInvoices = await prisma_default.invoice.findMany({
      where: {
        restaurantId,
        status: { in: [InvoiceStatus2.PENDENTE, InvoiceStatus2.ATRASADO] }
      },
      select: { status: true, dueDate: true }
    });
    if (!hasBlockingInvoices(openInvoices, /* @__PURE__ */ new Date())) {
      return next();
    }
    return res.status(403).json({
      code: "BILLING_BLOCKED",
      blocked: true,
      error: "Restaurante temporariamente indispon\xEDvel"
    });
  } catch {
    return res.status(500).json({
      error: "Erro ao validar disponibilidade do restaurante"
    });
  }
}

// src/modules/products/routes/productsRoutes.ts
var router2 = Router2();
router2.post("/", authMiddleware, adminMiddleware, CreateProductController_default.handle);
router2.get("/", publicRestaurantBillingMiddleware, ListProductController_default.handle);
router2.get("/ratings", ListProductRatingsController_default.handle);
router2.post("/:id/rating", RateProductController_default.handle);
router2.put("/:id", authMiddleware, adminMiddleware, UpdateProductController_default.handle);
router2.put(
  "/:id/discount",
  authMiddleware,
  adminMiddleware,
  (req, res) => UpsertProductDiscountController_default.handle(req, res)
);
router2.delete(
  "/:id/discount",
  authMiddleware,
  adminMiddleware,
  (req, res) => DeleteProductDiscountController_default.handle(req, res)
);
router2.delete("/:id", authMiddleware, adminMiddleware, DeleteProductController_default.handle);
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
  async countActiveOperationalOrders(restaurantId, db = prisma_default) {
    return db.order.count({
      where: {
        restaurantId,
        status: { in: [OrderStatus.PENDENTE, OrderStatus.PREPARANDO, OrderStatus.PRONTO] },
        NOT: {
          paid: false,
          paymentMethod: { in: [PaymentMethod.PIX, PaymentMethod.CARTAO] },
          payOnDelivery: false
        }
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
        status,
        ...status === OrderStatus.PREPARANDO ? { preparationStartedAt: /* @__PURE__ */ new Date(), readyAt: null } : {},
        ...status === OrderStatus.PRONTO ? { readyAt: /* @__PURE__ */ new Date() } : {}
      }
    });
    return this.findById(id, restaurantId, db);
  }
  async updateStatusIfCurrent(id, status, restaurantId, expected, db = prisma_default) {
    const result = await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId,
        status: expected.status,
        ...typeof expected.paid === "boolean" ? { paid: expected.paid } : {}
      },
      data: {
        status,
        ...status === OrderStatus.PREPARANDO ? { preparationStartedAt: /* @__PURE__ */ new Date(), readyAt: null } : {},
        ...status === OrderStatus.PRONTO ? { readyAt: /* @__PURE__ */ new Date() } : {}
      }
    });
    if (result.count !== 1) {
      const current = await this.findById(id, restaurantId, db);
      if (!current) {
        throw new Error("Pedido n\xE3o encontrado!");
      }
      throw new Error(
        "O pedido foi atualizado por outro processo. Atualize a tela e tente novamente."
      );
    }
    const updated = await this.findById(id, restaurantId, db);
    if (!updated) {
      throw new Error("Pedido n\xE3o encontrado ap\xF3s a atualiza\xE7\xE3o.");
    }
    return updated;
  }
  async confirmDeliveryReceived(id, restaurantId, db = prisma_default) {
    await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId,
        status: OrderStatus.ENTREGUE
      },
      data: {
        deliveryConfirmedAt: /* @__PURE__ */ new Date()
      }
    });
    return this.findById(id, restaurantId, db);
  }
  async confirmPayment(id, restaurantId, db = prisma_default) {
    const result = await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId,
        paid: false,
        status: { not: OrderStatus.CANCELADO }
      },
      data: {
        paid: true,
        paidAt: /* @__PURE__ */ new Date(),
        paymentConfirmationPin: null,
        paymentConfirmationPinExpiresAt: null
      }
    });
    const current = await this.findById(id, restaurantId, db);
    if (!current) {
      throw new Error("Pedido n\xE3o encontrado para confirmar o pagamento.");
    }
    if (result.count === 1 || current.paid === true) {
      return current;
    }
    if (current.status === OrderStatus.CANCELADO) {
      throw new Error("Pagamento recebido para um pedido cancelado; confirma\xE7\xE3o bloqueada.");
    }
    throw new Error("O pagamento n\xE3o p\xF4de ser confirmado no estado atual do pedido.");
  }
  async confirmPixPayment(id, restaurantId, {
    paymentProof,
    paymentProofImage
  } = {}, db = prisma_default) {
    const result = await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId,
        paid: false,
        status: { not: OrderStatus.CANCELADO }
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
    const current = await this.findById(id, restaurantId, db);
    if (!current) {
      throw new Error("Pedido n\xE3o encontrado para confirmar o pagamento PIX.");
    }
    if (result.count === 1 || current.paid === true) {
      return current;
    }
    if (current.status === OrderStatus.CANCELADO) {
      throw new Error("Pagamento PIX recebido para um pedido cancelado; confirma\xE7\xE3o bloqueada.");
    }
    throw new Error("O pagamento PIX n\xE3o p\xF4de ser confirmado no estado atual do pedido.");
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
  async findByIdForCustomer(id, customerId2, restaurantId, db = prisma_default) {
    const normalizedRestaurantId = Number(restaurantId || 0);
    return db.order.findFirst({
      where: {
        id: Number(id),
        userId: customerId2,
        ...Number.isInteger(normalizedRestaurantId) && normalizedRestaurantId > 0 ? { restaurantId: normalizedRestaurantId } : {}
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
import { z as z6 } from "zod";
import { OrderType as OrderType2, PaymentMethod as PaymentMethod2 } from "@prisma/client";
var createOrderSchema = z6.object({
  restaurantId: z6.number().int().positive().optional(),
  customerName: z6.string().trim().min(2).optional(),
  customerCpf: z6.string().trim().min(11).optional(),
  customerPhone: z6.string().trim().min(10).optional(),
  type: z6.nativeEnum(OrderType2),
  paymentMethod: z6.nativeEnum(PaymentMethod2).optional(),
  payOnDelivery: z6.boolean().optional(),
  payOnDeliveryMethod: z6.nativeEnum(PaymentMethod2).optional(),
  paid: z6.boolean().optional(),
  pixPaymentId: z6.string().trim().min(3).optional(),
  observation: z6.string().trim().optional(),
  tableId: z6.number().int().positive().optional(),
  address: z6.string().trim().optional(),
  number: z6.string().trim().optional(),
  district: z6.string().trim().optional(),
  city: z6.string().trim().optional(),
  state: z6.string().trim().optional(),
  zipCode: z6.string().trim().optional(),
  complement: z6.string().trim().optional(),
  couponRedemptionId: z6.number().int().positive().nullable().optional(),
  items: z6.array(
    z6.object({
      productId: z6.number().int().positive(),
      quantity: z6.number().int().positive(),
      observation: z6.string().trim().max(500, "A observa\xE7\xE3o do item deve ter no m\xE1ximo 500 caracteres.").optional(),
      ingredientIds: z6.array(z6.number().int().positive()).max(40).optional(),
      optionIds: z6.array(z6.number().int().positive()).max(100).optional(),
      selectedOptions: z6.array(
        z6.object({
          groupId: z6.number().int().positive(),
          optionIds: z6.array(z6.number().int().positive()).max(40)
        })
      ).max(20).optional()
    })
  ).min(1, "O pedido deve conter pelo menos um item.")
}).superRefine((data, ctx) => {
  if (data.type !== OrderType2.DELIVERY) {
    return;
  }
  const phoneDigits = String(data.customerPhone || "").replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 13) {
    ctx.addIssue({
      code: z6.ZodIssueCode.custom,
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
        code: z6.ZodIssueCode.custom,
        path: [field],
        message: `Informe ${field === "address" ? "a rua" : field === "number" ? "o n\xFAmero" : field === "district" ? "o bairro" : "a cidade"}.`
      });
    }
  });
  if (!/^\d{8}$/.test(String(data.zipCode || "").replace(/\D/g, ""))) {
    ctx.addIssue({
      code: z6.ZodIssueCode.custom,
      path: ["zipCode"],
      message: "Informe um CEP v\xE1lido com 8 n\xFAmeros."
    });
  }
  if (!/^[A-Za-z]{2}$/.test(String(data.state || "").trim())) {
    ctx.addIssue({
      code: z6.ZodIssueCode.custom,
      path: ["state"],
      message: "Informe uma UF v\xE1lida com duas letras."
    });
  }
  if (data.payOnDelivery === true) {
    if (data.type !== OrderType2.DELIVERY) {
      ctx.addIssue({
        code: z6.ZodIssueCode.custom,
        path: ["type"],
        message: "Pagar na entrega s\xF3 \xE9 permitido para pedidos de delivery."
      });
    }
    if (!data.payOnDeliveryMethod) {
      ctx.addIssue({
        code: z6.ZodIssueCode.custom,
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
            description: true,
            whatsapp: true,
            address: true,
            addressNumber: true,
            addressComplement: true,
            addressDistrict: true,
            city: true,
            state: true,
            zipCode: true
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
        description: true,
        whatsapp: true,
        address: true,
        addressNumber: true,
        addressComplement: true,
        addressDistrict: true,
        city: true,
        state: true,
        zipCode: true,
        banners: {
          where: { active: true },
          select: { id: true, title: true, image: true },
          orderBy: { id: "asc" }
        }
      }
    });
  }
  async findDefaultActiveRestaurant() {
    return prisma_default.restaurant.findFirst({
      where: { active: true },
      select: { id: true },
      orderBy: { id: "asc" }
    });
  }
  async findPublicByRestaurantId(restaurantId) {
    return prisma_default.restaurantSettings.findUnique({
      where: {
        restaurantId: Number(restaurantId)
      },
      select: {
        restaurantId: true,
        primaryColor: true,
        deliveryFee: true,
        minimumOrder: true,
        pixProvider: true,
        pixKey: true,
        instagram: true,
        facebook: true,
        companyLegalName: true,
        ownerEmail: true,
        ownerPhone: true,
        businessHours: true,
        isOpenForOrders: true,
        averageDeliveryTime: true,
        autoAcceptOrders: true,
        trackingRequiresLogin: true,
        soundNotifications: true,
        maxConcurrentOrders: true,
        restaurant: {
          select: {
            name: true,
            slug: true,
            logo: true,
            coverImage: true,
            description: true,
            address: true,
            addressNumber: true,
            addressComplement: true,
            addressDistrict: true,
            city: true,
            state: true,
            zipCode: true,
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

// src/modules/orders/utils/restaurantAvailability.ts
var RESTAURANT_CLOSED_MESSAGE = "O restaurante est\xE1 fechado no momento e n\xE3o est\xE1 recebendo pedidos.";
function assertRestaurantIsOpenForOrders(isOpenForOrders) {
  if (isOpenForOrders === false) {
    throw new Error(RESTAURANT_CLOSED_MESSAGE);
  }
}

// src/modules/billing/repositories/BillingRepository.ts
import { UserRole as UserRole5 } from "@prisma/client";
var BillingRepository = class {
  async findSubscriptionByRestaurantId(restaurantId, db = prisma_default) {
    return db.subscription.findUnique({
      where: {
        restaurantId
      },
      include: {
        restaurant: {
          select: {
            name: true,
            email: true,
            createdAt: true,
            users: {
              where: { role: UserRole5.ADMIN },
              orderBy: { createdAt: "asc" },
              take: 1,
              select: { id: true, name: true, email: true, createdAt: true }
            }
          }
        }
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
        status: {
          in: ["PENDENTE", "ATRASADO"]
        }
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
      },
      include: {
        restaurant: { select: { name: true, email: true } }
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
    monthlyFee: 149.9,
    trialDays: 30,
    availableForSale: true,
    features: ["Sistema de delivery", "Suporte padr\xE3o"]
  },
  [PlanType.PREMIUM]: {
    name: "Premium",
    monthlyFee: 249.9,
    trialDays: 30,
    availableForSale: true,
    features: [
      "Sistema de delivery",
      "Card\xE1pio digital com QR Code de mesa",
      "Suporte priorit\xE1rio"
    ]
  }
};
var AVAILABLE_PLAN_TYPES = [PlanType.BASICO, PlanType.PREMIUM];
function isAvailablePlan(plan) {
  return AVAILABLE_PLAN_TYPES.some((availablePlan) => availablePlan === plan);
}

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

// src/modules/orders/utils/productIngredients.ts
function money(value) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error("O produto possui um valor de op\xE7\xE3o inv\xE1lido.");
  }
  return Math.round((normalized + Number.EPSILON) * 100) / 100;
}
function uniquePositiveIds(values, field) {
  const ids = (values || []).map(Number);
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error(`${field} cont\xE9m uma op\xE7\xE3o inv\xE1lida.`);
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${field} cont\xE9m op\xE7\xF5es repetidas.`);
  }
  return ids;
}
function resolveExplicitOptionIds(product, selection) {
  const flatIds = uniquePositiveIds(selection.optionIds, "A montagem");
  const structured = selection.selectedOptions;
  if (!structured?.length) {
    return flatIds;
  }
  const seenGroups = /* @__PURE__ */ new Set();
  const structuredIds = [];
  structured.forEach((selectedGroup) => {
    const groupId = Number(selectedGroup.groupId);
    if (!Number.isInteger(groupId) || groupId <= 0) {
      throw new Error("A montagem cont\xE9m um grupo inv\xE1lido.");
    }
    if (seenGroups.has(groupId)) {
      throw new Error("A montagem cont\xE9m o mesmo grupo mais de uma vez.");
    }
    seenGroups.add(groupId);
    const group = (product.optionGroups || []).find((candidate) => candidate.id === groupId);
    if (!group || !group.active || group.restaurantId !== product.restaurantId) {
      throw new Error(`Grupo de op\xE7\xF5es inv\xE1lido para ${product.name}.`);
    }
    const ids = uniquePositiveIds(selectedGroup.optionIds, `O grupo ${group.name}`);
    if (ids.some((id) => !group.options.some((option) => option.id === id))) {
      throw new Error(`Uma op\xE7\xE3o n\xE3o pertence ao grupo ${group.name}.`);
    }
    structuredIds.push(...ids);
  });
  if (flatIds.length) {
    const flatSignature = [...flatIds].sort((a, b) => a - b).join(",");
    const structuredSignature = [...structuredIds].sort((a, b) => a - b).join(",");
    if (flatSignature !== structuredSignature) {
      throw new Error("Os campos optionIds e selectedOptions informam montagens diferentes.");
    }
  }
  return uniquePositiveIds(structuredIds, "A montagem");
}
function resolveLegacyIds(product, ingredientIds) {
  return ingredientIds.map((ingredientId) => {
    const matches = (product.optionGroups || []).flatMap(
      (group) => group.options.filter((option) => option.ingredientId === ingredientId)
    );
    if (matches.length !== 1) {
      throw new Error(`Ingrediente legado inv\xE1lido ou amb\xEDguo para ${product.name}.`);
    }
    return matches[0].id;
  });
}
function resolveOrderItemCustomizations(product, selection = {}) {
  const activeGroups = (product.optionGroups || []).filter((group) => group.active);
  if (!activeGroups.length) {
    return resolveLegacyProductIngredients(
      product,
      selection.ingredientIds?.length ? selection.ingredientIds : selection.optionIds
    );
  }
  activeGroups.forEach((group) => {
    if (group.restaurantId !== product.restaurantId) {
      throw new Error(`A configura\xE7\xE3o de ${product.name} pertence a outro restaurante.`);
    }
  });
  const legacyIds = uniquePositiveIds(selection.ingredientIds, "A montagem antiga");
  let selectedIds = resolveExplicitOptionIds(product, selection);
  if (!selectedIds.length && legacyIds.length) {
    selectedIds = resolveLegacyIds(product, legacyIds);
  }
  const allActiveOptions = activeGroups.flatMap(
    (group) => group.options.filter(
      (option) => option.active && option.ingredient.active && option.ingredient.restaurantId === product.restaurantId
    )
  );
  const allActiveOptionIds = new Set(allActiveOptions.map((option) => option.id));
  if (selectedIds.some((id) => !allActiveOptionIds.has(id))) {
    throw new Error(`Uma op\xE7\xE3o selecionada est\xE1 indispon\xEDvel para ${product.name}.`);
  }
  const customizations = activeGroups.map((group) => {
    const availableOptions = group.options.filter(
      (option) => option.active && option.ingredient.active && option.ingredient.restaurantId === product.restaurantId
    );
    const selected = availableOptions.filter((option) => selectedIds.includes(option.id));
    const minimum = group.required ? Math.max(1, group.minSelections) : group.minSelections;
    const maximum = group.selectionType === "SINGLE" ? 1 : group.maxSelections;
    if (availableOptions.length < minimum) {
      throw new Error(`O grupo ${group.name} est\xE1 sem op\xE7\xF5es suficientes. Avise o restaurante.`);
    }
    if (selected.length < minimum) {
      throw new Error(
        `Escolha pelo menos ${minimum} ${minimum === 1 ? "op\xE7\xE3o" : "op\xE7\xF5es"} em ${group.name}.`
      );
    }
    if (selected.length > maximum) {
      throw new Error(
        `Escolha no m\xE1ximo ${maximum} ${maximum === 1 ? "op\xE7\xE3o" : "op\xE7\xF5es"} em ${group.name}.`
      );
    }
    return {
      groupId: group.id,
      groupName: group.name,
      selectionType: group.selectionType,
      minSelections: minimum,
      maxSelections: maximum,
      options: selected.map((option) => ({
        optionId: option.id,
        ingredientId: option.ingredient.id,
        name: option.ingredient.name,
        price: money(option.ingredient.price)
      }))
    };
  });
  const selectedOptions = customizations.flatMap((group) => group.options);
  const additionalPrice = selectedOptions.reduce((total, option) => total + option.price, 0);
  const price = money(money(product.price) + additionalPrice);
  return {
    price,
    ingredients: selectedOptions.map((option) => ({
      id: option.ingredientId,
      name: option.name,
      price: option.price
    })),
    customizations
  };
}
function buildOrderItemCustomizationSnapshot(product, item) {
  const resolved = resolveOrderItemCustomizations(product, item);
  const basePricing = resolveProductBasePricing(product);
  const originalUnitPrice = roundMoney(resolved.price);
  const unitDiscount = roundMoney(basePricing.discountAmount);
  const effectiveUnitPrice = roundMoney(Math.max(originalUnitPrice - unitDiscount, 0));
  const quantity = Number(item.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`Quantidade inv\xE1lida para ${product.name}.`);
  }
  const observation = String(item.observation || "").trim();
  return {
    productId: product.id,
    quantity,
    price: effectiveUnitPrice,
    originalUnitPrice,
    unitDiscount,
    observation: observation || null,
    ingredients: resolved.ingredients,
    customizations: resolved.customizations
  };
}
function resolveLegacyProductIngredients(product, ingredientIds = []) {
  const selectedIds = uniquePositiveIds(ingredientIds, "A montagem");
  const available = product.ingredients.filter((ingredient) => ingredient.active);
  if (!available.length) {
    throw new Error(`${product.name} ainda n\xE3o possui op\xE7\xF5es de montagem configuradas.`);
  }
  const selected = selectedIds.map((id) => available.find((ingredient) => ingredient.id === id));
  if (selected.some((ingredient) => !ingredient)) {
    throw new Error(`Ingrediente inv\xE1lido para ${product.name}.`);
  }
  const requiredIds = available.filter((ingredient) => ingredient.required).map((ingredient) => ingredient.id);
  if (requiredIds.some((id) => !selectedIds.includes(id))) {
    throw new Error(`Selecione os ingredientes obrigat\xF3rios de ${product.name}.`);
  }
  const ingredients = selected.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    price: money(ingredient.price)
  }));
  return {
    price: money(money(product.price) + ingredients.reduce((sum, item) => sum + item.price, 0)),
    ingredients,
    customizations: []
  };
}

// src/modules/orders/services/couponRedemptionLifecycle.ts
import { CouponRedemptionStatus } from "@prisma/client";
async function reserveCouponRedemption({
  redemptionId,
  restaurantId,
  userId,
  db,
  now = /* @__PURE__ */ new Date()
}) {
  if (!redemptionId) return;
  const result = await db.couponRedemption.updateMany({
    where: {
      id: redemptionId,
      restaurantId,
      userId,
      status: CouponRedemptionStatus.CLAIMED,
      expiresAt: { gt: now }
    },
    data: {
      status: CouponRedemptionStatus.RESERVED,
      reservedAt: /* @__PURE__ */ new Date(),
      usedAt: null
    }
  });
  if (result.count !== 1) {
    const expired = await db.couponRedemption.updateMany({
      where: {
        id: redemptionId,
        restaurantId,
        userId,
        status: CouponRedemptionStatus.CLAIMED,
        expiresAt: { lte: now }
      },
      data: { status: CouponRedemptionStatus.EXPIRED }
    });
    if (expired.count === 1) {
      throw new Error("Este cupom expirou e n\xE3o pode mais ser utilizado.");
    }
    throw new Error("Este cupom j\xE1 foi reservado ou utilizado em outro pedido.");
  }
}
async function markCouponRedemptionUsedForOrder(orderId, restaurantId, db = prisma_default) {
  const order = await db.order.findFirst({
    where: { id: Number(orderId), restaurantId },
    select: { couponRedemptionId: true }
  });
  if (!order?.couponRedemptionId) return;
  const result = await db.couponRedemption.updateMany({
    where: {
      id: order.couponRedemptionId,
      restaurantId,
      status: CouponRedemptionStatus.RESERVED
    },
    data: { status: CouponRedemptionStatus.USED, usedAt: /* @__PURE__ */ new Date() }
  });
  if (result.count === 1) return;
  const current = await db.couponRedemption.findFirst({
    where: { id: order.couponRedemptionId, restaurantId },
    select: { status: true }
  });
  if (current?.status !== CouponRedemptionStatus.USED) {
    throw new Error("N\xE3o foi poss\xEDvel registrar o uso da recompensa deste pedido.");
  }
}
async function releaseCouponRedemptionForOrder(orderId, restaurantId, db = prisma_default, { now = /* @__PURE__ */ new Date() } = {}) {
  const order = await db.order.findFirst({
    where: { id: Number(orderId), restaurantId },
    select: { couponRedemptionId: true }
  });
  if (!order?.couponRedemptionId) return;
  const result = await db.couponRedemption.updateMany({
    where: {
      id: order.couponRedemptionId,
      restaurantId,
      status: CouponRedemptionStatus.RESERVED,
      expiresAt: { gt: now }
    },
    data: {
      status: CouponRedemptionStatus.CLAIMED,
      reservedAt: null,
      usedAt: null
    }
  });
  if (result.count !== 1) {
    const expired = await db.couponRedemption.updateMany({
      where: {
        id: order.couponRedemptionId,
        restaurantId,
        status: CouponRedemptionStatus.RESERVED,
        expiresAt: { lte: now }
      },
      data: {
        status: CouponRedemptionStatus.EXPIRED,
        reservedAt: null,
        usedAt: null
      }
    });
    if (expired.count === 1) {
      await db.order.updateMany({
        where: { id: Number(orderId), restaurantId },
        data: { couponRedemptionId: null }
      });
      return;
    }
    const current = await db.couponRedemption.findFirst({
      where: { id: order.couponRedemptionId, restaurantId },
      select: { status: true }
    });
    if (current?.status === CouponRedemptionStatus.USED) {
      return;
    }
    if (current?.status !== CouponRedemptionStatus.CLAIMED && current?.status !== CouponRedemptionStatus.EXPIRED) {
      throw new Error("N\xE3o foi poss\xEDvel liberar a recompensa deste pedido.");
    }
  }
  await db.order.updateMany({
    where: { id: Number(orderId), restaurantId },
    data: { couponRedemptionId: null }
  });
}

// src/modules/orders/services/restoreOrderItemsStock.ts
async function restoreOrderItemsStock(tx, order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const quantityByProduct = /* @__PURE__ */ new Map();
  for (const item of items) {
    const productId = Number(item?.productId || 0);
    const quantity = Number(item?.quantity || 0);
    if (!Number.isInteger(productId) || productId <= 0) {
      continue;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      continue;
    }
    quantityByProduct.set(productId, (quantityByProduct.get(productId) || 0) + quantity);
  }
  for (const [productId, quantity] of quantityByProduct) {
    await tx.product.updateMany({
      where: {
        id: productId,
        restaurantId: Number(order.restaurantId),
        stock: { gte: 0 }
      },
      data: {
        stock: { increment: quantity },
        active: true
      }
    });
  }
}

// src/modules/orders/services/OrderPixPaymentService.ts
var APPROVED_PAYMENT_STATUSES = /* @__PURE__ */ new Set(["approved", "accredited", "paid"]);
var APPROVED_ASAAS_PAYMENT_STATUSES = /* @__PURE__ */ new Set(["received", "confirmed", "received_in_cash"]);
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
    return String(process.env.PAGBANK_API_BASE_URL || "https://api.pagseguro.com").trim().replace(/\/+$/, "");
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
    const fallbackTransactionId = normalizeTxid(`${provider}${restaurantId}${createdAtTimestamp}`);
    const transactionId = normalizeTxid(transactionIdFromId || fallbackTransactionId);
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
    const settings = Number.isInteger(normalizedRestaurantId) && normalizedRestaurantId > 0 ? await RestaurantSettingsRepository_default.findByRestaurantId(normalizedRestaurantId) : null;
    const settingsToken = String(settings?.mercadoPagoAccessToken || "").trim();
    const globalToken = String(process.env.MP_ACCESS_TOKEN || "").trim();
    const accessToken = settingsToken || (allowGlobalFallback ? globalToken : "");
    if (!accessToken) {
      throw new Error(
        "Pagamento PIX indisponivel no momento. Configure access token Mercado Pago nas configuracoes do restaurante."
      );
    }
    const client = new MercadoPagoConfig({ accessToken });
    return new Payment(client);
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
      items.map((item) => ProductRepository_default.findById(item.productId, restaurantId))
    );
    products.forEach((product, index) => {
      if (!product) {
        throw new Error(`Produto n\xE3o encontrado: ${items[index].productId}`);
      }
    });
    return items.reduce((acc, item, index) => {
      const product = products[index];
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`Quantidade inv\xE1lida para ${product.name}.`);
      }
      const snapshot = buildOrderItemCustomizationSnapshot(product, item);
      return acc + Number(snapshot.price) * quantity;
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
    userEmail,
    orderId: sourceOrderId,
    orderTotal,
    orderSubtotal,
    orderDeliveryFee
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
        throw new Error("Informe o endereco completo para pedidos de delivery.");
      }
    }
    const settings = await RestaurantSettingsRepository_default.findPublicByRestaurantId(normalizedRestaurantId);
    assertRestaurantIsOpenForOrders(settings?.isOpenForOrders);
    void pixProvider;
    const resolvedPixProvider = this.normalizePixProvider(settings?.pixProvider);
    const pixKey = String(settings?.pixKey || "").trim();
    if (!pixKey) {
      throw new Error("Chave PIX n\xE3o configurada para este restaurante.");
    }
    const minimumOrder = Number(settings?.minimumOrder || 0);
    const deliveryFee = Number(settings?.deliveryFee || 0);
    const persistedTotal = Number(orderTotal);
    const hasPersistedTotal = Number.isFinite(persistedTotal) && persistedTotal >= 0;
    const persistedSubtotal = Number(orderSubtotal);
    const persistedDeliveryFee = Number(orderDeliveryFee);
    const subtotal = hasPersistedTotal ? Number.isFinite(persistedSubtotal) && persistedSubtotal >= 0 ? persistedSubtotal : Math.max(
      persistedTotal - (Number.isFinite(persistedDeliveryFee) ? persistedDeliveryFee : normalizedType === "DELIVERY" ? Math.max(deliveryFee, 0) : 0),
      0
    ) : await this.calculateOrderSubtotal({
      restaurantId: normalizedRestaurantId,
      items
    });
    if (!hasPersistedTotal && normalizedType === "DELIVERY" && minimumOrder > 0 && subtotal < minimumOrder) {
      throw new Error(
        `Pedido m\xEDnimo sobre o subtotal para delivery: R$ ${minimumOrder.toFixed(2)}. A taxa de entrega \xE9 cobrada \xE0 parte.`
      );
    }
    const additionalFee = hasPersistedTotal ? Math.max(Number.isFinite(persistedDeliveryFee) ? persistedDeliveryFee : 0, 0) : normalizedType === "DELIVERY" ? Math.max(deliveryFee, 0) : 0;
    const systemFee = await SplitService_default.execute({
      restaurantId: normalizedRestaurantId,
      orderTotal: subtotal
    });
    const totalAmount = Number(
      (hasPersistedTotal ? persistedTotal : subtotal + additionalFee).toFixed(2)
    );
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
            reference_id: sourceOrderId ? `orderpix:${normalizedRestaurantId}:${sourceOrderId}` : `orderpix:${normalizedRestaurantId}:${Date.now()}`,
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
            qr_codes: [{ amount: { value: Math.round(totalAmount * 100) } }],
            ...notificationUrl ? { notification_urls: [notificationUrl] } : {}
          })
        }
      );
      const providerError = String(result.body?.error_messages?.[0]?.description || "").trim();
      const orderId = String(result.body?.id || "").trim();
      const qrCode2 = String(result.body?.qr_codes?.[0]?.text || "").trim();
      if (!result.ok || !orderId || !qrCode2) {
        throw new Error(providerError || "N\xE3o foi poss\xEDvel gerar o Pix no PagBank.");
      }
      const base64Url = String(
        result.body?.qr_codes?.[0]?.links?.find((link) => link.rel === "QRCODE.BASE64")?.href || ""
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
      const accessToken = await this.getAsaasAccessToken(normalizedRestaurantId);
      const asaasBaseUrl = this.getAsaasBaseUrl();
      const privateSettings = await RestaurantSettingsRepository_default.findByRestaurantId(normalizedRestaurantId);
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
      const customerId2 = String(customerResult.responseBody.id || "").trim();
      const walletId = String(privateSettings?.gatewayMerchantId || "").trim();
      const platformWalletId = String(process.env.ASAAS_PLATFORM_WALLET_ID || "").trim();
      const buildAsaasPaymentBody = (includeSplit) => ({
        customer: customerId2,
        billingType: "PIX",
        value: totalAmount,
        dueDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        description: `Pedido delivery restaurante ${normalizedRestaurantId}`,
        externalReference: sourceOrderId ? `orderpix:${normalizedRestaurantId}:${sourceOrderId}` : `orderpix:${normalizedRestaurantId}:${Date.now()}`,
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
        this.getAsaasError(paymentResult.responseBody, "Erro ao criar pagamento PIX no Asaas.")
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
      const asaasPaymentId = String(paymentResult.responseBody?.id || "").trim();
      if (!asaasPaymentId) {
        throw new Error("Asaas nao retornou id do pagamento PIX.");
      }
      const qrResult = await this.fetchAsaasJson(
        `${asaasBaseUrl}/v3/payments/${encodeURIComponent(asaasPaymentId)}/pixQrCode`,
        accessToken
      );
      if (!qrResult.ok) {
        throw new Error(
          this.getAsaasError(qrResult.responseBody, "Nao foi possivel gerar QR Code PIX no Asaas.")
        );
      }
      const qrCode2 = String(qrResult.responseBody?.payload || "").trim();
      const qrCodeBase642 = String(qrResult.responseBody?.encodedImage || "").trim();
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
    const paymentApi = await this.getMercadoPagoPaymentApi(normalizedRestaurantId);
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
      external_reference: sourceOrderId ? `orderpix:${normalizedRestaurantId}:${sourceOrderId}` : `orderpix:${normalizedRestaurantId}:${Date.now()}`
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
        throw new Error("Restaurante inv\xE1lido para consulta de pagamento PIX Asaas.");
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
      const status2 = this.normalizeAsaasStatus(statusResult.responseBody?.status);
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
    const metadataRestaurantId = String(paymentData?.metadata?.restaurant_id || "").trim();
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
  async ensurePaymentApproved({ paymentId, restaurantId }) {
    const statusResult = await this.getPaymentStatus({
      paymentId,
      restaurantId
    });
    if (!statusResult.sameRestaurant) {
      throw new Error("Este pagamento PIX n\xE3o pertence ao restaurante do pedido.");
    }
    if (!statusResult.isApproved) {
      throw new Error("Pagamento PIX ainda n\xE3o foi aprovado.");
    }
    return statusResult;
  }
  async attachPaymentToOrder({
    orderId,
    restaurantId,
    paymentId
  }) {
    const normalizedPaymentId = String(paymentId || "").trim();
    if (!normalizedPaymentId) {
      throw new Error("O provedor n\xE3o retornou um identificador de pagamento PIX.");
    }
    const result = await prisma_default.order.updateMany({
      where: { id: Number(orderId), restaurantId, paid: false },
      data: { pixPaymentId: normalizedPaymentId }
    });
    if (result.count !== 1) {
      throw new Error("N\xE3o foi poss\xEDvel vincular o pagamento PIX ao pedido.");
    }
  }
  async removePendingOrderAfterPaymentFailure({
    orderId,
    restaurantId
  }) {
    await prisma_default.$transaction(async (tx) => {
      const pendingOrder = await OrderRepository_default.findById(orderId, restaurantId, tx);
      if (pendingOrder) {
        await restoreOrderItemsStock(tx, pendingOrder);
      }
      await releaseCouponRedemptionForOrder(orderId, restaurantId, tx);
      await OrderRepository_default.deleteById(orderId, restaurantId, tx);
    });
  }
};
var OrderPixPaymentService_default = new OrderPixPaymentService();

// src/modules/orders/services/CreateOrderService.ts
import { PaymentMethod as PaymentMethod3, TableSessionStatus as TableSessionStatus2, OrderType as OrderType4, OrderStatus as OrderStatus2 } from "@prisma/client";

// src/services/customerNotifier.ts
var configuredProvider = String(process.env.CUSTOMER_NOTIFICATION_PROVIDER || "none").trim().toLowerCase();
var whatsappWebhookUrl = String(process.env.WHATSAPP_WEBHOOK_URL || "").trim();
var whatsappWebhookToken = String(process.env.WHATSAPP_WEBHOOK_TOKEN || "").trim();
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
    console.error("[CUSTOMER_STATUS_NOTIFICATION_ERROR]", getErrorMessage(error2));
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
    console.error("[RESTAURANT_PIN_NOTIFICATION_ERROR]", getErrorMessage(error2));
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
    console.error("[RESTAURANT_ORDER_ISSUE_NOTIFICATION_ERROR]", getErrorMessage(error2));
    return {
      sent: false,
      reason: "send_failed",
      provider,
      error: getErrorMessage(error2)
    };
  }
}

// src/modules/orders/utils/orderCapacity.ts
function assertOrderCapacity(activeOrders, configuredLimit) {
  const limit = Math.min(500, Math.max(1, Number(configuredLimit) || 20));
  if (activeOrders >= limit) {
    throw new Error(
      "O restaurante atingiu o limite de pedidos em andamento. Tente novamente em alguns minutos."
    );
  }
  return limit;
}

// src/modules/orders/utils/orderTenant.ts
function positiveInteger(value) {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
}
function resolveOrderRestaurantId({
  requestedRestaurantId,
  contextRestaurantId
}) {
  const requested = positiveInteger(requestedRestaurantId);
  const context = positiveInteger(contextRestaurantId);
  if (context) {
    if (requested && requested !== context) {
      throw new Error("O restaurante informado n\xE3o corresponde \xE0 sess\xE3o atual.");
    }
    return context;
  }
  if (requested) {
    return requested;
  }
  throw new Error("Restaurante n\xE3o informado para o pedido.");
}

// src/modules/orders/services/OrderPricingService.ts
import { CouponRedemptionStatus as CouponRedemptionStatus2, OrderType as OrderType3 } from "@prisma/client";
var OrderPricingService = class {
  async quote({
    restaurantId,
    userId,
    type,
    items,
    couponRedemptionId,
    now = /* @__PURE__ */ new Date(),
    db = prisma_default
  }) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error("Restaurante inv\xE1lido para calcular o pedido.");
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("O pedido deve conter pelo menos um item.");
    }
    const products = await Promise.all(
      items.map(
        (item) => ProductRepository_default.findById(Number(item.productId), normalizedRestaurantId, db)
      )
    );
    const requestedQuantityByProduct = /* @__PURE__ */ new Map();
    products.forEach((product, index) => {
      const item = items[index];
      if (!product) {
        throw new Error(`Produto n\xE3o encontrado: ${Number(item.productId || 0)}`);
      }
      if (product.active === false) {
        throw new Error(`Produto indispon\xEDvel: ${product.name}`);
      }
      const quantity = Number(item.quantity || 0);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`Quantidade inv\xE1lida para ${product.name}.`);
      }
      requestedQuantityByProduct.set(
        product.id,
        (requestedQuantityByProduct.get(product.id) || 0) + quantity
      );
    });
    requestedQuantityByProduct.forEach((requestedQuantity, productId) => {
      const product = products.find((candidate) => candidate?.id === productId);
      const stock = product.stock === null || product.stock === void 0 ? null : Number(product.stock);
      if (Number.isInteger(stock) && stock >= 0 && requestedQuantity > stock) {
        throw new Error(`Estoque insuficiente para ${product.name}. Dispon\xEDvel: ${stock}.`);
      }
    });
    const orderItems = items.map(
      (item, index) => buildOrderItemCustomizationSnapshot(products[index], item)
    );
    const itemsSubtotal = roundMoney(
      orderItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
    );
    const productDiscountTotal = roundMoney(
      orderItems.reduce((sum, item) => sum + Number(item.unitDiscount) * item.quantity, 0)
    );
    const settings = await db.restaurantSettings.findUnique({
      where: { restaurantId: normalizedRestaurantId },
      select: { deliveryFee: true, minimumOrder: true }
    });
    const normalizedType = String(type || "").toUpperCase();
    const deliveryFeeAmount = normalizedType === OrderType3.DELIVERY ? roundMoney(Math.max(Number(settings?.deliveryFee || 0), 0)) : 0;
    const minimumOrder = Math.max(Number(settings?.minimumOrder || 0), 0);
    if (normalizedType === OrderType3.DELIVERY && minimumOrder > 0 && itemsSubtotal < minimumOrder) {
      throw new Error(
        `Pedido m\xEDnimo ap\xF3s as ofertas: R$ ${minimumOrder.toFixed(2)}. A taxa de entrega \xE9 cobrada \xE0 parte.`
      );
    }
    let couponDiscount = 0;
    let couponCode = null;
    let couponId = null;
    let redemptionId = null;
    const requestedRedemptionId = Number(couponRedemptionId || 0);
    if (requestedRedemptionId > 0) {
      const normalizedUserId = Number(userId || 0);
      if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
        throw new Error("Entre na sua conta para usar uma recompensa de fidelidade.");
      }
      const redemption = await db.couponRedemption.findFirst({
        where: {
          id: requestedRedemptionId,
          restaurantId: normalizedRestaurantId,
          userId: normalizedUserId,
          status: CouponRedemptionStatus2.CLAIMED,
          expiresAt: { gt: now }
        },
        include: { coupon: true }
      });
      if (!redemption || redemption.coupon.restaurantId !== normalizedRestaurantId) {
        throw new Error("Cupom resgatado inv\xE1lido ou indispon\xEDvel.");
      }
      const coupon = redemption.coupon;
      if (!coupon.active || coupon.expiration && coupon.expiration <= now) {
        throw new Error("Este cupom expirou ou foi desativado.");
      }
      if (itemsSubtotal < Number(coupon.minimumSubtotal || 0)) {
        throw new Error(
          `Este cupom exige subtotal m\xEDnimo de R$ ${Number(coupon.minimumSubtotal).toFixed(2)}.`
        );
      }
      const configuredDiscount = Number(coupon.discount || 0);
      const rawDiscount = coupon.discountType === "PERCENTAGE" ? itemsSubtotal * (Math.min(configuredDiscount, 100) / 100) : configuredDiscount;
      const limitedDiscount = coupon.maxDiscount ? Math.min(rawDiscount, Number(coupon.maxDiscount)) : rawDiscount;
      const maximumCouponDiscount = Math.max(itemsSubtotal - 0.01, 0);
      couponDiscount = roundMoney(
        Math.min(Math.max(limitedDiscount, 0), maximumCouponDiscount)
      );
      if (couponDiscount <= 0) {
        throw new Error(
          "Este cupom n\xE3o gera desconto neste pedido. Escolha outro benef\xEDcio ou aumente o subtotal."
        );
      }
      couponCode = coupon.code;
      couponId = coupon.id;
      redemptionId = redemption.id;
    } else if (couponRedemptionId !== null && couponRedemptionId !== void 0 && couponRedemptionId !== "") {
      throw new Error("Cupom resgatado inv\xE1lido.");
    }
    const total = roundMoney(Math.max(itemsSubtotal - couponDiscount + deliveryFeeAmount, 0));
    return {
      itemsSubtotal,
      productDiscountTotal,
      couponDiscount,
      deliveryFeeAmount,
      total,
      couponCode,
      couponId,
      couponRedemptionId: redemptionId,
      orderItems,
      products
    };
  }
};
var OrderPricingService_default = new OrderPricingService();

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
          throw new Error("O pagamento PIX informado nao pertence a este restaurante.");
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
    couponRedemptionId,
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
    const resolvedRestaurantId = resolveOrderRestaurantId({
      requestedRestaurantId: restaurantId,
      contextRestaurantId: userRestaurantId
    });
    if (paid === true) {
      throw new Error(
        "O pagamento s\xF3 pode ser confirmado pelo provedor ou pelo fluxo administrativo seguro."
      );
    }
    if (String(pixPaymentId || "").trim()) {
      throw new Error("O identificador PIX s\xF3 pode ser vinculado pelo provedor de pagamento.");
    }
    const restaurantSettings = await RestaurantSettingsRepository_default.findByRestaurantId(resolvedRestaurantId);
    assertRestaurantIsOpenForOrders(restaurantSettings?.isOpenForOrders);
    const shouldPayOnDelivery = payOnDelivery === true;
    const effectivePaymentMethod = shouldPayOnDelivery ? payOnDeliveryMethod || paymentMethod : paymentMethod;
    if (shouldPayOnDelivery && type !== OrderType4.DELIVERY) {
      throw new Error("Pagar na entrega s\xF3 \xE9 permitido para pedidos de delivery.");
    }
    if (shouldPayOnDelivery && !effectivePaymentMethod) {
      throw new Error("Informe o m\xE9todo de pagamento para pedidos com pagar na entrega.");
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
      couponRedemptionId,
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
    const { normalizedPaymentMethod, normalizedPixPaymentId, shouldMarkAsPaid, paidAt } = await this.resolvePaymentState({
      paymentMethod: effectivePaymentMethod,
      paid: shouldPayOnDelivery ? false : paid,
      pixPaymentId,
      restaurantId: resolvedRestaurantId
    });
    const activeOrders = await OrderRepository_default.countActiveOperationalOrders(resolvedRestaurantId);
    assertOrderCapacity(activeOrders, restaurantSettings?.maxConcurrentOrders);
    const initialStatus = restaurantSettings?.autoAcceptOrders ? OrderStatus2.PREPARANDO : OrderStatus2.PENDENTE;
    if (type === "MESA") {
      if (!tableSessionId) {
        throw new Error("Sess\xE3o da mesa n\xE3o informada. Valide o PIN da mesa para continuar.");
      }
      const session = await TableSessionRepository_default.findById(tableSessionId);
      if (!session || session.status !== TableSessionStatus2.OPEN) {
        throw new Error("Essa mesa est\xE1 fechada. Gere um novo PIN com a equipe para continuar.");
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
        throw new Error("Informe o endere\xE7o completo para pedidos de delivery.");
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
        const normalizedExistingPhone = this.normalizePhone(existingUser?.phone);
        if (!normalizedExistingPhone) {
          throw new Error("Informe um celular/WhatsApp v\xE1lido para pedidos de delivery.");
        }
      }
      if (!normalizedCustomerPhone && !userId) {
        throw new Error("Informe um celular/WhatsApp v\xE1lido para pedidos de delivery.");
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
      const pricing = await OrderPricingService_default.quote({
        restaurantId: resolvedRestaurantId,
        userId: resolvedUserId,
        type,
        items,
        couponRedemptionId,
        db: tx
      });
      const { products, orderItems } = pricing;
      const formattedCpf = this.formatCpf(customerCpf);
      const guestSummary = !userId && customerName ? `Cliente: ${String(customerName).trim()}${formattedCpf ? ` | CPF: ${formattedCpf}` : ""}` : "";
      const mergedObservation = [guestSummary, observation].map((item) => String(item || "").trim()).filter(Boolean).join(" | ");
      const normalizedTableId = tableId === null || tableId === void 0 || tableId === "" ? null : Number(tableId);
      const order = await OrderRepository_default.create(
        {
          total: pricing.total,
          itemsSubtotal: pricing.itemsSubtotal,
          productDiscountTotal: pricing.productDiscountTotal,
          couponDiscount: pricing.couponDiscount,
          deliveryFeeAmount: pricing.deliveryFeeAmount,
          couponId: pricing.couponId,
          couponRedemptionId: pricing.couponRedemptionId,
          couponCode: pricing.couponCode,
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
          complement,
          status: initialStatus,
          preparationStartedAt: initialStatus === OrderStatus2.PREPARANDO ? /* @__PURE__ */ new Date() : null
        },
        tx
      );
      await reserveCouponRedemption({
        redemptionId: pricing.couponRedemptionId,
        restaurantId: resolvedRestaurantId,
        userId: resolvedUserId,
        db: tx
      });
      if (shouldMarkAsPaid) {
        await markCouponRedemptionUsedForOrder(order.id, resolvedRestaurantId, tx);
      }
      await tx.orderItem.createMany({
        data: orderItems.map((item) => ({
          ...item,
          orderId: order.id
        }))
      });
      const requestedQuantityByProduct = /* @__PURE__ */ new Map();
      orderItems.forEach((item) => {
        requestedQuantityByProduct.set(
          item.productId,
          (requestedQuantityByProduct.get(item.productId) || 0) + Number(item.quantity)
        );
      });
      for (const [productId, requestedQuantity] of requestedQuantityByProduct) {
        const product = products.find((candidate) => candidate.id === productId);
        const stockValue = product.stock === null || product.stock === void 0 ? null : Number(product.stock);
        if (!Number.isInteger(stockValue) || stockValue < 0) {
          continue;
        }
        const decremented = await tx.product.updateMany({
          where: {
            id: productId,
            restaurantId: resolvedRestaurantId,
            stock: { gte: requestedQuantity }
          },
          data: {
            stock: { decrement: requestedQuantity }
          }
        });
        if (decremented.count !== 1) {
          throw new Error(`Estoque de ${product.name} mudou. Confira a quantidade e tente novamente.`);
        }
        await tx.product.updateMany({
          where: { id: productId, restaurantId: resolvedRestaurantId, stock: 0 },
          data: { active: false }
        });
      }
      return OrderRepository_default.findById(order.id, resolvedRestaurantId, tx);
    });
    const isUnpaidDelivery = type === OrderType4.DELIVERY && shouldPayOnDelivery !== true && shouldMarkAsPaid !== true;
    const isUnpaidDigitalPayment = shouldMarkAsPaid !== true && shouldPayOnDelivery !== true && (normalizedPaymentMethod === PaymentMethod3.PIX || normalizedPaymentMethod === PaymentMethod3.CARTAO);
    const shouldDeferRealtimeUntilPaid = deferRealtimeUntilPaid === true || isUnpaidDelivery || isUnpaidDigitalPayment;
    if (!shouldDeferRealtimeUntilPaid) {
      io.to(`restaurant:${createdOrder.restaurantId}`).emit("new-order", createdOrder);
      io.to(`user:${createdOrder.userId}`).emit("new-order", createdOrder);
    }
    if (shouldMarkAsPaid) {
      io.to(`restaurant:${createdOrder.restaurantId}`).emit("order:payment-confirmed", {
        orderId: createdOrder.id,
        paymentMethod: normalizedPaymentMethod,
        paid: true,
        status: createdOrder.status
      });
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
        observation,
        customerName,
        customerCpf,
        customerPhone,
        tableId,
        couponRedemptionId,
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
        throw new Error("Pagamento em dinheiro \xE9 registrado somente pelo administrador.");
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
        observation,
        customerName,
        customerCpf,
        customerPhone,
        tableId,
        couponRedemptionId,
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
import { OrderStatus as OrderStatus3 } from "@prisma/client";
var transitions = {
  [OrderStatus3.PENDENTE]: [OrderStatus3.PREPARANDO, OrderStatus3.CANCELADO],
  [OrderStatus3.PREPARANDO]: [OrderStatus3.PRONTO],
  [OrderStatus3.PRONTO]: [OrderStatus3.SAIU_PARA_ENTREGA, OrderStatus3.ENTREGUE],
  [OrderStatus3.SAIU_PARA_ENTREGA]: [OrderStatus3.ENTREGUE],
  [OrderStatus3.ENTREGUE]: [],
  [OrderStatus3.CANCELADO]: []
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
import { OrderStatus as OrderStatus4, UserRole as UserRole6 } from "@prisma/client";
var permissions = {
  [UserRole6.ADMIN]: [
    OrderStatus4.PENDENTE,
    OrderStatus4.PREPARANDO,
    OrderStatus4.PRONTO,
    OrderStatus4.SAIU_PARA_ENTREGA,
    OrderStatus4.ENTREGUE,
    OrderStatus4.CANCELADO
  ],
  [UserRole6.FUNCIONARIO]: [
    OrderStatus4.PREPARANDO,
    OrderStatus4.PRONTO,
    OrderStatus4.SAIU_PARA_ENTREGA,
    OrderStatus4.ENTREGUE
  ],
  [UserRole6.MOTOQUEIRO]: [OrderStatus4.ENTREGUE],
  [UserRole6.CLIENTE]: [OrderStatus4.CANCELADO]
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
import { OrderStatus as OrderStatus5, OrderType as OrderType5, PaymentMethod as PaymentMethod4, UserRole as UserRole7 } from "@prisma/client";
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
    const canUserChange = OrderPermissions.canUserChangeStatus(normalizedRole, status);
    if (!canUserChange) {
      throw new Error("Usu\xE1rio n\xE3o tem permiss\xE3o para isso!");
    }
    if (normalizedRole === UserRole7.MOTOQUEIRO) {
      if (order.type !== OrderType5.DELIVERY) {
        throw new Error("Motoqueiros s\xF3 podem atualizar pedidos de entrega.");
      }
      if (order.assignedCourierId !== Number(actorUserId || 0)) {
        throw new Error("Esta entrega n\xE3o est\xE1 atribu\xEDda a voc\xEA.");
      }
    }
    if (status === OrderStatus5.ENTREGUE && normalizedRole === UserRole7.MOTOQUEIRO && order.type === OrderType5.DELIVERY) {
      const customerPhoneDigits = String(order?.user?.phone || "").replace(/\D/g, "");
      const expectedCode = customerPhoneDigits.slice(-4);
      const providedCode = String(deliveryConfirmationCode || "").replace(/\D/g, "");
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
    const digitalMethods = [PaymentMethod4.PIX, PaymentMethod4.CARTAO];
    const isPayOnDelivery = order.payOnDelivery === true || this.hasLegacyPayOnDeliveryMarker(order?.observation);
    const isDigitalPayment = !!order.paymentMethod && digitalMethods.includes(order.paymentMethod);
    const isUnpaidDigitalDeliveryBlocked = order.type === OrderType5.DELIVERY && isDigitalPayment && !isPayOnDelivery && order.paid !== true;
    if (status === OrderStatus5.CANCELADO && isDigitalPayment && !isPayOnDelivery && order.paid === true) {
      throw new Error(
        "Pedido pago online deve ser cancelado pelo fluxo de estorno para devolver o valor ao cliente."
      );
    }
    if (isUnpaidDigitalDeliveryBlocked && status !== OrderStatus5.PENDENTE && status !== OrderStatus5.CANCELADO) {
      throw new Error(
        "Pedido delivery com pagamento digital pendente deve permanecer em PENDENTE at\xE9 a confirma\xE7\xE3o do pagamento."
      );
    }
    if (status === OrderStatus5.ENTREGUE && isDigitalPayment && !isPayOnDelivery && order.paid !== true) {
      throw new Error("N\xE3o \xE9 poss\xEDvel marcar como entregue: o pagamento ainda n\xE3o foi confirmado.");
    }
    let updatedOrder;
    let paymentConfirmedOnDelivery = false;
    if (status === OrderStatus5.CANCELADO) {
      updatedOrder = await prisma_default.$transaction(async (tx) => {
        const cancelledOrder = await OrderRepository_default.updateStatusIfCurrent(
          orderId,
          status,
          restaurantId,
          { status: currentStatus, paid: order.paid },
          tx
        );
        await restoreOrderItemsStock(tx, order);
        await releaseCouponRedemptionForOrder(orderId, restaurantId, tx);
        return cancelledOrder;
      });
    } else if (status === OrderStatus5.ENTREGUE) {
      updatedOrder = await prisma_default.$transaction(async (tx) => {
        let deliveredOrder = await OrderRepository_default.updateStatusIfCurrent(
          orderId,
          status,
          restaurantId,
          { status: currentStatus, paid: order.paid },
          tx
        );
        if (!deliveredOrder) {
          throw new Error("Pedido n\xE3o encontrado para atualizar.");
        }
        deliveredOrder = await tx.order.update({
          where: { id: deliveredOrder.id },
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
        if ((order.paymentMethod === PaymentMethod4.DINHEIRO || isPayOnDelivery) && deliveredOrder.paid !== true) {
          paymentConfirmedOnDelivery = true;
          deliveredOrder = await OrderRepository_default.confirmPayment(orderId, restaurantId, tx);
        }
        if (deliveredOrder?.paid === true) {
          await markCouponRedemptionUsedForOrder(orderId, restaurantId, tx);
        }
        return deliveredOrder;
      });
    } else {
      updatedOrder = await OrderRepository_default.updateStatusIfCurrent(
        orderId,
        status,
        restaurantId,
        { status: currentStatus, paid: order.paid }
      );
    }
    if (paymentConfirmedOnDelivery && updatedOrder) {
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
    io.to(`restaurant:${restaurantId}`).emit("order:status-changed", updatedOrder);
    io.to(`user:${updatedOrder.userId}`).emit("order:status-changed", updatedOrder);
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
      const normalizedStatus = String(status || "").toUpperCase();
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
import { OrderStatus as OrderStatus6, OrderType as OrderType6, UserRole as UserRole8 } from "@prisma/client";
var ClaimOrderForDeliveryService = class {
  async execute({
    orderId,
    restaurantId,
    courierId,
    role
  }) {
    const normalizedOrderId = Number(orderId);
    if (String(role || "").toUpperCase() !== UserRole8.MOTOQUEIRO) {
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
          type: OrderType6.DELIVERY,
          status: OrderStatus6.PRONTO,
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
          status: OrderStatus6.SAIU_PARA_ENTREGA
        }
      });
      if (claimed.count !== 1) {
        const current = await tx.order.findFirst({
          where: { id: normalizedOrderId, restaurantId },
          select: { type: true, status: true, assignedCourierId: true }
        });
        if (!current) throw new Error("Pedido n\xE3o encontrado.");
        if (current.type !== OrderType6.DELIVERY) throw new Error("Este pedido n\xE3o \xE9 uma entrega.");
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
import { OrderStatus as OrderStatus7, UserRole as UserRole9 } from "@prisma/client";
function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
var GetCourierFinanceService = class {
  async execute({
    courierId,
    restaurantId,
    role
  }) {
    if (String(role || "").toUpperCase() !== UserRole9.MOTOQUEIRO) {
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
      status: OrderStatus7.ENTREGUE
    };
    const [todayData, weekData, monthData, pendingData, deliveries] = await Promise.all([
      prisma_default.order.aggregate({
        where: { ...baseWhere, deliveredAt: { gte: today } },
        _sum: { courierEarning: true },
        _count: true
      }),
      prisma_default.order.aggregate({
        where: { ...baseWhere, deliveredAt: { gte: week } },
        _sum: { courierEarning: true },
        _count: true
      }),
      prisma_default.order.aggregate({
        where: { ...baseWhere, deliveredAt: { gte: month } },
        _sum: { courierEarning: true },
        _count: true
      }),
      prisma_default.order.aggregate({
        where: { ...baseWhere, courierPaidAt: null },
        _sum: { courierEarning: true },
        _count: true
      }),
      prisma_default.order.findMany({
        where: baseWhere,
        select: {
          id: true,
          courierEarning: true,
          courierPaidAt: true,
          deliveredAt: true,
          deliveryStartedAt: true,
          city: true,
          district: true
        },
        orderBy: { deliveredAt: "desc" },
        take: 100
      })
    ]);
    const format = (entry) => ({
      amount: Number(entry._sum.courierEarning || 0),
      deliveries: entry._count
    });
    return {
      today: format(todayData),
      week: format(weekData),
      month: format(monthData),
      pending: format(pendingData),
      deliveries: deliveries.map((order) => ({
        ...order,
        courierEarning: Number(order.courierEarning || 0)
      }))
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
import { UserRole as UserRole10 } from "@prisma/client";

// src/modules/orders/utils/deliveryRouteEstimate.ts
function buildDeliveryDestination(address) {
  return [address.address, address.number, address.district, address.city, address.state, "Brasil"].map((part) => String(part || "").trim()).filter(Boolean).join(", ");
}
function parseOsrmRouteEstimate(response) {
  const route = response.routes?.[0];
  const durationSeconds = Number(route?.duration);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;
  return {
    durationSeconds: Math.round(durationSeconds),
    distanceMeters: typeof route?.distance === "number" && route.distance >= 0 ? Math.round(route.distance) : null,
    provider: "OSRM"
  };
}
function hasValidCoordinates(value) {
  return Number.isFinite(value?.latitude) && Number.isFinite(value?.longitude) && Number(value?.latitude) >= -90 && Number(value?.latitude) <= 90 && Number(value?.longitude) >= -180 && Number(value?.longitude) <= 180;
}

// src/modules/orders/services/GetOsrmDeliveryRouteService.ts
var ROUTE_CACHE_TTL_MS = 2e4;
var GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
function normalizedBaseUrl(value) {
  return value.replace(/\/$/, "");
}
var GetOsrmDeliveryRouteService = class {
  routeCache = /* @__PURE__ */ new Map();
  geocodeCache = /* @__PURE__ */ new Map();
  get osrmBaseUrl() {
    return normalizedBaseUrl(String(process.env.OSRM_BASE_URL || "").trim());
  }
  get geocoderBaseUrl() {
    return normalizedBaseUrl(String(process.env.GEOCODER_BASE_URL || "").trim());
  }
  async geocode(destination) {
    const cached = this.geocodeCache.get(destination);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (!this.geocoderBaseUrl) return null;
    try {
      const url = new URL(`${this.geocoderBaseUrl}/search`);
      url.searchParams.set("q", destination);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      url.searchParams.set("countrycodes", "br");
      const response = await fetch(url, {
        headers: { "User-Agent": String(process.env.ROUTING_USER_AGENT || "PizzaIADelivery/1.0") }
      });
      const result = response.ok ? (await response.json())?.[0] : null;
      const coordinates = result ? { latitude: Number(result.lat), longitude: Number(result.lon) } : null;
      const value = hasValidCoordinates(coordinates) ? coordinates : null;
      this.geocodeCache.set(destination, { value, expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS });
      return value;
    } catch (error2) {
      console.warn(
        "[delivery-route] Nao foi possivel localizar o endereco do pedido",
        error2 instanceof Error ? error2.message : String(error2)
      );
      return null;
    }
  }
  async execute(input) {
    const destination = buildDeliveryDestination(input.destination);
    if (!this.osrmBaseUrl || !destination || !hasValidCoordinates(input)) return null;
    const destinationCoordinates = await this.geocode(destination);
    if (!destinationCoordinates) return null;
    const cacheKey = `${input.latitude.toFixed(4)}:${input.longitude.toFixed(4)}:${destinationCoordinates.latitude.toFixed(4)}:${destinationCoordinates.longitude.toFixed(4)}`;
    const cached = this.routeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    try {
      const coordinates = `${input.longitude},${input.latitude};${destinationCoordinates.longitude},${destinationCoordinates.latitude}`;
      const response = await fetch(
        `${this.osrmBaseUrl}/route/v1/driving/${coordinates}?overview=false`
      );
      const estimate = response.ok ? parseOsrmRouteEstimate(await response.json()) : null;
      this.routeCache.set(cacheKey, {
        value: estimate,
        expiresAt: Date.now() + ROUTE_CACHE_TTL_MS
      });
      return estimate;
    } catch (error2) {
      console.warn(
        "[delivery-route] Nao foi possivel calcular a rota do pedido",
        error2 instanceof Error ? error2.message : String(error2)
      );
      return null;
    }
  }
};
var GetOsrmDeliveryRouteService_default = new GetOsrmDeliveryRouteService();

// src/modules/orders/services/GetDeliveryTrackingService.ts
var GetDeliveryTrackingService = class {
  async execute({
    orderId,
    userId,
    restaurantId,
    role
  }) {
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
    const allowed = order.userId === userId || normalizedRole === UserRole10.MOTOQUEIRO && order.assignedCourierId === userId || normalizedRole === UserRole10.ADMIN && order.restaurantId === restaurantId;
    if (!allowed) throw new Error("Voc\xEA n\xE3o pode acompanhar esta entrega.");
    const locations = await prisma_default.deliveryLocation.findMany({
      where: { orderId: id },
      orderBy: { recordedAt: "desc" },
      take: 1e3,
      select: {
        latitude: true,
        longitude: true,
        heading: true,
        speed: true,
        accuracy: true,
        recordedAt: true
      }
    });
    locations.reverse();
    const latestLocation = locations.length ? locations[locations.length - 1] : null;
    const routeEstimate = order.status === "SAIU_PARA_ENTREGA" && latestLocation ? await GetOsrmDeliveryRouteService_default.execute({
      latitude: Number(latestLocation.latitude),
      longitude: Number(latestLocation.longitude),
      destination: order
    }) : null;
    const estimatedArrival = routeEstimate ? new Date(Date.now() + routeEstimate.durationSeconds * 1e3).toISOString() : null;
    return {
      order: { ...order, estimatedArrival, routeEstimate },
      locations: locations.map((point) => ({
        ...point,
        latitude: Number(point.latitude),
        longitude: Number(point.longitude)
      })),
      latestLocation: latestLocation ? {
        ...latestLocation,
        latitude: Number(latestLocation.latitude),
        longitude: Number(latestLocation.longitude)
      } : null
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
import { UserRole as UserRole11 } from "@prisma/client";
var ListOrdersService = class {
  async execute(restaurantId, status, role, userId) {
    if (String(role || "").toUpperCase() === UserRole11.MOTOQUEIRO) {
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
import { OrderStatus as OrderStatus9, PaymentMethod as PaymentMethod6 } from "@prisma/client";

// src/modules/orders/services/RefundOrderPaymentService.ts
import Stripe from "stripe";
import { PaymentMethod as PaymentMethod5 } from "@prisma/client";

// src/modules/payments/providers/mercadoPagoClient.ts
import { MercadoPagoConfig as MercadoPagoConfig2, Payment as Payment2, Preference } from "mercadopago";
async function getAccessToken(restaurantId) {
  const normalizedRestaurantId = Number(restaurantId || 0);
  const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
  const settings = Number.isInteger(normalizedRestaurantId) && normalizedRestaurantId > 0 ? await RestaurantSettingsRepository_default.findByRestaurantId(normalizedRestaurantId) : null;
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
  resolveAsaasApiBaseUrl() {
    return String(process.env.ASAAS_API_BASE_URL || "https://api.asaas.com").trim().replace(/\/+$/, "");
  }
  async getAsaasAccessToken(restaurantId) {
    if (!restaurantId || !Number.isInteger(restaurantId) || restaurantId <= 0) {
      throw new Error("Restaurante invalido para estorno Asaas.");
    }
    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
    const settings = await RestaurantSettingsRepository_default.findByRestaurantId(restaurantId);
    const restaurantToken = String(settings?.asaasAccessToken || "").trim();
    const globalToken = String(process.env.ASAAS_API_KEY || "").trim();
    const accessToken = restaurantToken || (allowGlobalFallback ? globalToken : "");
    if (!accessToken) {
      throw new Error(
        "Credencial Asaas nao configurada para este restaurante. Nenhuma alteracao foi aplicada ao pedido."
      );
    }
    return accessToken;
  }
  extractAsaasError(payload) {
    const firstError = Array.isArray(payload?.errors) ? payload.errors[0] : void 0;
    return {
      code: String(firstError?.code || "").trim(),
      description: String(firstError?.description || "").trim()
    };
  }
  async executeAsaasRefund(paymentId, order) {
    const normalizedPaymentId = String(paymentId || "").trim();
    const restaurantId = Number(order.restaurantId || 0);
    if (!normalizedPaymentId) {
      throw new Error("Identificador Asaas invalido para estorno automatico.");
    }
    const accessToken = await this.getAsaasAccessToken(restaurantId);
    const amount = this.parseAmount(order.total);
    const response = await fetch(
      `${this.resolveAsaasApiBaseUrl()}/v3/payments/${encodeURIComponent(normalizedPaymentId)}/refund`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          access_token: accessToken
        },
        body: JSON.stringify({
          ...amount ? { value: amount } : {},
          description: `Estorno do pedido #${String(order.id)}`
        })
      }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerError = this.extractAsaasError(payload);
      console.error("[ASAAS_REFUND_ERROR]", {
        orderId: order.id,
        restaurantId,
        paymentId: normalizedPaymentId,
        status: response.status,
        code: providerError.code || void 0,
        description: providerError.description || void 0
      });
      throw new Error(
        `Falha ao estornar pagamento no Asaas (HTTP ${response.status}). Nenhuma alteracao foi aplicada ao pedido.`
      );
    }
  }
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
    const settings = Number.isInteger(normalizedRestaurantId) && normalizedRestaurantId > 0 ? await RestaurantSettingsRepository_default.findByRestaurantId(normalizedRestaurantId) : null;
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
    const paymentApi = await getMercadoPagoPaymentApi(Number(restaurantId || 0) || void 0);
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
    throw new Error("SDK do Mercado Pago sem suporte de estorno configurado no servidor.");
  }
  async refundPix(order) {
    const paymentId = String(order.pixPaymentId || "").trim();
    const normalizedPaymentId = paymentId.toLowerCase();
    if (!paymentId) {
      throw new Error(
        "Pedido PIX sem identificador de pagamento. Nao foi possivel estornar automaticamente."
      );
    }
    if (normalizedPaymentId.startsWith("manual:")) {
      throw new Error(
        "Pedido PIX manual exige estorno manual. Nao foi possivel estornar automaticamente."
      );
    }
    if (normalizedPaymentId.startsWith("asaas:")) {
      const asaasPaymentId = paymentId.slice("asaas:".length).trim();
      await this.executeAsaasRefund(asaasPaymentId, order);
      return;
    }
    if (normalizedPaymentId.startsWith("pagbank:")) {
      throw new Error(
        "Estorno automatico deste PIX PagBank ainda nao e suportado. Nenhuma alteracao foi aplicada ao pedido."
      );
    }
    const amount = this.parseAmount(order.total);
    await this.executeMercadoPagoRefund(paymentId, amount, order.restaurantId);
  }
  async refundStripeCard(order) {
    const rawSessionId = String(order.cardCheckoutSessionId || "").trim();
    const stripeSessionId = rawSessionId;
    if (!stripeSessionId || !stripeSessionId.startsWith("cs_")) {
      throw new Error("Pedido de cartao sem sessao Stripe valida para estorno automatico.");
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
      throw new Error("Checkout Stripe sem payment_intent para estorno automatico.");
    }
    await stripe.refunds.create({
      payment_intent: paymentIntentId
    });
  }
  async refundPagBankByTransaction(transactionCode, order) {
    const normalizedTransactionCode = String(transactionCode || "").trim();
    if (!normalizedTransactionCode) {
      throw new Error("Codigo de transacao PagBank invalido para estorno automatico.");
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
    const normalizedCheckoutSessionId = checkoutSessionId.toLowerCase();
    const amount = this.parseAmount(order.total);
    if (!checkoutSessionId) {
      throw new Error(
        "Pedido CARTAO sem identificador de checkout. Nao foi possivel estornar automaticamente."
      );
    }
    if (normalizedCheckoutSessionId.startsWith("asaas_pay:")) {
      const asaasPaymentId = checkoutSessionId.slice("asaas_pay:".length).trim();
      await this.executeAsaasRefund(asaasPaymentId, order);
      return;
    }
    if (normalizedCheckoutSessionId.startsWith("mp_pay:")) {
      const paymentId = checkoutSessionId.replace(/^mp_pay:/i, "").trim();
      if (!paymentId) {
        throw new Error("Pedido CARTAO com id de pagamento Mercado Pago invalido para estorno.");
      }
      await this.executeMercadoPagoRefund(paymentId, amount, order.restaurantId);
      return;
    }
    if (normalizedCheckoutSessionId.startsWith("mp_pref:")) {
      const preferenceId = checkoutSessionId.replace(/^mp_pref:/i, "").trim();
      const orderId = Number(order.id || 0);
      const restaurantId = Number(order.restaurantId || 0);
      if (!preferenceId || !Number.isInteger(orderId) || orderId <= 0) {
        throw new Error(
          "Pedido CARTAO Mercado Pago sem dados suficientes para localizar pagamento e estornar automaticamente."
        );
      }
      const externalReference = Number.isInteger(restaurantId) && restaurantId > 0 ? `ordercard:${orderId}:${restaurantId}` : `ordercard:${orderId}`;
      const searchUrl = new URL("https://api.mercadopago.com/v1/payments/search");
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
      await this.executeMercadoPagoRefund(resolvedPaymentId, amount, order.restaurantId);
      return;
    }
    if (normalizedCheckoutSessionId.startsWith("pagbank_chk:")) {
      throw new Error(
        "Pedido PagBank ainda sem codigo de transacao confirmado para estorno automatico. Nenhuma alteracao foi aplicada ao pedido."
      );
    }
    if (normalizedCheckoutSessionId.startsWith("pagbank_tx:")) {
      const transactionCode = checkoutSessionId.replace(/^pagbank_tx:/i, "").trim();
      await this.refundPagBankByTransaction(transactionCode, order);
      return;
    }
    if (normalizedCheckoutSessionId.startsWith("pagbank:")) {
      throw new Error(
        "Identificador PagBank sem suporte de estorno automatico. Nenhuma alteracao foi aplicada ao pedido."
      );
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
    const normalizedRestaurantId = Number(restaurantId || 0);
    const order = await OrderRepository_default.findByIdForCustomer(
      normalizedOrderId,
      userId,
      normalizedRestaurantId
    );
    if (!order) {
      throw new Error("Pedido n\xE3o encontrado!");
    }
    if (order.userId !== userId) {
      throw new Error("Sem permiss\xE3o!");
    }
    const orderRestaurantId = order.restaurantId;
    const canCancel = OrderStateMachine.canTransition(order.status, OrderStatus9.CANCELADO);
    if (!canCancel) {
      throw new Error("Pedido n\xE3o pode ser cancelado!");
    }
    const isPaidDigitalOrder = order.paid === true && order.payOnDelivery !== true && (order.paymentMethod === PaymentMethod6.PIX || order.paymentMethod === PaymentMethod6.CARTAO);
    if (isPaidDigitalOrder) {
      await RefundOrderPaymentService_default.execute(order);
    }
    const updatedOrder = await prisma_default.$transaction(async (tx) => {
      const cancelledOrder = await OrderRepository_default.updateStatusIfCurrent(
        normalizedOrderId,
        OrderStatus9.CANCELADO,
        orderRestaurantId,
        { status: order.status, paid: order.paid },
        tx
      );
      await restoreOrderItemsStock(tx, order);
      await releaseCouponRedemptionForOrder(normalizedOrderId, orderRestaurantId, tx);
      return cancelledOrder;
    });
    notifyCustomerOrderStatusChanged({
      customerPhone: order?.user?.phone,
      customerName: order?.user?.name,
      restaurantName: order?.restaurant?.name,
      restaurantWhatsapp: order?.restaurant?.whatsapp,
      orderId: updatedOrder?.id,
      status: updatedOrder?.status
    }).catch((error2) => {
      console.error("[CUSTOMER_STATUS_NOTIFICATION_UNHANDLED]", error2?.message || error2);
    });
    io.to(`restaurant:${orderRestaurantId}`).emit("order:status-changed", updatedOrder);
    io.to(`user:${updatedOrder.userId}`).emit("order:status-changed", updatedOrder);
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
      throw new Error("Somente o administrador pode confirmar pagamento diretamente.");
    }
    const order = await OrderRepository_default.findById(normalizedOrderId, restaurantId);
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
    const updatedOrder = await prisma_default.$transaction(async (tx) => {
      const confirmedOrder = await OrderRepository_default.confirmPayment(
        normalizedOrderId,
        restaurantId,
        tx
      );
      await markCouponRedemptionUsedForOrder(normalizedOrderId, restaurantId, tx);
      return confirmedOrder;
    });
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
    io.to(`restaurant:${restaurantId}`).emit("order:status-changed", updatedOrder);
    io.to(`user:${updatedOrder.userId}`).emit("order:status-changed", updatedOrder);
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
      const updatedOrder = await ConfirmOrderPaymentService_default.execute(id, restaurantId, role);
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
    throw new Error("PAYMENT_PIN_SECRET deve ter pelo menos 32 caracteres em produ\xE7\xE3o.");
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
    const allowedRoles2 = ["MOTOQUEIRO", "ADMIN"];
    if (!allowedRoles2.includes(normalizedRole)) {
      throw new Error(
        "A confirma\xE7\xE3o por PIN \xE9 permitida apenas para admin ou motoqueiro na entrega."
      );
    }
    const order = await OrderRepository_default.findById(normalizedOrderId, restaurantId);
    if (!order) {
      throw new Error("Pedido n\xE3o encontrado!");
    }
    if (String(order.type || "").toUpperCase() !== "DELIVERY") {
      throw new Error("Confirma\xE7\xE3o por PIN dispon\xEDvel apenas para pedidos DELIVERY.");
    }
    if (order.payOnDelivery !== true || !order.paymentMethod) {
      throw new Error("Confirma\xE7\xE3o por PIN dispon\xEDvel apenas para pagamento na entrega.");
    }
    if (order.paid === true) {
      return order;
    }
    const normalizedPin = String(pin || "").trim();
    if (!/^\d{4}$/.test(normalizedPin)) {
      throw new Error("PIN inv\xE1lido. Informe os 4 d\xEDgitos enviados por um usu\xE1rio autorizado.");
    }
    if (!order.paymentConfirmationPin || !order.paymentConfirmationPinExpiresAt) {
      throw new Error("Este pedido n\xE3o possui PIN ativo. Solicite um novo PIN ao dono/admin.");
    }
    if (new Date(order.paymentConfirmationPinExpiresAt).getTime() < Date.now()) {
      throw new Error("PIN expirado. Solicite um novo PIN ao dono/admin.");
    }
    if (!verifyPaymentConfirmationPin(normalizedPin, String(order.paymentConfirmationPin))) {
      throw new Error("PIN incorreto. Confira com o dono/admin.");
    }
    const updatedOrder = await prisma_default.$transaction(async (tx) => {
      const confirmedOrder = await OrderRepository_default.confirmPayment(
        normalizedOrderId,
        restaurantId,
        tx
      );
      await markCouponRedemptionUsedForOrder(normalizedOrderId, restaurantId, tx);
      return confirmedOrder;
    });
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
    io.to(`restaurant:${restaurantId}`).emit("order:status-changed", updatedOrder);
    io.to(`user:${updatedOrder.userId}`).emit("order:status-changed", updatedOrder);
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
      throw new Error("PIN de confirma\xE7\xE3o dispon\xEDvel apenas para pedidos DELIVERY.");
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
      throw new Error("PIN de confirma\xE7\xE3o dispon\xEDvel apenas para pagamento na entrega.");
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
    io.to(`restaurant:${restaurantId}:admin`).emit("order:payment-pin-generated", {
      orderId: updatedOrder.id,
      expiresAt,
      pin
    });
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
      const result = await GenerateOrderPaymentConfirmationPinService_default.execute(id, restaurantId);
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
import { UserRole as UserRole12 } from "@prisma/client";
var RequestOrderPaymentConfirmationPinService = class {
  async execute(orderId, restaurantId, role) {
    const normalizedRole = String(role || "").toUpperCase();
    const allowedRoles2 = [UserRole12.MOTOQUEIRO, UserRole12.ADMIN];
    if (!allowedRoles2.includes(normalizedRole)) {
      throw new Error(
        "Somente admin ou motoqueiro podem solicitar PIN de confirma\xE7\xE3o de pagamento."
      );
    }
    const order = await OrderRepository_default.findById(orderId, restaurantId);
    if (!order) {
      throw new Error("Pedido n\xE3o encontrado!");
    }
    if (String(order.type || "").toUpperCase() !== "DELIVERY") {
      throw new Error("Solicita\xE7\xE3o de PIN dispon\xEDvel apenas para pedidos DELIVERY.");
    }
    if (order.paid === true) {
      throw new Error("Pagamento deste pedido j\xE1 est\xE1 confirmado.");
    }
    if (order.payOnDelivery !== true || !order.paymentMethod) {
      throw new Error("Solicita\xE7\xE3o de PIN dispon\xEDvel apenas para pagamento na entrega.");
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
        customerPhone,
        couponRedemptionId
      } = req.body;
      const userId = req.user?.id ?? null;
      const userRestaurantId = req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null;
      const resolvedRestaurantId = resolveOrderRestaurantId({
        requestedRestaurantId: restaurantId,
        contextRestaurantId: userRestaurantId
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
        observation,
        tableId,
        customerName,
        customerCpf,
        customerPhone,
        couponRedemptionId,
        items,
        address,
        number,
        district,
        city,
        state,
        zipCode,
        complement
      });
      let result;
      try {
        result = await OrderPixPaymentService_default.createPixPayment({
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
          userEmail: req.user?.email || null,
          orderId: order.id,
          orderTotal: Number(order.total),
          orderSubtotal: Number(order.itemsSubtotal) - Number(order.couponDiscount),
          orderDeliveryFee: Number(order.deliveryFeeAmount)
        });
      } catch (error2) {
        await OrderPixPaymentService_default.removePendingOrderAfterPaymentFailure({
          orderId: order.id,
          restaurantId: resolvedRestaurantId
        });
        throw error2;
      }
      try {
        await OrderPixPaymentService_default.attachPaymentToOrder({
          orderId: order.id,
          restaurantId: resolvedRestaurantId,
          paymentId: String(result.paymentId || "")
        });
      } catch (error2) {
        console.error(
          "[PIX_ORDER_PAYMENT_LINK_ERROR]",
          error2 instanceof Error ? error2.message : String(error2),
          { orderId: order.id, restaurantId: resolvedRestaurantId }
        );
      }
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
  const explicitNotificationUrl = String(process.env.MP_NOTIFICATION_URL || "").trim();
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
  const globalEmail = String(process.env.PAGBANK_EMAIL || process.env.PAGSEGURO_EMAIL || "").trim();
  const globalToken = String(process.env.PAGBANK_TOKEN || process.env.PAGSEGURO_TOKEN || "").trim();
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
  const explicitNotificationUrl = String(process.env.PAGBANK_NOTIFICATION_URL || "").trim();
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
    const notificationUrl = resolveMercadoPagoNotificationUrl(order.restaurantId);
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
    const preference = typeof response === "object" && response !== null ? response.body ?? response : {};
    const preferenceId = String(preference.id || "").trim();
    const checkoutUrl = String(preference.init_point || "").trim();
    if (!preferenceId || !checkoutUrl) {
      throw new Error("Nao foi possivel criar checkout de cartao no Mercado Pago.");
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
    const { email, token, environment: environment2 } = await getPagBankCredentials(order.restaurantId);
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
    const customerId2 = String(customerResult.responseBody.id || "").trim();
    const settings = await RestaurantSettingsRepository_default.findByRestaurantId(order.restaurantId);
    const walletId = String(settings?.gatewayMerchantId || "").trim();
    const platformWalletId = String(process.env.ASAAS_PLATFORM_WALLET_ID || "").trim();
    const systemFee = Number(order.systemFee || 0);
    const buildPaymentBody = (includeSplit) => ({
      customer: customerId2,
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
      getAsaasError(paymentResult.responseBody, "Erro ao criar checkout de cartao no Asaas.")
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
    const checkoutUrl = String(paymentResult.responseBody?.invoiceUrl || "").trim();
    if (!sessionId || !checkoutUrl) {
      throw new Error("Asaas nao retornou link de checkout para pagamento com cartao.");
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
    const resolvedRestaurantId = resolveOrderRestaurantId({
      requestedRestaurantId: payload.restaurantId,
      contextRestaurantId: payload.userRestaurantId
    });
    const settings = await RestaurantSettingsRepository_default.findByRestaurantId(resolvedRestaurantId);
    assertRestaurantIsOpenForOrders(settings?.isOpenForOrders);
    const configuredProvider3 = String(settings?.cardGateway || "").trim();
    if (!configuredProvider3) {
      throw new Error(
        "Pagamento com cart\xE3o indispon\xEDvel. Configure o gateway nas configura\xE7\xF5es do restaurante."
      );
    }
    if (!["MERCADO_PAGO", "ASAAS", "PAGBANK"].includes(configuredProvider3.toUpperCase())) {
      throw new Error("Gateway inv\xE1lido. Escolha Mercado Pago, Asaas ou PagBank.");
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
    let checkout;
    try {
      const providerHandler = getCardCheckoutProviderHandler(resolvedCardProvider);
      checkout = await providerHandler.createCheckout({
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
    } catch (error2) {
      await prisma_default.$transaction(async (tx) => {
        const pendingOrder = await OrderRepository_default.findById(
          createdOrder.id,
          createdOrder.restaurantId,
          tx
        );
        if (pendingOrder) {
          await restoreOrderItemsStock(tx, pendingOrder);
        }
        await releaseCouponRedemptionForOrder(createdOrder.id, createdOrder.restaurantId, tx);
        await OrderRepository_default.deleteById(createdOrder.id, createdOrder.restaurantId, tx);
      });
      throw error2;
    }
    try {
      await OrderRepository_default.setCardCheckoutSessionId(
        createdOrder.id,
        createdOrder.restaurantId,
        String(checkout.persistenceSessionId || checkout.sessionId)
      );
    } catch (error2) {
      console.error(
        "[CARD_ORDER_PAYMENT_LINK_ERROR]",
        error2 instanceof Error ? error2.message : String(error2),
        { orderId: createdOrder.id, restaurantId: createdOrder.restaurantId }
      );
    }
    return {
      orderId: createdOrder.id,
      provider: checkout.provider,
      sessionId: checkout.sessionId,
      checkoutUrl: checkout.checkoutUrl
    };
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
        cancelUrl,
        couponRedemptionId
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
        cancelUrl,
        couponRedemptionId
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
      const resolvedRestaurantId = resolveOrderRestaurantId({
        requestedRestaurantId: restaurantId,
        contextRestaurantId: req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null
      });
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

// src/modules/orders/services/ReconcileLateCancelledPaymentService.ts
import { OrderStatus as OrderStatus10, PaymentMethod as PaymentMethod7 } from "@prisma/client";
var ReconcileLateCancelledPaymentService = class {
  async execute({
    orderId,
    restaurantId,
    paymentMethod,
    paymentReference
  }) {
    const normalizedRestaurantId = Number(restaurantId || 0);
    const normalizedMethod = String(paymentMethod || "").toUpperCase();
    const normalizedReference = String(paymentReference || "").trim();
    if (!normalizedReference) {
      throw new Error("Pagamento tardio sem refer\xEAncia para estorno.");
    }
    const order = await OrderRepository_default.findById(orderId, normalizedRestaurantId);
    if (!order || order.status !== OrderStatus10.CANCELADO || order.paid === true) {
      return false;
    }
    const isPix = normalizedMethod === PaymentMethod7.PIX;
    const isCard = normalizedMethod === PaymentMethod7.CARTAO;
    if (!isPix && !isCard) {
      return false;
    }
    const pendingMarker = `late_refund_pending:${normalizedReference}`;
    const completedMarker = `late_refunded:${normalizedReference}`;
    const currentReference = String(
      isPix ? order.pixPaymentId || "" : order.cardCheckoutSessionId || ""
    ).trim();
    if (currentReference === completedMarker) {
      return true;
    }
    if (currentReference.startsWith("late_refund_pending:")) {
      throw new Error("Estorno de pagamento tardio j\xE1 est\xE1 em processamento.");
    }
    const claim = await prisma_default.order.updateMany({
      where: {
        id: order.id,
        restaurantId: order.restaurantId,
        status: OrderStatus10.CANCELADO,
        paid: false,
        ...isPix ? { pixPaymentId: order.pixPaymentId } : { cardCheckoutSessionId: order.cardCheckoutSessionId }
      },
      data: isPix ? { pixPaymentId: pendingMarker } : { cardCheckoutSessionId: pendingMarker }
    });
    if (claim.count !== 1) {
      const latest = await OrderRepository_default.findById(order.id, order.restaurantId);
      const latestReference = String(
        isPix ? latest?.pixPaymentId || "" : latest?.cardCheckoutSessionId || ""
      ).trim();
      if (latestReference === completedMarker) {
        return true;
      }
      throw new Error("N\xE3o foi poss\xEDvel iniciar o estorno do pagamento tardio.");
    }
    try {
      await RefundOrderPaymentService_default.execute({
        ...order,
        paid: true,
        ...isPix ? { pixPaymentId: normalizedReference } : { cardCheckoutSessionId: normalizedReference }
      });
      await prisma_default.order.updateMany({
        where: {
          id: order.id,
          restaurantId: order.restaurantId,
          ...isPix ? { pixPaymentId: pendingMarker } : { cardCheckoutSessionId: pendingMarker }
        },
        data: isPix ? { pixPaymentId: completedMarker } : { cardCheckoutSessionId: completedMarker }
      });
      console.warn("[LATE_CANCELLED_PAYMENT_REFUNDED]", {
        orderId: order.id,
        restaurantId: order.restaurantId,
        paymentMethod: normalizedMethod
      });
      return true;
    } catch (error2) {
      await prisma_default.order.updateMany({
        where: {
          id: order.id,
          restaurantId: order.restaurantId,
          ...isPix ? { pixPaymentId: pendingMarker } : { cardCheckoutSessionId: pendingMarker }
        },
        data: isPix ? { pixPaymentId: order.pixPaymentId } : { cardCheckoutSessionId: order.cardCheckoutSessionId }
      });
      throw error2;
    }
  }
};
var ReconcileLateCancelledPaymentService_default = new ReconcileLateCancelledPaymentService();

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
    const order = orderId ? await OrderRepository_default.findById(orderId, Number(normalizedRestaurantId || 0)) : await OrderRepository_default.findByPixPaymentId(normalizedPaymentId, normalizedRestaurantId);
    if (!order) {
      if (allowMissingOrder) {
        return null;
      }
      throw new Error("Pedido PIX nao encontrado para este pagamento.");
    }
    const storedPaymentId = String(order.pixPaymentId || "").trim();
    if (storedPaymentId !== normalizedPaymentId) {
      if (!storedPaymentId && orderId && String(order.status) !== "CANCELADO") {
        await OrderPixPaymentService_default.attachPaymentToOrder({
          orderId: order.id,
          restaurantId: order.restaurantId,
          paymentId: normalizedPaymentId
        });
      } else if (String(order.status) !== "CANCELADO") {
        throw new Error("Pagamento PIX nao corresponde ao pedido informado.");
      }
    }
    if (String(order.status) === "CANCELADO" && order.paid !== true) {
      await ReconcileLateCancelledPaymentService_default.execute({
        orderId: order.id,
        restaurantId: order.restaurantId,
        paymentMethod: "PIX",
        paymentReference: normalizedPaymentId
      });
      return OrderRepository_default.findById(order.id, order.restaurantId);
    }
    if (order.paid === true) {
      return order;
    }
    let updatedOrder;
    try {
      updatedOrder = await prisma_default.$transaction(async (tx) => {
        const confirmedOrder = await OrderRepository_default.confirmPayment(
          order.id,
          order.restaurantId,
          tx
        );
        await markCouponRedemptionUsedForOrder(order.id, order.restaurantId, tx);
        return confirmedOrder;
      });
    } catch (error2) {
      const latest = await OrderRepository_default.findById(order.id, order.restaurantId);
      if (latest?.status === "CANCELADO" && latest.paid !== true) {
        await ReconcileLateCancelledPaymentService_default.execute({
          orderId: latest.id,
          restaurantId: latest.restaurantId,
          paymentMethod: "PIX",
          paymentReference: normalizedPaymentId
        });
        return OrderRepository_default.findById(latest.id, latest.restaurantId);
      }
      throw error2;
    }
    io.to(`restaurant:${updatedOrder.restaurantId}`).emit("order:payment-confirmed", {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod
    });
    io.to(`user:${updatedOrder.userId}`).emit("payment-confirmed", {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
      status: updatedOrder.status
    });
    io.to(`restaurant:${updatedOrder.restaurantId}`).emit("new-order", updatedOrder);
    io.to(`restaurant:${updatedOrder.restaurantId}`).emit("order:status-changed", updatedOrder);
    io.to(`user:${updatedOrder.userId}`).emit("order:status-changed", updatedOrder);
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
      const resolvedRestaurantId = resolveOrderRestaurantId({
        requestedRestaurantId: restaurantId,
        contextRestaurantId: req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null
      });
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
    io.to(`restaurant:${order.restaurantId}:admin`).emit("order:issue-reported", payload);
    io.to(`restaurant:${order.restaurantId}:admin`).emit("order:issue-message", {
      ...threadPayload,
      message: chatMessage
    });
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
      const result = await ReportOrderIssueService_default.execute(id, userId, restaurantId, message);
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
    io.to(`restaurant:${order.restaurantId}:admin`).emit("order:issue-message", {
      ...threadPayload,
      message: chatMessage
    });
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
    io.to(`restaurant:${order.restaurantId}:admin`).emit("order:issue-resolved", resolvedPayload);
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
import { OrderStatus as OrderStatus11 } from "@prisma/client";
var RefundOrderByAdminService = class {
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
    if (order.status === OrderStatus11.CANCELADO) {
      throw new Error("Este pedido j\xE1 est\xE1 cancelado.");
    }
    const wasPaid = order.paid === true;
    const hasOnlinePaymentToRefund = wasPaid && order.payOnDelivery !== true;
    if (hasOnlinePaymentToRefund) {
      await RefundOrderPaymentService_default.execute(order);
    }
    const updatedOrder = await prisma_default.$transaction(async (tx) => {
      const cancelledOrder = await OrderRepository_default.updateStatusIfCurrent(
        order.id,
        OrderStatus11.CANCELADO,
        normalizedRestaurantId,
        { status: order.status, paid: order.paid },
        tx
      );
      await restoreOrderItemsStock(tx, order);
      await releaseCouponRedemptionForOrder(order.id, normalizedRestaurantId, tx);
      return cancelledOrder;
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
    io.to(`restaurant:${normalizedRestaurantId}`).emit("order:status-changed", updatedOrder);
    io.to(`user:${order.userId}`).emit("order:status-changed", updatedOrder);
    if (resolvedPayload) {
      io.to(`restaurant:${normalizedRestaurantId}:admin`).emit(
        "order:issue-resolved",
        resolvedPayload
      );
      io.to(`user:${order.userId}`).emit("order:issue-resolved", resolvedPayload);
    }
    return {
      order: updatedOrder,
      refunded: hasOnlinePaymentToRefund,
      info: hasOnlinePaymentToRefund ? "Pagamento estornado e pedido cancelado com sucesso." : "Pedido cancelado com sucesso. Nenhum estorno online foi realizado.",
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
      throw new Error("N\xE3o \xE9 possivel excluir uma categoria que possui produtos!");
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
  async execute(restaurantId, now = /* @__PURE__ */ new Date()) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isFinite(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error("Restaurant inv\xE1lido!");
    }
    await prisma_default.$transaction(async (db) => {
      const attachedRedemptions = await db.order.findMany({
        where: {
          restaurantId: normalizedRestaurantId,
          couponRedemptionId: { not: null }
        },
        select: { couponRedemptionId: true }
      });
      const redemptionIds = attachedRedemptions.map((order) => Number(order.couponRedemptionId || 0)).filter((id) => id > 0);
      if (redemptionIds.length > 0) {
        await db.couponRedemption.updateMany({
          where: {
            id: { in: redemptionIds },
            restaurantId: normalizedRestaurantId,
            status: "RESERVED",
            expiresAt: { gt: now }
          },
          data: {
            status: "CLAIMED",
            reservedAt: null,
            usedAt: null
          }
        });
        await db.couponRedemption.updateMany({
          where: {
            id: { in: redemptionIds },
            restaurantId: normalizedRestaurantId,
            status: "RESERVED",
            expiresAt: { lte: now }
          },
          data: {
            status: "EXPIRED",
            reservedAt: null,
            usedAt: null
          }
        });
      }
      await OrderRepository_default.deleteAllByRestaurant(normalizedRestaurantId, db);
      await CategoryRepository_default.deleteAllByRestaurant(normalizedRestaurantId, db);
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
    const order = orderId ? await OrderRepository_default.findById(orderId, Number(normalizedRestaurantId || 0)) : normalizedCheckoutSessionId ? await OrderRepository_default.findByCardCheckoutSessionId(
      normalizedCheckoutSessionId,
      normalizedRestaurantId
    ) : null;
    if (!order) {
      if (allowMissingOrder) {
        return null;
      }
      throw new Error("Pedido do cartao nao encontrado para esta sessao.");
    }
    if (String(order.status) === "CANCELADO" && order.paid !== true) {
      const paymentReference = normalizedCheckoutSessionId || String(order.cardCheckoutSessionId || "").trim();
      await ReconcileLateCancelledPaymentService_default.execute({
        orderId: order.id,
        restaurantId: order.restaurantId,
        paymentMethod: "CARTAO",
        paymentReference
      });
      return OrderRepository_default.findById(order.id, order.restaurantId);
    }
    if (order.paid === true) {
      return order;
    }
    let updatedOrder;
    try {
      updatedOrder = await prisma_default.$transaction(async (tx) => {
        const confirmedOrder = await OrderRepository_default.confirmPayment(
          order.id,
          order.restaurantId,
          tx
        );
        await markCouponRedemptionUsedForOrder(order.id, order.restaurantId, tx);
        return confirmedOrder;
      });
    } catch (error2) {
      const latest = await OrderRepository_default.findById(order.id, order.restaurantId);
      if (latest?.status === "CANCELADO" && latest.paid !== true) {
        await ReconcileLateCancelledPaymentService_default.execute({
          orderId: latest.id,
          restaurantId: latest.restaurantId,
          paymentMethod: "CARTAO",
          paymentReference: normalizedCheckoutSessionId || String(latest.cardCheckoutSessionId || "").trim()
        });
        return OrderRepository_default.findById(latest.id, latest.restaurantId);
      }
      throw error2;
    }
    io.to(`restaurant:${updatedOrder.restaurantId}`).emit("order:payment-confirmed", {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod
    });
    io.to(`user:${updatedOrder.userId}`).emit("payment-confirmed", {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
      status: updatedOrder.status
    });
    io.to(`restaurant:${updatedOrder.restaurantId}`).emit("new-order", updatedOrder);
    io.to(`restaurant:${updatedOrder.restaurantId}`).emit("order:status-changed", updatedOrder);
    io.to(`user:${updatedOrder.userId}`).emit("order:status-changed", updatedOrder);
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

// src/modules/orders/services/FailPendingOrderPaymentService.ts
import { OrderStatus as OrderStatus12 } from "@prisma/client";
var FailPendingOrderPaymentService = class {
  async execute({
    orderId,
    restaurantId,
    pixPaymentId,
    cardCheckoutSessionId
  }) {
    const normalizedRestaurantId = Number(restaurantId || 0) || void 0;
    const normalizedPixPaymentId = String(pixPaymentId || "").trim();
    const normalizedCardSessionId = String(cardCheckoutSessionId || "").trim();
    if (!normalizedRestaurantId) {
      throw new Error("Restaurante obrigat\xF3rio para reconciliar falha de pagamento.");
    }
    const order = orderId ? await OrderRepository_default.findById(orderId, normalizedRestaurantId) : normalizedPixPaymentId ? await OrderRepository_default.findByPixPaymentId(
      normalizedPixPaymentId,
      normalizedRestaurantId
    ) : normalizedCardSessionId ? await OrderRepository_default.findByCardCheckoutSessionId(
      normalizedCardSessionId,
      normalizedRestaurantId
    ) : null;
    if (!order || order.paid === true || order.status === OrderStatus12.CANCELADO) {
      return order;
    }
    if (order.status !== OrderStatus12.PENDENTE) {
      throw new Error(
        "Falha de pagamento recebida para um pedido que j\xE1 avan\xE7ou na opera\xE7\xE3o."
      );
    }
    const cancelledOrder = await prisma_default.$transaction(async (tx) => {
      const updated = await OrderRepository_default.updateStatusIfCurrent(
        order.id,
        OrderStatus12.CANCELADO,
        order.restaurantId,
        { status: OrderStatus12.PENDENTE, paid: false },
        tx
      );
      await restoreOrderItemsStock(tx, order);
      await releaseCouponRedemptionForOrder(order.id, order.restaurantId, tx);
      return updated;
    });
    return cancelledOrder;
  }
};
var FailPendingOrderPaymentService_default = new FailPendingOrderPaymentService();

// src/modules/orders/controllers/MercadoPagoOrderWebhookController.ts
var APPROVED_STATUSES = /* @__PURE__ */ new Set(["approved", "accredited", "paid"]);
var TERMINAL_UNPAID_STATUSES = /* @__PURE__ */ new Set(["cancelled", "rejected", "refunded", "charged_back"]);
var MercadoPagoOrderWebhookController = class {
  async handle(req, res) {
    try {
      const paymentId = req.body?.data?.id || req.body?.id || req.query?.id;
      const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
      const hintedRestaurantId = Number(req.query?.restaurantId || req.body?.restaurantId || 0);
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
      const status = String(payment.status || "").toLowerCase();
      const externalReference = String(
        payment.external_reference || ""
      ).trim();
      const metadataRestaurantId = Number(
        payment.metadata?.restaurant_id || 0
      );
      const resolvedRestaurantId = Number.isInteger(hintedRestaurantId) && hintedRestaurantId > 0 ? hintedRestaurantId : Number.isInteger(metadataRestaurantId) && metadataRestaurantId > 0 ? metadataRestaurantId : void 0;
      const parsedReference = /^order(pix|card):(\d+):(\d+)$/i.exec(externalReference);
      const referenceType = String(parsedReference?.[1] || "").toLowerCase();
      const referenceRestaurantId = Number(parsedReference?.[2] || 0);
      const referenceOrderId = Number(parsedReference?.[3] || 0);
      if (parsedReference && (hintedRestaurantId > 0 && referenceRestaurantId !== hintedRestaurantId || metadataRestaurantId > 0 && referenceRestaurantId !== metadataRestaurantId)) {
        return res.status(400).json({
          error: "Webhook Mercado Pago rejeitado: restaurante da transa\xE7\xE3o n\xE3o confere."
        });
      }
      if (TERMINAL_UNPAID_STATUSES.has(status)) {
        if (parsedReference) {
          await FailPendingOrderPaymentService_default.execute({
            orderId: referenceOrderId,
            restaurantId: referenceRestaurantId
          });
        } else {
          await FailPendingOrderPaymentService_default.execute({
            restaurantId: resolvedRestaurantId,
            pixPaymentId: String(paymentId)
          });
        }
        return res.sendStatus(200);
      }
      if (!APPROVED_STATUSES.has(status)) {
        return res.sendStatus(200);
      }
      if (referenceType === "card") {
        const orderId = referenceOrderId;
        const normalizedPaymentId = String(paymentId || "").trim();
        if (!Number.isInteger(orderId) || orderId <= 0 || !Number.isInteger(referenceRestaurantId) || referenceRestaurantId <= 0) {
          return res.status(400).json({
            error: "Webhook Mercado Pago rejeitado: restaurante da transa\xE7\xE3o n\xE3o confere."
          });
        }
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
        return res.sendStatus(200);
      }
      await FinalizeOrderPixPaymentService_default.execute({
        orderId: referenceType === "pix" ? referenceOrderId : void 0,
        paymentId: String(paymentId),
        restaurantId: referenceType === "pix" ? referenceRestaurantId : resolvedRestaurantId,
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
      const stripeSignature = String(req.headers["stripe-signature"] || "").trim();
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}), "utf-8");
      const untrustedPayload = JSON.parse(rawBody.toString("utf-8") || "{}");
      const untrustedRestaurantId = Number(
        untrustedPayload?.data?.object?.metadata?.restaurantId || 0
      );
      const settings = Number.isInteger(untrustedRestaurantId) && untrustedRestaurantId > 0 ? await RestaurantSettingsRepository_default.findByRestaurantId(untrustedRestaurantId) : null;
      const tenantWebhookSecret = String(settings?.stripeWebhookSecret || "").trim();
      const globalWebhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
      const stripeWebhookSecret = tenantWebhookSecret || (allowGlobalFallback || process.env.NODE_ENV !== "production" ? globalWebhookSecret : "");
      let eventPayload = {};
      if (stripeWebhookSecret) {
        if (!stripeSignature) {
          return res.status(400).json({
            error: "Assinatura Stripe ausente no webhook."
          });
        }
        const stripe = new Stripe3(process.env.STRIPE_SECRET_KEY || "");
        const event = stripe.webhooks.constructEvent(rawBody, stripeSignature, stripeWebhookSecret);
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
      const terminalFailureEventTypes = /* @__PURE__ */ new Set([
        "checkout.session.expired",
        "checkout.session.async_payment_failed"
      ]);
      if (!allowedEventTypes.has(eventType) && !terminalFailureEventTypes.has(eventType)) {
        return res.sendStatus(200);
      }
      if (!metadataOrderId || !Number.isInteger(metadataRestaurantId) || metadataRestaurantId <= 0) {
        return res.status(400).json({
          error: "Webhook Stripe invalido: metadata orderId/restaurantId obrigatoria."
        });
      }
      if (terminalFailureEventTypes.has(eventType)) {
        await FailPendingOrderPaymentService_default.execute({
          orderId: metadataOrderId,
          restaurantId: metadataRestaurantId
        });
        return res.sendStatus(200);
      }
      if (paymentStatus !== "paid") {
        return res.sendStatus(200);
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
var TERMINAL_TRANSACTION_STATUSES = /* @__PURE__ */ new Set(["6", "7", "8"]);
var TERMINAL_ORDER_STATUSES = /* @__PURE__ */ new Set(["CANCELED", "CANCELLED", "DECLINED", "EXPIRED"]);
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
  const globalEmail = String(process.env.PAGBANK_EMAIL || process.env.PAGSEGURO_EMAIL || "").trim();
  const globalToken = String(process.env.PAGBANK_TOKEN || process.env.PAGSEGURO_TOKEN || "").trim();
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
      const pagBankOrderId = String(req.body?.id || req.body?.order?.id || "").trim();
      const referenceId = String(
        req.body?.reference_id || req.body?.order?.reference_id || ""
      ).trim();
      const chargeStatuses = [
        ...Array.isArray(req.body?.charges) ? req.body.charges : [],
        ...Array.isArray(req.body?.order?.charges) ? req.body.order.charges : []
      ].map((charge) => String(charge?.status || "").toUpperCase());
      const pixReference = /^orderpix:(\d+):(\d+)$/i.exec(referenceId);
      if (pagBankOrderId && pixReference) {
        const referenceRestaurantId = Number(pixReference[1]);
        const referenceOrderId = Number(pixReference[2]);
        if (restaurantIdHint && restaurantIdHint !== referenceRestaurantId) {
          return res.status(400).json({
            error: "Webhook PagBank rejeitado: restaurante da transa\xE7\xE3o n\xE3o confere."
          });
        }
        const paymentId = `pagbank:${pagBankOrderId}`;
        const providerStatus = await OrderPixPaymentService_default.getPaymentStatus({
          paymentId,
          restaurantId: referenceRestaurantId
        });
        const normalizedProviderStatus = String(providerStatus.status || "").toUpperCase();
        if (providerStatus.isApproved || chargeStatuses.includes("PAID")) {
          await FinalizeOrderPixPaymentService_default.execute({
            orderId: referenceOrderId,
            paymentId,
            restaurantId: referenceRestaurantId,
            allowMissingOrder: true
          });
        } else if (TERMINAL_ORDER_STATUSES.has(normalizedProviderStatus)) {
          await FailPendingOrderPaymentService_default.execute({
            orderId: referenceOrderId,
            restaurantId: referenceRestaurantId
          });
        }
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
      const details = notificationCode ? await fetchPagBankTransactionByNotificationCode(notificationCode, restaurantIdHint) : await fetchPagBankTransactionByCode(transactionCode, restaurantIdHint);
      const externalReference = String(details.reference || "").trim();
      const cardReference = /^ordercard:(\d+):(\d+)$/i.exec(externalReference);
      if (cardReference && restaurantIdHint && Number(cardReference[2]) !== restaurantIdHint) {
        return res.status(400).json({
          error: "Webhook PagBank rejeitado: restaurante da transa\xE7\xE3o n\xE3o confere."
        });
      }
      if (TERMINAL_TRANSACTION_STATUSES.has(String(details.status || "")) && cardReference) {
        await FailPendingOrderPaymentService_default.execute({
          orderId: Number(cardReference[1]),
          restaurantId: Number(cardReference[2])
        });
        return res.sendStatus(200);
      }
      if (!APPROVED_TRANSACTION_STATUSES.has(String(details.status || ""))) {
        return res.sendStatus(200);
      }
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

// src/modules/orders/services/ConfirmOrderDeliveryReceivedService.ts
import { UserRole as UserRole14 } from "@prisma/client";

// src/modules/orders/utils/deliveryReceiptConfirmation.ts
import { OrderStatus as OrderStatus13, OrderType as OrderType7, UserRole as UserRole13 } from "@prisma/client";
function canConfirmDeliveryReceipt(order, customerId2, role) {
  if (String(role).toUpperCase() !== UserRole13.CLIENTE) {
    throw new Error("Somente o cliente do pedido pode confirmar o recebimento.");
  }
  if (order.userId !== customerId2) {
    throw new Error("Pedido n\xE3o encontrado.");
  }
  if (order.type !== OrderType7.DELIVERY) {
    throw new Error("A confirma\xE7\xE3o de recebimento \xE9 exclusiva para pedidos de entrega.");
  }
  if (order.status !== OrderStatus13.ENTREGUE) {
    throw new Error("O pedido ainda n\xE3o foi marcado como entregue.");
  }
  return !order.deliveryConfirmedAt;
}

// src/modules/orders/services/ConfirmOrderDeliveryReceivedService.ts
var ConfirmOrderDeliveryReceivedService = class {
  async execute({
    orderId,
    restaurantId,
    customerId: customerId2,
    role
  }) {
    const normalizedOrderId = Number(orderId);
    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error("Pedido inv\xE1lido.");
    }
    const isCustomer = String(role).toUpperCase() === UserRole14.CLIENTE;
    const order = isCustomer ? await OrderRepository_default.findByIdForCustomer(normalizedOrderId, customerId2) : await OrderRepository_default.findById(normalizedOrderId, restaurantId);
    if (!order) {
      throw new Error("Pedido n\xE3o encontrado.");
    }
    const shouldNotify = canConfirmDeliveryReceipt(order, customerId2, role);
    const updatedOrder = shouldNotify ? await OrderRepository_default.confirmDeliveryReceived(normalizedOrderId, order.restaurantId) : order;
    if (!updatedOrder) {
      throw new Error("N\xE3o foi poss\xEDvel confirmar o recebimento do pedido.");
    }
    if (shouldNotify) {
      const payload = {
        ...updatedOrder,
        deliveryConfirmedByCustomer: true
      };
      io.to(`restaurant:${restaurantId}`).emit("order:delivery-confirmed", payload);
      io.to(`restaurant:${restaurantId}`).emit("order:status-changed", payload);
      io.to(`user:${updatedOrder.userId}`).emit("order:delivery-confirmed", payload);
    }
    return updatedOrder;
  }
};
var ConfirmOrderDeliveryReceivedService_default = new ConfirmOrderDeliveryReceivedService();

// src/modules/orders/controllers/ConfirmOrderDeliveryReceivedController.ts
var ConfirmOrderDeliveryReceivedController = class {
  async handle(req, res) {
    try {
      const order = await ConfirmOrderDeliveryReceivedService_default.execute({
        orderId: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
        restaurantId: Number(req.user.restaurantId || 0),
        customerId: Number(req.user.id || 0),
        role: req.user.role
      });
      return res.status(200).json(order);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "N\xE3o foi poss\xEDvel confirmar o recebimento do pedido."
      });
    }
  }
};
var ConfirmOrderDeliveryReceivedController_default = new ConfirmOrderDeliveryReceivedController();

// src/modules/orders/controllers/QuoteOrderController.ts
import { OrderType as OrderType8 } from "@prisma/client";
import { z as z7 } from "zod";
var QuoteOrderController = class {
  async handle(req, res) {
    try {
      const { restaurantId, type, items, couponRedemptionId } = req.body;
      const resolvedRestaurantId = resolveOrderRestaurantId({
        requestedRestaurantId: restaurantId,
        contextRestaurantId: req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null
      });
      const parsed = z7.object({
        type: z7.nativeEnum(OrderType8),
        couponRedemptionId: z7.number().int().positive().nullable().optional(),
        items: z7.array(
          z7.object({
            productId: z7.number().int().positive(),
            quantity: z7.number().int().positive(),
            observation: z7.string().trim().max(500).optional(),
            ingredientIds: z7.array(z7.number().int().positive()).max(40).optional(),
            optionIds: z7.array(z7.number().int().positive()).max(100).optional(),
            selectedOptions: z7.array(
              z7.object({
                groupId: z7.number().int().positive(),
                optionIds: z7.array(z7.number().int().positive()).max(40)
              })
            ).max(20).optional()
          })
        ).min(1)
      }).parse({ type, items, couponRedemptionId });
      const quote = await OrderPricingService_default.quote({
        restaurantId: resolvedRestaurantId,
        userId: req.user?.id,
        type: parsed.type,
        items: parsed.items,
        couponRedemptionId: parsed.couponRedemptionId
      });
      return res.status(200).json({
        itemsSubtotal: quote.itemsSubtotal,
        productDiscountTotal: quote.productDiscountTotal,
        couponDiscount: quote.couponDiscount,
        deliveryFeeAmount: quote.deliveryFeeAmount,
        total: quote.total,
        couponCode: quote.couponCode
      });
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "N\xE3o foi poss\xEDvel calcular o pedido."
      });
    }
  }
};
var QuoteOrderController_default = new QuoteOrderController();

// src/middlewares/staffMiddleware.ts
import { UserRole as UserRole15 } from "@prisma/client";
function staffMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "N\xE3o autenticado"
    });
  }
  const allowedRoles2 = [UserRole15.ADMIN, UserRole15.FUNCIONARIO, UserRole15.MOTOQUEIRO];
  if (!allowedRoles2.includes(String(req.user.role))) {
    return res.status(403).json({
      error: "Acesso negado"
    });
  }
  return next();
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
  windowMs: Number(process.env.PAYMENT_PIN_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1e3),
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
  windowMs: Number(process.env.PAYMENT_PIN_REQUEST_RATE_LIMIT_WINDOW_MS || 60 * 1e3),
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
router3.post("/quote", orderAccessMiddleware, billingMiddleware, (req, res) => {
  QuoteOrderController_default.handle(req, res);
});
router3.post("/pix/payment", orderAccessMiddleware, billingMiddleware, (req, res) => {
  CreateOrderPixPaymentController_default.handle(req, res);
});
router3.post("/card/checkout", orderAccessMiddleware, billingMiddleware, (req, res) => {
  CreateOrderCardCheckoutController_default.handle(req, res);
});
router3.post("/pix/payment/status", orderAccessMiddleware, billingMiddleware, (req, res) => {
  GetOrderPixPaymentStatusController_default.handle(req, res);
});
router3.post("/pix/payment/confirm", orderAccessMiddleware, billingMiddleware, (req, res) => {
  ConfirmOrderPixPaymentController_default.handle(req, res);
});
router3.put("/:id/status", authMiddleware, staffMiddleware, (req, res) => {
  UpdateOrderStatusController_default.handle(req, res);
});
router3.patch("/:id/claim-delivery", authMiddleware, (req, res) => {
  ClaimOrderForDeliveryController_default.handle(req, res);
});
router3.patch("/:id/confirm-delivery-received", authMiddleware, (req, res) => {
  ConfirmOrderDeliveryReceivedController_default.handle(req, res);
});
router3.patch("/:id/confirm-payment", authMiddleware, adminMiddleware, (req, res) => {
  ConfirmOrderPaymentController_default.handle(req, res);
});
router3.post("/:id/payment-confirmation-pin", authMiddleware, adminMiddleware, (req, res) => {
  GenerateOrderPaymentConfirmationPinController_default.handle(req, res);
});
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
router3.delete("/cleanup/orders-categories", authMiddleware, adminMiddleware, (req, res) => {
  ClearOrdersAndCategoriesController_default.handle(req, res);
});
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
router3.patch("/:id/resolve-issue", authMiddleware, adminMiddleware, (req, res) => {
  ResolveOrderIssueController_default.handle(req, res);
});
router3.patch("/:id/refund", authMiddleware, adminMiddleware, (req, res) => {
  RefundOrderByAdminController_default.handle(req, res);
});
var orderRoutes_default = router3;

// src/modules/restaurants/routes/restaurantRoutes.ts
import { Router as Router4 } from "express";

// src/middlewares/superAdminMiddleware.ts
import { UserRole as UserRole16 } from "@prisma/client";
function superAdminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "N\xE3o autenticado" });
  }
  if (req.user.role !== UserRole16.SUPER_ADMIN) {
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
import { SubscriptionStatus, UserRole as UserRole17 } from "@prisma/client";

// src/validators/RestaurantValidator.ts
import { z as z8 } from "zod";
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
var createRestaurantSchema = z8.object({
  plan: z8.enum(["BASICO", "PREMIUM"], {
    errorMap: () => ({ message: "Escolha o plano B\xE1sico ou Premium." })
  }),
  restaurant: z8.object({
    name: z8.string().trim().min(2, "Nome do restaurante deve ter no m\xEDnimo 2 caracteres!").max(120, "Nome do restaurante muito longo!"),
    slug: z8.string().trim().toLowerCase().min(3, "Slug deve ter no m\xEDnimo 3 caracteres!").max(60, "Slug muito longo!").regex(slugPattern, "Slug inv\xE1lido! Use apenas letras min\xFAsculas, n\xFAmeros e h\xEDfen."),
    email: z8.string().trim().toLowerCase().email("Email do restaurante inv\xE1lido!").superRefine((value, context) => {
      const result = validateEmailDomainTypos(value);
      if (!result.valid) {
        context.addIssue({
          code: z8.ZodIssueCode.custom,
          message: result.message
        });
      }
    }),
    phone: z8.string().optional().transform((value) => normalizePhone(value || "")).refine((value) => !value || /^\d{10,11}$/.test(value), "Telefone do restaurante inv\xE1lido!"),
    whatsapp: z8.string().optional(),
    cnpj: z8.string().optional(),
    logo: z8.string().optional(),
    coverImage: z8.string().optional(),
    description: z8.string().optional(),
    address: z8.string().trim().optional(),
    city: z8.string().trim().optional().refine((value) => !value || value.length >= 2, "Cidade deve ter no m\xEDnimo 2 caracteres!"),
    state: z8.string().trim().toUpperCase().optional().refine(
      (value) => !value || /^[A-Z]{2}$/.test(value),
      "Estado deve conter exatamente 2 letras."
    ),
    zipCode: z8.string().optional(),
    openingHours: z8.string().optional()
  }),
  admin: z8.object({
    name: z8.string().trim().min(2, "Nome do admin deve ter no m\xEDnimo 2 caracteres!").max(120, "Nome do admin muito longo!"),
    email: z8.string().trim().toLowerCase().email("Email do admin inv\xE1lido!").superRefine((value, context) => {
      const result = validateEmailDomainTypos(value);
      if (!result.valid) {
        context.addIssue({
          code: z8.ZodIssueCode.custom,
          message: result.message
        });
      }
    }),
    password: z8.string().min(6, "Senha deve ter no m\xEDnimo 6 caracteres!").max(72, "Senha muito longa!")
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
  async execute({ restaurant, admin, plan }) {
    const parsedPayloadResult = createRestaurantSchema.safeParse({
      restaurant,
      admin,
      plan
    });
    if (!parsedPayloadResult.success) {
      const firstIssue = parsedPayloadResult.error.issues[0];
      throw new Error(firstIssue?.message || "Dados inv\xE1lidos para cadastro.");
    }
    const parsedPayload = parsedPayloadResult.data;
    const parsedRestaurant = parsedPayload.restaurant;
    const parsedAdmin = parsedPayload.admin;
    const restaurantExists = await RestaurantRepository_default.findByEmail(parsedRestaurant.email);
    if (restaurantExists) {
      throw new Error("J\xE1 existe um restaurante com esse e-mail.");
    }
    const slugExists = await RestaurantRepository_default.findBySlug(parsedRestaurant.slug);
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
      const createdRestaurant = await RestaurantRepository_default.create(restaurantCreateData, tx);
      const passwordHash = await bcrypt8.hash(parsedAdmin.password, 10);
      const createdAdmin = await UserRepository_default.create(
        {
          name: parsedAdmin.name,
          email: parsedAdmin.email,
          password: passwordHash,
          role: UserRole17.ADMIN,
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
          plan: parsedPayload.plan,
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
      const { restaurant, admin, plan } = req.body;
      const result = await CreateRestaurantService_default.execute({
        restaurant,
        admin,
        plan
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
  BASICO: PLAN_CONFIG.BASICO.monthlyFee,
  PREMIUM: PLAN_CONFIG.PREMIUM.monthlyFee
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
      revenueByRestaurant.map((item) => [item.restaurantId, Number(item._sum.total || 0)])
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
    const totalGenerated = paidOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
    const totalReceivable = paidOrders.reduce((acc, o) => acc + Number(o.systemFee || 0), 0);
    const pendingInvoiceTotal = invoices.reduce((acc, i) => acc + Number(i.total || 0), 0);
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
import { z as z9 } from "zod";
var createCategorySchema = z9.object({
  name: z9.string().trim().min(1, "Nome \xE9 obrigat\xF3rio!").max(50, "Nome deve ter no m\xE1ximo 50 caracteres."),
  description: z9.string().trim().max(255, "Descri\xE7\xE3o deve ter no m\xE1ximo 255 caracteres.").optional(),
  image: z9.string().trim().optional(),
  active: z9.boolean().optional()
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
    const category = await CategoryRepository_default.findById(id, normalizedRestaurantId);
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
    const category = await CategoryRepository_default.findById(id, normalizedRestaurantId);
    if (!category) {
      throw new Error("Categoria n\xE3o encontrada!");
    }
    const hasNameUpdate = Object.prototype.hasOwnProperty.call(parsedData, "name");
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
      const category = await UpdateCategoryService_default.execute(id, data, req.user.restaurantId);
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
      const categories = await ListCategoryService_default.execute(req.user.restaurantId);
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
import { UserRole as UserRole19 } from "@prisma/client";

// src/modules/employee/repositories/EmployeeRepository.ts
import { UserRole as UserRole18 } from "@prisma/client";
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
          in: [UserRole18.FUNCIONARIO, UserRole18.MOTOQUEIRO]
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
          in: [UserRole18.FUNCIONARIO, UserRole18.MOTOQUEIRO]
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
  async reactivate(id, restaurantId, db = prisma_default) {
    const employee = await this.findById(id, restaurantId, db);
    if (!employee) {
      throw new Error("Funcion\xE1rio n\xE3o encontrado!");
    }
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
      role: role || UserRole19.FUNCIONARIO,
      subRole: subRole ?? null
    });
    return employee;
  }
};
var CreateEmployeeService_default = new CreateEmployeeService();

// src/validators/EmployeeSchema.ts
import { FuncionarioSubRole as FuncionarioSubRole2, UserRole as UserRole20 } from "@prisma/client";
import { z as z10 } from "zod";
var phoneRegex = /^(?:\+?55\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})\s?-?\s?(\d{4}))$/;
var EmployeeUserSchema = z10.object({
  name: z10.string().min(1, "Nome obrigat\xF3rio"),
  email: z10.string().email("Email inv\xE1lido"),
  password: z10.string().min(6, "Senha deve conter no m\xEDnimo 6 caracteres!"),
  confirmPassword: z10.string().min(6, "Confirma\xE7\xE3o de senha obrigat\xF3ria"),
  role: z10.nativeEnum(UserRole20).optional().refine(
    (value) => !value || value === UserRole20.FUNCIONARIO || value === UserRole20.MOTOQUEIRO,
    {
      message: "Cargo inv\xE1lido"
    }
  ),
  phone: z10.string().min(1, "Telefone obrigat\xF3rio").regex(phoneRegex, "N\xFAmero de telefone inv\xE1lido!"),
  subRole: z10.nativeEnum(FuncionarioSubRole2).optional().nullable(),
  cpf: z10.string().optional().refine(
    (value) => !value || /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(
      value.replace(/\D/g, "").replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")
    ),
    { message: "CPF inv\xE1lido" }
  )
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas n\xE3o conferem!",
  path: ["confirmPassword"]
});
var loginSchema2 = z10.object({
  email: z10.string().email("Email inv\xE1lido"),
  password: z10.string().min(1, "Senha obrigat\xF3ria")
});

// src/modules/employee/Controllers/CreateEmployeeController.ts
var CreateEmployeeController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const { name, email, password, confirmPassword, phone, role, cpf, subRole } = req.body;
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
  async execute({ id, restaurantId, name, phone, email, subRole }) {
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
      const employee = await DeactivateEmployeeService_default.execute(id, restaurantId);
      return res.status(200).json(employee);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao desativar funcionario"
      });
    }
  }
};
var DeactivateEmployeeController_default = new DeactivateEmployeeController();

// src/modules/employee/services/ReactivateEmployeeService.ts
var ReactivateEmployeeService = class {
  async execute(id, restaurantId) {
    const employee = await EmployeeRepository_default.findById(id, restaurantId);
    if (!employee) {
      throw new Error("Funcion\xE1rio n\xE3o encontrado!");
    }
    return EmployeeRepository_default.reactivate(id, restaurantId);
  }
};
var ReactivateEmployeeService_default = new ReactivateEmployeeService();

// src/modules/employee/Controllers/ReactivateEmployeeController.ts
var ReactivateEmployeeController = class {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const employee = await ReactivateEmployeeService_default.execute(id, restaurantId);
      return res.status(200).json(employee);
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "Erro ao reativar funcion\xE1rio"
      });
    }
  }
};
var ReactivateEmployeeController_default = new ReactivateEmployeeController();

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
router6.patch("/:id/reactivate", authMiddleware, adminMiddleware, (req, res) => {
  ReactivateEmployeeController_default.handle(req, res);
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
  async execute({ tableId, restaurantId, openedById }) {
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
  async execute({ sessionId, closedById, restaurantId }) {
    const session = await TableSessionRepository_default.findById(sessionId);
    if (!session || session.table.restaurantId !== restaurantId) {
      throw new Error("Sess\xE3o n\xE3o encontrada!");
    }
    if (session.status === TableSessionStatus4.CLOSED) {
      throw new Error("Essa mesa j\xE1 est\xE1 fechada!");
    }
    const closedSession = await TableSessionRepository_default.close(sessionId, closedById);
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
    io.to(`restaurant:${table.restaurantId}`).emit("table:pin-requested", payload);
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
  windowMs: Number(process.env.TABLE_PIN_ASSISTANCE_RATE_LIMIT_WINDOW_MS || 60 * 1e3),
  max: Number(process.env.TABLE_PIN_ASSISTANCE_RATE_LIMIT_MAX_REQUESTS || 3),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getTableKey,
  message: {
    error: "Muitas solicita\xE7\xF5es de ajuda. Aguarde um instante."
  }
});

// src/middlewares/premiumTablePlanMiddleware.ts
async function premiumTablePlanMiddleware(req, res, next) {
  try {
    const restaurantId = Number(req.user?.restaurantId || 0);
    if (!restaurantId) {
      return res.status(400).json({ error: "Restaurante n\xE3o identificado." });
    }
    const subscription = await prisma_default.subscription.findUnique({
      where: { restaurantId },
      select: { plan: true, status: true }
    });
    const isActive = subscription?.status === "ATIVA" || subscription?.status === "TESTE";
    if (!isActive || subscription?.plan !== "PREMIUM") {
      return res.status(403).json({
        error: "O card\xE1pio digital com QR Code de mesa est\xE1 dispon\xEDvel no plano Premium.",
        code: "PREMIUM_TABLE_PLAN_REQUIRED"
      });
    }
    return next();
  } catch {
    return res.status(500).json({
      error: "N\xE3o foi poss\xEDvel validar o plano do restaurante."
    });
  }
}

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
  premiumTablePlanMiddleware,
  (req, res) => OpenTableSessionController_default.handle(req, res)
);
router7.patch(
  "/:id/close",
  authMiddleware,
  staffMiddleware,
  premiumTablePlanMiddleware,
  (req, res) => CloseTableSessionController_default.handle(req, res)
);
router7.get(
  "/open",
  authMiddleware,
  staffMiddleware,
  premiumTablePlanMiddleware,
  (req, res) => ListOpenSessionsController_default.handle(req, res)
);
var SessionsTablesRoutes_default = router7;

// src/modules/table/routes/TablesRoutes.ts
import { Router as Router8 } from "express";

// src/modules/table/services/CreateTableService.ts
import crypto8 from "crypto";
var CreateTableService = class {
  async execute({ number, restaurantId }) {
    const tableExists = await TableRepository_default.findByNumber(number, restaurantId);
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
      const tableExists = await TableRepository_default.findByNumber(number, restaurantId);
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
  premiumTablePlanMiddleware,
  (req, res) => CreateTableController_default.handle(req, res)
);
router8.get(
  "/",
  authMiddleware,
  staffMiddleware,
  premiumTablePlanMiddleware,
  (req, res) => ListTableController_default.handle(req, res)
);
router8.get(
  "/:id",
  authMiddleware,
  staffMiddleware,
  premiumTablePlanMiddleware,
  (req, res) => GetTableByIdController_default.handle(req, res)
);
router8.put(
  "/:id",
  authMiddleware,
  staffMiddleware,
  premiumTablePlanMiddleware,
  (req, res) => UpdateTableController_default.handle(req, res)
);
router8.patch(
  "/:id",
  authMiddleware,
  staffMiddleware,
  premiumTablePlanMiddleware,
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

// src/modules/restaurantSettings/utils/establishmentAddress.ts
function normalizeEstablishmentAddress(input) {
  return {
    address: String(input.address || "").trim(),
    number: String(input.number || "").trim(),
    complement: String(input.complement || "").trim(),
    district: String(input.district || "").trim(),
    city: String(input.city || "").trim(),
    state: String(input.state || "").trim().toUpperCase(),
    zipCode: String(input.zipCode || "").replace(/\D/g, "")
  };
}
function hasEstablishmentAddress(address) {
  return Object.values(address).some(Boolean);
}
function validateEstablishmentAddress(address) {
  if (!hasEstablishmentAddress(address)) return null;
  if (address.zipCode.length !== 8) return "CEP do estabelecimento inv\xE1lido.";
  if (address.address.length < 3) return "Rua do estabelecimento inv\xE1lida.";
  if (!address.number) return "N\xFAmero do estabelecimento \xE9 obrigat\xF3rio.";
  if (address.district.length < 2) return "Bairro do estabelecimento inv\xE1lido.";
  if (address.city.length < 2) return "Cidade do estabelecimento inv\xE1lida.";
  if (!/^[A-Z]{2}$/.test(address.state)) return "UF do estabelecimento inv\xE1lida.";
  if (address.complement.length > 160) return "Complemento do estabelecimento muito longo.";
  return null;
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
    restaurantCoverImage,
    restaurantDescription,
    restaurantAddress,
    restaurantAddressNumber,
    restaurantAddressComplement,
    restaurantAddressDistrict,
    restaurantCity,
    restaurantState,
    restaurantZipCode,
    businessHours,
    isOpenForOrders,
    averageDeliveryTime,
    autoAcceptOrders,
    trackingRequiresLogin,
    soundNotifications,
    maxConcurrentOrders
  }) {
    const settingsExists = await RestaurantSettingsRepository_default.findByRestaurantId(restaurantId);
    if (settingsExists) {
      throw new Error("Configura\xE7\xF5es j\xE1 existem para esse restaurante!");
    }
    const normalizedWhatsapp = whatsapp === void 0 ? void 0 : String(whatsapp || "").trim() || null;
    const normalizedRestaurantName = restaurantName === void 0 ? void 0 : String(restaurantName || "").trim();
    const normalizedRestaurantLogo = restaurantLogo === void 0 ? void 0 : normalizeRestaurantImage(restaurantLogo);
    const normalizedRestaurantCoverImage = restaurantCoverImage === void 0 ? void 0 : String(restaurantCoverImage || "").trim() || null;
    const normalizedRestaurantDescription = restaurantDescription === void 0 ? void 0 : String(restaurantDescription || "").trim() || null;
    const establishmentAddress = normalizeEstablishmentAddress({
      address: restaurantAddress,
      number: restaurantAddressNumber,
      complement: restaurantAddressComplement,
      district: restaurantAddressDistrict,
      city: restaurantCity,
      state: restaurantState,
      zipCode: restaurantZipCode
    });
    const addressValidationError = validateEstablishmentAddress(establishmentAddress);
    if (addressValidationError) throw new Error(addressValidationError);
    if (restaurantName !== void 0 && String(normalizedRestaurantName || "").length < 2) {
      throw new Error("Nome do restaurante inv\xE1lido.");
    }
    const normalizedLegalDocumentType = String(legalDocumentType || "").trim().toUpperCase();
    const normalizedCompanyDocument = String(companyDocument || "").replace(/\D/g, "");
    const normalizedBankHolderDocument = String(bankHolderDocument || "").replace(/\D/g, "");
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
      facebook,
      businessHours: businessHours === void 0 ? void 0 : businessHours,
      isOpenForOrders: isOpenForOrders === void 0 ? true : Boolean(isOpenForOrders),
      averageDeliveryTime: averageDeliveryTime === void 0 ? void 0 : String(Math.max(1, Number(averageDeliveryTime) || 1)),
      autoAcceptOrders: autoAcceptOrders === void 0 ? false : Boolean(autoAcceptOrders),
      trackingRequiresLogin: trackingRequiresLogin === void 0 ? true : Boolean(trackingRequiresLogin),
      soundNotifications: soundNotifications === void 0 ? true : Boolean(soundNotifications),
      maxConcurrentOrders: Math.min(500, Math.max(1, Number(maxConcurrentOrders) || 20))
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
    if (normalizedRestaurantDescription !== void 0) {
      restaurantData.description = normalizedRestaurantDescription;
    }
    if (establishmentAddress.address) {
      restaurantData.address = establishmentAddress.address;
      restaurantData.addressNumber = establishmentAddress.number;
      restaurantData.addressComplement = establishmentAddress.complement || null;
      restaurantData.addressDistrict = establishmentAddress.district;
      restaurantData.city = establishmentAddress.city;
      restaurantData.state = establishmentAddress.state;
      restaurantData.zipCode = establishmentAddress.zipCode;
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
      stripeSecretKeyConfigured: Boolean(String(created?.stripeSecretKey || "").trim()),
      stripeWebhookSecretConfigured: Boolean(String(created?.stripeWebhookSecret || "").trim()),
      mercadoPagoAccessTokenConfigured: Boolean(
        String(created?.mercadoPagoAccessToken || "").trim()
      ),
      picpayTokenConfigured: Boolean(String(created?.picpayToken || "").trim()),
      asaasAccessTokenConfigured: Boolean(String(created?.asaasAccessToken || "").trim()),
      pagbankTokenConfigured: Boolean(String(created?.pagbankToken || "").trim()),
      whatsapp: normalizedWhatsapp ?? null,
      restaurantName: normalizedRestaurantName ?? null,
      restaurantLogo: normalizedRestaurantLogo ?? null,
      restaurantCoverImage: normalizedRestaurantCoverImage ?? null,
      restaurantDescription: normalizedRestaurantDescription ?? null
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
        restaurantCoverImage,
        restaurantDescription,
        restaurantAddress,
        restaurantAddressNumber,
        restaurantAddressComplement,
        restaurantAddressDistrict,
        restaurantCity,
        restaurantState,
        restaurantZipCode,
        businessHours,
        isOpenForOrders,
        averageDeliveryTime,
        autoAcceptOrders,
        trackingRequiresLogin,
        soundNotifications,
        maxConcurrentOrders
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
        restaurantCoverImage,
        restaurantDescription,
        restaurantAddress,
        restaurantAddressNumber,
        restaurantAddressComplement,
        restaurantAddressDistrict,
        restaurantCity,
        restaurantState,
        restaurantZipCode,
        businessHours,
        isOpenForOrders,
        averageDeliveryTime,
        autoAcceptOrders,
        trackingRequiresLogin,
        soundNotifications,
        maxConcurrentOrders
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
    const settings = await RestaurantSettingsRepository_default.findByRestaurantId(normalizedRestaurantId);
    if (!settings) {
      const restaurant = await RestaurantSettingsRepository_default.findRestaurantById(normalizedRestaurantId);
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
        averageDeliveryTime: null,
        autoAcceptOrders: false,
        trackingRequiresLogin: true,
        soundNotifications: true,
        maxConcurrentOrders: 20,
        restaurant: {
          name: restaurant.name,
          logo: restaurant.logo,
          coverImage: restaurant.coverImage,
          description: restaurant.description,
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
      stripeSecretKeyConfigured: Boolean(String(settings?.stripeSecretKey || "").trim()),
      stripeWebhookSecretConfigured: Boolean(String(settings?.stripeWebhookSecret || "").trim()),
      mercadoPagoAccessTokenConfigured: Boolean(
        String(settings?.mercadoPagoAccessToken || "").trim()
      ),
      picpayTokenConfigured: Boolean(String(settings?.picpayToken || "").trim()),
      asaasAccessTokenConfigured: Boolean(String(settings?.asaasAccessToken || "").trim()),
      pagbankTokenConfigured: Boolean(String(settings?.pagbankToken || "").trim()),
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
  isValidCpf(value) {
    if (!/^\d{11}$/.test(value) || /^(\d)\1+$/.test(value)) return false;
    const digit = (base, factor) => {
      const sum = base.split("").reduce((total, number, index) => total + Number(number) * (factor - index), 0);
      const result = sum * 10 % 11;
      return result === 10 ? 0 : result;
    };
    return value.endsWith(`${digit(value.slice(0, 9), 10)}${digit(value.slice(0, 10), 11)}`);
  }
  isValidCnpj(value) {
    if (!/^\d{14}$/.test(value) || /^(\d)\1+$/.test(value)) return false;
    const digit = (base, weights) => {
      const sum = base.split("").reduce((total, number, index) => total + Number(number) * weights[index], 0);
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };
    const first = digit(value.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const second = digit(value.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return value.endsWith(`${first}${second}`);
  }
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
    restaurantCoverImage,
    restaurantDescription,
    restaurantAddress,
    restaurantAddressNumber,
    restaurantAddressComplement,
    restaurantAddressDistrict,
    restaurantCity,
    restaurantState,
    restaurantZipCode,
    businessHours,
    isOpenForOrders,
    averageDeliveryTime,
    autoAcceptOrders,
    trackingRequiresLogin,
    soundNotifications,
    maxConcurrentOrders
  }) {
    const settings = await RestaurantSettingsRepository_default.findByRestaurantId(restaurantId);
    if (!settings) {
      throw new Error("Configura\xE7\xF5es n\xE3o encontradas!");
    }
    const normalizedWhatsapp = whatsapp === void 0 ? void 0 : String(whatsapp || "").trim() || null;
    const normalizedRestaurantName = restaurantName === void 0 ? void 0 : String(restaurantName || "").trim();
    const normalizedRestaurantLogo = restaurantLogo === void 0 ? void 0 : normalizeRestaurantImage(restaurantLogo);
    const normalizedRestaurantCoverImage = restaurantCoverImage === void 0 ? void 0 : String(restaurantCoverImage || "").trim() || null;
    const normalizedRestaurantDescription = restaurantDescription === void 0 ? void 0 : String(restaurantDescription || "").trim() || null;
    const establishmentAddress = normalizeEstablishmentAddress({
      address: restaurantAddress,
      number: restaurantAddressNumber,
      complement: restaurantAddressComplement,
      district: restaurantAddressDistrict,
      city: restaurantCity,
      state: restaurantState,
      zipCode: restaurantZipCode
    });
    const hasAddressPayload = [
      restaurantAddress,
      restaurantAddressNumber,
      restaurantAddressComplement,
      restaurantAddressDistrict,
      restaurantCity,
      restaurantState,
      restaurantZipCode
    ].some((value) => value !== void 0);
    const addressValidationError = hasAddressPayload ? validateEstablishmentAddress(establishmentAddress) : null;
    if (addressValidationError) throw new Error(addressValidationError);
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
    const normalizedBusinessHours = businessHours === void 0 ? void 0 : businessHours;
    const normalizedIsOpenForOrders = isOpenForOrders === void 0 ? void 0 : Boolean(isOpenForOrders);
    const normalizedAverageDeliveryTime = averageDeliveryTime === void 0 ? void 0 : String(Math.max(1, Number(averageDeliveryTime) || 1));
    const normalizedAutoAcceptOrders = autoAcceptOrders === void 0 ? void 0 : Boolean(autoAcceptOrders);
    const normalizedTrackingRequiresLogin = trackingRequiresLogin === void 0 ? void 0 : Boolean(trackingRequiresLogin);
    const normalizedSoundNotifications = soundNotifications === void 0 ? void 0 : Boolean(soundNotifications);
    const normalizedMaxConcurrentOrders = maxConcurrentOrders === void 0 ? void 0 : Math.min(500, Math.max(1, Number(maxConcurrentOrders) || 1));
    const normalizedLegalDocumentType = legalDocumentType === void 0 ? void 0 : String(legalDocumentType || "").trim().toUpperCase() || null;
    const normalizedCompanyDocument = companyDocument === void 0 ? void 0 : String(companyDocument || "").replace(/\D/g, "") || null;
    const normalizedOwnerCpf = ownerCpf === void 0 ? void 0 : String(ownerCpf || "").replace(/\D/g, "") || null;
    const normalizedOwnerPhone = ownerPhone === void 0 ? void 0 : String(ownerPhone || "").replace(/\D/g, "") || null;
    const normalizedOwnerEmail = ownerEmail === void 0 ? void 0 : String(ownerEmail || "").trim().toLowerCase() || null;
    const normalizedBankHolderDocument = bankHolderDocument === void 0 ? void 0 : String(bankHolderDocument || "").replace(/\D/g, "") || null;
    const normalizedOwnerBirthDate = ownerBirthDate === void 0 ? void 0 : ownerBirthDate ? new Date(ownerBirthDate) : null;
    const resolvedAsaasToken = normalizedAsaasAccessToken === void 0 ? String(settings.asaasAccessToken || "").trim() : String(normalizedAsaasAccessToken || "").trim();
    const resolvedPixProvider = String(pixProvider || settings.pixProvider || "MERCADO_PAGO").trim().toUpperCase();
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
    if (resolvedDocumentType === "CNPJ" && resolvedCompanyDocument && !this.isValidCnpj(resolvedCompanyDocument)) {
      throw new Error("CNPJ inv\xE1lido para cadastro da empresa.");
    }
    if (resolvedDocumentType === "CPF" && resolvedCompanyDocument && !this.isValidCpf(resolvedCompanyDocument)) {
      throw new Error("CPF inv\xE1lido para cadastro de aut\xF4nomo.");
    }
    if (resolvedCompanyDocument && resolvedBankHolderDocument && resolvedCompanyDocument !== resolvedBankHolderDocument) {
      throw new Error(
        "A titularidade da conta banc\xE1ria deve ser igual ao documento cadastrado (CPF/CNPJ)."
      );
    }
    if (companyLegalName !== void 0 && String(companyLegalName || "").trim().length < 2) {
      throw new Error("Raz\xE3o social inv\xE1lida.");
    }
    if (normalizedOwnerPhone !== void 0 && (!normalizedOwnerPhone || !/^\d{10,11}$/.test(normalizedOwnerPhone))) {
      throw new Error("Telefone comercial inv\xE1lido.");
    }
    if (normalizedOwnerEmail !== void 0 && (!normalizedOwnerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedOwnerEmail))) {
      throw new Error("E-mail comercial inv\xE1lido.");
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
      ownerEmail: normalizedOwnerEmail,
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
      facebook,
      businessHours: normalizedBusinessHours,
      isOpenForOrders: normalizedIsOpenForOrders,
      averageDeliveryTime: normalizedAverageDeliveryTime,
      autoAcceptOrders: normalizedAutoAcceptOrders,
      trackingRequiresLogin: normalizedTrackingRequiresLogin,
      soundNotifications: normalizedSoundNotifications,
      maxConcurrentOrders: normalizedMaxConcurrentOrders
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
    if (normalizedRestaurantDescription !== void 0) {
      restaurantData.description = normalizedRestaurantDescription;
    }
    if (hasAddressPayload && establishmentAddress.address) {
      restaurantData.address = establishmentAddress.address;
      restaurantData.addressNumber = establishmentAddress.number;
      restaurantData.addressComplement = establishmentAddress.complement || null;
      restaurantData.addressDistrict = establishmentAddress.district;
      restaurantData.city = establishmentAddress.city;
      restaurantData.state = establishmentAddress.state;
      restaurantData.zipCode = establishmentAddress.zipCode;
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
      stripeSecretKeyConfigured: Boolean(String(updated?.stripeSecretKey || "").trim()),
      stripeWebhookSecretConfigured: Boolean(String(updated?.stripeWebhookSecret || "").trim()),
      mercadoPagoAccessTokenConfigured: Boolean(
        String(updated?.mercadoPagoAccessToken || "").trim()
      ),
      picpayTokenConfigured: Boolean(String(updated?.picpayToken || "").trim()),
      asaasAccessTokenConfigured: Boolean(String(updated?.asaasAccessToken || "").trim()),
      pagbankTokenConfigured: Boolean(String(updated?.pagbankToken || "").trim()),
      whatsapp: whatsapp !== void 0 ? normalizedWhatsapp : String(settings?.restaurant?.whatsapp || "").trim() || null,
      restaurantName: restaurantName !== void 0 ? normalizedRestaurantName : String(settings?.restaurant?.name || "").trim() || null,
      restaurantLogo: restaurantLogo !== void 0 ? normalizedRestaurantLogo : String(settings?.restaurant?.logo || "").trim() || null,
      restaurantCoverImage: restaurantCoverImage !== void 0 ? normalizedRestaurantCoverImage : String(settings?.restaurant?.coverImage || "").trim() || null,
      restaurantDescription: restaurantDescription !== void 0 ? normalizedRestaurantDescription : String(settings?.restaurant?.description || "").trim() || null,
      gatewayMerchantIdConfigured: Boolean(String(updated?.gatewayMerchantId || "").trim()),
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
        restaurantCoverImage,
        restaurantDescription,
        restaurantAddress,
        restaurantAddressNumber,
        restaurantAddressComplement,
        restaurantAddressDistrict,
        restaurantCity,
        restaurantState,
        restaurantZipCode,
        businessHours,
        isOpenForOrders,
        averageDeliveryTime,
        autoAcceptOrders,
        trackingRequiresLogin,
        soundNotifications,
        maxConcurrentOrders
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
        restaurantCoverImage,
        restaurantDescription,
        restaurantAddress,
        restaurantAddressNumber,
        restaurantAddressComplement,
        restaurantAddressDistrict,
        restaurantCity,
        restaurantState,
        restaurantZipCode,
        businessHours,
        isOpenForOrders,
        averageDeliveryTime,
        autoAcceptOrders,
        trackingRequiresLogin,
        soundNotifications,
        maxConcurrentOrders
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
  async execute({ restaurantId, slug, useDefault }) {
    let normalizedRestaurantId = Number(restaurantId);
    if ((!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) && slug) {
      const restaurant = await RestaurantRepository_default.findBySlug(String(slug).trim());
      normalizedRestaurantId = Number(restaurant?.id || 0);
    }
    if (useDefault && (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0)) {
      const restaurant = await RestaurantSettingsRepository_default.findDefaultActiveRestaurant();
      normalizedRestaurantId = Number(restaurant?.id || 0);
    }
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error("Restaurante inv\xE1lido.");
    }
    const settings = await RestaurantSettingsRepository_default.findPublicByRestaurantId(normalizedRestaurantId);
    if (!settings) {
      const restaurant = await RestaurantSettingsRepository_default.findRestaurantById(normalizedRestaurantId);
      const fallback = {
        restaurantId: normalizedRestaurantId,
        primaryColor: "#c95d3d",
        deliveryFee: 0,
        minimumOrder: 0,
        pixProvider: "MERCADO_PAGO",
        pixKey: null,
        instagram: null,
        facebook: null,
        companyLegalName: null,
        ownerEmail: null,
        ownerPhone: null,
        businessHours: null,
        isOpenForOrders: true,
        averageDeliveryTime: null,
        autoAcceptOrders: false,
        trackingRequiresLogin: true,
        soundNotifications: true,
        maxConcurrentOrders: 20,
        restaurant: {
          name: restaurant?.name || null,
          slug: restaurant?.slug || null,
          logo: restaurant?.logo || null,
          coverImage: restaurant?.coverImage || null,
          description: restaurant?.description || null,
          address: restaurant?.address || null,
          addressNumber: restaurant?.addressNumber || null,
          addressComplement: restaurant?.addressComplement || null,
          addressDistrict: restaurant?.addressDistrict || null,
          city: restaurant?.city || null,
          state: restaurant?.state || null,
          zipCode: restaurant?.zipCode || null,
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
      const useDefault = req.path.endsWith("/default");
      const settings = await GetPublicRestaurantSettingsService_default.execute({
        restaurantId,
        slug,
        useDefault
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
      throw new Error("Documento invalido. Informe CPF (11) ou CNPJ (14) digitos.");
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
      throw new Error("Asaas nao retornou identificador da conta/carteira da subconta.");
    }
    const asaasSubaccountToken = this.extractAsaasToken(responseBody);
    const existingSettings = await RestaurantSettingsRepository_default.findByRestaurantId(normalizedRestaurantId);
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
    const settings = await RestaurantSettingsRepository_default.findByRestaurantId(normalizedRestaurantId);
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
  async execute({ restaurantId, value, pixKey, description }) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error("Restaurante invalido para saque Asaas.");
    }
    const normalizedValue = Number(value);
    if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
      throw new Error("Valor de saque invalido.");
    }
    const settings = await RestaurantSettingsRepository_default.findByRestaurantId(normalizedRestaurantId);
    const asaasToken = String(settings?.asaasAccessToken || "").trim();
    if (!asaasToken) {
      throw new Error("Conta Asaas ainda nao vinculada. Finalize o onboarding para sacar.");
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
    return String(process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3e3}`).trim().replace(/\/+$/, "");
  }
  getRedirectUri() {
    return String(process.env.MP_OAUTH_REDIRECT_URI || "").trim();
  }
  getAuthBaseUrl() {
    return String(process.env.MP_OAUTH_AUTH_URL || "https://auth.mercadopago.com.br/authorization").trim().replace(/\/+$/, "");
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
    return String(process.env.MP_OAUTH_API_BASE_URL || "https://api.mercadopago.com").trim().replace(/\/+$/, "");
  }
  getBackendBaseUrl() {
    return String(process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3e3}`).trim().replace(/\/+$/, "");
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
      const providerErrorDescription = String(req.query.error_description || "").trim();
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
    const backendUrl = String(
      process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3e3}`
    ).trim().replace(/\/+$/, "");
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
    const backendUrl = String(
      process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3e3}`
    ).trim().replace(/\/+$/, "");
    const redirectUri = String(
      process.env.PAGBANK_CONNECT_REDIRECT_URI || `${backendUrl}/settings/pagbank/oauth/callback`
    ).trim();
    const apiBaseUrl = String(process.env.PAGBANK_CONNECT_API_URL || "https://api.pagseguro.com").trim().replace(/\/+$/, "");
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
      throw new Error(String(body.error_description || body.error || "PagBank recusou a conex\xE3o."));
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
    else
      await RestaurantSettingsRepository_default.create({
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
  "/public/default",
  publicRestaurantBillingMiddleware,
  (req, res) => GetPublicRestaurantSettingsController_default.handle(req, res)
);
router9.get(
  "/public/slug/:slug",
  publicRestaurantBillingMiddleware,
  (req, res) => GetPublicRestaurantSettingsController_default.handle(req, res)
);
router9.get(
  "/public/:restaurantId",
  publicRestaurantBillingMiddleware,
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
        code: {
          equals: code,
          mode: "insensitive"
        },
        restaurantId: Number(restaurantId)
      }
    });
  }
  async findActiveById(id, restaurantId, now = /* @__PURE__ */ new Date()) {
    return prisma_default.coupon.findFirst({
      where: {
        id: Number(id),
        restaurantId: Number(restaurantId),
        active: true,
        OR: [{ expiration: null }, { expiration: { gt: now } }]
      }
    });
  }
  async findActiveLoyaltyByRestaurant(restaurantId, now = /* @__PURE__ */ new Date()) {
    return prisma_default.coupon.findMany({
      where: {
        restaurantId: Number(restaurantId),
        active: true,
        OR: [{ expiration: null }, { expiration: { gt: now } }]
      },
      orderBy: [{ loyaltyPurchasesRequired: "asc" }, { id: "desc" }]
    });
  }
  async countCompletedPurchases(userId, restaurantId, completedAfter) {
    return prisma_default.order.count({
      where: {
        userId: Number(userId),
        restaurantId: Number(restaurantId),
        paid: true,
        status: "ENTREGUE",
        ...completedAfter ? {
          OR: [
            { deliveredAt: { gt: completedAfter } },
            { deliveredAt: null, updatedAt: { gt: completedAfter } }
          ]
        } : {}
      }
    });
  }
  async findRedemptions(userId, restaurantId, couponIds) {
    if (couponIds.length === 0) return [];
    return prisma_default.couponRedemption.findMany({
      where: {
        userId: Number(userId),
        restaurantId: Number(restaurantId),
        couponId: { in: couponIds }
      },
      include: { order: { select: { id: true } } },
      orderBy: [{ couponId: "asc" }, { cycle: "asc" }]
    });
  }
  async expireClaimedRedemptions({
    restaurantId,
    userId,
    couponIds,
    redemptionId,
    now = /* @__PURE__ */ new Date()
  } = {}) {
    return prisma_default.couponRedemption.updateMany({
      where: {
        status: "CLAIMED",
        expiresAt: { lte: now },
        ...restaurantId ? { restaurantId: Number(restaurantId) } : {},
        ...userId ? { userId: Number(userId) } : {},
        ...couponIds ? { couponId: { in: couponIds } } : {},
        ...redemptionId ? { id: Number(redemptionId) } : {}
      },
      data: {
        status: "EXPIRED",
        reservedAt: null
      }
    });
  }
  async createRedemption(data) {
    return prisma_default.couponRedemption.create({
      data,
      include: { order: { select: { id: true } } }
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

// src/validators/CouponValidator.ts
import { z as z11 } from "zod";
var nullableMoneySchema = z11.preprocess(
  (value) => value === "" || value === null || value === void 0 ? null : value,
  z11.union([z11.coerce.number().positive("O limite de desconto deve ser maior que zero."), z11.null()])
);
var nullableDateSchema = z11.preprocess(
  (value) => value === "" || value === null || value === void 0 ? null : value,
  z11.union([z11.null(), z11.coerce.date()])
);
var booleanSchema = z11.preprocess((value) => {
  if (value === "false" || value === 0 || value === "0") return false;
  if (value === "true" || value === 1 || value === "1") return true;
  return value;
}, z11.boolean());
var couponCodeSchema = z11.string({ required_error: "Informe o c\xF3digo do cupom." }).trim().min(3, "O c\xF3digo deve ter pelo menos 3 caracteres.").max(40, "O c\xF3digo deve ter no m\xE1ximo 40 caracteres.").transform((value) => value.toUpperCase()).refine(
  (value) => /^[A-Z0-9][A-Z0-9_-]*$/.test(value),
  "Use apenas letras, n\xFAmeros, h\xEDfen ou sublinhado no c\xF3digo."
);
var couponFields = {
  code: couponCodeSchema,
  title: z11.string().trim().max(80, "O t\xEDtulo deve ter no m\xE1ximo 80 caracteres.").optional(),
  description: z11.string().trim().max(300, "A descri\xE7\xE3o deve ter no m\xE1ximo 300 caracteres.").optional(),
  discountType: z11.enum(["FIXED", "PERCENTAGE"]),
  discount: z11.coerce.number().positive("Informe um desconto maior que zero."),
  minimumSubtotal: z11.coerce.number().min(0, "O pedido m\xEDnimo n\xE3o pode ser negativo."),
  maxDiscount: nullableMoneySchema,
  loyaltyPurchasesRequired: z11.coerce.number().int("A quantidade de compras deve ser um n\xFAmero inteiro.").min(1, "Exija pelo menos uma compra para liberar o cupom.").max(1e3, "A quantidade m\xE1xima \xE9 de 1000 compras."),
  perCustomerLimit: z11.coerce.number().int("O limite por cliente deve ser um n\xFAmero inteiro.").min(1, "Permita pelo menos um cupom guardado por cliente.").max(100, "O limite m\xE1ximo \xE9 de 100 cupons guardados por cliente."),
  redemptionValidityDays: z11.coerce.number().int("A validade da recompensa deve ser informada em dias inteiros.").min(1, "A recompensa deve ficar v\xE1lida por pelo menos um dia.").max(365, "A validade m\xE1xima da recompensa \xE9 de 365 dias."),
  active: booleanSchema,
  expiration: nullableDateSchema
};
function validatePercentage(payload, context) {
  if (payload.discountType === "PERCENTAGE" && Number(payload.discount) >= 100) {
    context.addIssue({
      code: z11.ZodIssueCode.custom,
      path: ["discount"],
      message: "O desconto percentual deve ser menor que 100%."
    });
  }
}
var createCouponSchema = z11.object({
  ...couponFields,
  title: couponFields.title.default(""),
  description: couponFields.description.default(""),
  discountType: couponFields.discountType.default("FIXED"),
  minimumSubtotal: couponFields.minimumSubtotal.default(0),
  maxDiscount: couponFields.maxDiscount.default(null),
  loyaltyPurchasesRequired: couponFields.loyaltyPurchasesRequired.default(1),
  perCustomerLimit: couponFields.perCustomerLimit.default(1),
  redemptionValidityDays: couponFields.redemptionValidityDays.default(30),
  active: couponFields.active.default(true),
  expiration: couponFields.expiration.default(null)
}).superRefine(validatePercentage);
var updateCouponSchema = z11.object({
  code: couponFields.code.optional(),
  title: couponFields.title,
  description: couponFields.description,
  discountType: couponFields.discountType.optional(),
  discount: couponFields.discount.optional(),
  minimumSubtotal: couponFields.minimumSubtotal.optional(),
  maxDiscount: couponFields.maxDiscount.optional(),
  loyaltyPurchasesRequired: couponFields.loyaltyPurchasesRequired.optional(),
  perCustomerLimit: couponFields.perCustomerLimit.optional(),
  redemptionValidityDays: couponFields.redemptionValidityDays.optional(),
  active: couponFields.active.optional(),
  expiration: couponFields.expiration.optional()
}).refine((payload) => Object.keys(payload).length > 0, {
  message: "Informe ao menos um campo para atualizar o cupom."
}).superRefine(validatePercentage);
var couponIdSchema = z11.coerce.number().int("Cupom inv\xE1lido.").positive("Cupom inv\xE1lido.");
var loyaltyRestaurantQuerySchema = z11.object({
  restaurantId: z11.coerce.number({ required_error: "Informe o restaurante." }).int("Restaurante inv\xE1lido.").positive("Restaurante inv\xE1lido.")
});
function couponValidationMessage(error2) {
  return error2.issues[0]?.message || "Confira os dados do cupom e tente novamente.";
}

// src/modules/coupon/utils/couponPresenter.ts
function nullableNumber(value) {
  if (value === null || value === void 0 || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function nullableIsoDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function presentCoupon(coupon) {
  const code = String(coupon.code || "").trim().toUpperCase();
  return {
    id: coupon.id,
    restaurantId: coupon.restaurantId,
    code,
    title: coupon.title?.trim() || code,
    description: coupon.description?.trim() || "",
    discountType: coupon.discountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
    discount: Number(coupon.discount || 0),
    minimumSubtotal: Number(coupon.minimumSubtotal || 0),
    maxDiscount: nullableNumber(coupon.maxDiscount),
    loyaltyPurchasesRequired: Number(coupon.loyaltyPurchasesRequired || 1),
    perCustomerLimit: Number(coupon.perCustomerLimit || 1),
    redemptionValidityDays: Number(coupon.redemptionValidityDays || 30),
    active: coupon.active,
    expiration: nullableIsoDate(coupon.expiration),
    ...coupon.createdAt ? { createdAt: nullableIsoDate(coupon.createdAt) } : {},
    ...coupon.updatedAt ? { updatedAt: nullableIsoDate(coupon.updatedAt) } : {}
  };
}

// src/modules/coupon/services/CreateCouponService.ts
var CreateCouponService = class {
  async execute(payload) {
    const { restaurantId, ...couponPayload } = payload;
    const parsed = createCouponSchema.parse(couponPayload);
    const exists = await CouponRepository_default.findByCode(parsed.code, restaurantId);
    if (exists) {
      throw new Error("J\xE1 existe um cupom com este c\xF3digo neste restaurante.");
    }
    let coupon;
    try {
      coupon = await CouponRepository_default.create({
        code: parsed.code,
        title: parsed.title || null,
        description: parsed.description || null,
        discountType: parsed.discountType,
        discount: parsed.discount,
        minimumSubtotal: parsed.minimumSubtotal,
        maxDiscount: parsed.maxDiscount,
        loyaltyPurchasesRequired: parsed.loyaltyPurchasesRequired,
        perCustomerLimit: parsed.perCustomerLimit,
        redemptionValidityDays: parsed.redemptionValidityDays,
        active: parsed.active,
        expiration: parsed.expiration,
        restaurantId
      });
    } catch (error2) {
      if (error2?.code === "P2002") {
        throw new Error("J\xE1 existe um cupom com este c\xF3digo neste restaurante.");
      }
      throw error2;
    }
    return presentCoupon(coupon);
  }
};
var CreateCouponService_default = new CreateCouponService();

// src/modules/coupon/controllers/CouponControllerHelpers.ts
import { ZodError } from "zod";
function couponControllerError(res, error2, fallback) {
  if (error2 instanceof ZodError) {
    return res.status(422).json({
      error: couponValidationMessage(error2),
      fields: error2.flatten().fieldErrors
    });
  }
  const message = error2 instanceof Error ? error2.message : fallback;
  if (/não encontrad|indisponível|expirado/i.test(message)) {
    return res.status(404).json({ error: message });
  }
  if (/já existe|já foi resgatado|limite de resgates/i.test(message)) {
    return res.status(409).json({ error: message });
  }
  if (/não pode ultrapassar|maior que zero|número inteiro|pelo menos/i.test(message)) {
    return res.status(422).json({ error: message });
  }
  if (/faltam? \d+ compras? concluídas?/i.test(message)) {
    return res.status(400).json({ error: message });
  }
  console.error("[coupons] unexpected error", error2);
  return res.status(500).json({ error: fallback });
}

// src/modules/coupon/controllers/CreateCouponController.ts
var CreateCouponController = class {
  async handle(req, res) {
    try {
      const restaurantId = Number(req.user?.restaurantId || 0);
      if (!restaurantId) {
        return res.status(403).json({ error: "Restaurante n\xE3o identificado." });
      }
      const coupon = await CreateCouponService_default.execute({
        ...req.body,
        restaurantId
      });
      return res.status(201).json(coupon);
    } catch (error2) {
      return couponControllerError(res, error2, "N\xE3o foi poss\xEDvel criar o cupom.");
    }
  }
};
var CreateCouponController_default = new CreateCouponController();

// src/modules/coupon/services/ListCouponService.ts
var ListCouponService = class {
  async execute({ restaurantId }) {
    const coupons = await CouponRepository_default.findAllByRestaurant(restaurantId);
    return coupons.map(presentCoupon);
  }
};
var ListCouponService_default = new ListCouponService();

// src/modules/coupon/controllers/ListCouponController.ts
var ListCouponController = class {
  async handle(req, res) {
    try {
      const restaurantId = Number(req.user?.restaurantId || 0);
      if (!restaurantId) {
        return res.status(403).json({ error: "Restaurante n\xE3o identificado." });
      }
      const coupons = await ListCouponService_default.execute({
        restaurantId
      });
      return res.status(200).json(coupons);
    } catch (error2) {
      return couponControllerError(res, error2, "N\xE3o foi poss\xEDvel listar os cupons.");
    }
  }
};
var ListCouponController_default = new ListCouponController();

// src/modules/coupon/services/UpdateCouponService.ts
var UpdateCouponService = class {
  async execute({ id, restaurantId, ...payload }) {
    const normalizedId = Array.isArray(id) ? id[0] : id;
    const coupon = await CouponRepository_default.findById(normalizedId, restaurantId);
    if (!coupon) {
      throw new Error("Cupom n\xE3o encontrado");
    }
    const parsed = updateCouponSchema.parse(payload);
    const effectiveDiscountType = parsed.discountType || coupon.discountType || "FIXED";
    const effectiveDiscount = parsed.discount ?? Number(coupon.discount);
    if (effectiveDiscountType === "PERCENTAGE" && effectiveDiscount >= 100) {
      throw new Error("O desconto percentual deve ser menor que 100%.");
    }
    if (parsed.code && parsed.code !== coupon.code.toUpperCase()) {
      const duplicate = await CouponRepository_default.findByCode(parsed.code, restaurantId);
      if (duplicate && duplicate.id !== coupon.id) {
        throw new Error("J\xE1 existe um cupom com este c\xF3digo neste restaurante.");
      }
    }
    const updated = await CouponRepository_default.update(normalizedId, restaurantId, {
      ...parsed,
      ...parsed.title !== void 0 ? { title: parsed.title || null } : {},
      ...parsed.description !== void 0 ? { description: parsed.description || null } : {}
    });
    if (!updated) {
      throw new Error("Cupom n\xE3o encontrado");
    }
    return presentCoupon(updated);
  }
};
var UpdateCouponService_default = new UpdateCouponService();

// src/modules/coupon/controllers/UpdateCouponController.ts
var UpdateCouponController = class {
  async handle(req, res) {
    try {
      const restaurantId = Number(req.user?.restaurantId || 0);
      const id = couponIdSchema.parse(
        Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      );
      if (!restaurantId) {
        return res.status(403).json({ error: "Restaurante n\xE3o identificado." });
      }
      const coupon = await UpdateCouponService_default.execute({
        ...req.body,
        id,
        restaurantId
      });
      return res.status(200).json(coupon);
    } catch (error2) {
      return couponControllerError(res, error2, "N\xE3o foi poss\xEDvel atualizar o cupom.");
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
      const restaurantId = Number(req.user?.restaurantId || 0);
      const id = couponIdSchema.parse(
        Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      );
      if (!restaurantId) {
        return res.status(403).json({ error: "Restaurante n\xE3o identificado." });
      }
      const result = await DeleteCouponService_default.execute({
        id,
        restaurantId
      });
      return res.status(200).json(result);
    } catch (error2) {
      return couponControllerError(res, error2, "N\xE3o foi poss\xEDvel remover o cupom.");
    }
  }
};
var DeleteCouponController_default = new DeleteCouponController();

// src/modules/coupon/utils/loyaltyProgress.ts
function calculateLoyaltyProgress({
  purchasesCompleted,
  purchasesRequired,
  perCustomerLimit,
  redemptions,
  now = /* @__PURE__ */ new Date()
}) {
  const completed = Math.max(0, Math.trunc(purchasesCompleted));
  const required = Math.max(1, Math.trunc(purchasesRequired));
  const limit = Math.max(1, Math.trunc(perCustomerLimit));
  const cycles = redemptions.map((redemption) => Math.trunc(Number(redemption.cycle))).filter((cycle) => cycle > 0);
  const earnedCycles = Math.floor(completed / required);
  const activeRedemptions = redemptions.filter((redemption) => {
    if (redemption.status === "RESERVED") return true;
    if (redemption.status !== "CLAIMED") return false;
    if (!redemption.expiresAt) return true;
    const expiresAt = new Date(redemption.expiresAt);
    return Number.isNaN(expiresAt.getTime()) || expiresAt > now;
  }).length;
  const limitReached = activeRedemptions >= limit;
  const nextCycle = (cycles.length > 0 ? Math.max(...cycles) : 0) + 1;
  const redeemableCycle = !limitReached && earnedCycles >= 1 ? nextCycle : null;
  const progressPercent = Math.min(100, Math.round(completed / required * 100));
  return {
    earnedCycles,
    nextCycle,
    redeemableCycle,
    canRedeem: redeemableCycle !== null && !limitReached,
    limitReached,
    activeRedemptions,
    walletLimit: limit,
    remaining: Math.max(0, required - completed),
    progressPercent
  };
}

// src/modules/coupon/services/ListLoyaltyCouponsService.ts
function isoDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function presentRedemption(redemption, coupon, now) {
  const expiresAt = redemption.expiresAt ? new Date(redemption.expiresAt) : null;
  const expired = redemption.status === "EXPIRED" || redemption.status === "CLAIMED" && expiresAt !== null && !Number.isNaN(expiresAt.getTime()) && expiresAt <= now;
  return {
    id: redemption.id,
    status: redemption.status,
    cycle: redemption.cycle,
    orderId: redemption.order?.id ?? null,
    claimedAt: isoDate(redemption.claimedAt),
    reservedAt: isoDate(redemption.reservedAt),
    usedAt: isoDate(redemption.usedAt),
    expiresAt: isoDate(expiresAt),
    expired,
    createdAt: isoDate(redemption.createdAt),
    updatedAt: isoDate(redemption.updatedAt),
    coupon
  };
}
function getLatestLoyaltyCycleStartedAt(redemptionRecords) {
  return redemptionRecords.reduce((latest, redemption) => {
    const value = redemption?.claimedAt || redemption?.createdAt;
    if (!value) return latest;
    const candidate = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(candidate.getTime())) return latest;
    return !latest || candidate > latest ? candidate : latest;
  }, null);
}
function buildLoyaltyReward(couponRecord, purchasesCompleted, redemptionRecords, now = /* @__PURE__ */ new Date()) {
  const coupon = presentCoupon(couponRecord);
  const redemptions = redemptionRecords.filter((redemption) => Number(redemption.couponId) === Number(coupon.id)).map((redemption) => presentRedemption(redemption, coupon, now));
  const progress = calculateLoyaltyProgress({
    purchasesCompleted,
    purchasesRequired: coupon.loyaltyPurchasesRequired,
    perCustomerLimit: coupon.perCustomerLimit,
    redemptions,
    now
  });
  return {
    coupon,
    purchasesCompleted,
    purchasesRequired: coupon.loyaltyPurchasesRequired,
    remaining: progress.remaining,
    progressPercent: progress.progressPercent,
    canRedeem: progress.canRedeem,
    nextCycle: progress.nextCycle,
    redeemableCycle: progress.redeemableCycle,
    limitReached: progress.limitReached,
    activeRedemptions: progress.activeRedemptions,
    walletLimit: progress.walletLimit,
    redemptions
  };
}
var ListLoyaltyCouponsService = class {
  async execute({ restaurantId, userId, now = /* @__PURE__ */ new Date() }) {
    const [coupons, purchasesCompleted] = await Promise.all([
      CouponRepository_default.findActiveLoyaltyByRestaurant(restaurantId, now),
      CouponRepository_default.countCompletedPurchases(userId, restaurantId)
    ]);
    const couponIds = coupons.map((coupon) => coupon.id);
    await CouponRepository_default.expireClaimedRedemptions({
      restaurantId,
      userId,
      couponIds,
      now
    });
    const redemptions = await CouponRepository_default.findRedemptions(
      userId,
      restaurantId,
      couponIds
    );
    const rewards = await Promise.all(
      coupons.map(async (coupon) => {
        const couponRedemptions = redemptions.filter(
          (redemption) => Number(redemption.couponId) === Number(coupon.id)
        );
        const cycleStartedAt = getLatestLoyaltyCycleStartedAt(couponRedemptions);
        const purchasesInCurrentCycle = cycleStartedAt ? await CouponRepository_default.countCompletedPurchases(userId, restaurantId, cycleStartedAt) : purchasesCompleted;
        return buildLoyaltyReward(coupon, purchasesInCurrentCycle, couponRedemptions, now);
      })
    );
    return {
      restaurantId,
      purchasesCompleted,
      rewards
    };
  }
};
var ListLoyaltyCouponsService_default = new ListLoyaltyCouponsService();

// src/modules/coupon/controllers/ListLoyaltyCouponsController.ts
var ListLoyaltyCouponsController = class {
  async handle(req, res) {
    try {
      const { restaurantId } = loyaltyRestaurantQuerySchema.parse(req.query);
      const userId = Number(req.user?.id || 0);
      const result = await ListLoyaltyCouponsService_default.execute({ restaurantId, userId });
      return res.status(200).json(result);
    } catch (error2) {
      return couponControllerError(
        res,
        error2,
        "N\xE3o foi poss\xEDvel carregar seu progresso de fidelidade."
      );
    }
  }
};
var ListLoyaltyCouponsController_default = new ListLoyaltyCouponsController();

// src/modules/coupon/services/RedeemLoyaltyCouponService.ts
function calculateRedemptionExpiresAt(coupon, claimedAt) {
  const validityDays = Math.min(
    365,
    Math.max(1, Math.trunc(Number(coupon.redemptionValidityDays || 30)))
  );
  const validityDeadline = new Date(claimedAt.getTime() + validityDays * 24 * 60 * 60 * 1e3);
  if (!coupon.expiration) return validityDeadline;
  const campaignDeadline = new Date(coupon.expiration);
  if (Number.isNaN(campaignDeadline.getTime())) return validityDeadline;
  return campaignDeadline < validityDeadline ? campaignDeadline : validityDeadline;
}
var RedeemLoyaltyCouponService = class {
  async execute({ couponId, restaurantId, userId, now = /* @__PURE__ */ new Date() }) {
    const coupon = await CouponRepository_default.findActiveById(couponId, restaurantId, now);
    if (!coupon) {
      throw new Error("Cupom indispon\xEDvel ou expirado.");
    }
    await CouponRepository_default.expireClaimedRedemptions({
      restaurantId: coupon.restaurantId,
      userId,
      couponIds: [coupon.id],
      now
    });
    const redemptions = await CouponRepository_default.findRedemptions(
      userId,
      coupon.restaurantId,
      [coupon.id]
    );
    const cycleStartedAt = getLatestLoyaltyCycleStartedAt(redemptions);
    const purchasesCompleted = await CouponRepository_default.countCompletedPurchases(
      userId,
      coupon.restaurantId,
      cycleStartedAt
    );
    const reward = buildLoyaltyReward(coupon, purchasesCompleted, redemptions, now);
    if (reward.limitReached) {
      throw new Error(
        "Voc\xEA j\xE1 atingiu o limite de resgates simult\xE2neos deste benef\xEDcio. Use o cupom guardado antes de resgatar outro."
      );
    }
    if (!reward.canRedeem || reward.redeemableCycle === null) {
      const remaining = Math.max(1, reward.remaining);
      throw new Error(
        `${remaining === 1 ? "Falta" : "Faltam"} ${remaining} ${remaining === 1 ? "compra conclu\xEDda" : "compras conclu\xEDdas"} para liberar este cupom.`
      );
    }
    try {
      const expiresAt = calculateRedemptionExpiresAt(coupon, now);
      const redemption = await CouponRepository_default.createRedemption({
        restaurantId: coupon.restaurantId,
        couponId: coupon.id,
        userId,
        cycle: reward.redeemableCycle,
        status: "CLAIMED",
        claimedAt: now,
        expiresAt
      });
      const updatedReward = buildLoyaltyReward(coupon, 0, [
        ...redemptions,
        redemption
      ], now);
      return {
        message: `Cupom ${coupon.code.toUpperCase()} resgatado. Use o c\xF3digo no seu pr\xF3ximo pedido.`,
        redemption: updatedReward.redemptions.find((item) => item.id === redemption.id),
        reward: updatedReward
      };
    } catch (error2) {
      if (error2?.code === "P2002") {
        throw new Error("Este ciclo de fidelidade j\xE1 foi resgatado.");
      }
      throw error2;
    }
  }
};
var RedeemLoyaltyCouponService_default = new RedeemLoyaltyCouponService();

// src/modules/coupon/controllers/RedeemLoyaltyCouponController.ts
var RedeemLoyaltyCouponController = class {
  async handle(req, res) {
    try {
      const couponId = couponIdSchema.parse(
        Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      );
      const { restaurantId } = loyaltyRestaurantQuerySchema.parse(req.body);
      const userId = Number(req.user?.id || 0);
      const result = await RedeemLoyaltyCouponService_default.execute({
        couponId,
        restaurantId,
        userId
      });
      return res.status(201).json(result);
    } catch (error2) {
      return couponControllerError(res, error2, "N\xE3o foi poss\xEDvel resgatar este cupom.");
    }
  }
};
var RedeemLoyaltyCouponController_default = new RedeemLoyaltyCouponController();

// src/modules/coupon/routes/CouponRoutes.ts
var router11 = Router11();
function clientMiddleware(req, res, next) {
  if (req.user?.role !== "CLIENTE" || !req.user.id) {
    return res.status(403).json({ error: "O programa de fidelidade \xE9 exclusivo para clientes." });
  }
  return next();
}
router11.get(
  "/loyalty",
  authMiddleware,
  clientMiddleware,
  (req, res) => ListLoyaltyCouponsController_default.handle(req, res)
);
router11.post(
  "/:id/redeem",
  authMiddleware,
  clientMiddleware,
  (req, res) => RedeemLoyaltyCouponController_default.handle(req, res)
);
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
  async execute({ restaurantId, plan, status, trialEndsAt }) {
    if (!isAvailablePlan(plan)) {
      throw new Error("Plano indispon\xEDvel para contrata\xE7\xE3o.");
    }
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

// src/modules/subscription/services/PlanChangePolicy.ts
var normalizeDate = (value) => new Date(value);
function evaluatePlanChangeEligibility({
  invoices,
  consumedInvoiceId,
  hasScheduledPlan = false,
  now = /* @__PURE__ */ new Date()
}) {
  if (hasScheduledPlan) {
    return {
      allowed: false,
      invoiceId: consumedInvoiceId || null,
      reason: "A escolha deste ciclo j\xE1 foi registrada e a troca est\xE1 agendada."
    };
  }
  const overdueOpenInvoice = invoices.find((invoice) => {
    const status = String(invoice.status || "").toUpperCase();
    return status === "ATRASADO" || status === "VENCIDO" || status === "PENDENTE" && normalizeDate(invoice.dueDate) < now;
  });
  if (overdueOpenInvoice) {
    return {
      allowed: false,
      invoiceId: null,
      reason: "Pague a fatura vencida para liberar a escolha do pr\xF3ximo plano."
    };
  }
  const paidOverdueInvoice = [...invoices].filter((invoice) => {
    if (String(invoice.status || "").toUpperCase() !== "PAGO" || !invoice.paidAt) {
      return false;
    }
    return normalizeDate(invoice.paidAt) > normalizeDate(invoice.dueDate);
  }).sort((left, right) => Number(right.id) - Number(left.id))[0];
  if (!paidOverdueInvoice) {
    return {
      allowed: false,
      invoiceId: null,
      reason: "A escolha ser\xE1 liberada ap\xF3s o pagamento de uma fatura vencida."
    };
  }
  if (Number(consumedInvoiceId) === paidOverdueInvoice.id) {
    return {
      allowed: false,
      invoiceId: paidOverdueInvoice.id,
      reason: "A escolha referente \xE0 \xFAltima fatura paga j\xE1 foi registrada."
    };
  }
  return {
    allowed: true,
    invoiceId: paidOverdueInvoice.id,
    reason: "Fatura vencida paga. Escolha manter o plano atual ou trocar no pr\xF3ximo ciclo."
  };
}

// src/modules/subscription/services/GetSubscriptionService.ts
var GetSubscriptionService = class {
  async execute({ restaurantId }) {
    const subscription = await SubscriptionRepository_default.findByRestaurantId(restaurantId);
    if (!subscription) {
      throw new Error("Assinatura n\xE3o encontrada!");
    }
    const invoices = await BillingRepository_default.findInvoicesByRestaurantId(Number(restaurantId));
    const planChangeEligibility = evaluatePlanChangeEligibility({
      invoices,
      consumedInvoiceId: subscription.planChangeInvoiceId,
      hasScheduledPlan: Boolean(subscription.scheduledPlan)
    });
    return {
      ...subscription,
      planChangeEligibility
    };
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
  async execute({ restaurantId, plan, status, trialEndsAt }) {
    if (plan && !isAvailablePlan(plan)) {
      throw new Error("Plano indispon\xEDvel para contrata\xE7\xE3o.");
    }
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
  return {
    month: next.getMonth() + 1,
    year: next.getFullYear()
  };
}
var RequestPlanChangeService = class {
  async execute({ restaurantId, plan }) {
    if (!Object.values(PlanType3).includes(plan) || !isAvailablePlan(plan)) {
      throw new Error("Escolha um plano dispon\xEDvel: B\xE1sico ou Premium.");
    }
    const subscription = await SubscriptionRepository_default.findByRestaurantId(restaurantId);
    if (!subscription) {
      throw new Error("Assinatura n\xE3o encontrada.");
    }
    const invoices = await BillingRepository_default.findInvoicesByRestaurantId(Number(restaurantId));
    const eligibility = evaluatePlanChangeEligibility({
      invoices,
      consumedInvoiceId: subscription.planChangeInvoiceId,
      hasScheduledPlan: Boolean(subscription.scheduledPlan)
    });
    if (!eligibility.allowed || !eligibility.invoiceId) {
      throw new Error(eligibility.reason);
    }
    if (subscription.plan === plan) {
      const updated2 = await SubscriptionRepository_default.update(restaurantId, {
        planChangeInvoiceId: eligibility.invoiceId,
        planChangeLockedUntil: null,
        scheduledPlan: null,
        scheduledPlanEffectiveMonth: null,
        scheduledPlanEffectiveYear: null
      });
      return {
        ...updated2,
        message: "Plano atual mantido para o pr\xF3ximo ciclo de faturamento."
      };
    }
    const nextPeriod = getNextMonthPeriod(/* @__PURE__ */ new Date());
    const updated = await SubscriptionRepository_default.update(restaurantId, {
      planChangeInvoiceId: eligibility.invoiceId,
      scheduledPlan: plan,
      scheduledPlanEffectiveMonth: nextPeriod.month,
      scheduledPlanEffectiveYear: nextPeriod.year,
      planChangeLockedUntil: null
    });
    return {
      ...updated,
      message: "Troca de plano agendada para o pr\xF3ximo ciclo de faturamento."
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
        "issueStatus",
        "issueResponse",
        "issueRespondedAt",
        "issueClosedAt",
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
        issueStatus: item.issueStatus,
        issueResponse: item.issueResponse,
        issueRespondedAt: item.issueRespondedAt?.toISOString?.() || null,
        issueClosedAt: item.issueClosedAt?.toISOString?.() || null,
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
      const subjectMap = new Map(firstMessages.map((m) => [m.restaurantId, m.message]));
      const tickets = grouped.map((g) => ({
        id: `#SUP-${String(g.restaurantId).padStart(4, "0")}`,
        restaurant: restaurantMap.get(g.restaurantId) ?? "Desconhecido",
        subject: (subjectMap.get(g.restaurantId) ?? "Sem mensagem").slice(0, 60),
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

// src/modules/aiSupport/controllers/UpdateSupportIssueController.ts
var validStatuses = /* @__PURE__ */ new Set(["OPEN", "IN_PROGRESS", "CLOSED"]);
var UpdateSupportIssueController = class {
  async handle(req, res) {
    try {
      if (String(req.user.role).toUpperCase() !== "ADMIN") {
        return res.status(403).json({ error: "Somente administradores podem atender relatos." });
      }
      const id = Number(req.params.id);
      const status = String(req.body?.status || "").toUpperCase();
      const response = typeof req.body?.response === "string" ? req.body.response.replace(/\s+/g, " ").trim() : "";
      if (!Number.isInteger(id) || !validStatuses.has(status)) {
        return res.status(400).json({ error: "Relato ou status inv\xE1lido." });
      }
      if (response && (response.length < 3 || response.length > 1200)) {
        return res.status(400).json({ error: "A resposta deve ter entre 3 e 1200 caracteres." });
      }
      const responder = response ? await prisma_default.user.findFirst({
        where: { id: Number(req.user.id), restaurantId: Number(req.user.restaurantId), role: "ADMIN" },
        select: { name: true }
      }) : null;
      if (response && !responder) {
        return res.status(403).json({ error: "Administrador n\xE3o encontrado para registrar a resposta." });
      }
      const result = await prisma_default.$queryRaw`
        UPDATE "SupportChatMessage"
        SET
          "issueStatus" = ${status},
          "issueResponse" = COALESCE(${response || null}, "issueResponse"),
          "issueResponderName" = COALESCE(${responder?.name || null}, "issueResponderName"),
          "issueRespondedAt" = CASE WHEN ${Boolean(response)} THEN ${/* @__PURE__ */ new Date()} ELSE "issueRespondedAt" END,
          "issueClosedAt" = ${status === "CLOSED" ? /* @__PURE__ */ new Date() : null}
        WHERE "id" = ${id} AND "restaurantId" = ${Number(req.user.restaurantId)} AND "issueStatus" IS NOT NULL
        RETURNING "id", "senderUserId"
      `;
      if (!result[0]) return res.status(404).json({ error: "Relato n\xE3o encontrado." });
      const payload = {
        id: String(result[0].id),
        status,
        response: response || null,
        responderName: responder?.name || null
      };
      io.to(`restaurant:${Number(req.user.restaurantId)}:admin`).emit(
        "support:issue-updated",
        payload
      );
      if (result[0].senderUserId && (status === "CLOSED" || response)) {
        io.to(`user:${result[0].senderUserId}`).emit("support:issue-updated", payload);
      }
      return res.status(200).json(payload);
    } catch (error2) {
      console.error("Erro ao atualizar relato de suporte:", error2);
      return res.status(500).json({ error: "N\xE3o foi poss\xEDvel atualizar o relato." });
    }
  }
};
var UpdateSupportIssueController_default = new UpdateSupportIssueController();

// src/modules/aiSupport/controllers/DeleteSupportIssueController.ts
var DeleteSupportIssueController = class {
  async handle(req, res) {
    try {
      if (String(req.user.role).toUpperCase() !== "ADMIN") {
        return res.status(403).json({ error: "Somente administradores podem excluir relatos." });
      }
      const id = Number(req.params.id);
      const restaurantId = Number(req.user.restaurantId);
      if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(restaurantId) || restaurantId <= 0) {
        return res.status(400).json({ error: "Relato inv\xE1lido." });
      }
      const deleted = await prisma_default.$queryRaw`
        DELETE FROM "SupportChatMessage"
        WHERE
          "id" = ${id}
          AND "restaurantId" = ${restaurantId}
          AND "issueStatus" = 'CLOSED'
        RETURNING "id"
      `;
      if (!deleted[0]) {
        return res.status(409).json({
          error: "Encerre o relato antes de exclu\xED-lo, ou confirme se ele pertence ao seu restaurante."
        });
      }
      io.to(`restaurant:${restaurantId}:admin`).emit("support:issue-deleted", { id: String(id) });
      return res.status(200).json({ id: String(id) });
    } catch (error2) {
      console.error("Erro ao excluir relato de suporte:", error2);
      return res.status(500).json({ error: "N\xE3o foi poss\xEDvel excluir o relato." });
    }
  }
};
var DeleteSupportIssueController_default = new DeleteSupportIssueController();

// src/modules/aiSupport/controllers/ListMySupportIssueUpdatesController.ts
var ListMySupportIssueUpdatesController = class {
  async handle(req, res) {
    try {
      const role = String(req.user.role || "").toUpperCase();
      if (role !== "FUNCIONARIO" && role !== "MOTOQUEIRO") {
        return res.status(403).json({ error: "Apenas funcion\xE1rios podem consultar seus relatos." });
      }
      const userId = Number(req.user.id);
      const restaurantId = Number(req.user.restaurantId);
      if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(restaurantId) || restaurantId <= 0) {
        return res.status(401).json({ error: "Sess\xE3o inv\xE1lida para consultar relatos." });
      }
      const updates = await prisma_default.$queryRaw`
        SELECT "id", "issueStatus", "issueResponse", "issueResponderName", "issueRespondedAt", "issueClosedAt"
        FROM "SupportChatMessage"
        WHERE
          "restaurantId" = ${restaurantId}
          AND "senderUserId" = ${userId}
          AND "issueStatus" IS NOT NULL
          AND ("issueResponse" IS NOT NULL OR "issueStatus" = 'CLOSED')
        ORDER BY "id" DESC
        LIMIT 50
      `;
      return res.status(200).json({
        updates: updates.map((item) => ({
          id: String(item.id),
          status: item.issueStatus,
          response: item.issueResponse,
          responderName: item.issueResponderName,
          respondedAt: item.issueRespondedAt?.toISOString?.() || null,
          closedAt: item.issueClosedAt?.toISOString?.() || null
        }))
      });
    } catch (error2) {
      console.error("Erro ao listar atualiza\xE7\xF5es de relatos do funcion\xE1rio:", error2);
      return res.status(500).json({ error: "N\xE3o foi poss\xEDvel carregar as atualiza\xE7\xF5es dos relatos." });
    }
  }
};
var ListMySupportIssueUpdatesController_default = new ListMySupportIssueUpdatesController();

// src/modules/aiSupport/routes/AiSupportRoutes.ts
var router13 = Router13();
router13.get("/messages", authMiddleware, (req, res) => {
  ListSupportChatMessagesController_default.handle(req, res);
});
router13.get("/my-issue-updates", authMiddleware, (req, res) => {
  ListMySupportIssueUpdatesController_default.handle(req, res);
});
router13.get("/tickets/all", authMiddleware, superAdminMiddleware, (req, res) => {
  GetAllSupportTicketsController_default.handle(req, res);
});
router13.patch(
  "/messages/:id/issue",
  authMiddleware,
  (req, res) => UpdateSupportIssueController_default.handle(req, res)
);
router13.delete(
  "/messages/:id/issue",
  authMiddleware,
  (req, res) => DeleteSupportIssueController_default.handle(req, res)
);
var AiSupportRoutes_default = router13;

// src/modules/menuImport/routes/MenuImportRoutes.ts
import { Router as Router14 } from "express";

// src/modules/menuImport/services/ImportIfoodMenuScraperService.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { z as z12 } from "zod";
var scrapeInputSchema = z12.object({
  url: z12.string().trim().url("Informe uma URL v\xE1lida do iFood."),
  restaurantId: z12.union([z12.number(), z12.string()])
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
        const name = normalizeText(graphItem.name);
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
    const candidateNames = productHints.filter((candidate) => !looksLikePrice(candidate));
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
        let category = await CategoryRepository_default.findByName(categoryName, restaurantId, db);
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
        const existingProduct = await ProductRepository_default.findByName(productName, restaurantId, db);
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
      const resolvedRestaurantId = Number(req.user?.restaurantId || bodyRestaurantId || 0);
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
import { z as z13 } from "zod";
var importedMenuItemSchema = z13.object({
  name: z13.string().trim().min(1, "Nome do item invalido."),
  description: z13.string().trim().nullable().optional(),
  price: z13.union([z13.number(), z13.string()]),
  imageUrl: z13.string().trim().url().nullable().optional()
});
var importedMenuCategorySchema = z13.object({
  name: z13.string().trim().min(1, "Nome da categoria invalido."),
  items: z13.array(importedMenuItemSchema).min(1, "Categoria sem itens.")
});
var importedMenuResponseSchema = z13.object({
  restaurantName: z13.string().trim().nullable().optional(),
  categories: z13.array(importedMenuCategorySchema).min(1, "Cardapio vazio.")
});
var importInputSchema = z13.object({
  imageUrl: z13.string().trim().url("Informe uma URL valida da imagem."),
  restaurantId: z13.union([z13.number(), z13.string()])
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
        let category = await CategoryRepository_default.findByName(categoryName, restaurantId, db);
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
          const existingProduct = await ProductRepository_default.findByName(productName, restaurantId, db);
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
      const resolvedRestaurantId = Number(req.user?.restaurantId || bodyRestaurantId || 0);
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
  if (!Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ error: "Produto inv\xE1lido." });
    return;
  }
  const product = await prisma_default.product.findFirst({
    where: { id: productId }
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

// src/modules/imageEnhancement/routes/ImageEnhancementRoutes.ts
import { Router as Router17 } from "express";

// src/modules/imageEnhancement/services/EnhanceRestaurantImageService.ts
import OpenAI2, { toFile } from "openai";
var DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/;
var EnhanceRestaurantImageService = class {
  async execute(imageDataUrl) {
    const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) throw new Error("OPENAI_API_KEY n\xE3o configurada no servidor.");
    const match = String(imageDataUrl || "").match(DATA_URL_PATTERN);
    if (!match) throw new Error("Envie uma imagem JPG, PNG ou WebP v\xE1lida.");
    const input = Buffer.from(match[2], "base64");
    if (!input.length || input.length > 5 * 1024 * 1024) {
      throw new Error("A imagem deve ter no m\xE1ximo 5 MB.");
    }
    const client = new OpenAI2({ apiKey });
    const editRequest = {
      model: "gpt-image-2",
      image: await toFile(input, "restaurant-cover.webp", { type: match[1] }),
      prompt: "Create a polished high-definition square login hero from this restaurant brand image. Faithfully restore the complete original logo, lettering, colors and identity with crisp clean edges. Place the entire logo centered and clearly visible, occupying at most 55 percent of the canvas, with generous space around it. Build a tasteful, softly lit pizza restaurant background that complements the logo. Remove blur, pixelation and compression artifacts. Do not crop the logo, do not enlarge it to fill the canvas, do not alter its wording, and do not add new text, brands or watermarks.",
      size: "1024x1024",
      quality: "high"
    };
    const result = await client.images.edit(editRequest);
    const base64 = result.data?.[0]?.b64_json;
    if (!base64) throw new Error("A IA n\xE3o retornou a imagem melhorada.");
    return { imageDataUrl: `data:image/png;base64,${base64}` };
  }
};
var EnhanceRestaurantImageService_default = new EnhanceRestaurantImageService();

// src/modules/imageEnhancement/controllers/EnhanceRestaurantImageController.ts
var EnhanceRestaurantImageController = class {
  async handle(req, res) {
    try {
      return res.json(await EnhanceRestaurantImageService_default.execute(req.body?.imageDataUrl));
    } catch (error2) {
      return res.status(400).json({
        error: error2 instanceof Error ? error2.message : "N\xE3o foi poss\xEDvel melhorar a imagem."
      });
    }
  }
};
var EnhanceRestaurantImageController_default = new EnhanceRestaurantImageController();

// src/modules/imageEnhancement/routes/ImageEnhancementRoutes.ts
var router17 = Router17();
router17.post(
  "/restaurant",
  authMiddleware,
  adminMiddleware,
  (req, res) => EnhanceRestaurantImageController_default.handle(req, res)
);
var ImageEnhancementRoutes_default = router17;

// src/modules/customerAddresses/routes/CustomerAddressRoutes.ts
import { Router as Router18 } from "express";
import { z as z14 } from "zod";
var router18 = Router18();
router18.use(authMiddleware);
var addressSchema = z14.object({
  label: z14.string().trim().min(1).max(40),
  address: z14.string().trim().min(3).max(160),
  number: z14.string().trim().regex(/^\d+[A-Za-z]?$/).max(10),
  district: z14.string().trim().min(2).max(100),
  city: z14.string().trim().min(2).max(100),
  state: z14.string().trim().length(2).transform((value) => value.toUpperCase()),
  zipCode: z14.string().transform((value) => value.replace(/\D/g, "")).refine((value) => value.length === 8),
  complement: z14.string().trim().max(160).optional().default(""),
  isDefault: z14.boolean().optional().default(false)
});
function customerId(req, res) {
  if (req.user.role !== "CLIENTE" || !req.user.id) {
    res.status(403).json({ error: "Endere\xE7os s\xE3o exclusivos para clientes." });
    return null;
  }
  return Number(req.user.id);
}
router18.get("/", async (req, res) => {
  const userId = customerId(req, res);
  if (!userId) return;
  const addresses = await prisma_default.userAddress.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
  });
  res.json({ addresses });
});
router18.post("/", async (req, res) => {
  const userId = customerId(req, res);
  if (!userId) return;
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Preencha todos os dados do endere\xE7o corretamente." });
    return;
  }
  const count = await prisma_default.userAddress.count({ where: { userId } });
  const makeDefault = parsed.data.isDefault || count === 0;
  const address = await prisma_default.$transaction(async (tx) => {
    if (makeDefault)
      await tx.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.userAddress.create({
      data: {
        userId,
        label: parsed.data.label,
        address: parsed.data.address,
        number: parsed.data.number,
        district: parsed.data.district,
        city: parsed.data.city,
        state: parsed.data.state,
        zipCode: parsed.data.zipCode,
        complement: parsed.data.complement || null,
        isDefault: makeDefault
      }
    });
  });
  res.status(201).json({ address });
});
router18.put("/:id/default", async (req, res) => {
  const userId = customerId(req, res);
  if (!userId) return;
  const id = Number(req.params.id);
  const exists = await prisma_default.userAddress.findFirst({ where: { id, userId } });
  if (!exists) {
    res.status(404).json({ error: "Endere\xE7o n\xE3o encontrado." });
    return;
  }
  const address = await prisma_default.$transaction(async (tx) => {
    await tx.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.userAddress.update({ where: { id }, data: { isDefault: true } });
  });
  res.json({ address });
});
var CustomerAddressRoutes_default = router18;

// src/modules/orders/controllers/AsaasOrderWebhookController.ts
var TERMINAL_UNPAID_EVENTS = /* @__PURE__ */ new Set([
  "PAYMENT_CANCELED",
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED"
]);
var AsaasOrderWebhookController = class {
  async handle(req, res) {
    try {
      const tokenFromHeader = String(req.header("asaas-access-token") || "").trim();
      const expectedToken = String(process.env.ASAAS_WEBHOOK_TOKEN || "").trim();
      if (!expectedToken || tokenFromHeader !== expectedToken) {
        return res.status(401).json({ error: "Token de webhook invalido." });
      }
      const payload = req.body;
      const event = String(payload?.event || "").trim().toUpperCase();
      const isPaymentReceived = event === "PAYMENT_RECEIVED";
      const isTerminalUnpaidEvent = TERMINAL_UNPAID_EVENTS.has(event);
      if (!isPaymentReceived && !isTerminalUnpaidEvent) {
        return res.status(200).json({ received: true, ignored: true });
      }
      const payment = payload?.payment;
      const externalReference = String(payment?.externalReference || "").trim();
      const asaasPaymentId = String(payment?.id || "").trim();
      const paymentValue = Number(payment?.value);
      const walletId = String(payment?.walletId || "").trim();
      const hasRequiredPaymentFields = Boolean(asaasPaymentId) && Boolean(externalReference) && (isTerminalUnpaidEvent || Number.isFinite(paymentValue) && paymentValue >= 0 && Boolean(walletId));
      if (!hasRequiredPaymentFields) {
        return res.status(200).json({ received: true, ignored: true });
      }
      const pixReference = /^orderpix:(\d+):(\d+)$/i.exec(externalReference);
      const referencedRestaurantId = pixReference ? Number(pixReference[1]) : null;
      const orderId = Number(pixReference?.[2] || externalReference);
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
          status: true,
          paymentMethod: true,
          pixPaymentId: true,
          total: true
        }
      });
      if (!order) {
        return res.status(200).json({ received: true, ignored: true });
      }
      if (referencedRestaurantId && referencedRestaurantId !== order.restaurantId) {
        return res.status(200).json({ received: true, ignored: true });
      }
      if (isTerminalUnpaidEvent) {
        await FailPendingOrderPaymentService_default.execute({
          orderId: order.id,
          restaurantId: order.restaurantId
        });
        return res.status(200).json({ received: true, processed: true });
      }
      if (Math.abs(paymentValue - Number(order.total)) > 9e-3) {
        return res.status(200).json({ received: true, ignored: true });
      }
      const normalizedPaymentMethod = String(order.paymentMethod || "").trim().toUpperCase();
      const isSupportedAutomaticMethod = normalizedPaymentMethod === "PIX" || normalizedPaymentMethod === "CARTAO";
      if (!isSupportedAutomaticMethod) {
        return res.status(200).json({ received: true, ignored: true });
      }
      if (String(order.status) === "CANCELADO" && order.paid !== true) {
        await ReconcileLateCancelledPaymentService_default.execute({
          orderId: order.id,
          restaurantId: order.restaurantId,
          paymentMethod: normalizedPaymentMethod,
          paymentReference: normalizedPaymentMethod === "PIX" ? `asaas:${asaasPaymentId}` : `asaas_pay:${asaasPaymentId}`
        });
        return res.status(200).json({ received: true, processed: true, refunded: true });
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
        if (normalizedPaymentMethod === "PIX" && asaasPaymentId && !String(order.pixPaymentId || "").trim()) {
          await prisma_default.order.update({
            where: {
              id: order.id
            },
            data: {
              pixPaymentId: `asaas:${asaasPaymentId}`
            }
          });
        }
        const updatedOrder = await prisma_default.$transaction(async (tx) => {
          const confirmedOrder = await OrderRepository_default.confirmPayment(
            order.id,
            order.restaurantId,
            tx
          );
          await markCouponRedemptionUsedForOrder(order.id, order.restaurantId, tx);
          return confirmedOrder;
        });
        io.to(`restaurant:${updatedOrder.restaurantId}`).emit("order:payment-confirmed", {
          orderId: updatedOrder.id,
          paid: true,
          paymentMethod: updatedOrder.paymentMethod
        });
        io.to(`restaurant:${updatedOrder.restaurantId}`).emit("new-order", updatedOrder);
        io.to(`restaurant:${updatedOrder.restaurantId}`).emit("order:status-changed", updatedOrder);
        io.to(`restaurant:${updatedOrder.restaurantId}:kitchen`).emit("kitchen:order-paid", {
          orderId: updatedOrder.id,
          restaurantId: updatedOrder.restaurantId,
          paid: true
        });
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
      return res.status(500).json({ received: true, processed: false });
    }
  }
};
var AsaasOrderWebhookController_default = new AsaasOrderWebhookController();

// src/modules/restaurantSettings/controllers/AsaasWithdrawValidationWebhookController.ts
var AsaasWithdrawValidationWebhookController = class {
  async handle(req, res) {
    try {
      const tokenFromHeader = String(req.header("asaas-access-token") || "").trim();
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

// src/modules/ingredients/routes/ingredientRoutes.ts
import { Router as Router19 } from "express";

// src/validators/IngredientValidator.ts
import { z as z15 } from "zod";
var createIngredientSchema = z15.object({
  name: z15.string().trim().min(1, "Nome do ingrediente \xE9 obrigat\xF3rio.").max(80),
  category: z15.string({
    invalid_type_error: "A categoria do ingrediente deve ser um texto.",
    required_error: "Categoria do ingrediente \xE9 obrigat\xF3ria."
  }).trim().min(1, "Categoria do ingrediente \xE9 obrigat\xF3ria.").max(60, "A categoria deve ter no m\xE1ximo 60 caracteres."),
  price: z15.number({
    invalid_type_error: "O valor adicional deve ser um n\xFAmero.",
    required_error: "O valor adicional \xE9 obrigat\xF3rio."
  }).min(0, "O valor adicional n\xE3o pode ser negativo.").max(99999, "O valor adicional informado \xE9 muito alto."),
  active: z15.boolean().optional()
});
var updateIngredientSchema = createIngredientSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "Informe ao menos um campo para atualizar."
);

// src/modules/ingredients/repositories/IngredientRepository.ts
var IngredientRepository = class {
  async findAll(restaurantId, db = prisma_default) {
    return db.ingredient.findMany({
      where: { restaurantId },
      orderBy: [{ category: "asc" }, { active: "desc" }, { name: "asc" }]
    });
  }
  async findById(id, restaurantId, db = prisma_default) {
    return db.ingredient.findFirst({ where: { id, restaurantId } });
  }
  async findByName(name, restaurantId, db = prisma_default) {
    return db.ingredient.findFirst({
      where: {
        restaurantId,
        name: { equals: name.trim(), mode: "insensitive" }
      }
    });
  }
  async create(data, restaurantId, db = prisma_default) {
    return db.ingredient.create({ data: { ...data, restaurantId } });
  }
  async update(id, data, restaurantId, db = prisma_default) {
    await db.ingredient.updateMany({ where: { id, restaurantId }, data });
    return this.findById(id, restaurantId, db);
  }
  async delete(id, restaurantId, db = prisma_default) {
    const usedByProduct = await db.productOption.findFirst({
      where: {
        ingredientId: id,
        group: { restaurantId }
      },
      select: { id: true }
    });
    if (usedByProduct) {
      throw new Error(
        "Este ingrediente est\xE1 vinculado a um produto. Remova-o dos grupos ou desative-o."
      );
    }
    return db.ingredient.deleteMany({ where: { id, restaurantId } });
  }
};
var IngredientRepository_default = new IngredientRepository();

// src/modules/ingredients/services/IngredientServices.ts
function assertRestaurantId(restaurantId) {
  if (!Number.isInteger(Number(restaurantId)) || Number(restaurantId) <= 0) {
    throw new Error("Restaurante n\xE3o encontrado.");
  }
  return Number(restaurantId);
}
var ListIngredientsService = class {
  async execute(restaurantId) {
    const tenantId = assertRestaurantId(restaurantId);
    const ingredients = await IngredientRepository_default.findAll(tenantId);
    const categories = [...new Set(ingredients.map((ingredient) => ingredient.category))].sort(
      (left, right) => left.localeCompare(right, "pt-BR")
    );
    return { ingredients, count: ingredients.length, categories };
  }
};
var CreateIngredientService = class {
  async execute(input, restaurantId) {
    const tenantId = assertRestaurantId(restaurantId);
    const data = createIngredientSchema.parse(input);
    const duplicate = await IngredientRepository_default.findByName(data.name, tenantId);
    if (duplicate) {
      throw new Error("J\xE1 existe um ingrediente com este nome neste restaurante.");
    }
    return IngredientRepository_default.create(
      {
        name: data.name,
        category: data.category,
        price: data.price,
        active: data.active ?? true
      },
      tenantId
    );
  }
};
var UpdateIngredientService = class {
  async execute(id, input, restaurantId) {
    const tenantId = assertRestaurantId(restaurantId);
    const ingredientId = Number(id);
    const data = updateIngredientSchema.parse(input);
    const existing = await IngredientRepository_default.findById(ingredientId, tenantId);
    if (!existing) {
      throw new Error("Ingrediente n\xE3o encontrado neste restaurante.");
    }
    if (data.name) {
      const duplicate = await IngredientRepository_default.findByName(data.name, tenantId);
      if (duplicate && duplicate.id !== ingredientId) {
        throw new Error("J\xE1 existe um ingrediente com este nome neste restaurante.");
      }
    }
    return IngredientRepository_default.update(ingredientId, data, tenantId);
  }
};
var DeleteIngredientService = class {
  async execute(id, restaurantId) {
    const tenantId = assertRestaurantId(restaurantId);
    const ingredientId = Number(id);
    const existing = await IngredientRepository_default.findById(ingredientId, tenantId);
    if (!existing) {
      throw new Error("Ingrediente n\xE3o encontrado neste restaurante.");
    }
    await IngredientRepository_default.delete(ingredientId, tenantId);
    return { message: "Ingrediente exclu\xEDdo com sucesso." };
  }
};
var listIngredientsService = new ListIngredientsService();
var createIngredientService = new CreateIngredientService();
var updateIngredientService = new UpdateIngredientService();
var deleteIngredientService = new DeleteIngredientService();

// src/modules/ingredients/controllers/IngredientControllers.ts
function errorMessage(error2, fallback) {
  return error2 instanceof Error ? error2.message : fallback;
}
async function listIngredients(req, res) {
  try {
    return res.json(await listIngredientsService.execute(Number(req.user?.restaurantId)));
  } catch (error2) {
    return res.status(400).json({ error: errorMessage(error2, "Erro ao listar ingredientes.") });
  }
}
async function createIngredient(req, res) {
  try {
    const ingredient = await createIngredientService.execute(
      req.body,
      Number(req.user?.restaurantId)
    );
    return res.status(201).json(ingredient);
  } catch (error2) {
    return res.status(400).json({ error: errorMessage(error2, "Erro ao criar ingrediente.") });
  }
}
async function updateIngredient(req, res) {
  try {
    const ingredient = await updateIngredientService.execute(
      Number(req.params.id),
      req.body,
      Number(req.user?.restaurantId)
    );
    return res.json(ingredient);
  } catch (error2) {
    return res.status(400).json({ error: errorMessage(error2, "Erro ao atualizar ingrediente.") });
  }
}
async function deleteIngredient(req, res) {
  try {
    return res.json(
      await deleteIngredientService.execute(
        Number(req.params.id),
        Number(req.user?.restaurantId)
      )
    );
  } catch (error2) {
    return res.status(400).json({ error: errorMessage(error2, "Erro ao excluir ingrediente.") });
  }
}

// src/modules/ingredients/routes/ingredientRoutes.ts
var router19 = Router19();
router19.use(authMiddleware, adminMiddleware);
router19.get("/", listIngredients);
router19.post("/", createIngredient);
router19.put("/:id", updateIngredient);
router19.delete("/:id", deleteIngredient);
var ingredientRoutes_default = router19;

// src/routes/index.ts
var router20 = Router20();
router20.post("/api/webhooks/asaas", (req, res) => {
  AsaasOrderWebhookController_default.handle(req, res);
});
router20.post("/api/webhooks/asaas/withdraw-validation", (req, res) => {
  AsaasWithdrawValidationWebhookController_default.handle(req, res);
});
router20.use("/auth", authRoutes_default);
router20.use("/restaurants", restaurantRoutes_default);
router20.use("/categories", CategoryRoutes_default);
router20.use("/products", productsRoutes_default);
router20.use("/ingredients", ingredientRoutes_default);
router20.use("/orders", orderRoutes_default);
router20.use("/employees", EmployeeRoutes_default);
router20.use("/table-sessions", SessionsTablesRoutes_default);
router20.use("/tables", TablesRoutes_default);
router20.use("/settings", RestaurantSettingsRoutes_default);
router20.use("/banners", BannerRoutes_default);
router20.use("/coupons", CouponRoutes_default);
router20.use("/subscription", SubscriptionRoutes_default);
router20.use("/ai-support", AiSupportRoutes_default);
router20.use("/menu-import", MenuImportRoutes_default);
router20.use("/audit-logs", AuditRoutes_default);
router20.use("/favorites", FavoriteRoutes_default);
router20.use("/image-enhancement", ImageEnhancementRoutes_default);
router20.use("/customer-addresses", CustomerAddressRoutes_default);
router20.get("/profile", authMiddleware, (req, res) => {
  return res.json({
    message: "Rota protegida!",
    user: req.user
  });
});
var routes_default = router20;

// src/modules/billing/routes/BillingRoutes.ts
import { Router as Router21 } from "express";

// src/modules/billing/services/MercadoPagoClient.ts
import { MercadoPagoConfig as MercadoPagoConfig3, Payment as Payment3 } from "mercadopago";

// src/modules/billing/config/platformMercadoPago.ts
function getPlatformMercadoPagoAccessToken() {
  return String(process.env.PLATFORM_MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || "").trim();
}
function requirePlatformMercadoPagoAccessToken() {
  const accessToken = getPlatformMercadoPagoAccessToken();
  if (!accessToken) {
    throw new Error(
      "Mercado Pago da plataforma n\xE3o configurado. Defina PLATFORM_MP_ACCESS_TOKEN no backend."
    );
  }
  return accessToken;
}

// src/modules/billing/services/MercadoPagoClient.ts
function createPlatformClient() {
  return new MercadoPagoConfig3({
    accessToken: requirePlatformMercadoPagoAccessToken()
  });
}
function getPlatformPaymentClient() {
  return new Payment3(createPlatformClient());
}

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
      const existingInvoice = await BillingRepository_default.findInvoiceById(normalizedInvoiceId, tx);
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
var APPROVED_STATUSES2 = /* @__PURE__ */ new Set(["approved", "paid", "authorized", "settled"]);
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
var MercadoPagoWebhookController = class {
  async handle(req, res) {
    try {
      const paymentId = req.body?.data?.id || req.body?.id || req.query?.id;
      debug("MP webhook received", { paymentId });
      if (!paymentId) {
        debug("webhook ignored: missing paymentId");
        return res.sendStatus(200);
      }
      const paymentApi = getPlatformPaymentClient();
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
      const isEnabled = process.env.NODE_ENV !== "production" && String(process.env.ENABLE_TEST_PAYMENT_WEBHOOK || "false").toLowerCase() === "true";
      const configuredSecret = String(process.env.TEST_PAYMENT_WEBHOOK_SECRET || "").trim();
      const receivedSecret = String(req.headers["x-test-webhook-secret"] || "").trim();
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

// src/modules/billing/utils/billingTimeline.ts
function getBillingStartDate(restaurantCreatedAt, adminCreatedAt) {
  if (!adminCreatedAt) return new Date(restaurantCreatedAt);
  return new Date(Math.max(restaurantCreatedAt.getTime(), adminCreatedAt.getTime()));
}
function getCompletedSubscriptionMonths(startedAt, referenceDate = /* @__PURE__ */ new Date()) {
  if (referenceDate <= startedAt) return 0;
  let months = (referenceDate.getFullYear() - startedAt.getFullYear()) * 12 + referenceDate.getMonth() - startedAt.getMonth();
  if (referenceDate.getDate() < startedAt.getDate()) months -= 1;
  return Math.max(0, months);
}

// src/modules/billing/utils/billingPaymentWindow.ts
function getPixAvailableAt(dueDate) {
  const availableAt = new Date(dueDate);
  const configuredDays = Number(process.env.BILLING_PIX_OPEN_DAYS_BEFORE_DUE || 5);
  const daysBeforeDue = Number.isFinite(configuredDays) && configuredDays >= 0 ? Math.floor(configuredDays) : 5;
  availableAt.setDate(availableAt.getDate() - daysBeforeDue);
  return availableAt;
}
function isInvoicePixAvailable(invoice, now = /* @__PURE__ */ new Date()) {
  const status = String(invoice.status || "").toUpperCase();
  if (!["PENDENTE", "ATRASADO", "VENCIDO"].includes(status)) {
    return false;
  }
  return now >= getPixAvailableAt(invoice.dueDate);
}

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
      const subscriptionStatus = String(subscription?.status || "").toUpperCase();
      const isPlanActive = subscriptionStatus === "ATIVA" || subscriptionStatus === "TESTE";
      const admin = subscription?.restaurant.users[0] || null;
      const restaurantCreatedAt = subscription?.restaurant.createdAt || null;
      const billingStartedAt = restaurantCreatedAt ? getBillingStartDate(restaurantCreatedAt, admin?.createdAt) : subscription?.createdAt || null;
      const payableInvoice = invoices.find(
        (invoice) => ["PENDENTE", "ATRASADO"].includes(invoice.status)
      );
      const billing = {
        plan: String(subscription?.plan || "BASICO").toUpperCase(),
        subscriptionStatus,
        isPlanActive,
        restaurantCreatedAt,
        adminCreatedAt: admin?.createdAt || null,
        adminName: admin?.name || null,
        billingStartedAt,
        completedMonths: billingStartedAt ? getCompletedSubscriptionMonths(billingStartedAt) : 0,
        currentCycle: billingStartedAt ? getCompletedSubscriptionMonths(billingStartedAt) + 1 : 1,
        currentInvoiceId: payableInvoice?.id || null,
        dueDate: payableInvoice?.dueDate || null,
        graceLimitDate: payableInvoice?.dueDate ? getGraceLimitDate(payableInvoice.dueDate) : null,
        pixAvailableAt: payableInvoice?.dueDate ? getPixAvailableAt(payableInvoice.dueDate) : null,
        pixAvailable: payableInvoice ? isInvoicePixAvailable(payableInvoice) : false
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
    const plans = Object.entries(PLAN_CONFIG).filter(([, config]) => config.availableForSale).map(([key, config]) => ({
      plan: key,
      name: config.name,
      monthlyFee: config.monthlyFee,
      trialDays: config.trialDays,
      features: config.features
    }));
    return res.status(200).json(plans);
  }
};
var GetPlansController_default = new GetPlansController();

// src/modules/billing/services/MercadoPagoService.ts
var MercadoPagoService = class {
  async createPayment({
    invoiceId,
    title,
    description,
    amount,
    payerEmail
  }) {
    const isProduction2 = process.env.NODE_ENV === "production";
    const port2 = process.env.PORT || 3e3;
    const backendBaseUrl = String(process.env.BACKEND_URL || "").trim();
    const fallbackUrl = backendBaseUrl ? `${backendBaseUrl}/billing/webhook/mercadopago` : `http://localhost:${port2}/billing/webhook/mercadopago`;
    const notificationUrl = String(process.env.MP_NOTIFICATION_URL || fallbackUrl).trim();
    if (isProduction2 && (!notificationUrl || notificationUrl.includes("localhost"))) {
      throw new Error(
        "Webhook Mercado Pago inv\xE1lido para produ\xE7\xE3o. Configure MP_NOTIFICATION_URL com uma URL p\xFAblica HTTPS."
      );
    }
    const expiresAt = new Date(Date.now() + 30 * 60 * 1e3).toISOString();
    debug("creating Mercado Pago Pix", { invoiceId, amount: Number(amount) });
    try {
      const payment = getPlatformPaymentClient();
      const response = await payment.create({
        body: {
          transaction_amount: Number(amount),
          payment_method_id: "pix",
          description: `${title} - ${description}`,
          external_reference: String(invoiceId),
          notification_url: notificationUrl,
          date_of_expiration: expiresAt,
          payer: { email: payerEmail }
        },
        requestOptions: {
          idempotencyKey: `invoice-pix-${invoiceId}-${Date.now()}`
        }
      });
      const transaction = response.point_of_interaction?.transaction_data;
      if (!response.id || !transaction?.qr_code || !transaction.qr_code_base64) {
        throw new Error("Mercado Pago n\xE3o retornou os dados do Pix.");
      }
      return {
        id: String(response.id),
        status: response.status || null,
        qrCode: transaction.qr_code,
        qrCodeBase64: transaction.qr_code_base64,
        ticketUrl: transaction.ticket_url || null,
        expiresAt: response.date_of_expiration || expiresAt
      };
    } catch (error2) {
      error("failed to create Mercado Pago Pix", {
        invoiceId,
        message: error2 instanceof Error ? error2.message : String(error2)
      });
      throw error2;
    }
  }
};
var MercadoPagoService_default = new MercadoPagoService();

// src/modules/billing/services/RegenerateInvoicePaymentLinkService.ts
var RegenerateInvoicePaymentLinkService = class {
  async execute({ invoiceId, restaurantId }) {
    const invoice = await BillingRepository_default.findInvoiceByIdAndRestaurantId(invoiceId, restaurantId);
    if (!invoice) {
      throw new Error("Fatura n\xE3o encontrada para este restaurante.");
    }
    if (!["PENDENTE", "ATRASADO"].includes(invoice.status)) {
      throw new Error("Esta mensalidade n\xE3o est\xE1 dispon\xEDvel para pagamento.");
    }
    if (!isInvoicePixAvailable(invoice)) {
      throw new Error(
        `O Pix desta mensalidade estar\xE1 dispon\xEDvel em ${getPixAvailableAt(invoice.dueDate).toLocaleDateString("pt-BR")}.`
      );
    }
    const payment = await MercadoPagoService_default.createPayment({
      invoiceId: invoice.id,
      title: `Mensalidade restaurante ${invoice.restaurantId}`,
      description: `Fatura ${invoice.month}/${invoice.year}`,
      amount: invoice.total,
      payerEmail: invoice.restaurant.email
    });
    const updatedInvoice = await BillingRepository_default.updateInvoice(invoice.id, {
      paymentLink: payment.ticketUrl,
      paymentExternalId: payment.id,
      pixQrCode: payment.qrCode,
      pixQrCodeBase64: payment.qrCodeBase64,
      pixExpiresAt: payment.expiresAt ? new Date(payment.expiresAt) : null
    });
    return {
      invoice: updatedInvoice,
      paymentLink: payment.ticketUrl,
      pixQrCode: payment.qrCode,
      pixQrCodeBase64: payment.qrCodeBase64,
      pixExpiresAt: payment.expiresAt
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
var router21 = Router21();
router21.post("/webhook/mercadopago", MercadoPagoWebhookController_default.handle);
router21.post("/webhook/mercadopago/test", BillingWebhookController_default.handle);
router21.get(
  "/plans",
  authMiddleware,
  adminMiddleware,
  (req, res) => GetPlansController_default.handle(req, res)
);
router21.get(
  "/invoices",
  authMiddleware,
  adminMiddleware,
  (req, res) => GetInvoicesController_default.handle(req, res)
);
router21.get(
  "/invoices/all",
  authMiddleware,
  superAdminMiddleware,
  (req, res) => GetAllInvoicesController_default.handle(req, res)
);
router21.post(
  "/invoices/:id/regenerate-link",
  authMiddleware,
  adminMiddleware,
  (req, res) => RegenerateInvoicePaymentLinkController_default.handle(req, res)
);
var BillingRoutes_default = router21;

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

// src/middlewares/security/httpAccessProtection.ts
import cors from "cors";
import rateLimit5 from "express-rate-limit";
var normalizeOrigin = (value) => value.trim().replace(/\/+$/, "");
function resolveGlobalRateLimitMax(isProduction2, configuredMax) {
  return isProduction2 ? configuredMax : Math.max(configuredMax, 5e3);
}
function applyCorsAndGlobalRateLimit(app2) {
  const isProduction2 = process.env.NODE_ENV === "production";
  const allowedOrigins = [process.env.CORS_ORIGINS || "", process.env.FRONTEND_URL || ""].flatMap((value) => value.split(",")).map((origin) => normalizeOrigin(origin)).filter(Boolean);
  const configuredMax = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 300);
  app2.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        const normalizedOrigin = normalizeOrigin(origin);
        if (!isProduction2 || allowedOrigins.includes(normalizedOrigin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true
    })
  );
  app2.use(
    rateLimit5({
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1e3),
      max: resolveGlobalRateLimitMax(isProduction2, configuredMax),
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: "Muitas requisicoes. Tente novamente em instantes."
      }
    })
  );
}

// src/app.ts
var app = express();
var authRateLimit = rateLimit6({
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
applyCorsAndGlobalRateLimit(app);
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

// src/socket/supportChatPolicy.ts
var operationalRoles = /* @__PURE__ */ new Set(["FUNCIONARIO", "MOTOQUEIRO"]);
var allowedRoles = /* @__PURE__ */ new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "FUNCIONARIO",
  "MOTOQUEIRO"
]);
function normalizeSupportChatRole(role) {
  return String(role || "").trim().toUpperCase();
}
function canSendSupportChat(role) {
  return allowedRoles.has(normalizeSupportChatRole(role));
}
function isOperationalSupportReporter(role) {
  return operationalRoles.has(normalizeSupportChatRole(role));
}
function getSupportMessageSender(role) {
  const normalizedRole = normalizeSupportChatRole(role);
  if (normalizedRole === "MOTOQUEIRO") {
    return { senderRole: normalizedRole, senderLabel: "Motoqueiro" };
  }
  if (normalizedRole === "FUNCIONARIO") {
    return { senderRole: normalizedRole, senderLabel: "Funcion\xE1rio" };
  }
  if (normalizedRole === "SUPER_ADMIN") {
    return { senderRole: normalizedRole, senderLabel: "Super Admin" };
  }
  return { senderRole: "ADMIN", senderLabel: "Admin" };
}

// src/socket/employeeIssuePayload.ts
function normalizeText3(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}
function validateEmployeeIssuePayload(rawPayload) {
  if (rawPayload?.type !== "employee-issue") return { isEmployeeIssue: false };
  const reporterName = normalizeText3(rawPayload.reporterName);
  const reporterRole = normalizeText3(rawPayload.reporterRole);
  const subject = normalizeText3(rawPayload.subject);
  const description = normalizeText3(rawPayload.description);
  if (reporterName.length < 3 || reporterName.length > 100) {
    return { isEmployeeIssue: true, ok: false, error: "Informe seu nome para enviar o relato." };
  }
  const reporterRoleLabel = reporterRole === "kitchen" ? "Cozinheiro" : reporterRole === "waiter" ? "Gar\xE7om" : reporterRole === "courier" ? "Motoqueiro" : null;
  if (!reporterRoleLabel) {
    return { isEmployeeIssue: true, ok: false, error: "Fun\xE7\xE3o do funcion\xE1rio inv\xE1lida." };
  }
  if (subject.length < 3 || subject.length > 100) {
    return { isEmployeeIssue: true, ok: false, error: "Informe um assunto v\xE1lido para o relato." };
  }
  if (description.length < 5 || description.length > 900) {
    return {
      isEmployeeIssue: true,
      ok: false,
      error: "Explique o problema com pelo menos 5 caracteres (m\xE1x. 900)."
    };
  }
  return {
    isEmployeeIssue: true,
    ok: true,
    reporterName,
    message: `Relato de problema
Remetente: ${reporterName} (${reporterRoleLabel})
Assunto: ${subject}
Descri\xE7\xE3o: ${description}`
  };
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
    const hasValidCoordinates2 = Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
    if (!hasValidCoordinates2) {
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
    const normalizedRole = normalizeSupportChatRole(role);
    const isOperationalRole = isOperationalSupportReporter(normalizedRole);
    if (!canSendSupportChat(normalizedRole)) {
      reply({ ok: false, error: "Sem permiss\xE3o para usar este chat." });
      return;
    }
    const employeeIssue = validateEmployeeIssuePayload(rawPayload || {});
    let employeeIssueMessage = null;
    let employeeIssueReporterName = null;
    if (employeeIssue.isEmployeeIssue) {
      if (!isOperationalRole) {
        reply({
          ok: false,
          error: "Esse tipo de relato est\xE1 dispon\xEDvel apenas para funcion\xE1rios."
        });
        return;
      }
      if ("error" in employeeIssue) {
        reply({ ok: false, error: employeeIssue.error });
        return;
      }
      employeeIssueMessage = employeeIssue.message;
      employeeIssueReporterName = employeeIssue.reporterName;
    }
    const normalizedMessage = employeeIssueMessage ? employeeIssueMessage : String(rawPayload?.message || "").replace(/\s+/g, " ").trim();
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
    if (isOperationalRole) {
      const activeEmployee = await prisma_default.user.findFirst({
        where: {
          id: Number(id || 0),
          restaurantId: targetRestaurantId,
          role: normalizedRole,
          active: true
        },
        select: { id: true }
      });
      if (!activeEmployee) {
        reply({
          ok: false,
          error: "Seu acesso n\xE3o est\xE1 vinculado a este restaurante. Entre novamente ou fale com o administrador."
        });
        return;
      }
    }
    if (!isOperationalRole) {
      const subscription = await prisma_default.subscription.findUnique({
        where: {
          restaurantId: targetRestaurantId
        },
        select: {
          plan: true
        }
      });
      const plan = String(subscription?.plan || "").toUpperCase();
      const supportChatEnabledPlan = plan === "BASICO" || plan === "PREMIUM";
      if (!supportChatEnabledPlan) {
        reply({
          ok: false,
          error: "Chat com Super Admin dispon\xEDvel nos planos ativos do sistema."
        });
        return;
      }
    }
    let savedMessage;
    const { senderRole: senderRoleValue, senderLabel: senderLabelValue } = getSupportMessageSender(normalizedRole);
    const senderLabel = employeeIssueReporterName ? `${senderLabelValue} \xB7 ${employeeIssueReporterName}` : senderLabelValue;
    try {
      const insertedRows = await prisma_default.$queryRaw`
        INSERT INTO "SupportChatMessage" (
          "restaurantId",
          "senderUserId",
          "senderRole",
          "senderLabel",
          "message",
          "issueStatus"
        )
        VALUES (
          ${targetRestaurantId},
          ${Number(id || 0) || null},
          CAST(${senderRoleValue} AS "SupportChatSenderRole"),
          ${senderLabel},
          ${normalizedMessage},
          ${employeeIssueReporterName ? "OPEN" : null}
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
      console.error("Erro ao salvar relato no chat de suporte:", {
        error: error2,
        restaurantId: targetRestaurantId,
        senderRole: senderRoleValue,
        isEmployeeIssue: Boolean(employeeIssueReporterName)
      });
      reply({
        ok: false,
        error: "N\xE3o foi poss\xEDvel registrar o relato agora. Tente novamente em instantes."
      });
      return;
    }
    const payload = {
      id: String(savedMessage.id),
      message: savedMessage.message,
      senderRole: savedMessage.senderRole,
      senderUserId: Number(savedMessage.senderUserId || 0) || 0,
      senderLabel: savedMessage.senderLabel,
      issueStatus: employeeIssueReporterName ? "OPEN" : null,
      restaurantId: savedMessage.restaurantId,
      sentAt: savedMessage.sentAt?.toISOString?.() || (/* @__PURE__ */ new Date()).toISOString()
    };
    socket.to(`user:${id}`).emit("support:chat-message", payload);
    socket.emit("support:chat-message", payload);
    if (isOperationalRole) {
      socket.to(`restaurant:${targetRestaurantId}:admin`).emit("support:chat-message", payload);
      reply({ ok: true });
      return;
    }
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
  async execute({ restaurantId, month, year, startDate, endDate }) {
    const subscription = await BillingRepository_default.findSubscriptionByRestaurantId(restaurantId);
    if (!subscription) {
      throw new Error("Assinatura n\xE3o encontrada.");
    }
    let activePlan = subscription.plan;
    const shouldApplyScheduledPlan = subscription.scheduledPlan && subscription.scheduledPlanEffectiveMonth === month && subscription.scheduledPlanEffectiveYear === year;
    if (shouldApplyScheduledPlan) {
      const updatedSubscription = await BillingRepository_default.updateSubscription(subscription.id, {
        plan: subscription.scheduledPlan,
        scheduledPlan: null,
        scheduledPlanEffectiveMonth: null,
        scheduledPlanEffectiveYear: null
      });
      activePlan = updatedSubscription.plan;
    }
    const plan = PLAN_CONFIG[activePlan];
    if (!plan) {
      throw new Error("Plano inv\xE1lido.");
    }
    const invoiceExists = await BillingRepository_default.findInvoiceByMonth(restaurantId, month, year);
    if (invoiceExists) {
      return invoiceExists;
    }
    const total = plan.monthlyFee;
    const trialEndsAtDate = subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null;
    const dueDate = subscription.status === "TESTE" && trialEndsAtDate && !Number.isNaN(trialEndsAtDate.getTime()) ? trialEndsAtDate : addDays(/* @__PURE__ */ new Date(), 30);
    return BillingRepository_default.createInvoice({
      restaurantId,
      month,
      year,
      monthlyFee: plan.monthlyFee,
      systemFees: 0,
      total,
      dueDate,
      status: "PENDENTE"
    });
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
    const enabled = String(process.env.MP_AUTO_RECONCILE_ENABLED || "true").toLowerCase();
    return enabled !== "false";
  }
  getAccessToken() {
    return getPlatformMercadoPagoAccessToken();
  }
  getApiBaseUrl() {
    return String(process.env.MP_API_BASE_URL || "https://api.mercadopago.com").trim();
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
      throw new Error(`MP search failed [${response.status}] for invoice ${invoiceId}`);
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
      warn("MP auto reconciliation skipped: missing PLATFORM_MP_ACCESS_TOKEN");
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
        const payment = await this.fetchLatestPaymentStatus(invoice.id, accessToken);
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
    const configuredDays = Number(process.env.DELIVERY_LOCATION_RETENTION_DAYS || 30);
    const retentionDays = Number.isFinite(configuredDays) ? Math.min(Math.max(Math.floor(configuredDays), 1), 365) : 30;
    const cutoff = new Date(Date.now() - retentionDays * 864e5);
    return prisma_default.deliveryLocation.deleteMany({
      where: { recordedAt: { lt: cutoff } }
    });
  }
};
var DeliveryLocationCleanupJob_default = new DeliveryLocationCleanupJob();

// src/modules/coupon/jobs/LoyaltyRedemptionExpirationJob.ts
var LoyaltyRedemptionExpirationJob = class {
  async execute(now = /* @__PURE__ */ new Date()) {
    return CouponRepository_default.expireClaimedRedemptions({ now });
  }
};
var LoyaltyRedemptionExpirationJob_default = new LoyaltyRedemptionExpirationJob();

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
    process.env.LOYALTY_REDEMPTION_EXPIRATION_CRON || "*/5 * * * *",
    async () => {
      try {
        const result = await LoyaltyRedemptionExpirationJob_default.execute();
        if (result.count > 0) {
          info("expired loyalty rewards updated", { count: result.count });
        }
      } catch (err) {
        error("loyalty reward expiration failed", {
          message: err instanceof Error ? err.message : String(err)
        });
      }
    },
    { timezone: "America/Sao_Paulo" }
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
  const isProduction2 = process.env.NODE_ENV === "production";
  if (!isProduction2) {
    return;
  }
  const errors = [];
  const jwtSecret = String(process.env.JWT_SECRET || "").trim();
  if (jwtSecret.length < 32) {
    errors.push("JWT_SECRET deve ter pelo menos 32 caracteres em producao.");
  }
  const jwtRefreshSecret = String(process.env.JWT_REFRESH_SECRET || jwtSecret).trim();
  if (jwtRefreshSecret.length < 32) {
    errors.push("JWT_REFRESH_SECRET deve ter pelo menos 32 caracteres em producao.");
  }
  const rateLimitMax = asNumber(String(process.env.RATE_LIMIT_MAX_REQUESTS || "300"), 300);
  if (rateLimitMax <= 0) {
    errors.push("RATE_LIMIT_MAX_REQUESTS deve ser maior que zero.");
  }
  const authRateLimitMax = asNumber(String(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || "50"), 50);
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
      errors.push("JWT_MFA_SECRET deve ter pelo menos 32 caracteres em producao.");
    }
  }
  const allowInsecureStripe = String(process.env.ALLOW_INSECURE_STRIPE_WEBHOOK || "false").trim() === "true";
  if (allowInsecureStripe) {
    errors.push("ALLOW_INSECURE_STRIPE_WEBHOOK nao pode ser true em producao.");
  }
  const allowGlobalFallback = String(process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK || "false").trim() === "true";
  if (allowGlobalFallback) {
    errors.push("ALLOW_GLOBAL_PAYMENT_FALLBACK nao pode ser true em producao multi-tenant.");
  }
  const paymentPinSecret = String(
    process.env.PAYMENT_PIN_SECRET || process.env.JWT_MFA_SECRET || jwtSecret
  ).trim();
  if (paymentPinSecret.length < 32) {
    errors.push("PAYMENT_PIN_SECRET deve ter pelo menos 32 caracteres em producao.");
  }
  const enableTestPaymentWebhook = String(process.env.ENABLE_TEST_PAYMENT_WEBHOOK || "false").trim() === "true";
  if (enableTestPaymentWebhook) {
    errors.push("ENABLE_TEST_PAYMENT_WEBHOOK nao pode ser true em producao.");
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
var isProduction = process.env.NODE_ENV === "production";
var normalizeOrigin2 = (value) => value.trim().replace(/\/+$/, "");
var socketAllowedOrigins = [
  process.env.SOCKET_CORS_ORIGINS || "",
  process.env.CORS_ORIGINS || "",
  process.env.FRONTEND_URL || ""
].flatMap((value) => value.split(",")).map((origin) => normalizeOrigin2(origin)).filter(Boolean);
var io = new Server(server, {
  cors: {
    origin: isProduction ? socketAllowedOrigins : "*",
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
  Sentry2.captureException(reason instanceof Error ? reason : new Error(String(reason)));
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
