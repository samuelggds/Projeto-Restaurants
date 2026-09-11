import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminMockSettings } from '../data';
import type { TableAccountAdminSettings } from '../types';
import { TablePrepaymentSettings } from './TablePrepaymentSettings';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('regras de pagamento antecipado da mesa', () => {
  let container: HTMLDivElement;
  let root: Root;
  const changed = vi.fn();
  beforeEach(() => {
    changed.mockClear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function Harness({ initial }: { initial: Partial<TableAccountAdminSettings> }) {
    const [account, setAccount] = useState({
      ...adminMockSettings.tableAccount,
      enabled: true,
      ...initial,
    });
    return (
      <TablePrepaymentSettings
        account={account}
        onChange={(key, value) => {
          changed(key, value);
          setAccount((current) => ({ ...current, [key]: value }));
        }}
      />
    );
  }
  function render(initial: Partial<TableAccountAdminSettings> = {}) {
    act(() => root.render(<Harness initial={initial} />));
    return container.querySelector<HTMLInputElement>(
      '[aria-label="Limite para pagamento antecipado"]',
    )!;
  }
  function enter(input: HTMLInputElement, value: string) {
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  function button(label: string) {
    return [...container.querySelectorAll('button')].find(
      (item) => item.textContent?.trim() === label,
    )!;
  }

  it('permite apagar e digitar reais e centavos sem formatar a cada tecla', () => {
    const input = render({ requirePrepaymentAboveCents: 10_000 });
    act(() => input.focus());
    expect(input.value).toBe('100,00');
    expect(input.selectionEnd).toBe(6);
    expect(input.inputMode).toBe('decimal');
    for (const [text, cents] of [
      ['', null],
      ['2', 200],
      ['2,', 200],
      ['2,3', 230],
      ['2,34', 234],
      ['100.25', 10_025],
    ] as const) {
      enter(input, text);
      expect(input.value).toBe(text);
      expect(changed).toHaveBeenLastCalledWith('requirePrepaymentAboveCents', cents);
    }
    act(() => input.blur());
    expect(input.value).toBe('100,25');
  });

  it('recusa negativos, texto e mais de duas casas sem alterar o limite', () => {
    const input = render({ requirePrepaymentAboveCents: 10_000 });
    for (const text of ['-1', 'abc', '1e2', '2,345', '1.000,00']) {
      enter(input, text);
      expect(input.value).toBe('100,00');
    }
    expect(changed).not.toHaveBeenCalled();
  });

  it('distingue limite zero de regra de valor desativada', () => {
    const input = render({ requirePrepaymentAboveCents: 0 });
    expect(container.textContent).toContain('Todo novo pedido com valor positivo');
    act(() => button('Remover limite de valor').click());
    expect(input.value).toBe('');
    expect(changed).toHaveBeenLastCalledWith('requirePrepaymentAboveCents', null);
    expect(container.textContent).toContain('Sem exigência de pagamento antecipado');
    expect(container.textContent).toContain('Nenhum período configurado');
  });

  it('explica que a condição usa saldo mais pedido e aceita igualdade com o limite', () => {
    render({ requirePrepaymentAboveCents: 10_000 });
    const text = container.textContent!.replace(/\u00a0/g, ' ');
    expect(text).toContain('Saldo em aberto + novo pedido');
    expect(text).toContain('Passa do limite: o cliente paga os R$ 30,00');
    expect(text).toContain('Se a soma for exatamente R$ 100,00, o pedido pode entrar na conta');
  });

  it('mantém os horários editáveis sem perder foco e explica a passagem da meia-noite', () => {
    render({ timeZone: 'America/Manaus' });
    act(() => button('Adicionar horário').click());
    const start = container.querySelector<HTMLInputElement>('[aria-label="Início do período 1"]')!;
    const end = container.querySelector<HTMLInputElement>('[aria-label="Fim do período 1"]')!;
    act(() => start.focus());
    enter(start, '22:00');
    expect(document.activeElement).toBe(start);
    enter(end, '02:00');
    expect(changed).toHaveBeenLastCalledWith('prepaymentWindows', [
      { weekdays: [1, 2, 3, 4, 5], startsAtMinute: 1320, endsAtMinute: 120 },
    ]);
    expect(container.textContent).toContain('Termina no dia seguinte');
    expect(container.textContent).toContain('Horário de Manaus');
    act(() =>
      container.querySelector<HTMLButtonElement>('[aria-label="Remover período 1"]')!.click(),
    );
    expect(changed).toHaveBeenLastCalledWith('prepaymentWindows', []);
  });

  it('explica a combinação com pagamento online desligado e deixa o admin ativar', () => {
    render({ requirePrepaymentAboveCents: 10_000, allowOnlinePayment: false });
    expect(container.textContent).toContain('O pagamento online está desativado');
    act(() => button('Ativar pagamento online').click());
    expect(changed).toHaveBeenLastCalledWith('allowOnlinePayment', true);
    expect(container.textContent).not.toContain('O pagamento online está desativado');
  });
});
