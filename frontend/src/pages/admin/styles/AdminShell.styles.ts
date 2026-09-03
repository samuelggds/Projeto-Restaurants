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
    return $settings ? `${sidebar} 298px minmax(0,1fr)` : `${sidebar} minmax(0,1fr)`;
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
export const SettingsSidebar = styled.aside<{ $visible: boolean }>`
  height: 100vh;
  position: sticky;
  top: 0;
  background: linear-gradient(180deg, #fff 0%, #fcfaf7 100%);
  border-right: 1px solid var(--border);
  padding: 30px 14px;
  overflow-y: auto;
  display: ${({ $visible }) => ($visible ? 'block' : 'none')};
  @media (max-width: 1080px) {
    display: none;
  }
`;
export const Search = styled.label`
  height: 50px;
  border: 1px solid #e3ddd6;
  border-radius: 12px;
  background: #f8f6f3;
  padding: 0 13px;
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 26px;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    background 180ms ease;
  &:focus-within {
    border-color: color-mix(in srgb, var(--a) 65%, #fff);
    background: #fff;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 10%, transparent);
  }
  input {
    min-width: 0;
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
  }
  svg {
    color: #666;
  }
`;
export const SettingsNav = styled.nav`
  display: grid;
  gap: 4px;
  .settings-group {
    display: grid;
    gap: 4px;
  }
  .settings-group > small {
    font-size: 10px;
    font-weight: 700;
    color: #777;
    margin: 10px 0 4px;
  }
  .settings-empty {
    padding: 14px 8px;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.45;
  }
  button {
    height: 47px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: #555;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 12px;
    text-align: left;
    transition:
      background 160ms ease,
      color 160ms ease,
      transform 160ms ease;
  }
  button:hover {
    background: #f7f3ef;
    color: #26221f;
    transform: translateX(2px);
  }
  button.active {
    background: #fbf0e7;
    color: var(--a);
    font-weight: 700;
  }
  svg {
    width: 19px;
  }
`;
export const MobileSettingsNav = styled.nav`
  display: none;
  width: 100%;
  min-width: 0;
  gap: 7px;
  overflow-x: auto;
  padding: 11px 18px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 253, 249, 0.96);
  scrollbar-width: thin;
  overscroll-behavior-inline: contain;
  scroll-snap-type: inline proximity;

  button {
    flex: 0 0 auto;
    height: 39px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    scroll-snap-align: start;
    border: 1px solid #e4ddd5;
    border-radius: 999px;
    padding: 0 13px;
    color: #5f5750;
    background: #fff;
    font-size: 11px;
    font-weight: 750;
    white-space: nowrap;
  }

  button svg {
    width: 15px;
    height: 15px;
  }

  button.active {
    border-color: color-mix(in srgb, var(--a) 42%, #fff);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, white);
    box-shadow: 0 5px 13px color-mix(in srgb, var(--a) 10%, transparent);
  }

  @media (max-width: 1080px) {
    display: flex;
  }

  @media (max-width: 760px) {
    position: sticky;
    top: 0;
    z-index: 30;
    padding: 9px 10px;

    body:has([aria-modal='true']) & {
      z-index: 0;
    }
  }
`;
export const Main = styled.main`
  min-width: 0;
`;
export const Top = styled.header`
  min-height: 154px;
  padding: 27px 34px 20px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 253, 249, 0.94);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  gap: 15px;
  small {
    font-size: 10px;
    color: var(--a);
    font-weight: 700;
  }
  h1 {
    font-size: 30px;
    margin: 17px 0 7px;
  }
  p {
    margin: 0;
    color: var(--muted);
  }
  @media (max-width: 760px) {
    min-height: 112px;
    padding: 14px 12px;
    h1 {
      font-size: 22px;
      margin: 5px 0;
    }
    p {
      font-size: 12px;
    }
  }
`;
export const TopActions = styled.div`
  margin-left: auto;
  display: flex;
  gap: 10px;
  button {
    height: 54px;
    padding: 0 24px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 9px;
    white-space: nowrap;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      filter 160ms ease;
  }
  button:hover {
    transform: translateY(-1px);
  }
  .preview {
    border: 1px solid var(--border);
    background: #fff;
  }
  .save {
    border: 0;
    background: var(--a);
    color: #fff;
    box-shadow: 0 8px 22px color-mix(in srgb, var(--a) 24%, transparent);
  }
  .save:hover {
    filter: brightness(0.96);
    box-shadow: 0 11px 26px color-mix(in srgb, var(--a) 32%, transparent);
  }
  @media (max-width: 580px) {
    button {
      width: 44px;
      height: 44px;
      padding: 0;
      justify-content: center;
      font-size: 0;
    }
    .save {
      width: 44px;
    }
  }
`;
export const Content = styled.div<{ $wide?: boolean }>`
  width: 100%;
  max-width: ${({ $wide }) => ($wide ? '1480px' : '1120px')};
  margin: auto;
  padding: 28px 34px 80px;
  > * {
    animation: admin-content-enter 240ms cubic-bezier(0.22, 0.8, 0.35, 1) both;
  }
  @keyframes admin-content-enter {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @media (max-width: 820px) {
    padding: 14px 10px calc(96px + env(safe-area-inset-bottom));
  }
  @media (prefers-reduced-motion: reduce) {
    > * {
      animation: none;
    }
  }
`;
export const Stack = styled.div`
  display: grid;
  gap: 22px;
  animation: settings-enter 260ms ease both;
  @keyframes settings-enter {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
export const Card = styled.section`
  border: 1px solid #e9e3dc;
  border-radius: 18px;
  background: #fff;
  padding: 30px 28px;
  box-shadow: 0 8px 30px rgba(51, 35, 22, 0.045);
  transition:
    box-shadow 200ms ease,
    border-color 200ms ease;
  &:hover {
    border-color: #ddd3c9;
    box-shadow: 0 12px 34px rgba(51, 35, 22, 0.065);
  }
  h2 {
    margin: 0;
    font-size: 18px;
  }
  p {
    color: var(--muted);
    line-height: 1.55;
  }
  @media (max-width: 580px) {
    padding: 18px 14px;
  }
