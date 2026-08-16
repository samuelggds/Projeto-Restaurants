import userRepository from '../repositories/UserRepository.js';

class GetProfileService {
  async execute(userId: number | string) {
    return userRepository.findById(userId);
  }
}

export default new GetProfileService();
