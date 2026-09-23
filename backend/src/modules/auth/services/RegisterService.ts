import bcrypt from 'bcrypt';
import userRepository from '../repositories/UserRepository.js';
import { registerSchema } from '../../../validators/RegisterValidator.js';
import emailVerificationService from './EmailVerificationService.js';

type RegisterPayload = {
  name: string;
  email: string;
  phone: string;
  restaurantSlug?: string;
  password: string;
  confirmPassword: string;
};

class RegisterService {
  async execute({ name, email, phone, restaurantSlug, password, confirmPassword }: RegisterPayload) {
    registerSchema.parse({ name, email, phone, restaurantSlug, password, confirmPassword });

    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();
    const phoneDigits = String(phone || '').replace(/\D/gu, '');
    const normalizedPhone = /^55\d{10,11}$/u.test(phoneDigits) ? phoneDigits.slice(2) : phoneDigits;

    const userExists = await userRepository.findByEmail(normalizedEmail);
    if (userExists) {
      throw new Error('Este e-mail já está em uso!');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepository.create({
      name: String(name || '').trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: passwordHash,
      emailVerificationRequired: true,
      emailVerifiedAt: null,
    });

    let verificationEmailSent = false;
    try {
      const result = await emailVerificationService.issueAndSend({
        userId: user.id,
        email: user.email,
        restaurantSlug,
      });
      verificationEmailSent = result.sent;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') throw error;
      console.error('[register] Conta criada, mas o e-mail de confirmação não pôde ser enviado.');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt,
        emailVerificationRequired: user.emailVerificationRequired,
      },
      verificationEmailSent,
    };
  }
}

export default new RegisterService();
