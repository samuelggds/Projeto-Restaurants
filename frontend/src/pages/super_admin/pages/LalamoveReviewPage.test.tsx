import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LalamoveReviewPage } from './LalamoveReviewPage';

const mocks = vi.hoisted(() => ({ list: vi.fn(), review: vi.fn() }));
vi.mock('../../../Services/superAdminService', () => ({
  default: {
    listLalamoveOnboarding: mocks.list,
    reviewLalamoveOnboarding: mocks.review,
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function entry(restaurantId: number) {
  return {
    id: 'request-' + restaurantId,
    restaurantId,
    restaurant: { id: restaurantId, name: 'Restaurante ' + restaurantId, slug: 'restaurante-' + restaurantId },
    status: 'REQUESTED',
    updatedAt: '2026-10-09T19:00:00.000Z',
    requestedAt: '2026-10-09T18:00:00.000Z',
    reviewReasonCode: null,
    connected: false,
    canDispatch: false,
  };
}
type Queue = { requests: ReturnType<typeof entry>[]; nextCursor: number | null };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('LalamoveReviewPage', () => {
  let container: HTMLDivElement;
  let root: Root | null;

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.list.mockResolvedValue({ requests: [entry(1)], nextCursor: null });
    mocks.review.mockResolvedValue({});
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    container.remove();
  });

  async function render(strict = false) {
    await act(async () => {
      root?.render(strict ? <StrictMode><LalamoveReviewPage /></StrictMode> : <LalamoveReviewPage />);
    });
  }

  function button(text: string): HTMLButtonElement {
    const element = Array.from(container.querySelectorAll('button')).find(item => item.textContent === text);
    if (!element) throw new Error('Botão não encontrado: ' + text);
    return element;
  }

  async function select(label: string, value: string) {
    const element = container.querySelector<HTMLSelectElement>('select[aria-label="' + label + '"]');
    if (!element) throw new Error('Campo não encontrado: ' + label);
    await act(async () => {
      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  it('starts loading, disables actions and only shows empty state after the API response', async () => {
    const pending = deferred<Queue>();
    mocks.list.mockReturnValueOnce(pending.promise);
    await render();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(button('Atualizar').disabled).toBe(true);
    expect(container.textContent).not.toContain('Nenhuma solicitação');
    expect(mocks.list).toHaveBeenCalledWith(undefined, expect.any(AbortSignal));
    await act(async () => pending.resolve({ requests: [], nextCursor: null }));
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.textContent).toContain('Nenhuma solicitação nesta página.');
    expect(button('Atualizar').disabled).toBe(false);
  });

  it('keeps the latest StrictMode request when the previous response arrives late', async () => {
    const previous = deferred<Queue>();
    const current = deferred<Queue>();
    mocks.list.mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise);
    await render(true);
    expect(mocks.list).toHaveBeenCalledTimes(2);
    expect((mocks.list.mock.calls[0][1] as AbortSignal).aborted).toBe(true);
    await act(async () => current.resolve({ requests: [entry(2)], nextCursor: null }));
    await act(async () => previous.resolve({ requests: [entry(1)], nextCursor: null }));
    expect(container.textContent).toContain('Restaurante 2');
    expect(container.textContent).not.toContain('Restaurante 1');
    expect(button('Atualizar').disabled).toBe(false);
  });

  it('aborts reads and ignores late errors after unmount', async () => {
    const pending = deferred<Queue>();
    mocks.list.mockReturnValueOnce(pending.promise);
    await render();
    const signal = mocks.list.mock.calls[0][1] as AbortSignal;
    act(() => { root?.unmount(); root = null; });
    expect(signal.aborted).toBe(true);
    await act(async () => pending.reject(new Error('late request failure')));
    expect(container.innerHTML).toBe('');
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it('shows a safe error, not internal diagnostics, and allows retry', async () => {
    mocks.list.mockRejectedValueOnce({ response: { status: 500, data: { error: 'PRIVATE_DIAGNOSTIC_SENTINEL' } } });
    await render();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível concluir');
    expect(container.textContent).not.toContain('PRIVATE_DIAGNOSTIC_SENTINEL');
    expect(container.textContent).not.toContain('Nenhuma solicitação');
    await act(async () => button('Atualizar').click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain('Restaurante 1');
  });

  it('rejects malformed queue responses without reporting an empty queue', async () => {
    mocks.list.mockResolvedValueOnce({ requests: null });
    await render();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.textContent).not.toContain('Nenhuma solicitação');
    expect(button('Atualizar').disabled).toBe(false);
  });

  it('appends pages once and replaces the queue on refresh', async () => {
    mocks.list.mockResolvedValueOnce({ requests: [entry(1)], nextCursor: 40 });
    await render();
    const page = deferred<Queue>();
    mocks.list.mockReturnValueOnce(page.promise);
    const more = button('Carregar mais');
    await act(async () => { more.click(); more.click(); });
    expect(mocks.list).toHaveBeenCalledTimes(2);
    expect(mocks.list).toHaveBeenLastCalledWith(40, expect.any(AbortSignal));
    await act(async () => page.resolve({ requests: [entry(2)], nextCursor: null }));
    expect(container.querySelectorAll('h3')).toHaveLength(2);
    mocks.list.mockResolvedValueOnce({ requests: [entry(3)], nextCursor: null });
    await act(async () => button('Atualizar').click());
    expect(container.querySelectorAll('h3')).toHaveLength(1);
    expect(container.textContent).toContain('Restaurante 3');
  });

  it('requires a reason and never offers activation or real dispatch', async () => {
    await render();
    const values = Array.from(container.querySelectorAll('option')).map(option => option.value);
    expect(values).not.toContain('CONNECTED');
    expect(values).not.toContain('ACTIVE');
    await select('Novo status Lalamove restaurante 1', 'SUSPENDED');
    await act(async () => button('Salvar revisão').click());
    expect(mocks.review).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Selecione o motivo');
    await select('Motivo Lalamove restaurante 1', 'THERMAL_BAG');
    await act(async () => button('Salvar revisão').click());
    expect(mocks.review).toHaveBeenCalledWith(1, {
      status: 'SUSPENDED', expectedStatus: 'REQUESTED',
      expectedUpdatedAt: '2026-10-09T19:00:00.000Z', reasonCode: 'THERMAL_BAG',
    });
  });

  it('sends only the selected restaurant and version, and blocks duplicate reviews', async () => {
    mocks.list.mockResolvedValue({ requests: [entry(1), entry(2)], nextCursor: null });
    await render();
    await select('Novo status Lalamove restaurante 2', 'IN_REVIEW');
    const saving = deferred<object>();
    mocks.review.mockReturnValueOnce(saving.promise);
    const save = Array.from(container.querySelectorAll<HTMLButtonElement>('button.primary')).find(item => !item.disabled);
    if (!save) throw new Error('Nenhuma revisão selecionada');
    await act(async () => { save.click(); save.click(); });
    expect(mocks.review).toHaveBeenCalledTimes(1);
    expect(mocks.review).toHaveBeenCalledWith(2, {
      status: 'IN_REVIEW', expectedStatus: 'REQUESTED',
      expectedUpdatedAt: '2026-10-09T19:00:00.000Z', reasonCode: null,
    });
    expect(button('Atualizar').disabled).toBe(true);
    await act(async () => saving.resolve({}));
    expect(mocks.list).toHaveBeenCalledTimes(2);
    expect(Array.from(container.querySelectorAll<HTMLSelectElement>('select')).every(item => item.value === '')).toBe(true);
  });

  it('reports concurrent review conflicts without retrying the mutation', async () => {
    await render();
    await select('Novo status Lalamove restaurante 1', 'IN_REVIEW');
    mocks.review.mockRejectedValueOnce({ response: { status: 409 } });
    await act(async () => button('Salvar revisão').click());
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Atualize a lista');
    expect(mocks.review).toHaveBeenCalledTimes(1);
    expect(button('Atualizar').disabled).toBe(false);
  });

  it('does not reload or retry a review that completes after leaving the page', async () => {
    await render();
    await select('Novo status Lalamove restaurante 1', 'IN_REVIEW');
    const saving = deferred<object>();
    mocks.review.mockReturnValueOnce(saving.promise);
    await act(async () => button('Salvar revisão').click());
    act(() => { root?.unmount(); root = null; });
    await act(async () => saving.resolve({}));
    expect(mocks.list).toHaveBeenCalledTimes(1);
    expect(mocks.review).toHaveBeenCalledTimes(1);
    expect(container.innerHTML).toBe('');
  });
});
