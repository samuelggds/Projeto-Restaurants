import createCouponService from "../services/CreateCouponService.js";
class CreateCouponController {
    async handle(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const { code, discount, expiration } = req.body;
            const coupon = await createCouponService.execute({
                code,
                discount,
                expiration,
                restaurantId,
            });
            return res.status(201).json(coupon);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error ? error.message : "Erro ao criar cupom",
            });
        }
    }
}
export default new CreateCouponController();
