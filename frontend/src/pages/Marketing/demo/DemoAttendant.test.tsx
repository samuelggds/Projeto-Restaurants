import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../Services/api';
import { DemoAttendant } from './DemoAttendant';
import { createInitialDemoState, type DemoState } from './demoDomain';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('DemoAttendant real screens with local services', () => {
  let container: HTMLDivElement;
  let root: Root;
  let state: DemoState;
  const requests = ['get', 'post', 'put', 'patch', 'delete'] as const;

  beforeEach(() => {
    requests.forEach((method) =>
      vi.spyOn(api, method).mockRejectedValue(new Error('A demo não pode chamar a API.')),
    );
    state = createInitialDemoState();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    requests.forEach((method) => expect(api[method]).not.toHaveBeenCalled());
    vi.restoreAllMocks();
  });

  function Harness() {
    const [current, setCurrent] = useState(state);
    return (
      <DemoAttendant
        state={current}
        onState={(next) => {
          state = next;
          setCurrent(next);
        }}
        onLogout={() => {}}
      />
    );
  }
  function button(label: string, parent: ParentNode = container) {
    const result = [...parent.querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.textContent?.trim() === label,
    );
    expect(result, label).toBeTruthy();
    return result!;
  }
  async function go(label: string) {
    const nav = container.querySelector('[aria-label="Navegação do atendente"]')!;
    await act(async () => button(label, nav).click());
  }

  it('navega em todas as telas reais sem executar rede e mantém o chamado atualizado', async () => {
    await act(async () => root.render(<Harness />));
    expect(container.textContent).toContain('Central de atendimento');
    await go('Novo pedido');
    expect(container.textContent).toContain('Monte o pedido');
    expect(container.textContent).toContain('Burger Clássico');
    await go('Pedidos');
    const pickup = [...container.querySelectorAll('main article')].find((item) =>
      item.textContent?.includes('#1056'),
    )!;
    await act(async () => button('Ver detalhes', pickup).click());
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('Carlos Souza');
    const close = container.querySelector('[aria-label="Fechar detalhes"]') as HTMLButtonElement;
    act(() => close.click());
    await go('Chamados');
    await act(async () => button('Assumir chamado').click());
    expect(state.calls[0].status).toBe('IN_PROGRESS');
    expect(container.textContent).toContain('Marcar como resolvido');
    await go('Mesas');
    expect(container.textContent).toContain('Mesas em operação');
    await go('Entregas');
    expect(container.textContent).toContain('Marina Lima');
    await go('Atendimento');
    expect(container.textContent).toContain('Pode confirmar o andamento do meu pedido?');
    const conversation = [...container.querySelectorAll<HTMLButtonElement>('button')].find((item) =>
      item.textContent?.includes('Pedido #1058'),
    )!;
    await act(async () => conversation.click());
    expect(container.querySelector('[aria-label="Responder cliente"]')).not.toBeNull();
    await act(async () => button('Resolver').click());
    expect(container.textContent).toContain('Atendimento resolvido');
    await go('Visão geral');
    await go('Atendimento');
    expect(container.textContent).toContain('Resolvido');
  });
});
