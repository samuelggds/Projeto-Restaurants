import withdrawAsaasWalletService from "../services/WithdrawAsaasWalletService.js";
class WithdrawAsaasWalletController {
    async handle(req, res) {
        try {
            const restaurantId = req.user?.restaurantId;
            const { value, pixKey, description } = req.body;
            const result = await withdrawAsaasWalletService.execute({
                restaurantId,
                value: Number(value),
                pixKey,
                description,
            });
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao solicitar saque da carteira Asaas.",
            });
        }
    }
}
export default new WithdrawAsaasWalletController();
