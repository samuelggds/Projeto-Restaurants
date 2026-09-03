import styled from 'styled-components';

export const Root = styled.div<{
  $primary: string;
  $settings?: boolean;
  $sidebarOpen?: boolean;
}>`
  --a: ${({ $primary }) => $primary};
  --brand: ${({ $primary }) => $primary};
  --border: #e4ddd5;
  --muted: #716d68;
  min-height: 100vh;
  min-height: 100dvh;
  background-color: #f6f7f4;
  background-image:
    linear-gradient(rgba(60, 48, 40, 0.026) 1px, transparent 1px),
    linear-gradient(90deg, rgba(60, 48, 40, 0.026) 1px, transparent 1px);
  background-size: 32px 32px;
  color: #191816;
  font-family: 'DM Sans', sans-serif;
  letter-spacing: 0;
  display: grid;
  grid-template-columns: ${({ $settings, $sidebarOpen }) => {
    const sidebar = $sidebarOpen === false ? '0px' : '236px';
    return $settings ? `${sidebar} 320px minmax(0,1fr)` : `${sidebar} minmax(0,1fr)`;
  }};
  transition: grid-template-columns 250ms ease;
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  h1,
  h2,
  h3 {
    font-family: 'Sora', sans-serif;
    letter-spacing: 0;
  }
  button,
  input,
  textarea,
  select {
    font: inherit;
  }
  button,
  a,
  [role='button'],
  label[for],
  select,
  input[type='checkbox'],
  input[type='radio'],
  input[type='color'],
  input[type='file'] {
    cursor: pointer;
  }
  button:disabled,
  input:disabled,
  select:disabled,
  [aria-disabled='true'] {
    cursor: not-allowed;
  }
  @media (max-width: 1080px) {
    grid-template-columns: ${({ $sidebarOpen }) =>
      $sidebarOpen === false ? '0px minmax(0,1fr)' : '232px minmax(0,1fr)'};
  }
  @media (max-width: 820px) {
    display: block;
  }
`;

export * from './AdminSettingsNavigation.styles';
export * from './AdminShellContent.styles';
