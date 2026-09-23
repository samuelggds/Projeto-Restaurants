import bcrypt from 'bcrypt';
import { UserRole, type Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import userRepository from '../repositories/UserRepository.js';
import emailVerificationService from './EmailVerificationService.js';

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
  currentPassword?: string;
};

class UpdateProfileService {
  async execute(userId: number | string, profileData: UpdateProfilePayload) {
    const currentUser = await userRepository.findById(userId);

    if (!currentUser) {
      throw new Error('Usuário não encontrado!');
    }

    const hasField = (field: keyof UpdateProfilePayload) =>
      Object.prototype.hasOwnProperty.call(profileData, field);
    const currentEmail = String(currentUser.email || '')
      .trim()
      .toLowerCase();
    const nextEmail = hasField('email')
      ? String(profileData.email || '')
          .trim()
          .toLowerCase()
      : currentEmail;

    if (
      currentUser.role === UserRole.SUPER_ADMIN &&
      hasField('email') &&
      nextEmail !== currentEmail
    ) {
      throw new Error('O e-mail da conta SUPER_ADMIN não pode ser alterado pelo perfil');
    }

    if (nextEmail && nextEmail !== currentEmail) {
      const emailInUse = await userRepository.findByEmail(nextEmail);

      if (emailInUse && Number(emailInUse.id) !== Number(userId)) {
        throw new Error('Este e-mail já está em uso!');
      }
    }

    const emailChanged = hasField('email') && nextEmail !== currentEmail;
    if (emailChanged) {
      const userWithPassword = await userRepository.findByIdWithPassword(userId);
      const passwordMatches =
        Boolean(userWithPassword?.password) &&
        (await bcrypt.compare(String(profileData.currentPassword || ''), userWithPassword!.password));
      if (!passwordMatches) {
        throw new Error('Confirme sua senha atual para alterar o e-mail.');
      }
    }

    const updates: Prisma.UserUpdateInput = {};

    if (hasField('name')) updates.name = String(profileData.name || '').trim();
    const nextPhone = hasField('phone') ? String(profileData.phone || '').trim() || null : undefined;
    const phoneChanged =
      hasField('phone') && String(nextPhone || '') !== String(currentUser.phone || '');

    if (hasField('email')) updates.email = nextEmail;
    if (emailChanged) {
      updates.emailVerifiedAt = null;
      updates.emailVerificationRequired = true;
      updates.authVersion = { increment: 1 };
    }
    if (hasField('phone')) updates.phone = nextPhone;
    if (phoneChanged) updates.phoneVerifiedAt = null;
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

    const updated = await prisma.$transaction(async (tx) => {
      const next = await userRepository.updateProfile(userId, updates, tx);
      if (emailChanged) {
        await tx.authRefreshSession.deleteMany({ where: { userId: Number(userId) } });
        await tx.emailVerificationToken.deleteMany({ where: { userId: Number(userId) } });
      }
      if (phoneChanged) {
        await tx.phoneVerificationChallenge.deleteMany({ where: { userId: Number(userId) } });
      }
      return next;
    });

    if (emailChanged) {
      try {
        const restaurant =
          currentUser.restaurantId != null
            ? await prisma.restaurant.findUnique({
                where: { id: Number(currentUser.restaurantId) },
                select: { slug: true },
              })
            : null;
        await emailVerificationService.issueAndSend({
          userId: Number(userId),
          email: nextEmail,
          restaurantSlug: restaurant?.slug || null,
        });
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') throw error;
        console.error('[profile] E-mail alterado, mas a confirmação não pôde ser enviada.');
      }
    }

    return updated;
  }
}

export default new UpdateProfileService();
