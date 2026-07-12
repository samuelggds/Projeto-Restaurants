import finalizeOrderPixPaymentService from "../services/FinalizeOrderPixPaymentService.js";
class ConfirmOrderPixPaymentController {
    async handle(req, res) {
        try {
            const { orderId, paymentId, restaurantId } = req.body;
            const userRestaurantId = req.user?.restaurantId ?? null;
            const resolvedRestaurantId = Number(restaurantId) || Number(userRestaurantId) || undefined;
            const order = await finalizeOrderPixPaymentService.execute({
                orderId,
                paymentId,
                restaurantId: resolvedRestaurantId,
            });
            return res.status(200).json(order);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao confirmar pagamento PIX do pedido",
            });
        }
    }
}
export default new ConfirmOrderPixPaymentController();
