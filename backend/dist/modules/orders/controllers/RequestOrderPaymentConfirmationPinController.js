import requestOrderPaymentConfirmationPinService from "../services/RequestOrderPaymentConfirmationPinService.js";
class RequestOrderPaymentConfirmationPinController {
    async handle(req, res) {
        try {
            const id = Array.isArray(req.params.id)
                ? req.params.id[0]
                : req.params.id;
            const { restaurantId, role } = req.user;
            const result = await requestOrderPaymentConfirmationPinService.execute(id, restaurantId, role);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao solicitar PIN de confirmacao de pagamento",
            });
        }
    }
}
export default new RequestOrderPaymentConfirmationPinController();
