import api from './api';

type MfaDeliveryChannel = 'EMAIL' | 'SMS' | 'WHATSAPP';

type MfaDeliveryOption = {
  channel: MfaDeliveryChannel;
  label: string;
  destination: string;
};

type PendingMfaChallenge = {
  mfaRequired?: boolean;
  mfaToken?: string;
  destination?: string;
  resendAfterSeconds?: number;
  selectedChannel?: MfaDeliveryChannel;
  channelSelectionRequired?: boolean;
  deliveryOptions?: MfaDeliveryOption[];
};

class AuthService {
  pendingMfaChallenge: PendingMfaChallenge | null = null;

  rememberMfaChallenge(payload: PendingMfaChallenge) {
    if (payload?.mfaRequired && payload?.mfaToken) {
      this.pendingMfaChallenge = payload;
    }
    return payload;
  }

  getPendingMfaChallenge() {
    return this.pendingMfaChallenge;
  }

  async login(data) {
    const response = await api.post('/auth/login', data);

    return this.rememberMfaChallenge(response.data);
  }

  async updateProfile(data) {
    const response = await api.put('/auth/profile', data);

    return response.data;
  }

  async register(data) {
    const response = await api.post('/auth/register', data);

    return response.data;
  }

  async loginWithGoogle(idToken) {
    const response = await api.post('/auth/google', { idToken });

    return this.rememberMfaChallenge(response.data);
  }

  async selectLogin2faChannel(data: { mfaToken?: string; channel?: MfaDeliveryChannel } = {}) {
    const payload = {
      ...data,
      mfaToken: data.mfaToken || this.pendingMfaChallenge?.mfaToken,
    };
    const response = await api.post('/auth/login/select-2fa-channel', payload);
    this.pendingMfaChallenge = {
      ...(this.pendingMfaChallenge || {}),
      ...response.data,
    };
    return response.data;
  }

  async verifyLogin2fa(data) {
    const response = await api.post('/auth/login/verify-2fa', data);
    this.pendingMfaChallenge = null;
    return response.data;
  }

  async resendLogin2fa(data: { mfaToken?: string; channel?: MfaDeliveryChannel } = {}) {
    const payload = {
      ...data,
      mfaToken: data.mfaToken || this.pendingMfaChallenge?.mfaToken,
    };
    const response = await api.post('/auth/login/resend-2fa', payload);
    this.pendingMfaChallenge = {
      ...(this.pendingMfaChallenge || {}),
      ...response.data,
    };
    return response.data;
  }

  async logout(accessToken) {
    this.pendingMfaChallenge = null;
    const response = await api.post(
      '/auth/logout',
      {},
      accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    );
    return response.data;
  }

  async getGoogleClientId() {
    const response = await api.get('/auth/google/client-id');

    return response.data?.clientId || null;
  }

  async resendEmailVerification(data: { email: string; restaurantSlug?: string }) {
    const response = await api.post('/auth/resend-email-verification', data);
    return response.data;
  }

  async getPhoneAuthConfig() {
    const response = await api.get('/auth/phone-auth/config');
    return response.data as { enabled?: boolean; siteKey?: string | null };
  }

  async requestPhoneVerification(data: { currentPassword: string; captchaResponse: string }) {
    const response = await api.post('/auth/phone-verification/request', data);
    return response.data;
  }

  async confirmPhoneVerification(data: { challengeId: string; code: string }) {
    const response = await api.post('/auth/phone-verification/confirm', data);
    return response.data;
  }

  async forgotPassword(data) {
    const response = await api.post('/auth/forgot-password', data);

    return response.data;
  }

  async forgotPasswordSms(data: { phone: string; captchaResponse: string }) {
    const response = await api.post('/auth/forgot-password/sms', data);
    return response.data;
  }

  async resetPassword(data) {
    const response = await api.post('/auth/reset-password', data);

    return response.data;
  }

  async resetPasswordSms(data: {
    challengeId: string;
    code: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    const response = await api.post('/auth/reset-password/sms', data);
    return response.data;
  }
}

export default new AuthService();
