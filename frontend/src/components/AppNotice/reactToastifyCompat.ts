import {
  buildLegacyNoticeContent,
  clearNotices,
  dismissNotice,
  showNotice,
  type NoticeVariant,
} from './noticeStore';

type LegacyToastOptions = {
  toastId?: string | number;
  autoClose?: number | false;
  onClose?: () => void;
};

function mapOptions(options?: LegacyToastOptions) {
  return {
    id: options?.toastId == null ? undefined : String(options.toastId),
    duration: options?.autoClose === false ? null : options?.autoClose,
    onClose: options?.onClose,
  };
}

function showLegacy(variant: NoticeVariant, message: unknown, options?: LegacyToastOptions) {
  return showNotice(variant, buildLegacyNoticeContent(message, variant), mapOptions(options));
}

export const toast = {
  success: (message: unknown, options?: LegacyToastOptions) => showLegacy('success', message, options),
  error: (message: unknown, options?: LegacyToastOptions) => showLegacy('error', message, options),
  warning: (message: unknown, options?: LegacyToastOptions) => showLegacy('warning', message, options),
  warn: (message: unknown, options?: LegacyToastOptions) => showLegacy('warning', message, options),
  info: (message: unknown, options?: LegacyToastOptions) => showLegacy('info', message, options),
  dismiss: (id?: string | number) => {
    if (id == null) {
      clearNotices();
      return;
    }
    dismissNotice(String(id));
  },
};

// Compatibilidade temporária para componentes que ainda importam o container antigo.
// O viewport real é montado uma única vez em main.tsx.
export function ToastContainer() {
  return null;
}
