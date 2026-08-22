import styled from 'styled-components';

export const Root = styled.div<{ $primary: string; $settings?: boolean }>`
  --a: ${({ $primary }) => $primary};
  --border: #e4ddd5;
  --muted: #716d68;
  min-height: 100vh;
  min-height: 100dvh;
  background: #f9f8f5;
  color: #191816;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;
  display: grid;
  grid-template-columns: ${({ $settings }) =>
    $settings ? '236px 298px minmax(0,1fr)' : '236px minmax(0,1fr)'};
  *,
  *::before,
  *::after {
    box-sizing: border-box;
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
    grid-template-columns: ${({ $settings }) =>
      $settings ? '220px minmax(0,1fr)' : '220px minmax(0,1fr)'};
  }
  @media (max-width: 760px) {
    display: block;
  }
`;
export const MainSidebar = styled.aside<{ $open: boolean }>`
  height: 100vh;
  position: sticky;
  top: 0;
  background: #171b1e;
  color: #d3d3d3;
  padding: 30px 10px 20px;
  display: flex;
  flex-direction: column;
  z-index: 60;
  @media (max-width: 760px) {
    display: ${({ $open }) => ($open ? 'flex' : 'none')};
    position: fixed;
    inset: 0 auto 0 0;
    width: min(86vw, 300px);
    height: 100dvh;
    box-shadow: 24px 0 60px #0007;
  }
`;
export const Brand = styled.div`
  padding: 5px 26px 26px;
  span {
    display: block;
    font:
      50px Georgia,
      serif;
    color: #eb641e;
  }
  b {
    display: block;
    font:
      23px Georgia,
      serif;
    color: #fff;
    margin-top: 3px;
  }
  small {
    display: block;
    margin-top: 12px;
    font-size: 10px;
    letter-spacing: 0.14em;
    color: #92999c;
  }
`;
export const MainNav = styled.nav`
  display: grid;
  gap: 5px;
  margin-top: 8px;
  button {
    height: 56px;
    border: 0;
    border-left: 2px solid transparent;
    border-radius: 9px;
    background: transparent;
    color: #b9bdbf;
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 0 20px;
    text-align: left;
  }
  button.active {
    border-left-color: var(--a);
    background: #2c241e;
    color: #ff6c21;
  }
  svg {
    width: 21px;
  }
  .employees {
    margin-top: 8px;
  }
`;
export const SideFooter = styled.div`
  margin-top: auto;
  border-top: 1px solid #34383a;
  padding: 14px 10px 0;
  display: grid;
  gap: 3px;
  button {
    height: 48px;
    border: 0;
    background: transparent;
    color: #bbb;
    display: flex;
    align-items: center;
    gap: 13px;
    text-align: left;
  }
  button:hover,
  button.active {
    color: #ff6c21;
    background: #2c241e;
    border-radius: 9px;
  }
  .unread-badge {
    min-width: 19px;
    height: 19px;
    margin-left: auto;
    padding: 0 5px;
    border-radius: 999px;
    color: #fff;
    background: #e64a19;
    display: grid;
    place-items: center;
    font-size: 10px;
    font-weight: 800;
    line-height: 1;
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
  > small {
    font-size: 10px;
    font-weight: 700;
    color: #777;
    margin: 10px 0 4px;
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
export const MobileMenu = styled.button`
  display: none;
  width: 42px;
  height: 42px;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 9px;
  place-items: center;
  @media (max-width: 760px) {
    display: grid;
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
export const Content = styled.div`
  width: 100%;
  max-width: 1120px;
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
  @media (max-width: 760px) {
    padding: 14px 10px 50px;
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
  ${({ $full }) => ($full ? 'grid-column:1/-1' : '')}
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

export const ProductFormDrawer = styled.form`
  width: min(100%, 780px);
  height: 100dvh;
  min-width: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  color: #24201d;
  background: #f8f6f3;
  animation: drawer-enter 260ms cubic-bezier(0.22, 0.8, 0.35, 1) both;
  @keyframes drawer-enter {
    from { opacity: 0; transform: translateX(24px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .drawer-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    padding: 3px 2px 9px;
  }
  .drawer-header > div > span {
    color: var(--a);
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.11em;
  }
  .drawer-header h2 {
    margin: 4px 0 2px;
    font-size: 25px;
  }
  .drawer-header p {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
  }
  .drawer-header > button {
    flex: 0 0 auto;
    width: 39px;
    height: 39px;
    display: grid;
    place-items: center;
    border: 1px solid #ddd5cd;
    border-radius: 11px;
    color: #514a44;
    background: #fff;
    cursor: pointer;
  }
  .drawer-header svg { width: 18px; }
  .basic-fields {
    display: grid;
    grid-template-columns: 1.3fr 0.7fr;
    gap: 15px;
  }
  .product-image-preview {
    width: 100%;
    height: 190px;
    object-fit: cover;
    border: 1px solid #e3dbd3;
    border-radius: 13px;
  }
  .stock-toggle {
    min-height: 48px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 13px;
    border: 1px solid #ded7cf;
    border-radius: 11px;
    background: #fcfbfa;
    font-weight: 600;
  }
  .stock-toggle input {
    width: 16px;
    height: 16px;
    accent-color: var(--a);
  }
  .drawer-footer {
    position: sticky;
    z-index: 4;
    bottom: -24px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 9px;
    margin: 2px -24px -24px;
    padding: 15px 24px;
    border-top: 1px solid #ded7cf;
    background: rgba(255, 253, 249, 0.97);
    backdrop-filter: blur(10px);
  }
  .drawer-footer > div {
    min-width: 0;
    display: grid;
    gap: 2px;
    margin-right: auto;
  }
  .drawer-footer b { font-size: 11px; }
  .drawer-footer span { color: var(--muted); font-size: 9px; }
  .drawer-footer > button {
    height: 42px;
    border: 1px solid #ded7cf;
    border-radius: 9px;
    padding: 0 16px;
    background: #fff;
    font-weight: 800;
    cursor: pointer;
  }
  .drawer-footer .primary {
    border-color: var(--a);
    color: #fff;
    background: var(--a);
  }
  .drawer-footer button:disabled { opacity: 0.6; cursor: wait; }
  @media (max-width: 600px) {
    padding: 16px;
    .drawer-header h2 { font-size: 21px; }
    .drawer-header p { display: none; }
    .basic-fields { grid-template-columns: 1fr; }
    .drawer-footer {
      bottom: -16px;
      margin: 2px -16px -16px;
      padding: 12px 16px;
    }
    .drawer-footer > div { display: none; }
    .drawer-footer > button { flex: 1; }
  }
`;

export const ProductFormError = styled.div`
  position: sticky;
  z-index: 5;
  top: 0;
  padding: 12px 14px;
  border: 1px solid #efb8b4;
  border-radius: 11px;
  color: #991b1b;
  background: #fff1f0;
  box-shadow: 0 8px 20px rgba(123, 25, 25, 0.08);
  font-size: 12px;
  font-weight: 700;
`;

export const ProductFormSection = styled.section`
  min-width: 0;
  display: grid;
  gap: 17px;
  padding: 20px;
  border: 1px solid #e2dbd4;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 10px 25px rgba(44, 34, 27, 0.035);
  .section-heading {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 11px;
  }
  .section-heading > span {
    width: 33px;
    height: 33px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 11%, white);
    font-size: 12px;
    font-weight: 900;
  }
  .section-heading h3 { margin: 0; font-size: 16px; }
  .section-heading p {
    margin: 3px 0 0;
    color: var(--muted);
    font-size: 10px;
    line-height: 1.45;
  }
  .customization-heading { grid-template-columns: auto minmax(0, 1fr) auto; }
  .add-group {
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 0;
    border-radius: 9px;
    padding: 0 12px;
    color: #fff;
    background: var(--a);
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }
  .add-group svg { width: 15px; }
  .add-group:disabled { opacity: 0.45; cursor: not-allowed; }
  @media (max-width: 600px) {
    padding: 15px;
    .customization-heading { grid-template-columns: auto 1fr; }
    .add-group { grid-column: 1 / -1; width: 100%; }
  }
`;

export const ProductCustomizationEmpty = styled.div`
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 17px;
  border: 1px dashed #d9cec4;
  border-radius: 13px;
  color: #4f4740;
  background: #fbf8f5;
  > svg { flex: 0 0 auto; width: 23px; color: var(--a); }
  b { font-size: 12px; }
  p { margin: 4px 0 0; color: var(--muted); font-size: 10px; line-height: 1.45; }
`;

export const ProductOptionGroupList = styled.div`
  display: grid;
  gap: 13px;
  > article {
    min-width: 0;
    overflow: hidden;
    border: 1px solid #e3dcd5;
    border-radius: 14px;
    background: #fdfcfb;
  }
  > article > header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-bottom: 1px solid #eee8e2;
    background: #faf7f4;
  }
  .group-number {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    color: #fff;
    background: #263640;
    font-size: 11px;
    font-weight: 900;
  }
  header b { display: block; font-size: 12px; }
  header span { color: var(--muted); font-size: 9px; }
  header .group-summary {
    display: block;
    margin-top: 3px;
    color: #76574a;
    font-size: 8px;
    line-height: 1.35;
  }
  .remove-group {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border: 1px solid #ead5d3;
    border-radius: 9px;
    color: #b42318;
    background: #fff;
    cursor: pointer;
  }
  .remove-group svg { width: 15px; }
  .group-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    padding: 14px;
  }
  .group-fields small {
    color: var(--muted);
    font-size: 8px;
    font-weight: 500;
    line-height: 1.35;
  }
  .legacy-category-warning {
    display: grid;
    gap: 3px;
    margin: 0 14px 12px;
    padding: 10px 12px;
    border: 1px solid #edc58f;
    border-radius: 10px;
    color: #7a4915;
    background: #fff8e8;
  }
  .legacy-category-warning b { font-size: 10px; }
  .legacy-category-warning span { font-size: 9px; line-height: 1.45; }
  .category-change-confirm {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 9px;
    margin: 0 14px 12px;
    padding: 11px 12px;
    border: 1px solid #e8b995;
    border-radius: 10px;
    background: #fff7f0;
  }
  .category-change-confirm > div { min-width: 0; display: grid; gap: 3px; }
  .category-change-confirm b { font-size: 10px; }
  .category-change-confirm span { color: #73584a; font-size: 8px; line-height: 1.4; }
  .category-change-confirm button {
    min-height: 34px;
    border: 1px solid #ded2c8;
    border-radius: 8px;
    padding: 0 10px;
    color: #4b423b;
    background: #fff;
    font-size: 9px;
    font-weight: 800;
    cursor: pointer;
  }
  .category-change-confirm .confirm-category-change {
    border-color: #b94d2c;
    color: #fff;
    background: #b94d2c;
  }
  .group-rules {
    display: flex;
    align-items: end;
    gap: 10px;
    padding: 0 14px 14px;
  }
  .group-rules label {
    display: grid;
    gap: 5px;
    color: #514943;
    font-size: 9px;
    font-weight: 800;
  }
  .group-rules input[type='number'] {
    width: 78px;
    height: 36px;
    border: 1px solid #ded7cf;
    border-radius: 9px;
    padding: 0 9px;
    background: #fff;
  }
  .required-toggle {
    min-height: 36px;
    display: flex !important;
    flex-direction: row;
    align-items: center;
    gap: 7px !important;
    margin-right: auto;
    padding: 0 11px;
    border: 1px solid #ded7cf;
    border-radius: 9px;
    background: #fff;
  }
  .required-toggle input { accent-color: var(--a); }
  .required-toggle[data-required='true'] {
    border-color: color-mix(in srgb, var(--a) 35%, #ded7cf);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 6%, white);
  }
  .group-options {
    min-width: 0;
    margin: 0 14px 14px;
    padding: 11px;
    border: 1px solid #e6ded7;
    border-radius: 11px;
  }
  .group-options legend {
    padding: 0 5px;
    color: #554d47;
    font-size: 9px;
    font-weight: 900;
  }
  .group-options-hint {
    margin: 0 0 10px;
    padding: 8px 10px;
    border-radius: 8px;
    color: #6e594d;
    background: #f8f2ed;
    font-size: 8px;
    line-height: 1.45;
  }
  .source-category-section {
    display: grid;
    gap: 7px;
    padding-top: 3px;
  }
  .source-category-section + .source-category-section {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #ece5de;
  }
  .source-category-section > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .source-category-section > header b { color: #4d443d; font-size: 9px; }
  .source-category-section > header span { color: var(--muted); font-size: 8px; }
  .source-category-section > div {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
  }
  .source-category-empty {
    padding: 13px;
    border: 1px dashed #d9cec4;
    border-radius: 9px;
    color: var(--muted);
    background: #fbf9f7;
    text-align: center;
    font-size: 9px;
  }
  .group-options label {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    padding: 9px;
    border: 1px solid #e8e1da;
    border-radius: 9px;
    background: #fff;
    cursor: pointer;
  }
  .group-options label.selected {
    border-color: color-mix(in srgb, var(--a) 45%, #e8e1da);
    background: color-mix(in srgb, var(--a) 6%, white);
  }
  .group-options label.inactive { opacity: 0.55; }
  .group-options input { accent-color: var(--a); }
  .group-options span { min-width: 0; }
  .group-options b {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 10px;
  }
  .group-options small { color: var(--muted); font-size: 8px; }
  @media (max-width: 600px) {
    .group-fields { grid-template-columns: 1fr; }
    .group-rules { align-items: stretch; flex-wrap: wrap; }
    .required-toggle { width: 100%; margin: 0; }
    .source-category-section > div { grid-template-columns: 1fr; }
    .category-change-confirm { grid-template-columns: 1fr 1fr; }
    .category-change-confirm > div { grid-column: 1 / -1; }
    .category-change-confirm button { width: 100%; }
  }
`;
export const Metrics = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 13px;
  margin-bottom: 17px;
  @media (max-width: 850px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;
export const Metric = styled.article`
  border: 1px solid var(--border);
  border-radius: 13px;
  background: #fff;
  padding: 18px;
  display: grid;
  gap: 7px;
  span,
  small {
    color: var(--muted);
    font-size: 11px;
  }
  b {
    font-size: 25px;
  }
  em {
    font-style: normal;
    color: #43853e;
    font-size: 10px;
  }
`;
export const AdminGrid = styled.div`
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 17px;
  @media (max-width: 850px) {
    grid-template-columns: 1fr;
  }
`;
export const DataList = styled.div`
  display: grid;
  .data-row {
    min-height: 66px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
  }
  .data-row img {
    width: 46px;
    height: 46px;
    border-radius: 9px;
    object-fit: cover;
  }
  .data-row div {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .data-row span,
  .data-row small {
    font-size: 10px;
    color: var(--muted);
  }
  .data-row strong {
    margin-left: auto;
    white-space: nowrap;
  }
  .data-row > button {
    margin-left: auto;
    border: 1px solid var(--a);
    border-radius: 7px;
    background: #fff;
    color: var(--a);
    height: 34px;
    padding: 0 10px;
  }
  .category-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 9px;
    min-width: 200px;
  }
  .category-actions button {
    width: 92px;
    height: 34px;
    border: 1px solid var(--a);
    border-radius: 8px;
    background: #fff;
    color: var(--a);
    transition:
      background 160ms ease,
      color 160ms ease,
      transform 160ms ease;
  }
  .category-actions button:hover:not(:disabled) {
    background: #fff3ed;
    transform: translateY(-1px);
  }
  .category-actions .category-delete {
    border-color: #e7aaa3;
    color: #b23b32;
  }
  .category-actions .category-delete:hover:not(:disabled) {
    background: #fff1ef;
  }
  .category-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  @media (max-width: 560px) {
    .data-row {
      min-height: 62px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
    }
    .category-actions {
      width: auto;
      min-width: auto;
      margin-left: auto;
      gap: 6px;
    }
    .category-actions button {
      width: 74px;
      height: 32px;
      padding: 0 6px;
      border-radius: 9px;
      font-size: 11px;
    }
  }
`;
export const OverviewFilters = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px;
  gap: 9px;
  margin: 16px 0 5px;
  label {
    position: relative;
    display: block;
  }
  label svg {
    position: absolute;
    left: 11px;
    top: 50%;
    width: 16px;
    color: #887d75;
    transform: translateY(-50%);
    pointer-events: none;
  }
  input,
  select {
    width: 100%;
    height: 40px;
    border: 1px solid #e5ddd6;
    border-radius: 10px;
    outline: 0;
    background: #fcfbfa;
    color: #282522;
    font: inherit;
    font-size: 12px;
  }
  input {
    padding: 0 12px 0 36px;
  }
  select {
    padding: 0 9px;
  }
  input:focus,
  select:focus {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 12%, transparent);
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;
export const OverviewPagination = styled.div`
  min-height: 50px;
  padding-top: 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--muted);
  font-size: 11px;
  & > div {
    display: flex;
    gap: 7px;
  }
  button {
    height: 34px;
    padding: 0 10px;
    display: flex;
    align-items: center;
    gap: 4px;
    border: 1px solid #e1d8d0;
    border-radius: 9px;
    color: #b94715;
    background: #fff;
    font-size: 11px;
    font-weight: 650;
    transition: 0.16s ease;
  }
  button:hover:not(:disabled) {
    border-color: var(--a);
    background: #fff7f2;
    transform: translateY(-1px);
  }
  button:disabled {
    opacity: 0.38;
    cursor: not-allowed;
  }
  button svg {
    width: 14px;
  }
  @media (max-width: 480px) {
    align-items: flex-start;
    flex-direction: column;
    & > div {
      width: 100%;
    }
    button {
      flex: 1;
      justify-content: center;
    }
  }
`;
export const OverviewEmpty = styled.div`
  min-height: 92px;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 12px;
  border-bottom: 1px solid var(--border);
`;
export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 15px;
  input,
  select {
    height: 42px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #fff;
    padding: 0 11px;
    outline: none;
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease;
  }
  input:focus,
  select:focus {
    border-color: var(--a);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 11%, transparent);
  }
  input {
    min-width: 0;
    flex: 1;
  }
  button {
    height: 42px;
    border: 0;
    border-radius: 8px;
    background: var(--a);
    color: #fff;
    padding: 0 14px;
  }
  @media (max-width: 520px) {
    display: grid;
    grid-template-columns: 1fr;
    input,
    select,
    button {
      width: 100%;
    }
  }
`;
export const OrdersToolbar = styled.div`
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 190px auto;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  .search-field,
  .status-filter {
    height: 44px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: #fff;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 13px;
    color: var(--muted);
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease;
  }
  .search-field:focus-within,
  .status-filter:focus-within {
    border-color: var(--a);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 10%, transparent);
  }
  input,
  select {
    min-width: 0;
    width: 100%;
    height: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text);
    font: inherit;
  }
  select {
    appearance: none;
    cursor: pointer;
  }
  .status-filter svg {
    flex: 0 0 auto;
    pointer-events: none;
  }
  .live-status {
    height: 38px;
    border-radius: 999px;
    background: #eff9f0;
    color: #347b3c;
    padding: 0 13px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }
  @media (max-width: 760px) {
    grid-template-columns: 1fr 1fr;
    .search-field {
      grid-column: 1 / -1;
    }
  }
  @media (max-width: 520px) {
    grid-template-columns: 1fr;
    .search-field {
      grid-column: auto;
    }
    .live-status {
      justify-self: start;
    }
  }
`;
export const OrdersList = styled.div`
  display: grid;
  .data-row {
    min-height: 76px;
    border-bottom: 1px solid var(--border);
    display: grid;
    grid-template-columns: minmax(190px, 1fr) auto auto auto 150px;
    align-items: center;
    gap: 14px;
    padding: 10px 0;
  }
  .order-identity {
    min-width: 0;
    display: grid;
    gap: 5px;
  }
  .order-identity span {
    color: var(--muted);
    font-size: 10px;
  }
  strong {
    white-space: nowrap;
  }
  button {
    min-height: 36px;
    border: 1px solid color-mix(in srgb, var(--a) 42%, #fff);
    border-radius: 10px;
    background: color-mix(in srgb, var(--a) 7%, #fff);
    color: var(--a);
    padding: 0 12px;
    font: inherit;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition:
      background 160ms ease,
      color 160ms ease,
      transform 160ms ease;
    &:hover {
      background: var(--a);
      color: #fff;
      transform: translateY(-1px);
    }
  }
  .cancel-order {
    border-color: #efc4c0;
    background: #fff7f5;
    color: #ad3f37;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    &:hover {
      background: #bd463d;
      border-color: #bd463d;
    }
    &:disabled {
      opacity: 0.58;
      cursor: wait;
      transform: none;
    }
  }
  .order-status {
    min-height: 32px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 0 11px;
    background: #f3f1ed;
    color: #6b645a;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.035em;
    white-space: nowrap;
  }
  .order-status i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 0 3px currentColor;
    opacity: 0.7;
  }
  .status-pendente {
    background: #fff5e8;
    color: #b96a18;
  }
  .status-preparando {
    background: #fff0e6;
    color: #c95522;
  }
  .status-pronto {
    background: #edf8ec;
    color: #378044;
  }
  .status-saiu_para_entrega {
    background: #eaf4ff;
    color: #286da8;
  }
  .status-entregue {
    background: #e9f7ef;
    color: #217644;
  }
  .status-cancelado {
    background: #f8eceb;
    color: #a9433c;
  }
  @media (max-width: 760px) {
    .data-row {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .order-status {
      justify-self: start;
    }
  }
  @media (max-width: 460px) {
    .data-row {
      grid-template-columns: 1fr;
      gap: 9px;
    }
    button,
    .order-status {
      justify-self: start;
    }
  }
`;
export const OrdersPagination = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-top: 18px;
  color: var(--muted);
  font-size: 11px;
  > div {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  b {
    color: var(--text);
    font-size: 11px;
    white-space: nowrap;
  }
  button {
    min-height: 36px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #fff;
    color: var(--text);
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition:
      border-color 160ms ease,
      color 160ms ease,
      background 160ms ease;
    &:hover:not(:disabled) {
      border-color: var(--a);
      color: var(--a);
      background: color-mix(in srgb, var(--a) 5%, #fff);
    }
    &:disabled {
      opacity: 0.42;
      cursor: not-allowed;
    }
  }
  @media (max-width: 620px) {
    align-items: stretch;
    flex-direction: column;
    > div {
      justify-content: space-between;
    }
  }
  @media (max-width: 430px) {
    > div {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    b {
      grid-column: 1 / -1;
      grid-row: 1;
      text-align: center;
    }
    button {
      justify-content: center;
    }
  }
`;
export const ProductGrid = styled.div`
  position: relative;
  overflow: visible;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 13px;
  @media (max-width: 760px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 10px;
  }
`;
export const ProductGroups = styled.div`
  display: grid;
  gap: 24px;
  overflow: visible;
  > section {
    position: relative;
    display: grid;
    gap: 10px;
    overflow: visible;
  }
`;
export const ProductCategoryTitle = styled.h2`
  margin: 0;
  padding-left: 10px;
  border-left: 3px solid var(--a);
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 16px;
  color: #2a2622;
  span {
    color: var(--muted);
    font-size: 11px;
    font-weight: 500;
  }
`;
export const EmptyCatalog = styled.p`
  margin: 0;
  color: var(--muted);
  text-align: center;
  padding: 28px;
  border: 1px dashed var(--border);
  border-radius: 12px;
`;
export const Product = styled.article`
  position: relative;
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: visible;
  background: #fff;
  img {
    width: 100%;
    height: 78px;
    object-fit: cover;
    border-radius: 11px 11px 0 0;
  }
  div {
    padding: 7px 9px;
    display: grid;
    gap: 3px;
  }
  b {
    font-size: 13px;
    line-height: 1.25;
  }
  span {
    font-size: 9px;
    color: var(--muted);
  }
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  footer strong {
    color: var(--a);
  }
  footer button {
    border: 0;
    background: transparent;
    color: var(--a);
    cursor: pointer;
  }
  footer .product-actions {
    position: relative;
    display: block;
    padding: 0;
  }
  footer .product-menu-trigger {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    display: grid;
    place-items: center;
    color: #4f4a45;
  }
  footer .product-menu-trigger:hover {
    background: #f4eee8;
  }
  footer .product-menu {
    position: absolute;
    right: 0;
    bottom: 42px;
    z-index: 80;
    width: 170px;
    padding: 6px;
    display: grid;
    gap: 2px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 14px 34px rgba(45, 31, 20, 0.18);
  }
  footer .product-menu button {
    width: 100%;
    padding: 10px;
    border-radius: 7px;
    text-align: left;
    color: #332f2b;
  }
  footer .product-menu button:hover {
    background: #f8f3ee;
  }
  footer .product-menu button.danger {
    color: #b42318;
  }
  @media (max-width: 480px) {
    width: min(100%, 350px);
    img {
      height: 70px;
    }
    div {
      padding: 7px 8px;
    }
    footer strong {
      font-size: 13px;
    }
  }
`;
export const SettingSection = styled.div`
  display: grid;
  gap: 22px;
  animation: section-enter 240ms ease both;
  @keyframes section-enter {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
export const ToggleRows = styled.div`
  display: grid;
  .toggle-row {
    min-height: 78px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 4px 2px;
    transition:
      padding 160ms ease,
      background 160ms ease;
  }
  .toggle-row:hover {
    padding-left: 8px;
    padding-right: 8px;
    background: #fcfaf7;
  }
  .toggle-row div {
    display: grid;
    gap: 4px;
  }
  .toggle-row span {
    font-size: 11px;
    color: var(--muted);
  }
  .toggle-row input {
    margin-left: auto;
    appearance: none;
    width: 44px;
    height: 24px;
    border-radius: 999px;
    background: #d9d4cf;
    position: relative;
    cursor: pointer;
    transition: background 180ms ease;
  }
  .toggle-row input::after {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    left: 3px;
    top: 3px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 5px #0002;
    transition: transform 180ms ease;
  }
  .toggle-row input:checked {
    background: var(--a);
  }
  .toggle-row input:checked::after {
    transform: translateX(20px);
  }
  .toggle-row input:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--a) 18%, transparent);
    outline-offset: 2px;
  }
`;
export const DayRow = styled.div`
  min-height: 59px;
  border-bottom: 1px solid var(--border);
  display: grid;
  grid-template-columns: 150px 1fr auto 1fr;
  align-items: center;
  gap: 10px;
  input {
    height: 46px;
    border: 1px solid #ded7cf;
    border-radius: 11px;
    background: #fcfbf9;
    padding: 0 12px;
    outline: 0;
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      background 180ms ease;
  }
  input:focus {
    border-color: var(--a);
    background: #fff;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 10%, transparent);
  }
  input:disabled {
    background: #f1efec;
    color: #a29c96;
    cursor: not-allowed;
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr 1fr;
    b {
      grid-column: 1/-1;
    }
    .separator {
      display: none;
    }
  }
`;
export const QrPanel = styled.div`
  border: 1px dashed var(--a);
  border-radius: 12px;
  background: #fff7f1;
  padding: 22px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 15px;
  span {
    color: var(--muted);
    font-size: 11px;
  }
  .code {
    font-size: 32px;
    letter-spacing: 0.2em;
    color: var(--a);
  }
  button {
    grid-column: 1/-1;
    justify-self: start;
    height: 40px;
    border: 0;
    border-radius: 8px;
    background: var(--a);
    color: #fff;
    padding: 0 14px;
  }
  @media (max-width: 500px) {
    grid-template-columns: 1fr;
    text-align: center;
    .code {
      justify-self: center;
    }
    button {
      justify-self: stretch;
    }
  }
`;

export const CatalogTabs = styled.div`
  display: inline-flex;
  gap: 5px;
  padding: 5px;
  margin-bottom: 22px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(42, 31, 23, 0.04);
  button {
    border: 0;
    border-radius: 9px;
    padding: 11px 17px;
    background: transparent;
    color: var(--muted);
    font-weight: 800;
    cursor: pointer;
    transition: 160ms ease;
  }
  button:hover:not(.primary) {
    background: #faf6f1;
    color: #322c27;
  }
  button.primary {
    background: var(--a);
    color: #fff;
    box-shadow: 0 5px 12px color-mix(in srgb, var(--a) 30%, transparent);
  }
`;
export const IngredientPanel = styled.div`
  max-width: 900px; padding: 26px;
  h2 { margin: 0 0 5px; } > p { margin: 0 0 22px; color: var(--muted); }
  .ingredient-form { display: grid; grid-template-columns: 1.4fr .7fr auto; gap: 10px; padding: 14px; border-radius: 12px; background: #fff7f1; }
  input { height: 42px; min-width: 0; border: 1px solid #ded7cf; border-radius: 9px; padding: 0 11px; background: #fff; }
  .ingredient-form button { border: 0; border-radius: 9px; padding: 0 16px; background: var(--a); color: #fff; font-weight: 700; }
  .ingredient-row { padding: 14px 0; }
  .ingredient-price { color: var(--a); font-weight: 800; }
  @media (max-width: 600px) { .ingredient-form { grid-template-columns: 1fr; } .ingredient-form button { height: 42px; } }
`;

export const IngredientWorkspace = styled.div`
  width: min(100%, 1060px);
  display: grid;
  gap: 18px;
  min-width: 0;
`;

export const IngredientHero = styled.section`
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding: 25px 27px;
  border-radius: 18px;
  color: #fff;
  background:
    radial-gradient(circle at 84% 5%, rgba(255, 126, 65, 0.36), transparent 31%),
    linear-gradient(125deg, #16242e 0%, #213441 58%, #5c382c 100%);
  box-shadow: 0 18px 38px rgba(33, 35, 37, 0.12);
  &::after {
    content: '';
    position: absolute;
    width: 180px;
    height: 180px;
    right: -65px;
    bottom: -95px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 50%;
  }
  .hero-icon {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 15px;
    color: #ff7a40;
    background: rgba(255, 255, 255, 0.08);
  }
  .hero-icon svg {
    width: 25px;
  }
  span {
    color: #ff9568;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.1em;
  }
  h2 {
    margin: 4px 0;
    color: #fff;
    font-size: clamp(20px, 2.2vw, 28px);
  }
  p {
    max-width: 650px;
    margin: 0;
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;
    line-height: 1.5;
  }
  dl {
    z-index: 1;
    display: flex;
    gap: 8px;
    margin: 0;
  }
  dl div {
    min-width: 88px;
    padding: 11px 13px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.07);
  }
  dt {
    color: rgba(255, 255, 255, 0.62);
    font-size: 10px;
  }
  dd {
    margin: 3px 0 0;
    color: #fff;
    font-size: 20px;
    font-weight: 900;
  }
  @media (max-width: 700px) {
    grid-template-columns: auto minmax(0, 1fr);
    padding: 20px;
    dl {
      grid-column: 1 / -1;
    }
  }
  @media (max-width: 430px) {
    .hero-icon {
      display: none;
    }
    grid-template-columns: 1fr;
  }
`;

export const IngredientForm = styled.form`
  display: grid;
  grid-template-columns: minmax(210px, 1fr) minmax(180px, 0.72fr) minmax(140px, 0.48fr) auto;
  align-items: end;
  gap: 14px;
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: 17px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(48, 35, 25, 0.045);
  .form-heading {
    display: flex;
    align-items: center;
    gap: 12px;
    align-self: center;
    grid-column: 1 / -1;
  }
  .form-icon {
    flex: 0 0 auto;
    width: 43px;
    height: 43px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 11%, white);
  }
  .form-icon svg {
    width: 21px;
  }
  h3 {
    margin: 0;
    font-size: 16px;
  }
  p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.4;
  }
  label {
    display: grid;
    gap: 7px;
    color: #4b433d;
    font-size: 11px;
    font-weight: 800;
  }
  input,
  button {
    height: 45px;
    border-radius: 10px;
  }
  input {
    min-width: 0;
    width: 100%;
    border: 1px solid #ded7cf;
    padding: 0 12px;
    background: #fcfbfa;
    outline: 0;
  }
  input:focus {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 10%, transparent);
  }
  .money-input {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    border: 1px solid #ded7cf;
    border-radius: 10px;
    background: #fcfbfa;
  }
  .money-input:focus-within {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 10%, transparent);
  }
  .money-input span {
    padding-left: 12px;
    color: var(--a);
    font-size: 12px;
    font-weight: 900;
  }
  .money-input input {
    border: 0;
    box-shadow: none;
  }
  .create-ingredient {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 0;
    padding: 0 16px;
    color: #fff;
    background: var(--a);
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
    cursor: pointer;
  }
  .create-ingredient svg {
    width: 16px;
  }
  button:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  @media (max-width: 1050px) {
    grid-template-columns: 1fr 1fr;
    .create-ingredient { width: 100%; }
  }
  @media (max-width: 680px) {
    grid-template-columns: 1fr;
    align-items: stretch;
    .create-ingredient {
      width: 100%;
    }
  }
`;

export const IngredientFeedback = styled.div<{ $tone: 'success' | 'error' }>`
  padding: 12px 15px;
  border: 1px solid ${({ $tone }) => ($tone === 'success' ? '#b7ddc0' : '#f1b7b7')};
  border-radius: 11px;
  color: ${({ $tone }) => ($tone === 'success' ? '#166534' : '#991b1b')};
  background: ${({ $tone }) => ($tone === 'success' ? '#f0f9f2' : '#fff1f1')};
  font-size: 12px;
  font-weight: 700;
`;

export const IngredientListPanel = styled.section`
  min-width: 0;
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: 17px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(48, 35, 25, 0.045);
  > header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 15px;
  }
  h3 {
    margin: 0;
    font-size: 17px;
  }
  header p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 11px;
  }
  .ingredient-filters {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }
  .ingredient-search {
    height: 42px;
    min-width: min(260px, 32vw);
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 11px;
    border: 1px solid #ded7cf;
    border-radius: 10px;
    background: #fcfbfa;
  }
  .ingredient-search svg {
    flex: 0 0 auto;
    width: 16px;
    color: var(--muted);
  }
  .ingredient-search input {
    min-width: 0;
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
  }
  select {
    height: 42px;
    border: 1px solid #ded7cf;
    border-radius: 10px;
    padding: 0 11px;
    background: #fcfbfa;
  }
  .ingredient-list {
    display: grid;
    gap: 16px;
  }
  .ingredient-category-group {
    min-width: 0;
    display: grid;
    gap: 8px;
  }
  .ingredient-category-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 4px 2px;
  }
  .ingredient-category-heading b {
    color: #39322d;
    font-size: 12px;
  }
  .ingredient-category-heading span {
    padding: 4px 8px;
    border-radius: 99px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 8%, white);
    font-size: 9px;
    font-weight: 800;
  }
  .ingredient-category-items {
    display: grid;
    gap: 8px;
  }
  article {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 13px;
    padding: 12px;
    border: 1px solid #eee7e0;
    border-radius: 13px;
    background: #fefdfc;
    transition: 160ms ease;
  }
  article:hover {
    border-color: #ddd1c7;
    transform: translateY(-1px);
    box-shadow: 0 7px 17px rgba(54, 39, 29, 0.045);
  }
  article.inactive {
    background: #fafafa;
    opacity: 0.74;
  }
  .ingredient-avatar {
    width: 39px;
    height: 39px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 10%, white);
    font-weight: 900;
  }
  .ingredient-copy {
    min-width: 0;
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }
  .ingredient-copy b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ingredient-badges {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
  }
  .ingredient-copy span {
    flex: 0 0 auto;
    padding: 4px 7px;
    border-radius: 99px;
    font-size: 9px;
    font-weight: 900;
  }
  .available {
    color: #166534;
    background: #eaf8ed;
  }
  .category-badge {
    color: #6b4c3a;
    background: #f5eee8;
  }
  .unavailable {
    color: #6b7280;
    background: #eceff1;
  }
  article > strong {
    color: var(--a);
    font-size: 14px;
    white-space: nowrap;
  }
  .ingredient-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }
  .ingredient-actions button {
    min-width: 35px;
    height: 35px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e3dcd5;
    border-radius: 9px;
    padding: 0 9px;
    color: #544b44;
    background: #fff;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }
  .ingredient-actions svg {
    width: 15px;
  }
  .ingredient-actions .confirm {
    color: #166534;
    border-color: #b7ddc0;
    background: #f0f9f2;
  }
  .ingredient-actions .delete {
    color: #b42318;
  }
  .ingredient-actions button:disabled {
    opacity: 0.5;
    cursor: wait;
  }
  .ingredient-edit-fields {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(130px, 1fr) minmax(120px, 0.65fr) minmax(105px, 0.45fr);
    gap: 8px;
  }
  .ingredient-edit-fields > input,
  .ingredient-edit-fields .money-input {
    min-width: 0;
    height: 38px;
    border: 1px solid #ded7cf;
    border-radius: 9px;
    background: #fff;
  }
  .ingredient-edit-fields > input {
    padding: 0 10px;
  }
  .ingredient-edit-fields .money-input {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
  }
  .ingredient-edit-fields .money-input span {
    padding-left: 9px;
    color: var(--a);
    font-size: 10px;
    font-weight: 900;
  }
  .ingredient-edit-fields .money-input input {
    width: 100%;
    min-width: 0;
    height: 36px;
    border: 0;
    padding: 0 8px;
    background: transparent;
  }
  @media (max-width: 750px) {
    > header {
      align-items: stretch;
      flex-direction: column;
    }
    .ingredient-search {
      min-width: 0;
      flex: 1;
    }
    article {
      grid-template-columns: auto minmax(0, 1fr) auto;
    }
    .ingredient-actions {
      grid-column: 2 / -1;
      justify-content: flex-start;
    }
    .ingredient-edit-fields {
      grid-column: 2 / -1;
    }
  }
  @media (max-width: 480px) {
    padding: 16px;
    .ingredient-filters {
      flex-direction: column;
    }
    .ingredient-copy {
      align-items: flex-start;
      flex-direction: column;
      gap: 4px;
    }
    .ingredient-edit-fields {
      grid-template-columns: 1fr;
    }
    .ingredient-actions .status-button {
      flex: 1;
    }
  }
`;
