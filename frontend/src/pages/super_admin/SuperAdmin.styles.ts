import styled from "styled-components";

export const Root = styled.div`
  --brand: #e9530b;
  --ink: #151719;
  --muted: #687078;
  --border: #e7e2dc;
  min-height: 100vh;
  min-height: 100dvh;
  background: #fbfaf8;
  color: var(--ink);
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    "Segoe UI",
    sans-serif;
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  button,
  input,
  select,
  textarea {
    font: inherit;
  }
  @media (max-width: 860px) {
    display: block;
  }
`;
export const Sidebar = styled.aside<{ $open: boolean }>`
  position: sticky;
  top: 0;
  height: 100dvh;
  background: linear-gradient(155deg, #151a1d, #0d171d);
  color: #fff;
  padding: 28px 12px 20px;
  display: flex;
  flex-direction: column;
  z-index: 80;
  @media (max-width: 860px) {
    position: fixed;
    inset: 0 auto 0 0;
    width: min(86vw, 310px);
    transform: translateX(${(p) => (p.$open ? "0" : "-105%")});
    transition: 0.25s;
    box-shadow: 24px 0 60px #0007;
  }
`;
export const Brand = styled.div`
  padding: 2px 17px 25px;
  border-bottom: 1px solid #ffffff20;
  span {
    font:
      43px Georgia,
      serif;
    color: #fff;
  }
  span b {
    color: #ff6717;
    font-weight: 400;
  }
  small {
    display: block;
    color: #929a9f;
    font-size: 10px;
    letter-spacing: 0.14em;
    margin-top: 12px;
  }
`;
export const Nav = styled.nav`
  display: grid;
  gap: 3px;
  margin-top: 19px;
  button {
    height: 47px;
    border: 0;
    border-left: 2px solid transparent;
    border-radius: 9px;
    background: transparent;
    color: #c9cdcf;
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 0 17px;
    cursor: pointer;
    text-align: left;
    font-size: 13px;
  }
  button.active {
    color: #ff711f;
    background: #35261e;
    border-left-color: #ff6514;
  }
  svg {
    width: 19px;
  }
`;
export const User = styled.div`
  margin-top: auto;
  border-top: 1px solid #ffffff25;
  padding: 18px 9px 0;
  display: grid;
  grid-template-columns: 43px 1fr 28px;
  align-items: center;
  gap: 9px;
  .avatar {
    width: 43px;
    height: 43px;
    border: 1px solid #fff;
    border-radius: 50%;
    display: grid;
    place-items: center;
  }
  .info {
    display: grid;
    gap: 3px;
  }
  .info b {
    font-size: 12px;
  }
  .info small {
    font-size: 9px;
    color: #b0b6b9;
  }
  .logout {
    border: 0;
    background: transparent;
    color: #bbb;
  }
  svg {
    width: 18px;
  }
`;
export const Close = styled.button`
  display: none;
  position: absolute;
  right: 12px;
  top: 12px;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 8px;
  background: #ffffff15;
  color: #fff;
  @media (max-width: 860px) {
    display: grid;
    place-items: center;
  }
`;
export const Overlay = styled.div`
  display: none;
  @media (max-width: 860px) {
    display: block;
    position: fixed;
    inset: 0;
    background: #0006;
    z-index: 70;
  }
`;
export const Main = styled.main`
  min-width: 0;
`;
export const Header = styled.header`
  min-height: 132px;
  background: #fffdfb;
  border-bottom: 1px solid var(--border);
  padding: 23px 32px;
  display: flex;
  align-items: center;
  gap: 14px;
  position: sticky;
  top: 0;
  z-index: 30;
  .crumb {
    font-size: 10px;
    font-weight: 800;
    color: var(--brand);
    letter-spacing: 0.08em;
  }
  .title h1 {
    margin: 7px 0 4px;
    font-size: 30px;
  }
  .title p {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }
  .access {
    margin-left: auto;
    border: 1px solid #f0ddcf;
    background: #fff8f1;
    border-radius: 9px;
    padding: 11px 13px;
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .primary {
    height: 43px;
    border: 0;
    border-radius: 8px;
    background: var(--brand);
    color: #fff;
    padding: 0 16px;
    font-weight: 750;
    cursor: pointer;
  }
  @media (max-width: 680px) {
    min-height: 96px;
    padding: 13px 11px;
    .title h1 {
      font-size: 21px;
    }
    .title p,
    .crumb,
    .access {
      display: none;
    }
    .primary {
      margin-left: auto;
      font-size: 11px;
      padding: 0 10px;
    }
  }
`;
export const MobileMenu = styled.button`
  display: none;
  width: 42px;
  height: 42px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: #fff;
  @media (max-width: 860px) {
    display: grid;
    place-items: center;
  }
`;
export const Content = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: auto;
  padding: 22px 28px 70px;
  @media (max-width: 650px) {
    padding: 12px 9px 60px;
  }
