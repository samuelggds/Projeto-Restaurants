import registerService from "../services/RegisterService.js";

class RegisterController {
  async handle(req, res) {
    try {
      const { name, email, password, confirmPassword } = req.body;

      const user = await registerService.execute({
        name,
        email,
        password,
        confirmPassword,
      });

      return res.status(201).json({ user });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new RegisterController();
