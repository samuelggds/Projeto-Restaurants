import userRepository from '../repositories/UserRepository.js';
import { isMfaRequiredForRole } from '../security/mfaPolicy.js';

class GetProfileService {
  async execute(userId: number | string) {
    const user = await userRepository.findById(userId);
    return user
      ? {
          ...user,
          mfaEnabled:
            user.role === 'SUPER_ADMIN' || isMfaRequiredForRole(user.role) || user.mfaEnabled,
        }
      : user;
  }
}

export default new GetProfileService();
