import orderPixPaymentService from "../services/OrderPixPaymentService.js";
import createOrderService from "../services/CreateOrderService.js";
class CreateOrderPixPaymentController {
    async handle(req, res) {
        try {
            const { restaurantId, type, paymentMethod, pixProvider, observation, tableId, items, address, number, district, city, state, zipCode, complement, customerName, customerCpf, customerPhone, } = req.body;
            const userId = req.user?.id ?? null;
            const userRestaurantId = req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null;
            const resolvedRestaurantId = Number(restaurantId) || Number(userRestaurantId);
            const normalizedType = String(type || "")
                .trim()
                .toUpperCase();
            const result = await orderPixPaymentService.createPixPayment({
                restaurantId: resolvedRestaurantId,
                type,
                paymentMethod,
                pixProvider,
                items,
                address,
                number,
                district,
                city,
                state,
                customerName,
                customerCpf,
                customerPhone,
                userEmail: req.user?.email || null,
            });
            const order = await createOrderService.execute({
                userId,
                restaurantId: resolvedRestaurantId,
                userRestaurantId,
                tableSessionId: req.tableSession?.id ?? null,
                tableSessionTableId: req.tableSession?.tableId ?? null,
                deferRealtimeUntilPaid: normalizedType === "DELIVERY",
                type,
                paymentMethod,
                paid: false,
                pixPaymentId: String(result.paymentId || ""),
                observation,
                tableId,
                customerName,
                customerCpf,
                customerPhone,
                items,
                address,
                number,
                district,
                city,
                state,
                zipCode,
                complement,
            });
            return res.status(201).json({
                ...result,
                orderId: order.id,
            });
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao gerar pagamento PIX",
            });
        }
    }
}
export default new CreateOrderPixPaymentController();