`;
export const LogoCard = styled.div`
  display: grid;
  grid-template-columns: 220px 170px 1fr;
  align-items: center;
  gap: 40px;
  .logo {
    width: 170px;
    height: 170px;
    border-radius: 6px;
    background: #171b1e;
    display: grid;
    place-items: center;
    overflow: hidden;
    color: #eb641e;
    font:
      52px Georgia,
      serif;
  }
  .logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .upload {
    display: grid;
    justify-items: start;
    gap: 12px;
  }
  .upload button {
    height: 50px;
    padding: 0 20px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #fff;
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .upload button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  .upload .spin {
    animation: admin-image-spin 0.9s linear infinite;
  }
  @keyframes admin-image-spin {
    to {
      transform: rotate(360deg);
    }
  }
  .upload small {
    color: var(--muted);
    line-height: 1.5;
  }
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    .logo {
      width: 130px;
      height: 130px;
    }
    .copy {
      display: none;
    }
  }
`;
export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px 20px;
  margin-top: 24px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;
export const Field = styled.label<{ $full?: boolean }>`
  display: grid;
  gap: 9px;
  color: #39342f;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
  ${({ $full }) => ($full ? 'grid-column: 1 / -1;' : '')}
  input, textarea, select {
    width: 100%;
    border: 1px solid #ded7cf;
    border-radius: 12px;
    background: #fcfbf9;
    color: #1f1c19;
    padding: 0 15px;
    outline: 0;
    font-weight: 400;
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      background 180ms ease,
      transform 180ms ease;
  }
  input:hover,
  textarea:hover,
  select:hover {
    border-color: #c8beb4;
    background: #fff;
  }
  input {
    height: 54px;
  }
  select {
    height: 54px;
    cursor: pointer;
  }
  textarea {
    resize: vertical;
    min-height: 118px;
    padding-top: 15px;
    line-height: 1.55;
  }
  :focus-within input,
  :focus-within textarea,
  :focus-within select {
    border-color: var(--a);
    background: #fff;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 11%, transparent);
  }
  input[aria-invalid='true'],
  textarea[aria-invalid='true'],
  select[aria-invalid='true'] {
    border-color: #c24132;
    background: #fff8f7;
  }
  > small {
    color: var(--muted);
    font-weight: 500;
    line-height: 1.4;
  }
  input[aria-invalid='true'] ~ small,
  textarea[aria-invalid='true'] ~ small,
  select[aria-invalid='true'] ~ small {
    color: #a33b30;
    font-weight: 600;
  }
`;
export const IdentityNameInput = styled.input`
  && {
    height: 54px;
    width: 100%;
    border: 1px solid #ded7cf;
    border-radius: 12px;
    background: #fcfbf9;
    color: #1f1c19;
    padding: 0 15px;
    outline: 0;
    font-weight: 400;
    line-height: 1.55;
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      background 180ms ease;
  }
  &&:hover {
    border-color: #c8beb4;
    background: #fff;
  }
  &&:focus {
    border-color: var(--a);
    background: #fff;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 11%, transparent);
  }
`;
export const Color = styled.div`
  display: grid;
  grid-template-columns: 52px 1fr;
  input[type='color'] {
    padding: 6px;
    width: 52px;
    cursor: pointer;
  }
