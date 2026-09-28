import userRepository from '../repositories/UserRepository.js';

class GetProfileService {
  async execute(userId: number | string) {
    const user = await userRepository.findById(userId);
    return user
      ? {
          ...user,
          mfaEnabled: user.mfaEnabled === true,
        }
      : user;
  }
}

export default new GetProfileService();
