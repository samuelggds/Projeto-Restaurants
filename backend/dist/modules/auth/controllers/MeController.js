import getProfileService from "../services/GetProfileService.js";
class MeController {
    async handle(req, res) {
        try {
            const user = await getProfileService.execute(req.user.id);
            return res.status(200).json(user);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error ? error.message : "Erro ao buscar perfil",
            });
        }
    }
}
export default new MeController();
