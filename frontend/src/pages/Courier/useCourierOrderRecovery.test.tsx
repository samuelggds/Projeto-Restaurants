import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useCourierOrderRecovery } from './useCourierOrderRecovery';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('recuperação da fila do motoqueiro', () => {
  let root: Root;
  let container: HTMLDivElement;
  let recover: () => void;
  let busy: boolean;
  const refresh = vi.fn();
  let visibility: 'hidden' | 'visible';
  let online: boolean;

  function Harness({ connected = false, enabled = true }) {
    recover = useCourierOrderRecovery({
      connected,
      enabled,
      isBusy: () => busy,
      onRefresh: refresh,
    });
    return null;
  }
  beforeEach(() => {
    vi.useFakeTimers();
    refresh.mockReset();
    busy = false;
    visibility = 'visible';
    online = true;
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('consulta a cada 30 segundos sem realtime e interrompe esse fallback quando conectado', () => {
    act(() => root.render(<Harness />));
    act(() => vi.advanceTimersByTime(30_200));
    expect(refresh).toHaveBeenCalledOnce();
    act(() => root.render(<Harness connected />));
    act(() => vi.advanceTimersByTime(60_000));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('agrupa eventos de retorno e espera a consulta anterior para não sobrepor requisições', () => {
    act(() => root.render(<Harness connected />));
    busy = true;
    act(() => {
      recover();
      window.dispatchEvent(new Event('online'));
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(2_000);
    });
    expect(refresh).not.toHaveBeenCalled();
    busy = false;
    act(() => vi.advanceTimersByTime(500));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('não consulta com página oculta ou navegador offline; recupera ao retornar', () => {
    act(() => root.render(<Harness />));
    visibility = 'hidden';
    act(() => vi.advanceTimersByTime(60_200));
    expect(refresh).not.toHaveBeenCalled();
    visibility = 'visible';
    online = false;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(200);
    });
    expect(refresh).not.toHaveBeenCalled();
    online = true;
    act(() => {
      window.dispatchEvent(new Event('online'));
      vi.advanceTimersByTime(200);
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('ignora recuperação desabilitada e cancela callbacks ao sair da tela', () => {
    act(() => root.render(<Harness enabled={false} />));
    act(() => {
      recover();
      vi.advanceTimersByTime(200);
    });
    expect(refresh).not.toHaveBeenCalled();
    act(() => root.render(<Harness />));
    act(() => recover());
    act(() => root.render(null));
    act(() => {
      window.dispatchEvent(new Event('online'));
      vi.advanceTimersByTime(60_200);
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
