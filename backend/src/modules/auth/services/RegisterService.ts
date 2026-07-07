import bcrypt from "bcrypt";
import userRepository from "../repositories/UserRepository.js";
import { registerSchema } from "../../../validators/RegisterValidator.js";

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

class RegisterService {
  async execute({ name, email, password, confirmPassword }: RegisterPayload) {
    registerSchema.parse({ name, email, password, confirmPassword });

    const userExists = await userRepository.findByEmail(email);
    if (userExists) {
      throw new Error("Este e-mail já está em uso!");
    }

    const passwordhash = await bcrypt.hash(password, 10);

    const user = await userRepository.create({
      name,
      email,
      password: passwordhash,
    });

    return user;
  }
}

export default new RegisterService();
