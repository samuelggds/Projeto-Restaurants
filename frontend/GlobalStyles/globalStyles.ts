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
`;
