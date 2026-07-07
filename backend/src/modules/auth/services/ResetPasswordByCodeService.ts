import bcrypt from "bcrypt";
import userRepository from "../repositories/UserRepository.js";
import { resetPasswordSchema } from "../../../validators/ForgotPasswordValidator.js";

class ResetPasswordByCodeService {
  async execute({
    email,
    code,
    newPassword,
    confirmPassword,
  }: {
    email: string;
    code: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    resetPasswordSchema.parse({
      email,
      code,
      newPassword,
      confirmPassword,
    });

    const user = await userRepository.findByEmail(email);

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
