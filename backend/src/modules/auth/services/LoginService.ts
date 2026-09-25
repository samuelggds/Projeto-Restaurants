import bcrypt from 'bcrypt';
import userRepository from '../repositories/UserRepository.js';
import { loginSchema } from '../../../validators/LoginValidator.js';
import loginLockoutService from './LoginLockoutService.js';
import authTokenService from './AuthTokenService.js';
import loginMfaService from './LoginMfaService.js';
import successfulLoginRecorderService from './SuccessfulLoginRecorderService.js';
import { platformMaintenanceAccessService } from '../../platform/services/PlatformMaintenanceService.js';

type PlatformAccess = Pick<typeof platformMaintenanceAccessService, 'assertRoleAllowed'>;

export class LoginService {
  constructor(private readonly platformAccess: PlatformAccess = platformMaintenanceAccessService) {}

  async execute({
    email,
    username,
    restaurantSlug,
    password,
  }: {
    email?: string;
    username?: string;
    restaurantSlug?: string;
    password: string;
  }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedUsername = String(username || '')
      .trim()
      .normalize('NFC')
      .toLocaleLowerCase('pt-BR');
    const normalizedRestaurantSlug = String(restaurantSlug || '').trim().toLowerCase();
    const staffLogin = Boolean(normalizedUsername);
    const loginKey = staffLogin
      ? `staff:${normalizedRestaurantSlug}:${normalizedUsername}`
      : normalizedEmail;
    const lockStatus = await loginLockoutService.check(loginKey);
    if (lockStatus.locked) {
      throw new Error(`Muitas tentativas de login. Tente novamente em ${lockStatus.waitSeconds}s.`);
    }

    try {
      loginSchema.parse({ email, username, restaurantSlug, password });
    } catch (_err: unknown) {
      throw new Error('Dados inválidos');
    }

    const user = staffLogin
      ? await userRepository.findStaffByUsername(normalizedUsername, normalizedRestaurantSlug)
      : await userRepository.findByEmail(normalizedEmail);

    if (!user) {
      await loginLockoutService.registerFailure(loginKey);
      throw new Error(staffLogin ? 'Usuário ou senha inválidos!' : 'Email ou senha inválidos!');
    }
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      const failure = await loginLockoutService.registerFailure(loginKey);
      if (failure.locked) {
        throw new Error(`Muitas tentativas de login. Tente novamente em ${failure.waitSeconds}s.`);
      }

      throw new Error(staffLogin ? 'Usuário ou senha inválidos!' : 'Email ou senha inválidos!');
    }
    if (!user.active) {
      await loginLockoutService.registerFailure(loginKey);
      throw new Error('Email ou senha inválidos!');
    }

    if (user.emailVerificationRequired && !user.emailVerifiedAt) {
      await loginLockoutService.registerSuccess(loginKey);
      throw new Error('Confirme seu e-mail antes de entrar. Reenvie a confirmação se necessário.');
    }

    await loginLockoutService.registerSuccess(loginKey);
    await this.platformAccess.assertRoleAllowed(user.role);

    const mfaChallenge = await loginMfaService.beginIfRequired(user as any);
    if (mfaChallenge) {
      return mfaChallenge;
    }

    const tokenPayload = {
      id: user.id,
      role: user.role,
      subRole: user.subRole ?? null,
      restaurantId: user.restaurantId,
      authVersion: user.authVersion,
    };
    const token = authTokenService.createAccessToken(tokenPayload);
    const refreshToken = await authTokenService.createRefreshToken(tokenPayload);
    await successfulLoginRecorderService.execute(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        subRole: user.subRole ?? null,
        active: user.active,
        mustChangePassword: user.mustChangePassword,
        mfaEnabled: user.mfaEnabled,
        phone: user.phone,
        emailVerifiedAt: user.emailVerifiedAt,
        emailVerificationRequired: user.emailVerificationRequired,
        phoneVerifiedAt: user.phoneVerifiedAt,
        address: user.address,
        number: user.number,
        district: user.district,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        complement: user.complement,
        restaurantId: user.restaurantId,
        avatar: user.avatar,
      },
      token,
      refreshToken,
    };
  }
}

export default new LoginService();
