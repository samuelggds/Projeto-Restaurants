import { useCallback, useEffect, useRef, useState } from 'react';
import supportChatService from '../../../Services/supportChatService';

export const EMPLOYEE_ISSUES_UNREAD_EVENT = 'employee-issues-unread';
export const EMPLOYEE_ISSUES_SYNC_EVENT = 'employee-issues-sync';

const UNREAD_ISSUES_STORAGE_KEY = 'employee-issues-unread';
const ISSUES_LAST_SEEN_STORAGE_KEY = 'employee-issues-last-seen-id';

type IssueMessage = {
  id?: string;
  issueStatus?: string | null;
};

function countUnreadIssues(messages: IssueMessage[], lastSeenId: number) {
  return messages.filter((message) => {
    const isActive = message.issueStatus === 'OPEN' || message.issueStatus === 'IN_PROGRESS';
    return isActive && Number(message.id || 0) > lastSeenId;
  }).length;
}

export function useAdminUnreadIssues(isHelpOpen: boolean) {
  const [unreadIssues, setUnreadIssues] = useState(() =>
    Number(sessionStorage.getItem(UNREAD_ISSUES_STORAGE_KEY) || 0),
  );
  const mountedRef = useRef(true);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  const refreshUnreadIssues = useCallback(() => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const request = supportChatService
      .getMessages({ limit: 100, channel: 'internal' })
      .then((result) => {
        if (!mountedRef.current) return;
        const lastSeenId = Number(sessionStorage.getItem(ISSUES_LAST_SEEN_STORAGE_KEY) || 0);
        const nextUnread = countUnreadIssues(result?.messages || [], lastSeenId);
        sessionStorage.setItem(UNREAD_ISSUES_STORAGE_KEY, String(nextUnread));
        setUnreadIssues(nextUnread);
      })
      .catch(() => {})
      .finally(() => {
        if (refreshInFlightRef.current === request) refreshInFlightRef.current = null;
      });

    refreshInFlightRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const markUnread = () => {
      if (isHelpOpen) return;
      setUnreadIssues((current) => {
        const next = current + 1;
        sessionStorage.setItem(UNREAD_ISSUES_STORAGE_KEY, String(next));
        return next;
      });
    };
    window.addEventListener(EMPLOYEE_ISSUES_UNREAD_EVENT, markUnread);
    return () => window.removeEventListener(EMPLOYEE_ISSUES_UNREAD_EVENT, markUnread);
  }, [isHelpOpen]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'hidden') void refreshUnreadIssues();
    };

    refreshWhenVisible();
    window.addEventListener('focus', refreshWhenVisible);
    window.addEventListener(EMPLOYEE_ISSUES_SYNC_EVENT, refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener(EMPLOYEE_ISSUES_SYNC_EVENT, refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refreshUnreadIssues]);

  const clearUnreadIssues = useCallback(() => {
    setUnreadIssues(0);
    sessionStorage.setItem(UNREAD_ISSUES_STORAGE_KEY, '0');
    void supportChatService
      .getMessages({ limit: 1, channel: 'internal' })
      .then((result) => {
        const latestId = Number(result?.messages?.[0]?.id || 0);
        sessionStorage.setItem(ISSUES_LAST_SEEN_STORAGE_KEY, String(latestId));
      })
      .catch(() => {});
  }, []);

  return { unreadIssues, clearUnreadIssues, refreshUnreadIssues };
}
