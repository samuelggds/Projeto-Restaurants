import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMessages: vi.fn(),
}));

vi.mock('../../../Services/supportChatService', () => ({
  default: { getMessages: mocks.getMessages },
}));

import {
  EMPLOYEE_ISSUES_SYNC_EVENT,
  EMPLOYEE_ISSUES_UNREAD_EVENT,
  useAdminUnreadIssues,
} from './useAdminUnreadIssues';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function Probe({ helpOpen = false }: { helpOpen?: boolean }) {
  const { unreadIssues, clearUnreadIssues } = useAdminUnreadIssues(helpOpen);
  return (
    <button type="button" data-unread={unreadIssues} onClick={clearUnreadIssues}>
      Limpar
    </button>
  );
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useAdminUnreadIssues', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mocks.getMessages.mockResolvedValue({ messages: [] });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('calcula os chamados ativos ao abrir e não cria polling contínuo', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    sessionStorage.setItem('employee-issues-last-seen-id', '10');
    mocks.getMessages.mockResolvedValue({
      messages: [
        { id: '11', issueStatus: 'OPEN' },
        { id: '12', issueStatus: 'IN_PROGRESS' },
        { id: '13', issueStatus: 'RESOLVED' },
        { id: '9', issueStatus: 'OPEN' },
      ],
    });

    await act(async () => root.render(<Probe />));
    await flush();

    expect(container.querySelector('button')?.dataset.unread).toBe('2');
    expect(mocks.getMessages).toHaveBeenCalledTimes(1);
    expect(mocks.getMessages).toHaveBeenCalledWith({ limit: 100, channel: 'internal' });
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('atualiza por evento em tempo real e sincroniza somente quando solicitado', async () => {
    await act(async () => root.render(<Probe />));
    await flush();

    act(() => window.dispatchEvent(new CustomEvent(EMPLOYEE_ISSUES_UNREAD_EVENT)));
    expect(container.querySelector('button')?.dataset.unread).toBe('1');

    mocks.getMessages.mockResolvedValue({
      messages: [
        { id: '21', issueStatus: 'OPEN' },
        { id: '22', issueStatus: 'IN_PROGRESS' },
      ],
    });
    act(() => window.dispatchEvent(new CustomEvent(EMPLOYEE_ISSUES_SYNC_EVENT)));
    await flush();

    expect(container.querySelector('button')?.dataset.unread).toBe('2');
    expect(mocks.getMessages).toHaveBeenCalledTimes(2);
  });

  it('não incrementa novos alertas enquanto a central de ajuda está aberta', async () => {
    await act(async () => root.render(<Probe helpOpen />));
    await flush();

    act(() => window.dispatchEvent(new CustomEvent(EMPLOYEE_ISSUES_UNREAD_EVENT)));

    expect(container.querySelector('button')?.dataset.unread).toBe('0');
  });
});
