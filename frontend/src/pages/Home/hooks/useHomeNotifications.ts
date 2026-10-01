import { useCallback, useState } from 'react';
import type { HomeNotification } from '../components/HomeFeedback';

type NotifType = 'success' | 'error' | 'info' | 'warning';

export function useHomeNotifications() {
  const [notifications, setNotifications] = useState<HomeNotification[]>([]);

  const notify = useCallback(
    (
      type: NotifType,
      title: string,
      msg?: string,
      duration = 3500,
    ) => {
      const id = Date.now();
      setNotifications((previous) => {
        const duplicate = previous.some(
          (notification) =>
            notification.title === title &&
            notification.msg === msg,
        );
        if (duplicate) return previous;
        return [...previous.slice(-2), { id, type, title, msg, visible: false }];
      });

      requestAnimationFrame(() => {
        setNotifications((previous) =>
          previous.map((notification) =>
            notification.id === id ? { ...notification, visible: true } : notification,
          ),
        );
      });

      window.setTimeout(() => {
        setNotifications((previous) =>
          previous.map((notification) =>
            notification.id === id ? { ...notification, visible: false } : notification,
          ),
        );
        window.setTimeout(
          () =>
            setNotifications((previous) =>
              previous.filter((notification) => notification.id !== id),
            ),
          400,
        );
      }, duration);
    },
    [],
  );

  const dismissNotification = useCallback((id: number) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id ? { ...notification, visible: false } : notification,
      ),
    );
    window.setTimeout(
      () =>
        setNotifications((previous) =>
          previous.filter((notification) => notification.id !== id),
        ),
      400,
    );
  }, []);

  return { notifications, notify, dismissNotification };
}
