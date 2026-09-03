import { useEffect, useRef, type ButtonHTMLAttributes, type MouseEventHandler } from 'react';
import styled from 'styled-components';

type FloatingActionsToggleProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

/*
 * The old table-menu shell used one generic "Cupons e status" control before
 * exposing the actual actions. The individual controls (benefits, table
 * service and status) now own their collapsed/expanded experience, so this
 * compatibility button only expands the legacy parent state once and stays
 * visually absent.
 */
const CompatibilityButton = styled.button`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  padding: 0;
  border: 0;
  opacity: 0;
  pointer-events: none;
  clip-path: inset(50%);
`;

export function FloatingActionsToggle({ children, ...props }: FloatingActionsToggleProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const expanded = props['aria-expanded'] === true || props['aria-expanded'] === 'true';

  useEffect(() => {
    if (expanded) return;
    const frame = window.requestAnimationFrame(() => buttonRef.current?.click());
    return () => window.cancelAnimationFrame(frame);
  }, [expanded]);

  return (
    <CompatibilityButton ref={buttonRef} tabIndex={-1} aria-hidden="true" {...props}>
      {children}
    </CompatibilityButton>
  );
}
