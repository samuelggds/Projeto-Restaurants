import api from './api';

export type AiCreditBalance = {
  provider: 'OPENAI';
  currency: 'USD';
  balanceUsd: number;
  remainingUsd: number;
  usedUsd: number;
  freeGrantUsd: number;
  freeGrantClaimed: boolean;
  exhausted: boolean;
};

export type AiCreditCardOption =
  | { available: false }
  | {
      available: true;
      brand: string;
      brandLabel: string;
      last4: string;
      expMonth: number;
      expYear: number;
    };

export type AiCreditTopUpQuote = {
  creditUsd: number;
  exchangeRateBrlPerUsd: number;
  exchangeRateSource: string;
  quotedAt: string;
  baseAmountBrl: number;
  markupPercent: number;
  amountBrl: number;
  card: AiCreditCardOption;
};

export type AiCreditTopUp = {
  publicId: string;
  creditUsd: number;
  exchangeRateBrlPerUsd: number;
  exchangeRateSource: string;
  exchangeRateQuotedAt: string;
  baseAmountBrl: number;
  markupPercent: number;
  amountBrl: number;
  paymentMethod: 'PIX' | 'CARD';
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELED' | 'EXPIRED';
  providerPaymentId?: string | null;
  providerOrderId?: string | null;
  pixQrCode?: string | null;
  pixQrCodeBase64?: string | null;
  pixExpiresAt?: string | null;
  paidAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
};

export type AiGuideStep = {
  title: string;
  body: string;
  target: string;
  navigateTo?: string | null;
};

export type AiTourGuide = {
  mode: 'TOUR';
  title: string;
  summary: string;
  steps: AiGuideStep[];
};

export type AiSupportGuide = {
  mode: 'SUPPORT_CHAT';
  title: string;
  summary: string;
  audience: string;
  answer: string;
  instructions: string[];
};

export type AiGuide = AiTourGuide | AiSupportGuide;

const aiGuideService = {
  async getCredits() {
    const response = await api.get('/ai-support/credits');
    return response.data as AiCreditBalance;
  },

  async getTopUpQuote(amountUsd: number) {
    const response = await api.get('/ai-support/credits/topup/quote', { params: { amountUsd } });
    return response.data as AiCreditTopUpQuote;
  },

  async createPixTopUp(amountUsd: number) {
    const response = await api.post('/ai-support/credits/topup/pix', { amountUsd });
    return response.data as AiCreditTopUp;
  },

  async createCardTopUp(amountUsd: number) {
    const response = await api.post('/ai-support/credits/topup/card', { amountUsd });
    return response.data as AiCreditTopUp;
  },

  async listTopUps() {
    const response = await api.get('/ai-support/credits/topups');
    return response.data as AiCreditTopUp[];
  },

  async createGuide(question: string) {
    const response = await api.post('/ai-support/guide', { question });
    return response.data as { guide: AiGuide; credits: AiCreditBalance };
  },
};

export default aiGuideService;
