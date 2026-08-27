export type RealtimeEmitter = {
  emit(event: string, ...args: unknown[]): unknown;
};

export type RealtimeTransport = RealtimeEmitter & {
  to(room: string): RealtimeEmitter;
};

let activeTransport: RealtimeTransport | null = null;
let warnedAboutMissingTransport = false;

function warnAboutMissingTransport() {
  if (warnedAboutMissingTransport || process.env.NODE_ENV === 'test') return;
  warnedAboutMissingTransport = true;
  console.warn('[REALTIME_TRANSPORT_NOT_CONFIGURED]');
}

/**
 * Porta de saída usada pelos módulos de negócio. Ela evita que um service
 * importe o bootstrap HTTP e, por consequência, abra servidor e jobs em testes.
 */
export const realtimePublisher: RealtimeTransport = {
  emit(event, ...args) {
    if (!activeTransport) {
      warnAboutMissingTransport();
      return false;
    }
    return activeTransport.emit(event, ...args);
  },

  to(room) {
    return {
      emit(event, ...args) {
        if (!activeTransport) {
          warnAboutMissingTransport();
          return false;
        }
        return activeTransport.to(room).emit(event, ...args);
      },
    };
  },
};

/**
 * Registra o adaptador da infraestrutura. O disposer só remove o transporte
 * que esta chamada instalou, impedindo que um bootstrap antigo desligue outro.
 */
export function registerRealtimeTransport(transport: RealtimeTransport) {
  activeTransport = transport;
  warnedAboutMissingTransport = false;

  return () => {
    if (activeTransport === transport) activeTransport = null;
  };
}
