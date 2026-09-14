import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installReadOnlyHelpPreview } from './readOnlyHelpPreview';

describe('prévia de ajuda somente para consulta', () => {
  let root: HTMLDivElement;
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    root = document.createElement('div');
    root.innerHTML = '<main tabindex="0"><div class="card">Pedido de exemplo</div></main>';
    document.body.append(root);
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    root.remove();
  });

  it('mantém os contêineres roláveis e protege controles carregados depois', async () => {
    cleanup = installReadOnlyHelpPreview(root);
    const main = root.querySelector('main')!;
    main.insertAdjacentHTML(
      'beforeend',
      '<button>Salvar</button><input><select><option>Pix</option></select>' +
        '<textarea></textarea><a href="/admin">Abrir</a><details><summary>Detalhes</summary></details>' +
        '<div role="button">Avançar</div><div contenteditable="true">Mensagem</div>',
    );
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.hasAttribute('inert')).toBe(false);
    expect(main.hasAttribute('inert')).toBe(false);
    expect(main.getAttribute('tabindex')).toBe('0');
    expect(root.getAttribute('data-help-preview-readonly')).toBe('true');
    for (const control of main.querySelectorAll(
      'button,input,select,textarea,a,summary,[role="button"],[contenteditable]',
    ))
      expect(control.hasAttribute('inert')).toBe(true);

    const card = main.querySelector('.card')!;
    card.setAttribute('role', 'button');
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(card.hasAttribute('inert')).toBe(true);
  });

  it.each(['click', 'auxclick', 'dblclick', 'submit', 'beforeinput', 'change', 'drop'])(
    'bloqueia %s antes dos handlers da aplicação',
    (type) => {
      cleanup = installReadOnlyHelpPreview(root);
      const action = vi.fn();
      root.addEventListener(type, action, true);
      const event = new Event(type, { bubbles: true, cancelable: true });
      root.querySelector('.card')!.dispatchEvent(event);
      expect(action).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(true);
    },
  );

  it.each([
    'wheel',
    'touchstart',
    'touchmove',
    'touchend',
    'pointerdown',
    'pointerup',
    'mousedown',
  ])('preserva o comportamento nativo de %s sem acionar handlers da aplicação', (type) => {
    cleanup = installReadOnlyHelpPreview(root);
    const action = vi.fn();
    root.addEventListener(type, action);
    const event = new Event(type, { bubbles: true, cancelable: true });
    root.querySelector('main')!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(action).not.toHaveBeenCalled();
  });

  it.each(['ArrowDown', 'PageDown', 'Home', 'End', ' ', 'Tab'])(
    'preserva navegação nativa com %s',
    (key) => {
      cleanup = installReadOnlyHelpPreview(root);
      const action = vi.fn();
      root.addEventListener('keydown', action);
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      root.querySelector('main')!.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(action).not.toHaveBeenCalled();
    },
  );

  it('restaura listeners e apenas os atributos que adicionou ao encerrar', () => {
    root.innerHTML = '<button>Salvar</button><button inert>Já protegido</button>';
    cleanup = installReadOnlyHelpPreview(root);
    const buttons = root.querySelectorAll('button');
    cleanup();
    cleanup = undefined;
    expect(buttons[0].hasAttribute('inert')).toBe(false);
    expect(buttons[1].hasAttribute('inert')).toBe(true);
    expect(root.hasAttribute('data-help-preview-readonly')).toBe(false);
    const action = vi.fn();
    root.addEventListener('click', action);
    buttons[0].click();
    expect(action).toHaveBeenCalledOnce();
  });
});
