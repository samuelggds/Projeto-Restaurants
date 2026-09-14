import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { PublicGuestOrderHelp } from './PublicGuestOrderHelp';
vi.mock('../../Services/ordersService', () => ({
  default: { getIssueThread: vi.fn().mockResolvedValue({ restaurantId: 1 }) },
  getGuestOwnedOrderProofs: () => [],
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

it('abre fora do painel flutuante e fecha por Escape restaurando o foco', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<PublicGuestOrderHelp restaurantId={1} inline />));
    const launcher = host.querySelector('button')!;
    launcher.focus();
    await act(async () => launcher.click());
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
    await act(async () =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    );
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(launcher);
    expect(document.body.style.overflow).not.toBe('hidden');
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
