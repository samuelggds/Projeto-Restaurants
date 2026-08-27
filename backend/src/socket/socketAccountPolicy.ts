export type SocketAccountClaims = {
  id: number | string;
  role: string;
  subRole?: string | null;
  restaurantId: number | string | null;
  authVersion?: number | null;
};

export type CurrentSocketAccount = {
  id: number;
  active: boolean;
  role: string;
  subRole?: string | null;
  restaurantId: number | null;
  authVersion: number;
};

export function isSocketAccountAuthorized(
  account: CurrentSocketAccount | null,
  claims: SocketAccountClaims,
) {
  if (!account?.active || account.id !== Number(claims.id)) return false;
  if (String(account.role) !== String(claims.role)) return false;
  if (String(account.subRole || '') !== String(claims.subRole || '')) return false;
  if (Number(account.restaurantId || 0) !== Number(claims.restaurantId || 0)) return false;

  return (
    claims.authVersion === null ||
    claims.authVersion === undefined ||
    account.authVersion === Number(claims.authVersion)
  );
}
