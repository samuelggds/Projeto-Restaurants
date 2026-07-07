import googleAuthService from "../services/GoogleAuthService.js";

class GoogleAuthController {
  async handle(req, res) {
    try {
      const { idToken } = req.body;

      const result = await googleAuthService.execute({ idToken });

      return res.json(result);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new GoogleAuthController();
