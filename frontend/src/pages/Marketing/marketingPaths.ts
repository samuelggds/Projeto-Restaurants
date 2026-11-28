export const RESTAURANT_TRIAL_PATH = '/ativar/restaurante';
export const MARKETING_PATHS = new Set(['/', RESTAURANT_TRIAL_PATH]);

export function isMarketingPath(pathname: string) {
  return MARKETING_PATHS.has(pathname.replace(/\/+$/u, '') || '/');
}
