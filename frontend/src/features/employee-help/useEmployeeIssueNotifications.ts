import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { acquireSocket } from '../../Services/socketService';
import { getAccessToken } from '../../modules/auth/session/authSession';
import supportChatService from '../../Services/supportChatService';

export function useEmployeeIssueNotifications() {
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return undefined;

    const { socket, release } = acquireSocket(token, 'operational-issue-notifications');
    const notify = (issue: {
      id?: string;
      status?: string;
      response?: string | null;
      responderName?: string | null;
      respondedAt?: string | null;
      closedAt?: string | null;
    }) => {
      const id = String(issue.id || 'latest');
      const version = issue.respondedAt || issue.closedAt || issue.status || 'update';
      const storageKey = `employee-issue-notified:${id}:${version}`;
      if (sessionStorage.getItem(storageKey)) return;

      if (issue.status === 'CLOSED') {
        toast.success(
          issue.response
            ? `Relato resolvido · Admin${issue.responderName ? ` ${issue.responderName}` : ''}: ${issue.response}`
            : 'Seu relato foi encerrado.',
          { autoClose: false },
        );
      } else if (issue.response) {
        toast.info(
          `Admin${issue.responderName ? ` ${issue.responderName}` : ''}: ${issue.response}`,
          { autoClose: false },
        );
      } else {
        return;
      }
      sessionStorage.setItem(storageKey, '1');
    };
    const onIssueUpdated = (issue: { id?: string; status?: string; response?: string | null }) =>
      notify(issue);
    const checkUpdates = () => {
      void supportChatService
        .getMyIssueUpdates()
        .then((result) => (result?.updates || []).forEach(notify))
        .catch(() => {});
    };

    socket.on('support:issue-updated', onIssueUpdated);
    checkUpdates();
    const intervalId = window.setInterval(checkUpdates, 8_000);
    return () => {
      socket.off('support:issue-updated', onIssueUpdated);
      window.clearInterval(intervalId);
      release();
    };
  }, []);
}
