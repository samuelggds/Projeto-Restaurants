import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GlobalStyles } from '../GlobalStyles/globalStyles.js';
import './config/sentry.js';
import AppRoutes from './routes/AppRoutes.js';
import { AuthProvider } from './contexts/authContext.js';
import { AppDialogProvider } from './components/AppDialog/AppDialogProvider.js';
import AppRuntimeBoundary from './components/AppRuntimeBoundary/AppRuntimeBoundary.js';
import { NoticeViewport } from './components/AppNotice/NoticeViewport.js';
import {
  installVitePreloadRecovery,
  markRuntimeReady,
} from './components/AppRuntimeBoundary/runtimeRecovery.js';

const TENANT_SESSION_STORAGE_KEY = 'gastronexa:tenant-slug';
const TENANT_PERSISTENT_STORAGE_KEY = 'gastronexa:last-tenant-slug';
const RESERVED_ROUTE_SEGMENTS = new Set([
  'admin',
  'attendant',
  'billing',
  'change-password',
  'courier',
  'equipe',
  'kitchen',
  'login',
  'mesa',
  'orders',
  'profile',
  'recover-password',
  'register',
  'restaurant-required',
  'super_admin',
  'system-blocked',
  'system-maintenance',
  'team',
  'waiter',
]);

function normalizeTenantSlug(value: unknown) {
  const slug = String(value || '')
    .trim()
    .toLowerCase();
  return /^[a-z0-9_-]+$/u.test(slug) && !RESERVED_ROUTE_SEGMENTS.has(slug) ? slug : '';
}

function restoreTenantRouteContext() {
  if (typeof window === 'undefined') return;

  try {
    const explicitSlug = normalizeTenantSlug(window.location.pathname.split('/').filter(Boolean)[0]);
    const persistedSlug = normalizeTenantSlug(
      window.localStorage.getItem(TENANT_PERSISTENT_STORAGE_KEY),
    );
    const resolvedSlug = explicitSlug || persistedSlug;

    if (!resolvedSlug) return;

    window.sessionStorage.setItem(TENANT_SESSION_STORAGE_KEY, resolvedSlug);
    if (explicitSlug) {
      // Apenas o slug público do restaurante atravessa abas. Nenhum usuário,
      // senha, access token, refresh token ou grant administrativo é persistido aqui.
      window.localStorage.setItem(TENANT_PERSISTENT_STORAGE_KEY, explicitSlug);
    }
  } catch {
    // Storage pode estar indisponível em navegadores com políticas restritivas.
  }
}

restoreTenantRouteContext();

const removePreloadRecovery = installVitePreloadRecovery();
const cancelRuntimeReadyMarker = markRuntimeReady();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    removePreloadRecovery();
    cancelRuntimeReadyMarker();
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Elemento principal da aplicação não foi encontrado.');

createRoot(rootElement).render(
  <StrictMode>
    <AppRuntimeBoundary>
      <AuthProvider>
        <AppDialogProvider>
          <NoticeViewport />
          <GlobalStyles />
          <AppRoutes />
        </AppDialogProvider>
      </AuthProvider>
    </AppRuntimeBoundary>
  </StrictMode>,
);
