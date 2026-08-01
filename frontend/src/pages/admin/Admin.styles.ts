import styled from "styled-components";

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
    "Segoe UI",
    sans-serif;
  display: grid;
  grid-template-columns: ${({ $settings }) =>
    $settings ? "236px 298px minmax(0,1fr)" : "236px minmax(0,1fr)"};
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
  button {
    cursor: pointer;
  }
  @media (max-width: 1080px) {
    grid-template-columns: ${({ $settings }) =>
      $settings ? "220px minmax(0,1fr)" : "220px minmax(0,1fr)"};
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
    display: ${({ $open }) => ($open ? "flex" : "none")};
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
`;
export const SettingsSidebar = styled.aside<{ $visible: boolean }>`
  height: 100vh;
  position: sticky;
  top: 0;
  background: #fff;
  border-right: 1px solid var(--border);
  padding: 30px 14px;
  overflow-y: auto;
  display: ${({ $visible }) => ($visible ? "block" : "none")};
  @media (max-width: 1080px) {
    display: none;
  }
`;
export const Search = styled.label`
  height: 50px;
  border: 1px solid #d8d1c9;
  border-radius: 7px;
  padding: 0 13px;
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 26px;
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
  background: #fffdf9;
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
  }
  .preview {
    border: 1px solid var(--border);
    background: #fff;
  }
  .save {
    border: 0;
    background: var(--a);
    color: #fff;
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
  padding: 22px 28px 70px;
  @media (max-width: 760px) {
    padding: 14px 10px 50px;
  }
`;
export const Stack = styled.div`
  display: grid;
  gap: 17px;
`;
export const Card = styled.section`
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
  padding: 28px 25px;
  box-shadow: 0 3px 12px rgba(30, 20, 10, 0.025);
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
  gap: 18px;
  margin-top: 20px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;
export const Field = styled.label<{ $full?: boolean }>`
  display: grid;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
  ${({ $full }) => ($full ? "grid-column:1/-1" : "")}input,textarea,select {
    width: 100%;
    border: 1px solid #d8d1c9;
    border-radius: 8px;
    background: #fff;
    padding: 12px;
    outline: 0;
    font-weight: 400;
  }
  input {
    height: 51px;
  }
  textarea {
    resize: vertical;
    min-height: 108px;
  }
  :focus-within input,
  :focus-within textarea {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 12%, transparent);
  }
`;
export const Color = styled.div`
  display: grid;
  grid-template-columns: 52px 1fr;
  input[type="color"] {
    padding: 5px;
    width: 52px;
  }
`;
export const Banners = styled.div`
  display: grid;
  grid-template-columns: 1.8fr 1fr 1fr;
  gap: 14px;
  margin-top: 20px;
  button {
    min-height: 170px;
    border: 1px dashed #bdb4aa;
    border-radius: 10px;
    background: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #333;
  }
  span {
    color: var(--muted);
    font-size: 12px;
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
  .row input[type="checkbox"] {
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
  grid-template-columns: 42px minmax(130px, 1fr) 130px 110px 38px;
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
  }
  @media (max-width: 580px) {
    grid-template-columns: 42px 1fr 38px;
    .role,
    .status {
      display: none;
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
  .data-row button {
    margin-left: auto;
    border: 1px solid var(--a);
    border-radius: 7px;
    background: #fff;
    color: var(--a);
    height: 34px;
    padding: 0 10px;
  }
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
export const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 13px;
  @media (max-width: 760px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;
export const Product = styled.article`
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  img {
    width: 100%;
    height: 125px;
    object-fit: cover;
  }
  div {
    padding: 12px;
    display: grid;
    gap: 6px;
  }
  span {
    font-size: 10px;
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
  }
`;
export const SettingSection = styled.div`
  display: grid;
  gap: 17px;
`;
export const ToggleRows = styled.div`
  display: grid;
  .toggle-row {
    min-height: 70px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 13px;
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
    width: 20px;
    height: 20px;
    accent-color: var(--a);
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
    height: 40px;
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 0 9px;
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
