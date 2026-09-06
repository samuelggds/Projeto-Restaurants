export type NoticeVariant = 'success' | 'error' | 'warning' | 'info';

export type NoticeContent =
  | string
  | {
      title: string;
      message?: string;
    };

export type NoticeOptions = {
  id?: string;
  duration?: number | null;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
};

export type AppNotice = {
  id: string;
  variant: NoticeVariant;
  title: string;
  message?: string;
  duration: number | null;
  createdAt: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
};

const DEFAULT_DURATION: Record<NoticeVariant, number> = {
  success: 3800,
  info: 4400,
  warning: 5200,
  error: 6200,
};

const MAX_VISIBLE_NOTICES = 4;
const EMPTY_NOTICES: AppNotice[] = [];

let sequence = 0;
let currentNotices: AppNotice[] = EMPTY_NOTICES;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function normalizeContent(content: NoticeContent): { title: string; message?: string } {
  if (typeof content === 'string') {
    return { title: content };
  }

  return {
    title: String(content.title || '').trim(),
    message: content.message ? String(content.message).trim() : undefined,
  };
}

function normalizeDuration(variant: NoticeVariant, duration: number | null | undefined) {
  if (duration === null) return null;
  if (typeof duration !== 'number' || !Number.isFinite(duration)) return DEFAULT_DURATION[variant];
  return Math.max(1200, Math.round(duration));
}

function closeNotice(notice: AppNotice | undefined) {
  try {
    notice?.onClose?.();
  } catch {
    // O fechamento visual não deve falhar por causa de callbacks externos.
  }
}

export function subscribeNotices(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getNoticesSnapshot() {
  return currentNotices;
}

export function getServerNoticesSnapshot() {
  return EMPTY_NOTICES;
}

export function dismissNotice(id: string) {
  const notice = currentNotices.find((item) => item.id === id);
  if (!notice) return;

  currentNotices = currentNotices.filter((item) => item.id !== id);
  emitChange();
  closeNotice(notice);
}

export function clearNotices() {
  const previous = currentNotices;
  currentNotices = EMPTY_NOTICES;
  emitChange();
  previous.forEach(closeNotice);
}

export function showNotice(
  variant: NoticeVariant,
  content: NoticeContent,
  options: NoticeOptions = {},
) {
  const normalized = normalizeContent(content);
  const now = Date.now();

  if (!options.id) {
    const duplicate = [...currentNotices]
      .reverse()
      .find(
        (item) =>
          item.variant === variant &&
          item.title === normalized.title &&
          item.message === normalized.message &&
          now - item.createdAt < 800,
      );
    if (duplicate) return duplicate.id;
  }

  const id = options.id || `app-notice-${now}-${++sequence}`;
  const previousWithSameId = currentNotices.find((item) => item.id === id);
  const nextNotice: AppNotice = {
    id,
    variant,
    title: normalized.title,
    message: normalized.message,
    duration: normalizeDuration(variant, options.duration),
    createdAt: now,
    action:
      options.actionLabel && options.onAction
        ? { label: options.actionLabel, onClick: options.onAction }
        : undefined,
    onClose: options.onClose,
  };

  const withoutSameId = currentNotices.filter((item) => item.id !== id);
  const combined = [...withoutSameId, nextNotice];
  const evicted = combined.length > MAX_VISIBLE_NOTICES ? combined.slice(0, -MAX_VISIBLE_NOTICES) : [];
  currentNotices = combined.slice(-MAX_VISIBLE_NOTICES);
  emitChange();

  if (previousWithSameId) closeNotice(previousWithSameId);
  evicted.forEach((item) => {
    if (item.id !== previousWithSameId?.id) closeNotice(item);
  });

  return id;
}

export const notice = {
  success: (content: NoticeContent, options?: NoticeOptions) => showNotice('success', content, options),
  error: (content: NoticeContent, options?: NoticeOptions) => showNotice('error', content, options),
  warning: (content: NoticeContent, options?: NoticeOptions) => showNotice('warning', content, options),
  info: (content: NoticeContent, options?: NoticeOptions) => showNotice('info', content, options),
  dismiss: dismissNotice,
  clear: clearNotices,
};

const DEFAULT_LEGACY_TITLES: Record<NoticeVariant, string> = {
  success: 'Tudo certo',
  error: 'Não foi possível concluir',
  warning: 'Atenção',
  info: 'Informação',
};

export function buildLegacyNoticeContent(message: unknown, variant: NoticeVariant): NoticeContent {
  const text = String(message ?? '').trim();
  const lower = text.toLocaleLowerCase('pt-BR');

  if (variant === 'success' && lower.includes('sacola') && lower.includes('adicionad')) {
    return {
      title: 'Adicionado à sacola',
      message:
        text === 'Itens adicionados à sacola.'
          ? 'Os itens deste pedido foram incluídos na sua sacola.'
          : text,
    };
  }

  if (variant === 'success' && lower.includes('pagamento') && lower.includes('confirm')) {
    const rest = text.replace(/^pagamento[^.!?]*[.!?]?\s*/i, '').trim();
    return {
      title: 'Pagamento confirmado',
      message: rest || text,
    };
  }

  if (variant === 'success' && lower.includes('senha') && /(atualiz|alterad)/i.test(text)) {
    return { title: 'Senha atualizada', message: text };
  }

  if (variant === 'error' && lower.includes('sessão expirada')) {
    return { title: 'Sessão expirada', message: text };
  }

  if (variant === 'warning' && lower.includes('indisponível')) {
    return { title: 'Indisponível no momento', message: text };
  }

  const sentenceMatch = text.match(/^(.{1,48}?[.!?])\s+(.+)$/);
  if (sentenceMatch) {
    return {
      title: sentenceMatch[1].replace(/[.!?]+$/, ''),
      message: sentenceMatch[2],
    };
  }

  return {
    title: DEFAULT_LEGACY_TITLES[variant],
    message: text || undefined,
  };
}
