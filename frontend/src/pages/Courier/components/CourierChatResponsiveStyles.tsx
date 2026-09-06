import { createGlobalStyle } from 'styled-components';

export const CourierChatResponsiveStyles = createGlobalStyle`
  @media (max-width: 720px) {
    [role='dialog'][aria-label='Conversas das entregas'] {
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      max-width: none !important;
      height: 100dvh !important;
      max-height: none !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }

    [role='dialog'][aria-label='Conversas das entregas'] > header {
      padding-top: max(12px, env(safe-area-inset-top)) !important;
    }

    [role='dialog'][aria-label='Conversas das entregas'] > div,
    [role='dialog'][aria-label='Conversas das entregas'] section,
    [role='dialog'][aria-label='Conversas das entregas'] form,
    [role='dialog'][aria-label='Conversas das entregas'] input {
      min-width: 0 !important;
    }

    [role='dialog'][aria-label='Conversas das entregas'] form input {
      font-size: 16px !important;
    }

    [role='dialog'][aria-label='Conversas das entregas'] p,
    [role='dialog'][aria-label='Conversas das entregas'] small,
    [role='dialog'][aria-label='Conversas das entregas'] b {
      overflow-wrap: anywhere;
    }

    [role='dialog'][aria-label='Conversas das entregas'] form + small,
    [role='dialog'][aria-label='Conversas das entregas'] footer {
      padding-bottom: max(10px, env(safe-area-inset-bottom));
    }
  }

  @media (max-width: 380px) {
    [role='dialog'][aria-label='Conversas das entregas'] > header {
      padding-left: 12px !important;
      padding-right: 12px !important;
    }
  }
`;
