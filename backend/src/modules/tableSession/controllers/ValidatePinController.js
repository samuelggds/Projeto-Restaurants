import validatePinService from "../services/ValidatePinService.js";

class ValidatePinController {
  async handle(req, res) {
    try {
      const { tableId, pin } = req.body;

      const result = await validatePinService.execute({ tableId, pin });

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new ValidatePinController();