`;
export const Metrics = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 13px;
  margin-bottom: 18px;
  @media (max-width: 480px) {
    display: flex;
    overflow: auto;
    margin-inline: -9px;
    padding-inline: 9px;
    scroll-snap-type: x mandatory;
  }
`;
export const Metric = styled.article`
  min-height: 112px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 4px 16px #39220c07;
  i {
    width: 50px;
    height: 50px;
    border-radius: 11px;
    background: #fff0e7;
    color: var(--brand);
    display: grid;
    place-items: center;
    font-style: normal;
  }
  i svg {
    width: 25px;
  }
  .copy {
    display: grid;
    gap: 4px;
  }
  .copy span {
    font-size: 12px;
    color: #50565c;
  }
  .copy b {
    font-size: 27px;
  }
  .copy small {
    font-size: 9px;
    color: #29833c;
  }
  @media (max-width: 480px) {
    flex: 0 0 210px;
    scroll-snap-align: start;
  }
`;
export const Toolbar = styled.div`
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  padding: 14px;
  display: flex;
  gap: 9px;
  margin-bottom: 18px;
  input,
  select,
  button {
    height: 42px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #fff;
    padding: 0 12px;
  }
  input {
    flex: 1;
    min-width: 190px;
  }
  button {
    cursor: pointer;
  }
  @media (max-width: 720px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    input {
      grid-column: 1/-1;
    }
  }
  @media (max-width: 440px) {
    grid-template-columns: 1fr;
    input {
      grid-column: auto;
    }
  }
`;
export const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(290px, 0.75fr);
  gap: 17px;
  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`;
export const Card = styled.section`
  border: 1px solid var(--border);
  border-radius: 13px;
  background: #fff;
  padding: 19px;
  min-width: 0;
  box-shadow: 0 4px 17px #39220c06;
  > header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 14px;
  }
  h2 {
    font-size: 18px;
    margin: 0;
  }
  header p {
    font-size: 10px;
    color: var(--muted);
    margin: 4px 0 0;
  }
  @media (max-width: 520px) {
    padding: 13px 9px;
  }
`;
export const Table = styled.div`
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  .row {
    min-width: 780px;
    display: grid;
    grid-template-columns: 1.35fr 1.2fr 0.8fr 0.8fr 0.95fr 0.85fr;
    align-items: center;
    gap: 10px;
    padding: 13px;
    border-bottom: 1px solid var(--border);
    font-size: 11px;
  }
  .row:last-child {
    border-bottom: 0;
  }
  .head {
    background: #faf8f5;
    color: #667078;
    font-size: 9px;
    font-weight: 800;
  }
  .name {
    display: grid;
    gap: 3px;
  }
  .name b {
    font-size: 12px;
  }
  .name small {
    color: var(--muted);
  }
  .action {
    border: 1px solid var(--border);
    border-radius: 7px;
    background: #fff;
    height: 32px;
    font-size: 9px;
    cursor: pointer;
  }
`;
export const Badge = styled.span<{
  $tone?: "green" | "red" | "yellow" | "blue" | "gray";
}>`
  display: inline-flex;
  width: max-content;
  padding: 5px 7px;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 800;
  color: ${(p) =>
    p.$tone === "green"
      ? "#16752e"
      : p.$tone === "red"
        ? "#c92c1f"
        : p.$tone === "yellow"
          ? "#b86800"
          : p.$tone === "blue"
            ? "#2459b8"
            : "#5f656a"};
  background: ${(p) =>
    p.$tone === "green"
      ? "#e7f5e9"
      : p.$tone === "red"
        ? "#fde9e7"
        : p.$tone === "yellow"
          ? "#fff1d8"
          : p.$tone === "blue"
            ? "#e9f0ff"
            : "#eee"};
