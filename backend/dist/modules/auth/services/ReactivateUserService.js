import userRepository from "../repositories/UserRepository.js";
class ReactivateUserService {
    async execute(userId) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new Error("Usuário não encontrado!");
        }
        if (user.active) {
            throw new Error("A conta ja está ativa!");
        }
        return userRepository.reactivate(userId);
    }
}
export default new ReactivateUserService();
