import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  :root {
    --motion-fast: 150ms;
    --motion-base: 220ms;
    --motion-slow: 320ms;
    --motion-ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
    --motion-ease-emphasized: cubic-bezier(0.22, 1, 0.36, 1);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    scrollbar-width: thin;
    scrollbar-color: rgba(100, 116, 139, 0.62) transparent;
  }

  *::-webkit-scrollbar {
    width: 9px;
    height: 9px;
  }

  *::-webkit-scrollbar-track {
    background: transparent;
  }

  *::-webkit-scrollbar-thumb {
    min-height: 42px;
    border: 2px solid transparent;
    border-radius: 999px;
    background: rgba(100, 116, 139, 0.58);
    background-clip: padding-box;
    transition: background-color var(--motion-fast) var(--motion-ease-standard);
  }

  *::-webkit-scrollbar-thumb:hover {
    background: rgba(71, 85, 105, 0.78);
    background-clip: padding-box;
  }

  *::-webkit-scrollbar-thumb:active {
    background: rgba(51, 65, 85, 0.9);
    background-clip: padding-box;
  }

  *::-webkit-scrollbar-corner {
    background: transparent;
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

  :where(
    button,
    a[href],
    input,
    textarea,
    select,
    summary,
    [role="button"],
    [role="tab"]
  ) {
    transition:
      background-color var(--motion-base) var(--motion-ease-standard),
      border-color var(--motion-base) var(--motion-ease-standard),
      color var(--motion-base) var(--motion-ease-standard),
      box-shadow var(--motion-base) var(--motion-ease-standard),
      opacity var(--motion-base) var(--motion-ease-standard),
      filter var(--motion-base) var(--motion-ease-standard);
  }

  button:not(:disabled),
  [role="button"],
  a[href],
  label[for],
  select:not(:disabled),
  summary {
    cursor: pointer;
  }

  button:disabled,
  select:disabled {
    cursor: not-allowed;
  }

  select {
    transition:
      border-color var(--motion-base) var(--motion-ease-standard),
      box-shadow var(--motion-base) var(--motion-ease-standard),
      background-color var(--motion-base) var(--motion-ease-standard),
      color var(--motion-base) var(--motion-ease-standard),
      opacity var(--motion-base) var(--motion-ease-standard);
  }

  [role="tab"] {
    transition:
      background-color var(--motion-base) var(--motion-ease-standard),
      border-color var(--motion-base) var(--motion-ease-standard),
      color var(--motion-base) var(--motion-ease-standard),
      box-shadow var(--motion-base) var(--motion-ease-standard),
      opacity var(--motion-base) var(--motion-ease-standard);
  }

  [role="tabpanel"]:not([hidden]) {
    animation: app-surface-enter var(--motion-slow) var(--motion-ease-emphasized) both;
  }

  details[open] > :not(summary) {
    animation: app-reveal-enter var(--motion-base) var(--motion-ease-emphasized) both;
  }

  [role="dialog"],
  [aria-modal="true"] {
    transform-origin: center;
    animation: app-dialog-enter 280ms var(--motion-ease-emphasized) both;
  }

  [role="menu"],
  [role="listbox"],
  [role="tooltip"],
  [popover]:popover-open,
  [data-state="open"] {
    transform-origin: top center;
    animation: app-floating-enter var(--motion-base) var(--motion-ease-emphasized) both;
  }

  dialog[open]::backdrop {
    animation: app-backdrop-enter var(--motion-base) ease both;
  }

  /* A proteção continua obrigatória no backend; o ADMIN não precisa ver a nota interna. */
  .thresholds + .security-note {
    display: none !important;
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
    transition: opacity var(--motion-fast) ease, transform var(--motion-fast) ease;
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
    animation: app-page-enter var(--motion-slow) var(--motion-ease-emphasized) both;
  }

  .app-route-loading {
    min-height: 100vh;
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 24px;
    color: #334155;
    background: #f8fafc;
    animation: app-fade-enter var(--motion-base) ease both;
  }

  :where(a, button, input, select, textarea, [tabindex]):focus-visible {
    outline: 3px solid #2563eb;
    outline-offset: 3px;
  }

  @keyframes app-page-enter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes app-surface-enter {
    from {
      opacity: 0;
      transform: translateY(7px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes app-dialog-enter {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.985);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes app-floating-enter {
    from {
      opacity: 0;
      transform: translateY(-5px) scale(0.985);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes app-reveal-enter {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes app-backdrop-enter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes app-fade-enter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
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
