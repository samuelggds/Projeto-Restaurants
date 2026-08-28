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

  async execute({ email, password }: { email: string; password: string }) {
    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();
    const lockStatus = await loginLockoutService.check(normalizedEmail);
    if (lockStatus.locked) {
      throw new Error(`Muitas tentativas de login. Tente novamente em ${lockStatus.waitSeconds}s.`);
    }

    try {
      loginSchema.parse({ email, password });
    } catch (_err: unknown) {
      throw new Error('Dados inválidos');
    }

    const user = await userRepository.findByEmail(normalizedEmail);

    if (!user) {
      await loginLockoutService.registerFailure(normalizedEmail);
      throw new Error('Email ou senha inválidos!');
    }
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      const failure = await loginLockoutService.registerFailure(normalizedEmail);
      if (failure.locked) {
        throw new Error(`Muitas tentativas de login. Tente novamente em ${failure.waitSeconds}s.`);
      }

      throw new Error('Email ou senha inválidos!');
    }
    if (!user.active) {
      await loginLockoutService.registerFailure(normalizedEmail);
      throw new Error('Email ou senha inválidos!');
    }

    await loginLockoutService.registerSuccess(normalizedEmail);
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
        role: user.role,
        subRole: user.subRole ?? null,
        active: user.active,
        mustChangePassword: user.mustChangePassword,
        mfaEnabled: user.mfaEnabled,
        phone: user.phone,
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
