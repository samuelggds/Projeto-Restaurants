import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDialogProvider } from '../../../components/AppDialog/AppDialogProvider';
import { HelpCenter } from './HelpCenter';

const mocks = vi.hoisted(() => ({
  getMessages: vi.fn(),
  socketOn: vi.fn(),
  socketOff: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../../../Services/supportChatService', () => ({
  default: {
    getMessages: mocks.getMessages,
    updateIssue: vi.fn(),
    deleteIssue: vi.fn(),
  },
}));

vi.mock('../../../Services/socketService', () => ({
  acquireSocket: vi.fn(() => ({
    socket: {
      on: mocks.socketOn,
      off: mocks.socketOff,
    },
    release: vi.fn(),
  })),
}));

vi.mock('../../../modules/auth/session/authSession', () => ({
  getAccessToken: vi.fn(() => 'admin-test-token'),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('HelpCenter support channels', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();

    mocks.getMessages.mockImplementation(({ channel }: { channel: 'internal' | 'platform' }) => {
      if (channel === 'internal') {
        return Promise.resolve({
          messages: [
            {
              id: 'employee-issue',
              senderRole: 'FUNCIONARIO',
              senderLabel: 'Cozinha',
              message: 'Forno principal não está aquecendo.',
              issueStatus: 'OPEN',
              sentAt: '2026-08-28T10:00:00.000Z',
            },
            {
              id: 'platform-internal-leak',
              senderRole: 'SUPER_ADMIN',
              senderLabel: 'Plataforma',
              message: 'Mensagem da plataforma indevida em relatos.',
              issueStatus: null,
              sentAt: '2026-08-28T10:01:00.000Z',
            },
          ],
        });
      }

      return Promise.resolve({
        messages: [
          {
            id: 'admin-platform',
            senderRole: 'ADMIN',
            senderLabel: 'Administrador',
            message: 'Preciso de ajuda para configurar o gateway.',
            issueStatus: null,
            sentAt: '2026-08-28T10:02:00.000Z',
          },
          {
            id: 'super-admin-platform',
            senderRole: 'SUPER_ADMIN',
            senderLabel: 'Super Admin',
            message: 'Vou revisar a configuração com você.',
            issueStatus: 'CLOSED',
            sentAt: '2026-08-28T10:03:00.000Z',
          },
          {
            id: 'employee-platform-leak',
            senderRole: 'FUNCIONARIO',
            senderLabel: 'Garçom',
            message: 'Relato operacional indevido na plataforma.',
            issueStatus: 'OPEN',
            sentAt: '2026-08-28T10:04:00.000Z',
          },
        ],
      });
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('mantém relatos da equipe separados da conversa entre ADMIN e SUPER_ADMIN', async () => {
    act(() => {
      root.render(
        <AppDialogProvider>
          <HelpCenter onReport={vi.fn().mockResolvedValue(undefined)} />
        </AppDialogProvider>,
      );
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 20));
    });

    expect(mocks.getMessages).toHaveBeenCalledWith({ limit: 100, channel: 'internal' });
    expect(mocks.getMessages).toHaveBeenCalledWith({ limit: 100, channel: 'platform' });

    expect(container.textContent).toContain('Relatos da equipe');
    expect(container.textContent).toContain('Forno principal não está aquecendo.');
    expect(container.textContent).toContain('Suporte da plataforma');
    expect(container.textContent).toContain('Preciso de ajuda para configurar o gateway.');
    expect(container.textContent).toContain('Vou revisar a configuração com você.');
    expect(container.textContent).toContain('Atendimento encerrado');

    expect(container.textContent).not.toContain('Mensagem da plataforma indevida em relatos.');
    expect(container.textContent).not.toContain('Relato operacional indevido na plataforma.');
  });
});
