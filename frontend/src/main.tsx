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
import { restoreTenantRouteContext } from './shared/navigation/tenantRouteContext.js';

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
