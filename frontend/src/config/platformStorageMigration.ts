/** Read the former namespace once so a rebrand does not discard saved preferences. */
export function migratePlatformStorage(storage: Storage) {
  const prefixes = [
    ['@PecaJaFood:', '@GastroNexa:'],
    ['pecajaf:', 'gastronexa:'],
  ] as const;
  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    for (const key of keys) {
      if (!key) continue;
      const prefix = prefixes.find(([previous]) => key.startsWith(previous));
      if (!prefix) continue;
      const nextKey = prefix[1] + key.slice(prefix[0].length);
      const value = storage.getItem(key);
      if (value !== null && storage.getItem(nextKey) === null) storage.setItem(nextKey, value);
      storage.removeItem(key);
    }
  } catch {
    // Restricted storage must never prevent the application from starting.
  }
}

export function normalizePlatformName(name: string) {
  return /^pe[çc]a\s*j[aá](?:\s*food)?$/iu.test(name) ? 'GastroNexa' : name;
}

if (typeof window !== 'undefined') {
  try {
    migratePlatformStorage(window.localStorage);
  } catch {
    /* Storage disabled. */
  }
}
