import { describe, expect, it } from 'vitest';
import { buildNfcEntryPath, getNfcEntryAction, isNfcStaffReturnPath } from './nfcEntryNavigation';

const token = 'a'.repeat(43);
describe('NFC staff entry navigation', () => {
  it('keeps the public card URL and strictly scoped staff/order/payment intents', () => {
    expect(buildNfcEntryPath(token)).toBe('/nfc/' + token);
    expect(buildNfcEntryPath(token, 'staff', 'north-pizza')).toBe('/north-pizza/nfc/' + token + '?action=staff');
    expect(isNfcStaffReturnPath('/north-pizza/nfc/' + token + '?action=staff')).toBe(true);
    expect(buildNfcEntryPath(token, 'staff')).toBe('/nfc/' + token + '?action=staff');
    expect(buildNfcEntryPath(token, 'order')).toBe('/nfc/' + token + '?action=order');
    expect(getNfcEntryAction('?action=order')).toBe('order');
    expect(getNfcEntryAction('?action=staff')).toBe('staff');
    expect(buildNfcEntryPath(token, 'payment')).toBe('/nfc/' + token + '?action=payment');
    expect(getNfcEntryAction('?action=payment')).toBe('payment');
    expect(isNfcStaffReturnPath(buildNfcEntryPath(token, 'payment'))).toBe(true);
    expect(getNfcEntryAction('')).toBeNull();
    expect(isNfcStaffReturnPath(buildNfcEntryPath(token))).toBe(true);
    expect(isNfcStaffReturnPath(buildNfcEntryPath(token, 'order'))).toBe(true);
  });
  it.each([
    '?action=order&action=staff',
    '?action=order&redirect=https://evil.example',
    '?action=pay',
    '?action=ORDER',
    '?next=/admin',
  ])('rejects ambiguous or unsupported entry mode %s', search => {
    expect(getNfcEntryAction(search)).toBeNull();
  });
  it.each([
    '/nfc/short?action=order',
    '/nfc/' + token + '?action=payments',
    '/north-pizza/nfc/' + token + '?action=order&next=/admin',
    '/nfc/' + token + '?action=order&next=/admin',
    '/nfc/' + token + '?action=order#foo',
    '//evil.example/nfc/' + token,
    '/nfc/' + token + '/anything',
    '/nfc/' + token + '?action=staff&action=order',
  ])('rejects invalid staff return path %s', path => {
    expect(isNfcStaffReturnPath(path)).toBe(false);
  });
  it('does not construct routes from malformed card tokens', () => {
    expect(buildNfcEntryPath('../attendant', 'order')).toBe('');
  });
});
