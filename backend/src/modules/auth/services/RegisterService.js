import bcrypt from "bcrypt";
import userRepository from "../repositories/UserRepository.js";
import { registerSchema } from "../../../validators/RegisterValidator.js";

class RegisterService {
  async execute({ name, email, password , confirmPassword }) {
    registerSchema.parse({ name, email, password, confirmPassword });

    const userExists = await userRepository.findByEmail(email);

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
