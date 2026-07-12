import resetPasswordByCodeService from "../services/ResetPasswordByCodeService.js";
class ResetPasswordByCodeController {
    async handle(req, res) {
        try {
            const { email, phone, code, newPassword, confirmPassword } = req.body;
            const result = await resetPasswordByCodeService.execute({
                email,
                phone,
                code,
                newPassword,
                confirmPassword,
            });
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error ? error.message : "Erro ao redefinir senha",
            });
        }
    }
}
export default new ResetPasswordByCodeController();
