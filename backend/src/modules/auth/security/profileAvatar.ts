const MAX_PROFILE_AVATAR_BINARY_BYTES = 500 * 1024;
const MAX_PROFILE_AVATAR_URL_LENGTH = 2048;
const DATA_IMAGE_PATTERN = /^data:image\/(jpeg|png|webp);base64,([a-z0-9+/]+={0,2})$/iu;

export function normalizeProfileAvatar(value: unknown): string | null {
  const avatar = String(value ?? '').trim();
  if (!avatar) return null;

  if (avatar.startsWith('data:')) {
    const match = avatar.match(DATA_IMAGE_PATTERN);
    if (!match) {
      throw new Error('A foto do perfil deve ser JPG, PNG ou WEBP.');
    }

    const encoded = match[2];
    const binarySize = Buffer.from(encoded, 'base64').byteLength;
    if (binarySize <= 0 || binarySize > MAX_PROFILE_AVATAR_BINARY_BYTES) {
      throw new Error('A foto do perfil deve ter no máximo 500 KB após o processamento.');
    }

    return avatar;
  }

  if (avatar.length > MAX_PROFILE_AVATAR_URL_LENGTH) {
    throw new Error('A URL da foto do perfil é muito longa.');
  }

  try {
    const url = new URL(avatar);
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new Error();
    }
  } catch {
    throw new Error('A foto do perfil deve usar uma URL HTTPS válida.');
  }

  return avatar;
}
