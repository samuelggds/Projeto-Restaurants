import { afterEach, expect, it, vi } from 'vitest';
import { readStorage, writeStorage, removeStorage } from './safeStorage';
import {
  persistAuthSession,
  getAccessToken,
  clearAuthSession,
} from '../../modules/auth/session/authSession';

afterEach(() => {
  vi.restoreAllMocks();
  clearAuthSession();
});

it('mantém autenticação em memória quando leitura/gravação/remoção de storage falham', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('blocked');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('quota');
  });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    throw new DOMException('blocked');
  });
  expect(readStorage('key')).toBeNull();
  expect(writeStorage('key', 'value')).toBe(false);
  expect(() => removeStorage('key')).not.toThrow();
  persistAuthSession({ id: 1 }, 'memory-token');
  expect(getAccessToken()).toBe('memory-token');
  clearAuthSession();
  expect(getAccessToken()).toBeNull();
});
