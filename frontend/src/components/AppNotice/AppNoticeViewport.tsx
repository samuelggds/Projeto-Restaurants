import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { dismissNotice, subscribeToNotices, type AppNotice, type NoticeTone } from './notify';

const iconByTone = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: ShieldAlert,
} satisfies Record<NoticeTone, typeof Info>;

const titleByTone: Record<NoticeTone, string> = {
  success: 'Tudo certo',
  info: 'Informação',
  warning: 'Atenção',
  error: 'Não foi possível concluir',
};

function NoticeCard({ notice }: { notice: AppNotice }) {
  const Icon = iconByTone[notice.tone];

  useEffect(() => {
    if (notice.autoClose === false) return undefined;
    const timer = window.setTimeout(() => dismissNotice(notice.id), notice.autoClose);
    return () => window.clearTimeout(timer);
  }, [notice.autoClose, notice.createdAt, notice.id]);

  return (
    <Card $tone={notice.tone} role={notice.tone === 'error' ? 'alert' : 'status'}>
      <IconBox $tone={notice.tone} aria-hidden="true">
        <Icon />
      </IconBox>
      <Copy>
        <strong>{notice.title || titleByTone[notice.tone]}</strong>
        <p>{notice.message}</p>
      </Copy>
      <Close type="button" onClick={() => dismissNotice(notice.id)} aria-label="Fechar aviso">
        <X />
      </Close>
      {notice.autoClose !== false ? <Progress $tone={notice.tone} $duration={notice.autoClose} /> : null}
    </Card>
  );
}

export function AppNoticeViewport() {
  const [notices, setNotices] = useState<AppNotice[]>([]);

  useEffect(() => subscribeToNotices(setNotices), []);

  if (!notices.length) return null;

  return (
    <Viewport aria-live="polite" aria-relevant="additions removals">
      {notices.map((notice) => (
        <NoticeCard key={notice.id} notice={notice} />
      ))}
    </Viewport>
  );
}

const Viewport = styled.div`
  position: fixed;
  top: max(18px, env(safe-area-inset-top));
  right: max(18px, env(safe-area-inset-right));
  z-index: 5000;
  width: min(390px, calc(100vw - 36px));
  display: grid;
  gap: 10px;
  pointer-events: none;

  @media (max-width: 640px) {
    top: auto;
    right: max(10px, env(safe-area-inset-right));
    bottom: max(12px, env(safe-area-inset-bottom));
    left: max(10px, env(safe-area-inset-left));
    width: auto;
  }
`;

const toneStyles: Record<NoticeTone, { border: string; soft: string; strong: string }> = {
  success: { border: '#b8dfc6', soft: '#ecf8f0', strong: '#247546' },
  info: { border: '#c9dcef', soft: '#eef6fd', strong: '#2a6494' },
  warning: { border: '#ead4a6', soft: '#fff8e7', strong: '#9a6415' },
  error: { border: '#efc5c5', soft: '#fff1f1', strong: '#a93636' },
};

const Card = styled.article<{ $tone: NoticeTone }>`
  position: relative;
  overflow: hidden;
  min-height: 78px;
  padding: 14px 42px 14px 14px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 11px;
  align-items: start;
  border: 1px solid ${({ $tone }) => toneStyles[$tone].border};
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.98);
  color: #182230;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(12px);
  pointer-events: auto;
  animation: app-notice-in 240ms cubic-bezier(.16,1,.3,1) both;

  @keyframes app-notice-in {
    from { opacity: 0; transform: translateY(-8px) scale(.985); }
    to { opacity: 1; transform: none; }
  }

  @media (max-width: 640px) {
    min-height: 74px;
    border-radius: 15px;
    animation-name: app-notice-mobile-in;
  }

  @keyframes app-notice-mobile-in {
    from { opacity: 0; transform: translateY(10px) scale(.985); }
    to { opacity: 1; transform: none; }
  }
`;

const IconBox = styled.span<{ $tone: NoticeTone }>`
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: ${({ $tone }) => toneStyles[$tone].soft};
  color: ${({ $tone }) => toneStyles[$tone].strong};

  svg { width: 19px; height: 19px; }
`;

const Copy = styled.div`
  min-width: 0;
  padding-top: 1px;

  strong {
    display: block;
    margin-bottom: 3px;
    font-size: 13px;
    line-height: 1.25;
  }

  p {
    margin: 0;
    color: #667085;
    font-size: 11px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
`;

const Close = styled.button`
  position: absolute;
  top: 9px;
  right: 9px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #788597;

  svg { width: 15px; height: 15px; }
  &:hover { background: #f3f5f7; color: #273343; }
`;

const Progress = styled.span<{ $tone: NoticeTone; $duration: number }>`
  position: absolute;
  left: 0;
  bottom: 0;
  height: 3px;
  width: 100%;
  background: ${({ $tone }) => toneStyles[$tone].strong};
  transform-origin: left;
  opacity: .62;
  animation: app-notice-progress ${({ $duration }) => $duration}ms linear forwards;

  @keyframes app-notice-progress {
    from { transform: scaleX(1); }
    to { transform: scaleX(0); }
  }
`;
