import { describe, expect, it } from 'vitest';
import {
  PROFILE_AVATAR_MAX_SOURCE_BYTES,
  validateProfileAvatarFile,
} from './profileAvatar';

describe('profileAvatar', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])(
    'aceita formato de avatar seguro %s',
    (type) => {
      const file = new File(['avatar'], 'avatar', { type });
      expect(() => validateProfileAvatarFile(file)).not.toThrow();
    },
  );

  it('rejeita SVG e formatos não permitidos', () => {
    const file = new File(['<svg/>'], 'avatar.svg', { type: 'image/svg+xml' });
    expect(() => validateProfileAvatarFile(file)).toThrow(/JPG, PNG ou WEBP/u);
  });

  it('rejeita arquivo maior que o limite de origem', () => {
    const file = new File(
      [new Uint8Array(PROFILE_AVATAR_MAX_SOURCE_BYTES + 1)],
      'avatar.jpg',
      { type: 'image/jpeg' },
    );
    expect(() => validateProfileAvatarFile(file)).toThrow(/5 MB/u);
  });
});
