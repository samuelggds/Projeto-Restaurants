import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDialogProvider } from '../../../components/AppDialog/AppDialogProvider';
import tableAccountService from '../../../Services/tableAccountService';
import { adminMockSettings } from '../data';
import { TableAccountSettings } from './TableAccountSettings';

vi.mock('../../../Services/tableAccountService', () => ({
  default: {
    listAdminSessions: vi.fn(),
    forceCloseSession: vi.fn(),
  },
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const session = {
  tableSessionId: 41,
  sessionPublicId: 'session-public-41',
  tableNumber: 1,
  openedAt: '2026-08-30T10:00:00.000Z',
  status: 'OPEN',
  openedByName: 'Garçom',
  itemsCount: 0,
  summary: {
    consumedCents: 0,
    grossPaidCents: 0,
    remainingCents: 0,
    participantsCount: 2,
  },
};

describe('TableAccountSettings', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
    vi.mocked(tableAccountService.listAdminSessions).mockResolvedValue({ sessions: [session] });
    vi.mocked(tableAccountService.forceCloseSession).mockResolvedValue({});
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('solicita o motivo do fechamento em um diálogo interno do sistema', async () => {
    await act(async () => {
      root.render(
        <AppDialogProvider>
          <TableAccountSettings settings={adminMockSettings} update={vi.fn()} />
        </AppDialogProvider>,
      );
      await Promise.resolve();
    });

    const forceCloseButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Fechamento administrativo',
    );
    expect(forceCloseButton).toBeDefined();

    await act(async () => forceCloseButton?.click());

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('Fechar a Mesa 1?');
    expect(dialog?.textContent).toContain('O motivo ficará registrado na auditoria.');
    expect(dialog?.textContent).toContain('Manter aberta');
    expect(dialog?.textContent).toContain('Fechar mesa');
  });
});
