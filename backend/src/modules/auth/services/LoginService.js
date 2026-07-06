import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userRepository from "../repositories/UserRepository.js";
import { loginSchema } from "../../../validators/LoginValidator.js";
class LoginService {
  async execute({ email, password }) {
    try {
      loginSchema.parse({ email, password });
    } catch (err) {
      throw new Error("Dados inválidos");
    }

    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new Error("Email ou senha inválidos!");
    }
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new Error("Email ou senha inválidos!");
    }
    if (!user.active) {
      throw new Error("Conta desativada. Reative sua conta para continuar.");
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        phone: user.phone,
        address: user.address,
        number: user.number,
        district: user.district,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        complement: user.complement,
        restaurantId: user.restaurantId,
      },
      token,
    };
  }
}

export default new LoginService();
