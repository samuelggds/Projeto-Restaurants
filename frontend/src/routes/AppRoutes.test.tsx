import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as { role?: string; mustChangePassword?: boolean } | null,
    isLoading: false,
  },
}));

vi.mock('../contexts/authContext', () => ({
  useAuth: () => mocks.auth,
}));

import { RequireAuth, RouteAuthorizationGuard } from './AppRoutes';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function LocationProbe() {
  const location = useLocation();
  return <output>{`${location.pathname}${location.search}${location.hash}`}</output>;
}

describe('RequireAuth', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mocks.auth.user = null;
    mocks.auth.isLoading = false;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('preserva pathname, query e hash ao encaminhar uma rota protegida para o login', () => {
    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/profile?view=addresses&newAddress=1#form']}>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/profile" element={<div>Perfil privado</div>} />
            </Route>
            <Route path="/login" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    const renderedLocation = container.textContent || '';
    expect(renderedLocation).toMatch(/^\/login\?next=/u);
    expect(new URLSearchParams(renderedLocation.split('?')[1]).get('next')).toBe(
      '/profile?view=addresses&newAddress=1#form',
    );
  });
});

describe('RouteAuthorizationGuard após login', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mocks.auth.user = null;
    mocks.auth.isLoading = false;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function renderGuardedEntry(user: NonNullable<typeof mocks.auth.user>, initialEntry: string) {
    mocks.auth.user = user;
    act(() => {
      root.render(
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route element={<RouteAuthorizationGuard />}>
              <Route path="/login" element={<div>Login</div>} />
              <Route path="/register" element={<div>Cadastro</div>} />
              <Route path="/recover-password" element={<div>Recuperação</div>} />
              <Route path="/:restaurantSlug/mesa/:tableNumber" element={<LocationProbe />} />
              <Route path="/admin" element={<LocationProbe />} />
              <Route path="/change-password" element={<LocationProbe />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
    });
  }

  function renderGuardedLogin(user: NonNullable<typeof mocks.auth.user>, nextPath: string) {
    renderGuardedEntry(user, `/login?next=${encodeURIComponent(nextPath)}`);
  }

  it('prioriza o next seguro de mesa para CLIENTE', () => {
    const nextPath = '/restaurante-teste/mesa/5?rid=1&tk=abc#menu';
    renderGuardedLogin({ role: 'CLIENTE' }, nextPath);

    expect(container.textContent).toBe(nextPath);
  });

  it('mantém o dashboard como destino do ADMIN', () => {
    renderGuardedLogin({ role: 'ADMIN' }, '/restaurante-teste/mesa/5?rid=1&tk=abc');

    expect(container.textContent).toBe('/admin');
  });

  it('mantém a troca obrigatória de senha acima do next do CLIENTE', () => {
    const nextPath = '/restaurante-teste/mesa/5?rid=1&tk=abc';
    renderGuardedLogin({ role: 'CLIENTE', mustChangePassword: true }, nextPath);

    const renderedLocation = container.textContent || '';
    expect(renderedLocation).toMatch(/^\/change-password\?next=/u);
    expect(new URLSearchParams(renderedLocation.split('?')[1]).get('next')).toBe(nextPath);
  });

  it.each(['/register', '/recover-password'])(
    'retorna CLIENTE já autenticado ao contexto ao abrir %s',
    (entryPath) => {
      const nextPath = '/restaurante-teste/mesa/5?rid=1&tk=abc#conta';
      renderGuardedEntry({ role: 'CLIENTE' }, `${entryPath}?next=${encodeURIComponent(nextPath)}`);

      expect(container.textContent).toBe(nextPath);
    },
  );

  it('preserva a rota da mesa ao exigir troca de senha de CLIENTE já autenticado', () => {
    const nextPath = '/restaurante-teste/mesa/5?rid=1&tk=abc#conta';
    renderGuardedEntry({ role: 'CLIENTE', mustChangePassword: true }, nextPath);

    const renderedLocation = container.textContent || '';
    expect(renderedLocation).toMatch(/^\/change-password\?next=/u);
    expect(new URLSearchParams(renderedLocation.split('?')[1]).get('next')).toBe(nextPath);
  });
});
