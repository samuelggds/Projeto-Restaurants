import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiPut: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../../Services/api', () => ({ default: { put: mocks.apiPut } }));
vi.mock('../../contexts/authContext', () => ({
  useAuth: () => ({ logout: mocks.logout }),
}));

import ChangePasswordPage from './ChangePasswordPage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('ChangePasswordPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <MemoryRouter>
          <ChangePasswordPage />
        </MemoryRouter>,
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('explica os campos ausentes após a primeira tentativa de envio', () => {
    const form = container.querySelector('form') as HTMLFormElement;
    const inputs = [...container.querySelectorAll('input')];

    act(() => form.requestSubmit());

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Informe a senha temporária atual.',
    );
    expect(inputs.every((input) => input.getAttribute('aria-invalid') === 'true')).toBe(true);
    expect(inputs[0].getAttribute('aria-describedby')).toBe('change-password-error');
  });
});
