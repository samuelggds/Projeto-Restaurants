import startMercadoPagoOAuthService from "../services/StartMercadoPagoOAuthService.js";
class StartMercadoPagoOAuthController {
    async handle(req, res) {
        try {
            const restaurantId = req.user?.restaurantId;
            const userId = req.user?.id;
            const result = await startMercadoPagoOAuthService.execute({
                restaurantId,
                userId,
            });
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao iniciar conexao com Mercado Pago.",
            });
        }
    }
}
export default new StartMercadoPagoOAuthController();
