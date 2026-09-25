import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type InputHTMLAttributes,
} from 'react';

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'onBlur'
> & {
  value: number;
  onCommit: (value: number) => void;
  integer?: boolean;
};

function numericBound(value: string | number | undefined) {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function NumericDraftInput({
  value,
  onCommit,
  integer = false,
  min,
  max,
  onFocus,
  ...inputProps
}: Props) {
  const [draft, setDraft] = useState(String(value));
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) setDraft(String(value));
  }, [value]);

  function commit() {
    editingRef.current = false;
    const normalized = draft.trim().replace(',', '.');
    const parsed = Number(normalized);

    if (!normalized || !Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }

    let next = integer ? Math.round(parsed) : parsed;
    const minimum = numericBound(min);
    const maximum = numericBound(max);

    if (minimum !== undefined) next = Math.max(minimum, next);
    if (maximum !== undefined) next = Math.min(maximum, next);

    setDraft(String(next));
    if (next !== value) onCommit(next);
  }

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    editingRef.current = true;
    onFocus?.(event);
  }

  return (
    <input
      {...inputProps}
      type="number"
      min={min}
      max={max}
      value={draft}
      onFocus={handleFocus}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
    />
  );
}
