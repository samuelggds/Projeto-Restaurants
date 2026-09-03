import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminOrder, Employee } from '../types';
import { AdminCustomers } from './AdminCustomers';
import { EmployeeList } from './EmployeeList';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function changeInput(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(
    input,
    value,
  );
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function changeSelect(select: HTMLSelectElement, value: string) {
  Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set?.call(
    select,
    value,
  );
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('diretórios administrativos de pessoas', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('resume, ordena e filtra clientes pelo histórico de pedidos', () => {
    const orders: AdminOrder[] = [
      {
        id: '#1',
        numericId: 1,
        userId: 'customer-a',
        customerName: 'Ana Lima',
        customerEmail: 'ana@teste.com',
        status: 'ENTREGUE',
        total: 30,
      },
      {
        id: '#2',
        numericId: 2,
        userId: 'customer-a',
        customerName: 'Ana Lima',
        customerEmail: 'ana@teste.com',
        status: 'ENTREGUE',
        total: 20,
      },
      {
        id: '#3',
        numericId: 3,
        userId: 'customer-b',
        customerName: 'Bruno Alves',
        customerEmail: 'bruno@teste.com',
        status: 'ENTREGUE',
        total: 80,
      },
    ];

    act(() => root.render(<AdminCustomers orders={orders} money={(value) => `R$ ${value},00`} />));

    expect(container.textContent).toContain('1 cliente recorrente');
    expect(container.textContent).toContain('R$ 130,00');
    const rows = container.querySelectorAll('[aria-label="Lista de clientes"] article');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain('Bruno Alves');

    const search = container.querySelector(
      '[aria-label="Buscar cliente por nome ou e-mail"]',
    ) as HTMLInputElement;
    act(() => changeInput(search, 'ana@teste.com'));

    const filteredRows = container.querySelectorAll('[aria-label="Lista de clientes"] article');
    expect(filteredRows).toHaveLength(1);
    expect(filteredRows[0]?.textContent).toContain('Ana Lima');
    expect(filteredRows[0]?.textContent).toContain('R$ 50,00');
  });

  it('filtra funcionários sem ocultar cargo e executa as ações do acesso', async () => {
    const employees: Employee[] = [
      {
        id: '1',
        name: 'Ana Cozinha',
        email: 'ana@teste.com',
        role: 'COOK',
        active: true,
        permissions: { viewOrders: true, updateOrderStatus: true, manageQrTables: false },
      },
      {
        id: '2',
        name: 'Bruno Entrega',
        email: 'bruno@teste.com',
        role: 'COURIER',
        active: false,
        permissions: { viewOrders: true, updateOrderStatus: true, manageQrTables: false },
      },
    ];
    const onNew = vi.fn();
    const onEdit = vi.fn();
    const onDeactivate = vi.fn().mockResolvedValue(undefined);
    const onReactivate = vi.fn().mockResolvedValue(undefined);

    act(() =>
      root.render(
        <EmployeeList
          employees={employees}
          onNew={onNew}
          onEdit={onEdit}
          onDeactivate={onDeactivate}
          onReactivate={onReactivate}
        />,
      ),
    );

    expect(container.textContent).toContain('1 com acesso ativo');
    expect(container.textContent).toContain('Cozinheiro');
    expect(container.textContent).toContain('Motoqueiro');

    const status = container.querySelector(
      '[aria-label="Filtrar funcionários por status"]',
    ) as HTMLSelectElement;
    act(() => changeSelect(status, 'INACTIVE'));

    expect(container.textContent).not.toContain('Ana Cozinha');
    expect(container.textContent).toContain('Bruno Entrega');
    expect(container.textContent).toContain('Acesso inativo');

    const edit = container.querySelector(
      '[aria-label="Editar Bruno Entrega"]',
    ) as HTMLButtonElement;
    act(() => edit.click());
    expect(onEdit).toHaveBeenCalledWith(employees[1]);

    const reactivate = container.querySelector(
      '[aria-label="Reativar Bruno Entrega"]',
    ) as HTMLButtonElement;
    await act(async () => reactivate.click());
    expect(onReactivate).toHaveBeenCalledWith(employees[1]);

    const createButtons = Array.from(container.querySelectorAll('button')).filter((button) =>
      button.textContent?.includes('Novo funcionário'),
    );
    act(() => createButtons[0]?.click());
    expect(onNew).toHaveBeenCalledOnce();
  });
});
