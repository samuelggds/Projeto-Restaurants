import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import tablesService from '../../../Services/tablesService';
import { adminMockSettings } from '../data';
import { TableMenuSettings } from './TableMenuSettings';

vi.mock('../../../Services/tablesService', () => ({
  default: {
    listTables: vi.fn(),
    createTable: vi.fn(),
  },
}));

describe('TableMenuSettings', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tablesService.listTables).mockResolvedValue([]);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    Object.defineProperty(window, 'print', { configurable: true, value: vi.fn() });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:table-qr'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    act(() => root.unmount());
    container.remove();
  });

  async function renderSettings(
    props: Partial<React.ComponentProps<typeof TableMenuSettings>> = {},
  ) {
    await act(async () =>
      root.render(
        <TableMenuSettings
          settings={{
            ...adminMockSettings,
            tableOrderingEnabled: true,
            waiterCallEnabled: false,
            billRequestEnabled: true,
          }}
          update={() => undefined}
          {...props}
        />,
      ),
    );
  }

  it('reflete os recursos operacionais do cardápio de mesa', async () => {
    await renderSettings();

    expect(
      (container.querySelector('[aria-label="Pedidos por QR Code"]') as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (container.querySelector('[aria-label="Chamar garçom"]') as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (container.querySelector('[aria-label="Pedir a conta"]') as HTMLInputElement).checked,
    ).toBe(true);
  });

  it('encaminha a alteração do pedido por mesa ao estado da tela', async () => {
    const update = vi.fn();
    await renderSettings({
      settings: { ...adminMockSettings, tableOrderingEnabled: false },
      update,
    });

    act(() =>
      (container.querySelector('[aria-label="Pedidos por QR Code"]') as HTMLInputElement).click(),
    );

    expect(update).toHaveBeenCalledWith('tableOrderingEnabled', true);
  });

  it('explica o ciclo sem PIN e não exibe ação simulada de geração', async () => {
    await renderSettings({ settings: adminMockSettings });

    expect(container.textContent).not.toContain('4827');
    expect(container.textContent).not.toContain('Gerar novo código');
    expect(container.textContent).not.toContain('PIN temporário');
    expect(container.textContent).toContain('QR Code é fixo');
    expect(container.textContent).toContain('Atendimento pelo salão');
  });

  it('encaminha as preferências de chamar garçom e pedir a conta', async () => {
    const update = vi.fn();
    await renderSettings({
      settings: {
        ...adminMockSettings,
        tableOrderingEnabled: true,
        waiterCallEnabled: false,
        billRequestEnabled: false,
      },
      update,
    });

    act(() =>
      (container.querySelector('[aria-label="Chamar garçom"]') as HTMLInputElement).click(),
    );
    act(() =>
      (container.querySelector('[aria-label="Pedir a conta"]') as HTMLInputElement).click(),
    );

    expect(update).toHaveBeenCalledWith('waiterCallEnabled', true);
    expect(update).toHaveBeenCalledWith('billRequestEnabled', true);
  });

  it('lista o QR seguro e abre o diálogo acessível da mesa', async () => {
    vi.mocked(tablesService.listTables).mockResolvedValue([
      {
        id: 9,
        number: 1,
        restaurantId: 4,
        token: '0123456789abcdef0123456789abcdef',
        active: true,
        status: 'FREE',
      },
    ]);

    await renderSettings({ settings: { ...adminMockSettings, restaurantName: 'Casa Teste' } });

    expect(container.querySelector('[aria-label="Mesa 01"]')).not.toBeNull();
    const view = container.querySelector(
      '[aria-label="Visualizar QR Code da Mesa 01"]',
    ) as HTMLButtonElement;
    await act(async () => view.click());

    expect(
      container.querySelector('[role="dialog"][aria-label="QR Code da Mesa 01"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain('QR seguro vinculado e pronto para o salão.');
  });

  it('valida o número e cria a mesa com QR vinculado retornado pelo backend', async () => {
    vi.mocked(tablesService.createTable).mockResolvedValue({
      id: 10,
      number: 2,
      restaurantId: 4,
      token: 'fedcba9876543210fedcba9876543210',
      active: true,
    });
    await renderSettings();

    const input = container.querySelector('[aria-label="Número da mesa"]') as HTMLInputElement;
    const submit = container.querySelector('[aria-label="Criar mesa"]') as HTMLButtonElement;
    await act(async () => submit.click());
    expect(container.textContent).toContain('Informe um número de mesa inteiro entre 1 e 9999.');
    expect(tablesService.createTable).not.toHaveBeenCalled();

    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(
        input,
        '2',
      );
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => submit.click());

    expect(tablesService.createTable).toHaveBeenCalledWith({ number: 2 });
    expect(container.textContent).toContain('Mesa 02 criada com QR Code seguro.');
    expect(
      container.querySelector('[role="dialog"][aria-label="QR Code da Mesa 02"]'),
    ).not.toBeNull();
  });

  it('imprime os QR Codes ativos pelo botão principal', async () => {
    vi.useFakeTimers();
    vi.mocked(tablesService.listTables).mockResolvedValue([
      {
        id: 9,
        number: 1,
        restaurantId: 4,
        token: '0123456789abcdef0123456789abcdef',
        active: true,
      },
    ]);
    await renderSettings();

    const print = container.querySelector('[aria-label="Imprimir QR Codes"]') as HTMLButtonElement;
    act(() => print.click());
    await act(async () => vi.runAllTimers());

    expect(window.print).toHaveBeenCalledOnce();
    expect(document.body.classList.contains('admin-table-qr-printing')).toBe(false);
    const printSheet = Array.from(document.body.children).find((element) =>
      element.hasAttribute('data-admin-table-qr-print'),
    );
    expect(printSheet).toBeDefined();
    expect(printSheet?.querySelectorAll('article')).toHaveLength(1);
    expect(printSheet?.querySelector('.print-qr svg')).not.toBeNull();
  });

  it('baixa o SVG do QR sem expor o token como texto na interface', async () => {
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.mocked(tablesService.listTables).mockResolvedValue([
      {
        id: 9,
        number: 1,
        restaurantId: 4,
        token: '0123456789abcdef0123456789abcdef',
        active: true,
      },
    ]);
    await renderSettings();

    const download = container.querySelector(
      '[aria-label="Baixar QR Code da Mesa 01"]',
    ) as HTMLButtonElement;
    await act(async () => download.click());

    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:table-qr');
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(container.textContent).not.toContain('0123456789abcdef0123456789abcdef');
  });
});
