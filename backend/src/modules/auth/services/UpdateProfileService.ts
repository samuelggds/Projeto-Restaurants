import type { Prisma } from '@prisma/client';
import userRepository from '../repositories/UserRepository.js';

type UpdateProfilePayload = {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  address?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  complement?: string;
  avatar?: string;
};

class UpdateProfileService {
  async execute(userId: number | string, profileData: UpdateProfilePayload) {
    const currentUser = await userRepository.findById(userId);

    if (!currentUser) {
      throw new Error('Usuário não encontrado!');
    }

    const hasField = (field: keyof UpdateProfilePayload) =>
      Object.prototype.hasOwnProperty.call(profileData, field);
    const nextEmail = hasField('email')
      ? String(profileData.email || '')
          .trim()
          .toLowerCase()
      : currentUser.email;

    if (nextEmail && nextEmail !== currentUser.email) {
      const emailInUse = await userRepository.findByEmail(nextEmail);

      if (emailInUse && Number(emailInUse.id) !== Number(userId)) {
        throw new Error('Este e-mail já está em uso!');
      }
    }

    const updates: Prisma.UserUpdateInput = {};

    if (hasField('name')) updates.name = String(profileData.name || '').trim();
    if (hasField('email')) updates.email = nextEmail;
    if (hasField('phone')) updates.phone = String(profileData.phone || '').trim() || null;
    if (hasField('cpf')) updates.cpf = String(profileData.cpf || '').replace(/\D/g, '') || null;
    if (hasField('address')) updates.address = String(profileData.address || '').trim() || null;
    if (hasField('number')) updates.number = String(profileData.number || '').trim() || null;
    if (hasField('district')) updates.district = String(profileData.district || '').trim() || null;
    if (hasField('city')) updates.city = String(profileData.city || '').trim() || null;
    if (hasField('state')) updates.state = String(profileData.state || '').trim() || null;
    if (hasField('zipCode')) updates.zipCode = String(profileData.zipCode || '').trim() || null;
    if (hasField('complement'))
      updates.complement = String(profileData.complement || '').trim() || null;
    if (hasField('avatar')) updates.avatar = String(profileData.avatar || '').trim() || null;

    return userRepository.updateProfile(userId, updates);
  }
}

export default new UpdateProfileService();
