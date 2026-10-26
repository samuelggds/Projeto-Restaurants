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
      const heading = headingRef.current;
      if (!heading?.isConnected) return;
      if (scrollBodyRef.current) scrollBodyRef.current.scrollTop = 0;
      heading.focus({ preventScroll: true });
    };

    // Focus after React commits the new step and the browser completes the
    // click dispatch. Synchronous focus/scroll can stall WebKit's mouse event.
    if (typeof window.requestAnimationFrame !== 'function') {
      focusStep();
      return;
    }

    let settleFrame: number | undefined;
    const frame = window.requestAnimationFrame(() => {
      focusStep();
      // Safari may restore focus to the opener after the first frame of a modal
      // click. Retry once after the next paint, but never steal focus from an
      // element the user has already focused inside this dialog.
      settleFrame = window.requestAnimationFrame(() => {
        const heading = headingRef.current;
        if (!heading?.isConnected) return;
        const dialog = heading.closest('[role="dialog"]');
        if (dialog && !dialog.contains(document.activeElement)) focusStep();
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (settleFrame !== undefined) window.cancelAnimationFrame(settleFrame);
    };
  }, [step, scrollBodyRef, headingRef]);
}
