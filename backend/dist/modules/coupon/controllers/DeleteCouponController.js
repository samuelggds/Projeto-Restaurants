import deleteCouponService from "../services/DeleteCouponService.js";
class DeleteCouponController {
    async handle(req, res) {
        try {
            const { id } = req.params;
            const result = await deleteCouponService.execute({
                id,
            });
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error ? error.message : "Erro ao remover cupom",
            });
        }
    }
}
export default new DeleteCouponController();
