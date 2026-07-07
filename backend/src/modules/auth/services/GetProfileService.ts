import userRepository from "../repositories/UserRepository.js";

class GetProfileService {
  async execute(userId) {
    return userRepository.findById(userId);
  }
}

export default new GetProfileService();
