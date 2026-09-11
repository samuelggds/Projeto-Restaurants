import { useEffect, useRef, useState } from 'react';
import { sanitizeDemoState, type DemoState } from './demoDomain';
import { DEMO_ADMIN_STORAGE_KEY, readDemoAdminData } from './demoAdminData';

export function DemoAdmin({
  state,
  onState,
  onLogout,
  onViewStore,
}: {
  state: DemoState;
  onState: (state: DemoState) => void;
  onLogout: () => void;
  onViewStore?: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'demo-admin:ready') {
        setReady(true);
        frame.current?.contentWindow?.postMessage(
          { type: 'demo-admin:init', state: stateRef.current, data: readDemoAdminData() },
          location.origin,
        );
      }
      if (event.data?.type === 'demo-admin:state')
        onState({
          ...sanitizeDemoState(event.data.state),
          sessionAccountId: stateRef.current.sessionAccountId,
        });
      if (event.data?.type === 'demo-admin:data') {
        try {
          localStorage.setItem(DEMO_ADMIN_STORAGE_KEY, JSON.stringify(event.data.data));
          window.dispatchEvent(new Event('demo-admin-data'));
        } catch {
          /* The frame remains usable without browser storage. */
        }
      }
      if (event.data?.type === 'demo-admin:exit') onLogout();
      if (event.data?.type === 'demo-admin:store') {
        if (onViewStore) onViewStore();
        else onState({ ...stateRef.current, sessionAccountId: 'demo-cliente' });
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onState, onLogout, onViewStore]);
  useEffect(() => {
    if (ready)
      frame.current?.contentWindow?.postMessage(
        { type: 'demo-admin:state', state },
        location.origin,
      );
  }, [ready, state]);
  return (
    <iframe
      ref={frame}
      src="/demo-admin.html"
      title="Painel administrativo demonstrativo"
      sandbox="allow-scripts allow-same-origin allow-downloads allow-forms"
      style={{
        display: 'block',
        width: '100%',
        height: '100dvh',
        border: 0,
        background: '#f7f8f6',
      }}
    />
  );
}
