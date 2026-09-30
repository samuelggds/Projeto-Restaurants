export const MARKETING_PATHS = new Set(['/']);

export function isMarketingPath(pathname: string) {
  return MARKETING_PATHS.has(pathname);
}
