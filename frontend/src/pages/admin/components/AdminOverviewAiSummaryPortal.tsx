import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AdminOverviewAiSummary } from './AdminOverviewAiSummary';

export function AdminOverviewAiSummaryPortal({ onNavigate }: { onNavigate: (target: string) => void }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let disposed = false;
    let node: HTMLDivElement | null = null;
    let frame = 0;

    const sync = () => {
      if (disposed) return;
      const hero = document.querySelector<HTMLElement>('[aria-labelledby="overview-summary-title"]');
      if (!hero) {
        if (node) {
          node.remove();
          node = null;
          setHost(null);
        }
        return;
      }
      if (!node || !node.isConnected) {
        node = document.createElement('div');
        node.dataset.adminAiOverviewSummary = 'true';
        hero.insertAdjacentElement('afterend', node);
        setHost(node);
      }
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      node?.remove();
    };
  }, []);

  return host ? createPortal(<AdminOverviewAiSummary onNavigate={onNavigate} />, host) : null;
}
