import bcrypt from "bcrypt";
import userRepository from "../repositories/UserRepository.js";
import { registerSchema } from "../../../validators/RegisterValidator.js";
class RegisterService {
    async execute({ name, email, password, confirmPassword }) {
        registerSchema.parse({ name, email, password, confirmPassword });
        const normalizedEmail = String(email || "")
            .trim()
            .toLowerCase();
        const userExists = await userRepository.findByEmail(normalizedEmail);
        if (userExists) {
            throw new Error("Este e-mail já está em uso!");
        }
        const passwordhash = await bcrypt.hash(password, 10);
        const user = await userRepository.create({
            name,
            email: normalizedEmail,
            password: passwordhash,
        });
        return user;
    }
}
export default new RegisterService();
