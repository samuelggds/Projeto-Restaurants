import { useEffect, useSyncExternalStore } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import styled from 'styled-components';
import {
  dismissNotice,
  getNoticesSnapshot,
  getServerNoticesSnapshot,
  subscribeNotices,
  type AppNotice,
} from './noticeStore';

const variantIcon = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

function NoticeCard({ notice }: { notice: AppNotice }) {
  const Icon = variantIcon[notice.variant];

  useEffect(() => {
    if (notice.duration == null) return undefined;
    const timeout = window.setTimeout(() => dismissNotice(notice.id), notice.duration);
    return () => window.clearTimeout(timeout);
  }, [notice.duration, notice.id]);

  return (
    <Card
      $variant={notice.variant}
      $duration={notice.duration}
      role={notice.variant === 'error' || notice.variant === 'warning' ? 'alert' : 'status'}
      aria-live={notice.variant === 'error' ? 'assertive' : 'polite'}
    >
      <IconWrap $variant={notice.variant}>
        <Icon aria-hidden="true" />
      </IconWrap>

      <Copy>
        <strong>{notice.title}</strong>
        {notice.message ? <p>{notice.message}</p> : null}
        {notice.action ? (
          <ActionButton
            type="button"
            onClick={() => {
              notice.action?.onClick();
              dismissNotice(notice.id);
            }}
          >
            {notice.action.label}
          </ActionButton>
        ) : null}
      </Copy>

      <CloseButton type="button" aria-label="Fechar aviso" onClick={() => dismissNotice(notice.id)}>
        <X aria-hidden="true" />
      </CloseButton>

      {notice.duration != null ? <Progress aria-hidden="true" /> : null}
    </Card>
  );
}

export function NoticeViewport() {
  const notices = useSyncExternalStore(
    subscribeNotices,
    getNoticesSnapshot,
    getServerNoticesSnapshot,
  );

  if (!notices.length) return null;

  return (
    <Viewport aria-label="Avisos da aplicação">
      {notices.map((notice) => (
        <NoticeCard key={notice.id} notice={notice} />
      ))}
    </Viewport>
  );
}

const Viewport = styled.section`
  position: fixed;
  z-index: 5000;
  top: max(16px, env(safe-area-inset-top));
  right: 16px;
  width: min(390px, calc(100vw - 32px));
  display: grid;
  gap: 10px;
  pointer-events: none;

  @media (max-width: 560px) {
    top: max(10px, env(safe-area-inset-top));
    right: 10px;
    width: calc(100vw - 20px);
  }
`;

const variantAccent = {
  success: '#2f855a',
  error: '#c2413a',
  warning: '#b7791f',
  info: '#3569a8',
} as const;

const variantSoft = {
  success: '#edf8f1',
  error: '#fff1ef',
  warning: '#fff8e8',
  info: '#eef5ff',
} as const;

const Card = styled.article<{ $variant: AppNotice['variant']; $duration: number | null }>`
  --notice-accent: ${({ $variant }) => variantAccent[$variant]};
  position: relative;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 30px;
  gap: 10px;
  align-items: start;
  overflow: hidden;
  padding: 13px 12px 14px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 18px 55px rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(14px);
  color: #1f2937;
  pointer-events: auto;
  animation: notice-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both;

  @keyframes notice-in {
    from {
      opacity: 0;
      transform: translate3d(16px, -6px, 0) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const IconWrap = styled.span<{ $variant: AppNotice['variant'] }>`
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: ${({ $variant }) => variantSoft[$variant]};
  color: ${({ $variant }) => variantAccent[$variant]};

  svg {
    width: 20px;
    height: 20px;
    stroke-width: 2.2;
  }
`;

const Copy = styled.div`
  min-width: 0;
  padding-top: 2px;

  strong {
    display: block;
    font-size: 13px;
    line-height: 1.35;
    color: #172033;
  }

  p {
    margin: 4px 0 0;
    color: #647084;
    font-size: 11px;
    line-height: 1.45;
  }
`;

const ActionButton = styled.button`
  margin-top: 9px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--notice-accent);
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--notice-accent) 30%, transparent);
    outline-offset: 3px;
    border-radius: 4px;
  }
`;

const CloseButton = styled.button`
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #8b96a8;
  cursor: pointer;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: #f2f4f7;
    color: #475467;
  }

  &:focus-visible {
    outline: 2px solid rgba(71, 84, 103, 0.22);
    outline-offset: 2px;
  }
`;

const Progress = styled.span`
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  background: var(--notice-accent);
  transform-origin: left center;
  animation: notice-progress linear forwards;
  animation-duration: inherit;
  opacity: 0.62;

  ${Card}[style*='--notice-duration'] & {
    animation-duration: var(--notice-duration);
  }

  @keyframes notice-progress {
    from {
      transform: scaleX(1);
    }
    to {
      transform: scaleX(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;
