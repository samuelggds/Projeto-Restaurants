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
      action?: HomeNotification['action'],
    ) => {
      const id = Date.now();
      setNotifications((previous) => {
        const current =
          action === 'open-cart'
            ? previous.filter((item) => item.action !== action)
            : previous;
        const duplicate = current.some(
          (notification) =>
            notification.title === title &&
            notification.msg === msg &&
            notification.action === action,
        );
        if (duplicate) return current;
        return [...current.slice(-2), { id, type, title, msg, visible: false, action }];
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
