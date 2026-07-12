import confirmOrderPaymentService from "../services/ConfirmOrderPaymentService.js";
class ConfirmOrderPaymentController {
    async handle(req, res) {
        try {
            const { id } = req.params;
            const { restaurantId, role } = req.user;
            const updatedOrder = await confirmOrderPaymentService.execute(id, restaurantId, role);
            return res.status(200).json(updatedOrder);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao confirmar pagamento do pedido",
            });
        }
    }
}
export default new ConfirmOrderPaymentController();
