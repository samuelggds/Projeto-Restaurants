import userRepository from "../repositories/UserRepository.js";
import bcrypt from "bcrypt";
class UpdatePasswordService {
    async execute(userId, oldPassword, newPassword) {
        const user = await userRepository.findByIdWithPassword(userId);
        if (!user) {
            throw new Error("Usuário não encontrado!");
        }
        const passwordCompare = await bcrypt.compare(oldPassword, user.password);
        if (!passwordCompare) {
            throw new Error("Senha atual incorreta!");
        }
        const hashPassword = await bcrypt.hash(newPassword, 10);
        return userRepository.updatePassword(userId, hashPassword);
    }
}
export default new UpdatePasswordService();
