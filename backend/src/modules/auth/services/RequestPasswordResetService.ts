import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";
import userRepository from "../repositories/UserRepository.js";
import { forgotPasswordSchema } from "../../../validators/ForgotPasswordValidator.js";

function createTransporter() {
  const smtpHost = String(process.env.SMTP_HOST || "").trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || "false") === "true";
  const smtpUser = String(process.env.SMTP_USER || "").trim();
  const smtpPass = String(process.env.SMTP_PASS || "").trim();

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

class RequestPasswordResetService {
  async execute({ email }: { email: string }) {
    forgotPasswordSchema.parse({ email });

    const user = await userRepository.findByEmail(email);

    // Always return the same response to avoid exposing registered emails.
    const safeMessage =
      "Se o e-mail existir, enviamos um codigo para redefinir a senha.";

    if (!user) {
      return { message: safeMessage };
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await userRepository.savePasswordResetCode(user.id, codeHash, expiresAt);

    const frontendUrl = String(
      process.env.FRONTEND_URL || "http://localhost:5173",
    ).replace(/\/$/, "");
    const transporter = createTransporter();

    if (transporter) {
      const from =
        String(
          process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER || "",
        ).trim() || "no-reply@pizzaia.local";

      await transporter.sendMail({
        from,
        to: user.email,
        subject: "Recuperacao de senha - Peca ja food",
        text: `Seu codigo para redefinir a senha e: ${code}. Ele expira em 15 minutos.\n\nSe preferir, abra: ${frontendUrl}/login`,
      });
    } else {
      console.warn(
        `[password-reset] SMTP nao configurado. Codigo para ${user.email}: ${code}`,
      );
    }

    return { message: safeMessage };
  }
}

export default new RequestPasswordResetService();
