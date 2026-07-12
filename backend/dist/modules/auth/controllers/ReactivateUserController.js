import reactivateUserService from "../services/ReactivateUserService.js";
class ReactivateUserController {
    async handle(req, res) {
        try {
            const userId = req.user.id;
            const user = await reactivateUserService.execute(userId);
            return res.json(user);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error ? error.message : "Erro ao reativar usuario",
            });
        }
    }
}
export default new ReactivateUserController();
