import { useCallback, useState } from 'react';
import { readStorage, writeStorage } from '../../shared/storage/safeStorage';

export const KITCHEN_READING_MODE_STORAGE_KEY = 'kitchen:reading-mode';

export function useKitchenReadingMode(storageKey = KITCHEN_READING_MODE_STORAGE_KEY) {
  const [largeReadingMode, setLargeReadingMode] = useState(
    () => readStorage(storageKey) === 'large',
  );
  const changeReadingMode = useCallback(
    (enabled: boolean) => {
      setLargeReadingMode(enabled);
      writeStorage(storageKey, enabled ? 'large' : 'standard');
    },
    [storageKey],
  );

  return [largeReadingMode, changeReadingMode] as const;
}
