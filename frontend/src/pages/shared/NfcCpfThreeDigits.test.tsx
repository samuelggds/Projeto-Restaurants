import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NfcCpfThreeDigits from './NfcCpfThreeDigits';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('NFC CPF prefix with three visual boxes', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  it('renders three non-readable boxes and an accessible numeric input', () => {
    act(() => root.render(<NfcCpfThreeDigits value="12" onChange={() => {}} />));
    expect(container.querySelectorAll('.digit')).toHaveLength(3);
    const field = container.querySelector<HTMLInputElement>('input')!;
    expect(field.getAttribute('aria-label')).toContain('CPF');
    expect(field.type).toBe('password');
    expect(field.maxLength).toBe(3);
    expect(field.inputMode).toBe('numeric');
    expect(container.querySelector('.digits')?.textContent).not.toContain('12');
  });
  it('accepts only three digits and preserves leading zeroes', () => {
    const onChange = vi.fn();
    act(() => root.render(<NfcCpfThreeDigits value="" onChange={onChange} />));
    const input = container.querySelector<HTMLInputElement>('input')!;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, '0a1234');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('012');
  });
});
