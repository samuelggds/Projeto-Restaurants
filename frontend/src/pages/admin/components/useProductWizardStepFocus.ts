import { useLayoutEffect, type RefObject } from 'react';
import type { ProductWizardStep } from '../domain/productWizard';

/**
 * Keep wizard focus predictable without triggering Safari's implicit scrolling.
 * Scrolling and focus are synchronized with the committed step before paint.
 */
export function useProductWizardStepFocus(
  step: ProductWizardStep,
  drawerRef: RefObject<HTMLFormElement | null>,
  headingRef: RefObject<HTMLHeadingElement | null>,
) {
  useLayoutEffect(() => {
    if (drawerRef.current) drawerRef.current.scrollTop = 0;
    headingRef.current?.focus({ preventScroll: true });
  }, [step, drawerRef, headingRef]);
}
