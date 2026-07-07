import bcrypt from "bcrypt";
import userRepository from "../repositories/UserRepository.js";
import { resetPasswordSchema } from "../../../validators/ForgotPasswordValidator.js";

class ResetPasswordByCodeService {
  async execute({
    email,
    phone,
    code,
    newPassword,
    confirmPassword,
  }: {
    email?: string;
    phone?: string;
    code: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    resetPasswordSchema.parse({
      email,
      phone,
      code,
      newPassword,
      confirmPassword,
    });

    const normalizedEmail = String(email || "").trim();
    const normalizedPhone = String(phone || "").trim();

    const user = normalizedEmail
      ? await userRepository.findByEmail(normalizedEmail)
      : await userRepository.findByPhone(normalizedPhone);

    if (
      !user?.resetPasswordCodeHash ||
      !user?.resetPasswordCodeExpiresAt ||
      new Date(user.resetPasswordCodeExpiresAt).getTime() < Date.now()
    ) {
      throw new Error("Codigo invalido ou expirado");
    }

    const isCodeValid = await bcrypt.compare(code, user.resetPasswordCodeHash);

    if (!isCodeValid) {
      throw new Error("Codigo invalido ou expirado");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userRepository.updatePasswordAndClearResetCode(user.id, passwordHash);

    return { message: "Senha redefinida com sucesso" };
  }
}

export default new ResetPasswordByCodeService();
