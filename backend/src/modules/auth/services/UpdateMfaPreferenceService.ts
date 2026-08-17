import userRepository from '../repositories/UserRepository.js';

class UpdateMfaPreferenceService {
  async execute(userId: number | string, enabled: unknown) {
    if (typeof enabled !== 'boolean') {
      throw new Error('A preferencia de verificacao em duas etapas e obrigatoria');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuario nao encontrado');
    }

    return userRepository.updateMfaEnabled(userId, enabled);
  }
}

export default new UpdateMfaPreferenceService();
