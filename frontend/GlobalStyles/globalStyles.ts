import { createGlobalStyle } from "styled-components";

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

  .app-page-transition {
    width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
    animation: app-page-enter 240ms ease both;
  }

  [role="dialog"],
  [aria-modal="true"] {
    animation: app-dialog-enter 220ms cubic-bezier(.22, .8, .35, 1) both;
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
      transform: translateY(0) scale(1);
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
