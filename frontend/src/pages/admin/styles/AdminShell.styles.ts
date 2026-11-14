import styled from 'styled-components';
import { adminDesignTokens } from './AdminDesignTokens';

export const Root = styled.div<{
  $primary: string;
  $settings?: boolean;
  $sidebarOpen?: boolean;
}>`
  ${adminDesignTokens}
  --a: ${({ $primary }) => $primary};
  --brand: ${({ $primary }) => $primary};
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--admin-subtle);
  color: var(--admin-text);
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  display: grid;
  grid-template-columns: ${({ $settings, $sidebarOpen }) => {
    const sidebar = $sidebarOpen === false ? '0px' : '248px';
    return $settings ? `${sidebar} 280px minmax(0,1fr)` : `${sidebar} minmax(0,1fr)`;
  }};
  *, *::before, *::after { box-sizing: border-box; }
  h1, h2, h3 { font-family: inherit; letter-spacing: -.025em; }
  button, input, textarea, select { font: inherit; }
  button, a, [role='button'], label[for], select,
  input[type='checkbox'], input[type='radio'], input[type='color'], input[type='file'] { cursor: pointer; }
  button:disabled, input:disabled, select:disabled, [aria-disabled='true'] { cursor: not-allowed; }
  button:focus-visible, a:focus-visible, summary:focus-visible {
    outline: 3px solid var(--admin-accent); outline-offset: 3px;
  }
  @media (max-width: 1080px) {
    grid-template-columns: ${({ $sidebarOpen }) => $sidebarOpen === false ? '0px minmax(0,1fr)' : '232px minmax(0,1fr)'};
  }
  @media (max-width: 820px) { display: block; }
`;

export * from './AdminSettingsNavigation.styles';
export * from './AdminShellContent.styles';
