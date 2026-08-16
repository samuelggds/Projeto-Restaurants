import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GlobalStyles } from '../GlobalStyles/globalStyles.js';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './config/sentry.js';
import AppRoutes from './routes/AppRoutes.js';
import { AuthProvider } from './contexts/authContext.js';
import { AppDialogProvider } from './components/AppDialog/AppDialogProvider.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AppDialogProvider>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
        <GlobalStyles />
        <AppRoutes />
      </AppDialogProvider>
    </AuthProvider>
  </StrictMode>,
);
