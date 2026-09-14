type StorageArea = 'localStorage' | 'sessionStorage';

export function readStorage(key: string, area: StorageArea = 'localStorage'): string | null {
  try { return globalThis[area]?.getItem(key) ?? null; } catch { return null; }
}

export function writeStorage(key: string, value: string, area: StorageArea = 'localStorage'): boolean {
  try {
    const storage = globalThis[area];
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch { return false; }
}

export function removeStorage(key: string, area: StorageArea = 'localStorage'): void {
  try { globalThis[area]?.removeItem(key); } catch { /* Memory remains the source of truth. */ }
}
