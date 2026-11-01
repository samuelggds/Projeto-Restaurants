/** NFC public URL remains a card identifier, never proof of staff authorization. */
export type NfcEntryAction = 'staff' | 'order' | 'payment';

const VALID_NFC_SLUG = /^[a-z0-9][a-z0-9_-]{0,99}$/u;
const VALID_NFC_TOKEN = /^[A-Za-z0-9_-]{32,128}$/u;
const NFC_STAFF_RETURN = /^\/(?:[a-z0-9][a-z0-9_-]{0,99}\/)?nfc\/[A-Za-z0-9_-]{32,128}\/?(?:\?action=(?:staff|order|payment))?$/u;

export function getNfcEntryAction(search: string): NfcEntryAction | null {
  const params = new URLSearchParams(search);
  if (Array.from(params.keys()).some(key => key !== 'action')) return null;
  const actions = params.getAll('action');
  if (actions.length !== 1) return null;
  return actions[0] === 'staff' || actions[0] === 'order' || actions[0] === 'payment' ? actions[0] : null;
}

export function buildNfcEntryPath(token: string, action?: NfcEntryAction, restaurantSlug?: string): string {
  if (!VALID_NFC_TOKEN.test(token)) return '';
  if (restaurantSlug && !VALID_NFC_SLUG.test(restaurantSlug)) return '';
  return '/' + (restaurantSlug ? restaurantSlug + '/' : '') + 'nfc/' + token + (action ? '?action=' + action : '');
}

/** Only canonical NFC card return URLs may be used after STAFF login. */
export function isNfcStaffReturnPath(path: string): boolean {
  return NFC_STAFF_RETURN.test(path);
}