`;
export const Banners = styled.div`
  display: grid;
  grid-template-columns: 1.8fr 1fr 1fr;
  gap: 14px;
  margin-top: 20px;
  button {
    position: relative;
    min-height: 170px;
    border: 1px dashed #bdb4aa;
    border-radius: 14px;
    background: linear-gradient(145deg, #fff, #faf7f3);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #333;
    cursor: pointer;
    overflow: hidden;
    transition:
      transform 180ms ease,
      border-color 180ms ease,
      box-shadow 180ms ease;
  }
  button:has(img)::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 35%, rgba(0, 0, 0, 0.68));
    pointer-events: none;
  }
  button:hover {
    transform: translateY(-2px);
    border-color: var(--a);
    box-shadow: 0 10px 24px color-mix(in srgb, var(--a) 10%, transparent);
  }
  span {
    color: var(--muted);
    font-size: 12px;
  }
  button:has(img) b,
  button:has(img) span {
    position: relative;
    z-index: 1;
    color: #fff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }
  img {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
    border-radius: inherit;
  }
  @media (max-width: 620px) {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    button {
      flex: 0 0 78vw;
      scroll-snap-align: center;
    }
  }
`;
export const Generic = styled.div`
  display: grid;
  gap: 14px;
  .row {
    min-height: 68px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .row div {
    display: grid;
    gap: 4px;
  }
  .row span {
    color: var(--muted);
    font-size: 12px;
  }
  .row input[type='checkbox'] {
    margin-left: auto;
    width: 20px;
    height: 20px;
    accent-color: var(--a);
  }
`;
export const EmployeeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
  h2 {
    margin: 0;
  }
  p {
    margin: 4px 0;
    color: var(--muted);
    font-size: 12px;
  }
  button {
    height: 44px;
    border: 0;
    border-radius: 9px;
    background: var(--a);
    color: #fff;
    padding: 0 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;
export const EmployeeList = styled.div`
  display: grid;
`;
export const EmployeeRow = styled.article`
  min-height: 76px;
  border-bottom: 1px solid var(--border);
  display: grid;
  grid-template-columns: 42px minmax(130px, 1fr) 130px 110px 38px 104px;
  align-items: center;
  gap: 12px;
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #fff0e7;
    color: var(--a);
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 11px;
  }
  .identity,
  .role {
    display: grid;
    gap: 4px;
  }
  .identity span,
  .role span {
    font-size: 10px;
    color: var(--muted);
  }
  .status {
    font-size: 10px;
    color: #43853e;
    background: #edf7ea;
    border-radius: 999px;
    padding: 6px 9px;
    text-align: center;
  }
  .edit {
    width: 34px;
    height: 34px;
    border: 0;
    background: transparent;
    border-radius: 9px;
    cursor: pointer;
    transition:
      background 160ms ease,
      color 160ms ease;
    &:hover {
      color: var(--a);
      background: #fff3ed;
    }
  }
  .deactivate,
  .reactivate {
    min-height: 36px;
    border: 1px solid #f2c7c2;
    border-radius: 10px;
    background: #fff7f5;
    color: #b53b32;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(181, 59, 50, 0.06);
    transition:
      color 160ms ease,
      background 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease,
      transform 160ms ease;
    &:hover {
      color: #fff;
      background: #c9473d;
      border-color: #c9473d;
      box-shadow: 0 7px 16px rgba(181, 59, 50, 0.2);
      transform: translateY(-1px);
    }
    &:active {
      transform: translateY(0);
    }
    &:focus-visible {
      outline: 3px solid rgba(201, 71, 61, 0.2);
      outline-offset: 2px;
    }
  }
  .reactivate {
    border-color: #b9dfbb;
    background: #f2fbf1;
    color: #31763a;
    box-shadow: 0 3px 10px rgba(49, 118, 58, 0.06);
    &:hover {
      color: #fff;
      background: #3f8f49;
      border-color: #3f8f49;
      box-shadow: 0 7px 16px rgba(49, 118, 58, 0.2);
    }
    &:focus-visible {
      outline-color: rgba(63, 143, 73, 0.22);
    }
  }
  @media (max-width: 580px) {
    grid-template-columns: 42px minmax(0, 1fr) 38px;
    .role,
    .status {
      display: none;
    }
    .deactivate,
    .reactivate {
      grid-column: 2 / -1;
      justify-self: start;
      margin: -5px 0 10px;
    }
  }
`;
export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 90;
  background: #1118;
  display: flex;
  justify-content: flex-end;
  animation: overlay-enter 180ms ease both;
  @keyframes overlay-enter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  &.product-editor-overlay {
    inset: 0 0 0 236px;
    justify-content: center;
    background: #f9f8f5;
  }
  @media (max-width: 1080px) {
    &.product-editor-overlay {
      left: 220px;
    }
  }
  @media (max-width: 760px) {
    &.product-editor-overlay {
      inset: 0;
    }
  }
`;
export const Drawer = styled.form`
  width: min(100%, 530px);
  height: 100dvh;
  background: #fffdf9;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 17px;
  animation: drawer-enter 260ms cubic-bezier(0.22, 0.8, 0.35, 1) both;
  @keyframes drawer-enter {
    from {
      opacity: 0;
      transform: translateX(22px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    padding-bottom: 14px;
  }
  header h2 {
    margin: 0;
  }
  header button {
    border: 0;
    background: transparent;
  }
  .permissions {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 13px;
    display: grid;
    gap: 12px;
  }
  .permissions label {
    display: flex;
    gap: 9px;
    font-size: 12px;
  }
  .permissions input {
    accent-color: var(--a);
  }
  footer {
    margin-top: auto;
    display: flex;
    justify-content: flex-end;
    gap: 9px;
    border-top: 1px solid var(--border);
    padding-top: 14px;
  }
  footer button {
    height: 42px;
    padding: 0 16px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: #fff;
  }
  footer .primary {
    background: var(--a);
    color: #fff;
    border: 0;
  }
`;
