import { useEffect, type RefObject } from 'react';
import type { ProductWizardStep } from '../domain/productWizard';

/**
 * Keep wizard focus predictable without triggering Safari's implicit scrolling.
 * Focus and scrolling run after the step is committed, without blocking clicks.
 */
export function useProductWizardStepFocus(
  step: ProductWizardStep,
  scrollBodyRef: RefObject<HTMLDivElement | null>,
  headingRef: RefObject<HTMLHeadingElement | null>,
) {
  useEffect(() => {
    const focusStep = () => {
      if (scrollBodyRef.current) scrollBodyRef.current.scrollTop = 0;
      headingRef.current?.focus({ preventScroll: true });
    };
    // Focus after React commits the new step and the browser completes the
    // click dispatch. Synchronous focus/scroll can stall WebKit's mouse event.
    if (typeof window.requestAnimationFrame !== 'function') {
      focusStep();
      return;
    }
    const frame = window.requestAnimationFrame(focusStep);
    return () => window.cancelAnimationFrame(frame);
  }, [step, scrollBodyRef, headingRef]);
}
