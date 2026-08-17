import * as S from '../../Home/Home.styles';

export type HomeNotification = {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  msg?: string;
  visible: boolean;
};

const ICONS: Record<HomeNotification['type'], string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '!',
};

type Props = {
  showLoginNudge: boolean;
  notifications: HomeNotification[];
  onLogin: () => void;
  onDismissNudge: () => void;
  onDismissNotification: (id: number) => void;
};

export function HomeFeedback(props: Props) {
  return (
    <>
      {props.showLoginNudge && (
        <S.LoginNudge>
          <span>🔔 Faça login para acompanhar seus pedidos em tempo real</span>
          <button className="nudge-login" type="button" onClick={props.onLogin}>
            Entrar
          </button>
          <button className="nudge-dismiss" type="button" onClick={props.onDismissNudge}>
            Agora não
          </button>
        </S.LoginNudge>
      )}
      <S.NotifStack aria-live="polite">
        {props.notifications.map((notification) => (
          <S.NotifItem
            key={notification.id}
            $type={notification.type}
            $visible={notification.visible}
          >
            <div className="notif-icon">{ICONS[notification.type]}</div>
            <div className="notif-body">
              <span className="notif-title">{notification.title}</span>
              {notification.msg && <span className="notif-msg">{notification.msg}</span>}
            </div>
            <button
              className="notif-close"
              aria-label="Fechar notificação"
              type="button"
              onClick={() => props.onDismissNotification(notification.id)}
            >
              ×
            </button>
          </S.NotifItem>
        ))}
      </S.NotifStack>
    </>
  );
}
