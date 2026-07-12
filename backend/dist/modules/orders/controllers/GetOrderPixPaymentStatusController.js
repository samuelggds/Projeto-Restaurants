import orderPixPaymentService from "../services/OrderPixPaymentService.js";
class GetOrderPixPaymentStatusController {
    async handle(req, res) {
        try {
            const { paymentId, restaurantId } = req.body;
            const userRestaurantId = req.user?.restaurantId ?? null;
            const resolvedRestaurantId = Number(restaurantId) || Number(userRestaurantId);
            const result = await orderPixPaymentService.getPaymentStatus({
                paymentId,
                restaurantId: resolvedRestaurantId,
            });
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao consultar status do pagamento PIX",
            });
        }
    }
}
export default new GetOrderPixPaymentStatusController();