`;
export const Stack = styled.div`
  display: grid;
  gap: 10px;
`;
export const ListItem = styled.article`
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 12px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 7px;
  align-items: center;
  .info {
    display: grid;
    gap: 4px;
  }
  .info b {
    font-size: 12px;
  }
  .info span {
    font-size: 10px;
    color: var(--muted);
  }
  button {
    height: 32px;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: #fff;
    color: var(--brand);
    font-size: 9px;
    font-weight: 700;
  }
`;
export const Chart = styled.div`
  height: 240px;
  border-left: 1px solid #ddd;
  border-bottom: 1px solid #ddd;
  margin: 30px 15px 20px;
  display: flex;
  align-items: end;
  justify-content: space-around;
  gap: 14px;
  padding: 0 12px;
  .bar {
    flex: 1;
    max-width: 56px;
    background: linear-gradient(#ff7a2d, #e95108);
    border-radius: 7px 7px 0 0;
    position: relative;
  }
  .bar span {
    position: absolute;
    bottom: -23px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 9px;
    color: var(--muted);
  }
`;
export const PlanGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 17px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
  @media (min-width: 581px) and (max-width: 900px) {
    grid-template-columns: 1fr 1fr;
  }
`;
export const PlanCard = styled.article<{ $featured?: boolean }>`
  border: 1px solid ${(p) => (p.$featured ? "var(--brand)" : "var(--border)")};
  border-radius: 13px;
  background: #fff;
  padding: 19px;
  display: flex;
  flex-direction: column;
  min-height: 400px;
  h2 {
    margin: 0;
    font-size: 20px;
  }
  .price {
    font-size: 25px;
    font-weight: 800;
    margin: 8px 0;
  }
  .price small {
    font-size: 11px;
    font-weight: 500;
  }
  .features {
    display: grid;
    gap: 9px;
    border-top: 1px solid var(--border);
    padding-top: 14px;
    margin-top: 10px;
    font-size: 11px;
  }
  .features span::before {
    content: "✓";
    color: #289442;
    margin-right: 8px;
  }
  .edit {
    margin-top: auto;
    height: 38px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #fff;
  }
`;
export const SettingsLayout = styled.div`
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  gap: 17px;
  @media (max-width: 850px) {
    grid-template-columns: 1fr;
  }
`;
export const SettingsNav = styled.div`
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  padding: 12px;
  display: grid;
  align-content: start;
  gap: 5px;
  input {
    height: 40px;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0 10px;
    margin-bottom: 8px;
  }
  button {
    height: 43px;
    border: 0;
    border-left: 2px solid transparent;
    border-radius: 7px;
    background: #fff;
    text-align: left;
    padding: 0 12px;
  }
  .active {
    color: var(--brand);
    border-left-color: var(--brand);
    background: #fff2e9;
  }
`;
export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;
export const FormCard = styled(Card)`
  display: grid;
  gap: 12px;
  label {
    display: grid;
    gap: 5px;
    font-size: 10px;
    font-weight: 700;
  }
  input,
  select {
    height: 40px;
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 0 10px;
    background: #fff;
  }
  .line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
  .toggle {
    width: 42px;
    height: 23px;
    border: 0;
    border-radius: 99px;
    background: #ccc;
    position: relative;
  }
  .toggle.on {
    background: var(--brand);
  }
  .toggle::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    background: #fff;
  }
  .toggle.on::after {
    left: 22px;
  }
`;
export const AccessDenied = styled.div`
  min-height: 100dvh;
  display: grid;
  place-content: center;
  text-align: center;
  gap: 12px;
  background: #fbfaf8;
  padding: 20px;
  svg {
    margin: auto;
    color: #d73f2c;
    width: 50px;
    height: 50px;
  }
  h1 {
    margin: 0;
  }
  p {
    color: #687078;
    max-width: 460px;
  }
`;
