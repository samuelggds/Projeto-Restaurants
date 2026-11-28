import axios from 'axios';
import api from '../../../Services/api';
import { toUserFacingErrorMessage } from '../../../shared/errors/userFacingError';
import type { RestaurantCategory } from '../../../config/restaurantCategory';

export type TrialPlanCode = 'BASICO' | 'PREMIUM';
export type TrialPlan = {
  code: TrialPlanCode;
  name: string;
  monthlyFee: number;
  trialDays: number;
};
export type TrialChallenge = { challenge: string; expiresInMinutes: number };
export type TrialAccess = { adminPath: string; menuPath: string; trialEndsAt: string };

export type TrialDetails = {
  email: string;
  restaurantName: string;
  ownerName: string;
  whatsapp: string;
  category: RestaurantCategory;
  plan: TrialPlanCode;
  quotedMonthlyFee: number;
  quotedTrialDays: number;
};

// Public signup is independent of any restaurant session already open in this browser.
const publicRequest = () => ({
  baseURL: api.defaults.baseURL,
  timeout: api.defaults.timeout,
  withCredentials: false,
});

export async function getTrialAvailability(signal: AbortSignal) {
  const { data } = await axios.get('/restaurant-trials/availability', {
    ...publicRequest(),
    signal,
  });
  if (typeof data?.available !== 'boolean' || typeof data?.manualApproval !== 'boolean') {
    throw new Error('Disponibilidade não confirmada.');
  }
  return data.available && !data.manualApproval ? 'enabled' : 'contact';
}

export async function loadTrialPlans(signal: AbortSignal): Promise<TrialPlan[]> {
  const { data } = await axios.get('/platform/plans', { ...publicRequest(), signal });
  if (!Array.isArray(data?.plans)) return [];
  return data.plans.filter(
    (plan: TrialPlan | null) =>
      plan &&
      (plan.code === 'BASICO' || plan.code === 'PREMIUM') &&
      typeof plan.name === 'string' &&
      plan.name.trim() &&
      Number.isFinite(plan.monthlyFee) &&
      plan.monthlyFee >= 0 &&
      Number.isInteger(plan.trialDays) &&
      plan.trialDays > 0,
  );
}

export async function requestTrialCode(email: string): Promise<TrialChallenge> {
  const { data } = await axios.post('/restaurant-trials/challenge', { email }, publicRequest());
  if (
    typeof data?.challenge !== 'string' ||
    !data.challenge ||
    !Number.isInteger(data.expiresInMinutes) ||
    data.expiresInMinutes <= 0
  ) {
    throw new Error('Código não confirmado.');
  }
  return data;
}

export async function activateTrial(
  payload: TrialDetails & { challenge: string; code: string; password: string },
): Promise<TrialAccess> {
  const { data } = await axios.post('/restaurant-trials/activate', payload, publicRequest());
  const adminPath =
    typeof data?.adminPath === 'string' &&
    data.adminPath.match(/^\/(?<slug>[a-z0-9]+(?:-[a-z0-9]+)*)\/admin\/[\w-]+$/);
  if (
    !adminPath ||
    data.menuPath !== '/' + adminPath.groups?.slug ||
    typeof data.trialEndsAt !== 'string' ||
    !Number.isFinite(Date.parse(data.trialEndsAt))
  ) {
    throw new Error('Ativação não confirmada.');
  }
  return data;
}

export function trialRequestError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 429)
      return 'Muitas tentativas em sequência. Aguarde alguns minutos para tentar novamente.';
    return toUserFacingErrorMessage(error.response?.data?.error, fallback);
  }
  return fallback;
}
