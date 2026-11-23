import { useState } from 'react';

export function useCustomerTheme(value?: boolean, onChange?: (dark: boolean) => void, initial: boolean | (() => boolean) = false) {
  const [local, setLocal] = useState(initial);
  const dark = value ?? local;

  function toggle() {
    if (value === undefined) setLocal(!dark);
    onChange?.(!dark);
  }
  return [dark, toggle] as const;
}
