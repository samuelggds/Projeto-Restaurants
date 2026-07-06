import loginService from "../services/LoginService.js";

class LoginController {
  async handle(req, res) {
    try {
      const { email, password } = req.body;

      const result = await loginService.execute({
        email,
        password,
      });

      return res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

export default new LoginController();
