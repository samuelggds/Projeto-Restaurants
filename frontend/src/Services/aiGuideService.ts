import api from './api';

export type AiCreditBalance = {
  provider: 'OPENAI';
  currency: 'USD';
  monthlyLimitUsd: number;
  usedUsd: number;
  remainingUsd: number;
  usedPercent: number;
  exhausted: boolean;
  cycle: string;
  renewsAt: string;
};

export type AiGuideStep = {
  title: string;
  body: string;
  target: string;
  navigateTo?: string | null;
};

export type AiGuide = {
  title: string;
  summary: string;
  steps: AiGuideStep[];
};

const aiGuideService = {
  async getCredits() {
    const response = await api.get('/ai-support/credits');
    return response.data as AiCreditBalance;
  },

  async createGuide(question: string) {
    const response = await api.post('/ai-support/guide', { question });
    return response.data as { guide: AiGuide; credits: AiCreditBalance };
  },
};

export default aiGuideService;
