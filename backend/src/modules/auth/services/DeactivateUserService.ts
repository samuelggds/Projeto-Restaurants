import userRepository from "../repositories/UserRepository.js";

class DeactivateUserService {
  async execute(userId) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error("Usuário não encontrado!");
    }

    return userRepository.deactivate(userId);
  }
}

export default new DeactivateUserService();
