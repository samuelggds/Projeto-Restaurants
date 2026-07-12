import getAsaasWalletBalanceService from "../services/GetAsaasWalletBalanceService.js";
class GetAsaasWalletBalanceController {
    async handle(req, res) {
        try {
            const restaurantId = req.user?.restaurantId;
            const result = await getAsaasWalletBalanceService.execute({
                restaurantId,
            });
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao consultar saldo da carteira Asaas.",
            });
        }
    }
}
export default new GetAsaasWalletBalanceController();
