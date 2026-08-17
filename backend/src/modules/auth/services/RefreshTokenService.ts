import authTokenService from './AuthTokenService.js';

class RefreshTokenService {
  async execute(refreshToken: string) {
    const token = String(refreshToken || '').trim();
    if (!token) {
      throw new Error('Refresh token nao informado');
    }

    return authTokenService.rotateRefreshToken(token);
  }
}

export default new RefreshTokenService();
