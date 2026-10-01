import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import * as S from '../../Home/Home.styles';

export type HomeNotification = {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  msg?: string;
  visible: boolean;
};

const LABELS: Record<HomeNotification['type'], string> = {
  success: 'Tudo certo',
  error: 'Não foi possível concluir',
  info: 'Atualização',
  warning: 'Atenção',
};

function NotificationIcon({ type }: { type: HomeNotification['type'] }) {
  if (type === 'success') return <CheckCircle2 />;
  if (type === 'error') return <AlertCircle />;
  if (type === 'warning') return <TriangleAlert />;
  return <Info />;
}

type Props = {
  notifications: HomeNotification[];
  onDismissNotification: (id: number) => void;
};

export function HomeFeedback(props: Props) {
  return (
    <>
      <S.NotifStack
        aria-label="Avisos recentes"
        aria-live="polite"
        aria-relevant="additions"
      >
        {props.notifications.map((notification) => (
          <S.NotifItem
            key={notification.id}
            $type={notification.type}
            $visible={notification.visible}
            role={notification.type === 'error' ? 'alert' : 'status'}
            aria-atomic="true"
          >
            <div className="notif-icon" aria-hidden="true">
              <NotificationIcon type={notification.type} />
            </div>
            <div className="notif-body">
              <span className="notif-type">{LABELS[notification.type]}</span>
              <span className="notif-title">{notification.title}</span>
              {notification.msg && <span className="notif-msg">{notification.msg}</span>}
            </div>
            <div className="notif-actions">
              <button
                className="notif-close"
                aria-label="Fechar notificação"
                type="button"
                onClick={() => props.onDismissNotification(notification.id)}
              >
                <X aria-hidden="true" />
              </button>
            </div>
          </S.NotifItem>
        ))}
      </S.NotifStack>
    </>
  );
}
