export type AdminTableQrRecord = {
  id: string;
  number: number;
  restaurantId: number;
  token: string;
  active: boolean;
  status: 'FREE' | 'OCCUPIED';
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

export function mapAdminTableQr(value: unknown): AdminTableQrRecord | null {
  const table = asRecord(value);
  const operational = asRecord(table.operational);
  const id = String(table.id || '').trim();
  const number = Number(table.number);
  const restaurantId = Number(table.restaurantId);
  const token = String(table.token || '').trim();
  const status =
    operational.status === 'OCCUPIED' || table.status === 'OCCUPIED' ? 'OCCUPIED' : 'FREE';

  if (
    !id ||
    !Number.isInteger(number) ||
    number <= 0 ||
    !Number.isInteger(restaurantId) ||
    restaurantId <= 0
  ) {
    return null;
  }

  return {
    id,
    number,
    restaurantId,
    token,
    active: table.active !== false,
    status,
  };
}

export function mapAdminTableQrs(values: unknown): AdminTableQrRecord[] {
  if (!Array.isArray(values)) return [];
  return values
    .map(mapAdminTableQr)
    .filter((table): table is AdminTableQrRecord => Boolean(table))
    .sort((left, right) => left.number - right.number);
}

export function buildAdminTableQrUrl(
  table: Pick<AdminTableQrRecord, 'id' | 'number' | 'restaurantId' | 'token'>,
  origin = typeof window === 'undefined' ? '' : window.location.origin,
) {
  const params = new URLSearchParams({
    tid: table.id,
    tk: table.token,
    rid: String(table.restaurantId),
  });
  return `${origin}/mesa/${table.number}?${params.toString()}`;
}

export function tableDisplayName(number: number) {
  return `Mesa ${String(number).padStart(2, '0')}`;
}
