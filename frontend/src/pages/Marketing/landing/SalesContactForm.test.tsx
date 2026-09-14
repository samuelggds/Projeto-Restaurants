import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SalesContactForm } from './SalesContactForm';

vi.mock('../../../Services/api', () => ({
  default: { defaults: { baseURL: 'https://api.example.test', timeout: 15000 } },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('contato comercial da landing', () => {
  let root: Root;
  let container: HTMLDivElement;
  const post = vi.spyOn(axios, 'post');

  function fill(name: string, value: string) {
    const input = container.querySelector<HTMLInputElement | HTMLSelectElement>(
      `[name="${name}"]`,
    )!;
    const prototype =
      input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(
      new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }),
    );
  }

  function fillRequired({ selectChannel = true } = {}) {
    fill('name', '  Joana Silva  ');
    fill('restaurantName', 'Bistrô da Joana');
    fill('email', 'joana@example.test');
    fill('phone', '(11) 99999-8888');
    fill('city', 'São Paulo');
    fill('state', 'SP');
    fill('businessType', 'Restaurante');
    if (selectChannel)
      container.querySelector<HTMLInputElement>('[name="channels"][value="DELIVERY"]')!.click();
    container.querySelector<HTMLInputElement>('[name="consent"]')!.click();
  }

  function submit() {
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  beforeEach(() => {
    post.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<SalesContactForm />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('envia dados públicos uma única vez enquanto aguarda confirmação do servidor', async () => {
    let acknowledge: (response: { data: { received: boolean; emailStatus: string } }) => void;
    post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          acknowledge = resolve;
        }),
    );

    await act(async () => {
      fillRequired();
      submit();
      submit();
    });

    expect(post).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledWith(
      '/sales-leads',
      expect.objectContaining({
        name: 'Joana Silva',
        restaurantName: 'Bistrô da Joana',
        email: 'joana@example.test',
        phone: '11999998888',
        city: 'São Paulo',
        state: 'SP',
        businessType: 'Restaurante',
        channels: ['DELIVERY'],
        planInterest: 'UNDECIDED',
        consent: true,
      }),
      expect.objectContaining({
        baseURL: 'https://api.example.test',
        withCredentials: false,
        headers: {
          'Idempotency-Key': expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          ),
        },
      }),
    );
    expect(container.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    expect(container.textContent).not.toContain('Recebemos seu contato.');

    await act(async () => acknowledge({ data: { received: true, emailStatus: 'PENDING' } }));

    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      'Recebemos seu contato.',
    );
    expect(container.textContent).toContain('Nossa equipe vai conversar com você.');
    expect(container.textContent).not.toContain('e-mail enviado');
    expect(document.activeElement).toBe(container.querySelector('[role="status"]'));
  });

  it('preserva os dados e a chave ao tentar novamente; uma edição inicia outro envio', async () => {
    post.mockRejectedValue(new Error('Network Error'));
    await act(async () => {
      fillRequired();
      submit();
    });
    const firstKey = post.mock.calls[0][2]?.headers?.['Idempotency-Key'];

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível confirmar',
    );
    expect(container.querySelector<HTMLInputElement>('[name="email"]')?.value).toBe(
      'joana@example.test',
    );
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(
      false,
    );

    await act(async () => submit());
    expect(post.mock.calls[1][2]?.headers?.['Idempotency-Key']).toBe(firstKey);

    await act(async () => {
      fill('email', 'novo@example.test');
      submit();
    });
    expect(post.mock.calls[2][2]?.headers?.['Idempotency-Key']).not.toBe(firstKey);
    expect(post.mock.calls[2][1]).toMatchObject({ email: 'novo@example.test' });
  });

  it('exige consentimento e canal, e recebe o plano escolhido sem apagar dados', async () => {
    await act(async () => {
      fillRequired({ selectChannel: false });
      submit();
    });
    expect(post).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Selecione ao menos');
    expect(document.activeElement).toBe(container.querySelector('[name="channels"]'));

    await act(async () => root.render(<SalesContactForm initialPlan="PREMIUM" />));
    expect(container.querySelector<HTMLSelectElement>('[name="planInterest"]')?.value).toBe(
      'PREMIUM',
    );
    expect(container.querySelector<HTMLInputElement>('[name="restaurantName"]')?.value).toBe(
      'Bistrô da Joana',
    );

    await act(async () => {
      container.querySelector<HTMLInputElement>('[name="channels"]')!.click();
      container.querySelector<HTMLInputElement>('[name="consent"]')!.click();
      submit();
    });
    expect(post).not.toHaveBeenCalled();
  });

  it('não mostra sucesso quando a resposta não confirma o recebimento', async () => {
    post.mockResolvedValueOnce({ data: {} });
    await act(async () => {
      fillRequired();
      submit();
    });

    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível confirmar',
    );
    expect(container.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe(
      '  Joana Silva  ',
    );
  });
});
