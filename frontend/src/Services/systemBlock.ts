const SYSTEM_BLOCK_KEY = 'system_block_state';

export function getSystemBlockState() {
  try {
    const raw = localStorage.getItem(SYSTEM_BLOCK_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(SYSTEM_BLOCK_KEY);
    return null;
  }
}

export function setSystemBlockState(payload) {
  localStorage.setItem(
    SYSTEM_BLOCK_KEY,
    JSON.stringify({
      blocked: true,
      updatedAt: new Date().toISOString(),
      ...payload,
    }),
  );
}

export function clearSystemBlockState() {
  localStorage.removeItem(SYSTEM_BLOCK_KEY);
}
