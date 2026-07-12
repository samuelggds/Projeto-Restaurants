import requestPinAssistanceService from "../services/RequestPinAssistanceService.js";
class RequestPinAssistanceController {
    async handle(req, res) {
        try {
            const { tableId } = req.body;
            const result = await requestPinAssistanceService.execute({ tableId });
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao solicitar apoio de PIN",
            });
        }
    }
}
export default new RequestPinAssistanceController();
