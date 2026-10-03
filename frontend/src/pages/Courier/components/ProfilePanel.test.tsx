import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resizeProfileAvatar: vi.fn(),
}));

vi.mock('../../../utils/profileAvatar', () => ({
  PROFILE_AVATAR_ACCEPT: 'image/jpeg,image/png,image/webp',
  resizeProfileAvatar: mocks.resizeProfileAvatar,
}));

import ProfilePanel from './ProfilePanel';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

async function flush() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 1));
  });
}

describe('Courier ProfilePanel avatar', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    mocks.resizeProfileAvatar.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('exibe a foto real salva no perfil do motoqueiro', async () => {
    await act(async () =>
      root.render(
        <ProfilePanel
          user={{
            name: 'Motoqueiro Teste',
            email: 'courier@example.test',
            role: 'MOTOQUEIRO',
            avatar: 'https://cdn.example.test/courier.webp',
          }}
          onUpdated={vi.fn()}
          saveProfile={vi.fn()}
        />,
      ),
    );

    expect(
      container
        .querySelector('img[alt="Foto do perfil do motoqueiro"]')
        ?.getAttribute('src'),
    ).toBe('https://cdn.example.test/courier.webp');
  });

  it('processa e persiste a foto escolhida no perfil autenticado', async () => {
    const saveProfile = vi.fn().mockResolvedValue({
      name: 'Motoqueiro Teste',
      email: 'courier@example.test',
      role: 'MOTOQUEIRO',
      avatar: 'data:image/jpeg;base64,cGVyc2lzdGlkbw==',
    });
    const onUpdated = vi.fn();
    mocks.resizeProfileAvatar.mockResolvedValue(
      'data:image/jpeg;base64,cHJvY2Vzc2Fkbw==',
    );

    await act(async () =>
      root.render(
        <ProfilePanel
          user={{
            name: 'Motoqueiro Teste',
            email: 'courier@example.test',
            role: 'MOTOQUEIRO',
          }}
          onUpdated={onUpdated}
          saveProfile={saveProfile}
        />,
      ),
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['foto'], 'courier.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [file],
    });

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await flush();

    expect(mocks.resizeProfileAvatar).toHaveBeenCalledWith(file);
    expect(saveProfile).toHaveBeenCalledWith({
      avatar: 'data:image/jpeg;base64,cHJvY2Vzc2Fkbw==',
    });
    expect(onUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        avatar: 'data:image/jpeg;base64,cGVyc2lzdGlkbw==',
      }),
    );
    expect(container.textContent).toContain('Foto de perfil atualizada com sucesso!');
  });
});
