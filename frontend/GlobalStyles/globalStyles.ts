import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    background-color: #1e1e1e;
    color: #f3f4f6;
    font-family: 'Plus Jakarta Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  html {
    scroll-behavior: smooth;
  }

  #root {
    min-height: 100vh;
    min-height: 100dvh;
  }

  button:not(:disabled),
  [role="button"],
  a[href],
  label[for],
  select:not(:disabled) {
    cursor: pointer;
  }

  button:disabled,
  select:disabled {
    cursor: not-allowed;
  }

  .Toastify__toast {
    min-height: 64px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    box-shadow: 0 16px 42px rgba(20, 16, 12, 0.2);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14px;
    line-height: 1.4;
    padding: 15px 42px 15px 16px;
    backdrop-filter: blur(12px);
  }

  .Toastify__toast--success {
    background: linear-gradient(135deg, #1f6a43, #286c4c);
  }

  .Toastify__toast--error {
    background: linear-gradient(135deg, #a92f31, #7e2228);
  }

  .Toastify__toast--warning {
    background: linear-gradient(135deg, #9b5d17, #734310);
  }

  .Toastify__toast--info {
    background: linear-gradient(135deg, #245f94, #1c4770);
  }

  .Toastify__close-button {
    color: #fff;
    opacity: 0.75;
    transition: opacity 160ms ease, transform 160ms ease;
  }

  .Toastify__close-button:hover {
    opacity: 1;
    transform: scale(1.08);
  }

  .Toastify__progress-bar {
    height: 3px;
    background: rgba(255, 255, 255, 0.7);
  }

  .app-page-transition {
    width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
    animation: app-page-enter 240ms ease both;
  }

  .app-route-loading {
    min-height: 100vh;
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 24px;
    color: #334155;
    background: #f8fafc;
  }

  :where(a, button, input, select, textarea, [tabindex]):focus-visible {
    outline: 3px solid #2563eb;
    outline-offset: 3px;
  }

  [role="dialog"],
  [aria-modal="true"] {
    animation: app-dialog-enter 220ms cubic-bezier(.22, .8, .35, 1);
  }

  @keyframes app-page-enter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes app-dialog-enter {
    from {
      opacity: 0;
      transform: translateY(5px) scale(.992);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }

    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
