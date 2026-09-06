export type NoticeTone = 'success' | 'info' | 'warning' | 'error';

export type NoticeOptions = {
  autoClose?: number | false;
  title?: string;
};

export type AppNotice = {
  id: number;
  tone: NoticeTone;
  message: string;
  title?: string;
  autoClose: number | false;
  createdAt: number;
};

type Listener = (notices: AppNotice[]) => void;

const DEFAULT_DURATIONS: Record<NoticeTone, number> = {
  success: 4200,
  info: 5200,
  warning: 6200,
  error: 7600,
};

const listeners = new Set<Listener>();
let notices: AppNotice[] = [];
let nextId = 1;

function emit() {
  const snapshot = [...notices];
  listeners.forEach((listener) => listener(snapshot));
}

function normalizeMessage(message: unknown) {
  if (typeof message === 'string') return message.trim();
  if (message == null) return '';
  return String(message).trim();
}

function push(tone: NoticeTone, message: unknown, options: NoticeOptions = {}) {
  const normalizedMessage = normalizeMessage(message);
  if (!normalizedMessage) return 0;

  const existing = notices.find(
    (notice) => notice.tone === tone && notice.message === normalizedMessage,
  );
  if (existing) {
    notices = [
      ...notices.filter((notice) => notice.id !== existing.id),
      { ...existing, createdAt: Date.now() },
    ].slice(-4);
    emit();
    return existing.id;
  }

  const id = nextId++;
  notices = [
    ...notices,
    {
      id,
      tone,
      message: normalizedMessage,
      title: options.title,
      autoClose:
        options.autoClose === false
          ? false
          : typeof options.autoClose === 'number'
            ? Math.max(1200, options.autoClose)
            : DEFAULT_DURATIONS[tone],
      createdAt: Date.now(),
    },
  ].slice(-4);
  emit();
  return id;
}

export function dismissNotice(id: number) {
  const next = notices.filter((notice) => notice.id !== id);
  if (next.length === notices.length) return;
  notices = next;
  emit();
}

export function subscribeToNotices(listener: Listener) {
  listeners.add(listener);
  listener([...notices]);
  return () => {
    listeners.delete(listener);
  };
}

export const notify = {
  success: (message: unknown, options?: NoticeOptions) => push('success', message, options),
  info: (message: unknown, options?: NoticeOptions) => push('info', message, options),
  warning: (message: unknown, options?: NoticeOptions) => push('warning', message, options),
  warn: (message: unknown, options?: NoticeOptions) => push('warning', message, options),
  error: (message: unknown, options?: NoticeOptions) => push('error', message, options),
};
