import styled from "styled-components";

export const Root = styled.div<{ $primary: string }>`
  --p: ${({ $primary }) => $primary};
  --border: #eadfd3;
  --muted: #6f6a63;
  min-height: 100vh;
  width: 100%;
  background: #fffdf9;
  color: #191816;
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
  button {
    font: inherit;
    -webkit-tap-highlight-color: transparent;
  }
  img {
    display: block;
    max-width: 100%;
  }
`;
export const Page = styled.main`
  width: 100%;
  max-width: 1480px;
  margin: auto;
  padding: 24px 48px 60px;
  > small {
    color: var(--muted);
  }
  > h1 {
    font-size: 38px;
    margin: 12px 0 0;
  }
  h1 em {
    font-style: normal;
    color: #e53935;
    cursor: pointer;
  }
  @media (max-width: 700px) {
    padding: 18px 12px 50px;
    > h1 {
      font-size: 30px;
    }
  }
`;
export const Subtitle = styled.p`
  margin: 4px 0 26px;
  color: var(--muted);
`;
export const Layout = styled.div`
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 22px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;
export const Side = styled.aside`
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
  padding: 24px 20px;
  h2 {
    margin: 12px 0 3px;
  }
  p {
    margin: 0;
    color: var(--muted);
  }
  nav {
    display: grid;
    gap: 4px;
    margin: 20px 0;
    border-bottom: 1px solid var(--border);
    padding-bottom: 14px;
  }
  nav button {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 12px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    text-align: left;
    cursor: pointer;
  }
  nav button.active {
    background: #f8e9df;
    color: var(--p);
    font-weight: 700;
  }
  svg {
    width: 20px;
  }
  .logout {
    border: 0;
    background: transparent;
    color: #b52b22;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    cursor: pointer;
  }
  @media (max-width: 900px) {
    display: none;
  }
`;
export const AvatarWrap = styled.div`
  position: relative;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 4px solid #f4eadf;
  flex-shrink: 0;
  &:hover .ov {
    opacity: 1;
  }
`;
export const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;
export const AvatarInitials = styled.div`
  width: 100%;
  height: 100%;
  background: #f8e9df;
  color: var(--p);
  display: grid;
  place-items: center;
  font-size: 26px;
  font-weight: 800;
  user-select: none;
`;
export const AvatarOverlay = styled.div.attrs({ className: "ov" })`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.52);
  opacity: 0;
  transition: opacity 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  pointer-events: none;
  gap: 2px;
  span {
    font-size: 10px;
    line-height: 1.2;
    text-align: center;
  }
`;
export const Main = styled.section`
  min-width: 0;
`;
export const Active = styled.article`
  min-height: 290px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
  display: grid;
  grid-template-columns: 1.35fr 0.9fr;
  overflow: hidden;
  padding: 24px 16px 16px 34px;
  @media (max-width: 850px) {
    grid-template-columns: 1fr;
    padding: 18px 14px;
  }
  .map {
    display: none;
  }
`;
export const Heading = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  h2 {
    margin: 0;
    font-size: 25px;
  }
  > span {
    color: var(--muted);
  }
  @media (max-width: 600px) {
    flex-wrap: wrap;
    gap: 8px 12px;
    h2 {
      width: 100%;
      font-size: 21px;
    }
  }
`;
export const Status = styled.b`
  padding: 8px 14px;
  border: 1px solid #b9d9b1;
  background: #eef8eb;
  color: #4f8b40;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
`;
export const Tracking = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto 1fr auto 1fr auto;
  align-items: start;
  margin: 28px 0 24px;
`;
export const Step = styled.div<{ $done?: boolean; $active?: boolean }>`
  color: ${({ $done, $active }) => ($done || $active ? "var(--p)" : "#aaa")};
  text-align: center;
  i {
    width: 38px;
    height: 38px;
    border: 2px solid currentColor;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-style: normal;
    background: ${({ $done, $active }) =>
      $done || $active ? "currentColor" : "transparent"};
    box-shadow: inset 0 0 0 8px
      ${({ $done, $active }) => ($done || $active ? "var(--p)" : "transparent")};
  }
  span {
    display: block;
    color: #191816;
    font-size: 12px;
    margin-top: 8px;
    white-space: nowrap;
  }
  @media (max-width: 520px) {
    i {
      width: 30px;
      height: 30px;
    }
    span {
      font-size: 9px;
      white-space: normal;
      line-height: 1.15;
      max-width: 58px;
    }
  }
`;
export const Line = styled.div<{ $done?: boolean }>`
  height: 2px;
  margin-top: 18px;
  background: ${({ $done }) => ($done ? "var(--p)" : "var(--border)")};
`;
export const Eta = styled.p`
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--muted);
  font-size: 14px;
`;
export const Actions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
  button {
    padding: 11px 17px;
    border: 1px solid var(--p);
    border-radius: 9px;
    background: transparent;
    color: var(--p);
    cursor: pointer;
  }
  button:first-child {
    background: var(--p);
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  @media (max-width: 480px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    button {
      padding: 10px 8px;
      font-size: 11px;
      justify-content: center;
    }
  }
`;
export const Map = styled.div.attrs({ className: "map" })`
  margin-left: 20px;
  position: relative;
  background: repeating-linear-gradient(
    32deg,
    #f5f3ed 0 20px,
    #ebe8df 21px 23px,
    #f5f3ed 24px 45px
  );
  border-radius: 12px;
  overflow: hidden;
  div {
    position: absolute;
    width: 70%;
    height: 80px;
    border-bottom: 3px dashed var(--p);
    transform: rotate(10deg);
    left: 15%;
    top: 30%;
  }
  span {
    position: absolute;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid var(--p);
    display: grid;
    place-items: center;
    color: var(--p);
    z-index: 2;
  }
  .store {
    left: 12%;
    top: 45%;
  }
  .driver {
    right: 8%;
    top: 20%;
  }
`;
export const Bottom = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-top: 18px;
  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`;
export const Card = styled.section`
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
  padding: 20px 24px;
  h2 {
    margin: 0 0 16px;
  }
  @media (max-width: 520px) {
    padding: 17px 14px;
  }
`;
export const Order = styled.article`
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  img {
    width: 72px;
    height: 72px;
    border-radius: 10px;
    object-fit: cover;
  }
  div {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }
  span,
  small {
    color: var(--muted);
    font-size: 12px;
  }
  aside {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
  }
  aside small {
    color: #43853e;
  }
  button {
    border: 1px solid var(--p);
    color: var(--p);
    background: transparent;
    border-radius: 7px;
    padding: 5px 9px;
    font-size: 11px;
    cursor: pointer;
  }
  @media (max-width: 520px) {
    grid-template-columns: 58px 1fr;
    gap: 10px;
    img {
      width: 58px;
      height: 58px;
    }
    aside {
      grid-column: 2;
      align-items: flex-start;
      flex-direction: row;
      flex-wrap: wrap;
    }
    aside button {
      width: 100%;
    }
  }
`;
export const All = styled.button`
  margin: 12px auto 0;
  border: 0;
  background: transparent;
  color: var(--p);
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  cursor: pointer;
`;
export const Account = styled.div`
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 15px 0;
  border-bottom: 1px solid var(--border);
  i {
    flex: 0 0 42px;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: #f3ede5;
    display: grid;
    place-items: center;
    font-style: normal;
  }
  div {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  span {
    color: var(--muted);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  button {
    margin-left: auto;
    border: 0;
    background: transparent;
    color: var(--p);
    cursor: pointer;
  }
`;
export const Support = styled.div`
  width: min(680px, 70%);
  min-height: 72px;
  margin: 18px auto 0;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 12px 28px;
  button {
    margin-left: auto;
    border: 1px solid var(--p);
    background: transparent;
    color: var(--p);
    padding: 10px 25px;
    border-radius: 8px;
    cursor: pointer;
  }
  @media (max-width: 700px) {
    width: 100%;
    padding: 14px;
    display: grid;
    grid-template-columns: auto 1fr;
    button {
      grid-column: 1/-1;
      width: 100%;
      margin: 0;
    }
  }
`;
export const Empty = styled.section`
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
  padding: 36px;
  text-align: center;
  color: var(--muted);
`;
export const MobileTabs = styled.nav`
  display: none;
  width: calc(100% + 24px);
  margin: 0 -12px 16px;
  padding: 0 12px 5px;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
  button {
    flex: 0 0 auto;
    height: 40px;
    padding: 0 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: #fff;
    color: #555;
    white-space: nowrap;
  }
  button.active {
    border-color: var(--p);
    background: #f8e9df;
    color: var(--p);
    font-weight: 700;
  }
  @media (max-width: 900px) {
    display: flex;
  }
`;
export const ViewHeader = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 18px;
  h2 {
    font-size: 27px;
    margin: 0 0 5px;
  }
  p {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }
  button {
    height: 43px;
    border: 0;
    border-radius: 9px;
    background: var(--p);
    color: #fff;
    padding: 0 16px;
    font-weight: 700;
  }
  @media (max-width: 520px) {
    align-items: stretch;
    flex-direction: column;
    h2 {
      font-size: 23px;
    }
    button {
      width: 100%;
    }
  }
`;
export const PageCard = styled.section`
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
  padding: 22px 24px;
  @media (max-width: 520px) {
    padding: 16px 13px;
  }
`;
export const FullOrder = styled.article`
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr) auto;
  align-items: center;
  gap: 15px;
  padding: 15px 0;
  border-bottom: 1px solid var(--border);
  img {
    width: 82px;
    height: 72px;
    border-radius: 10px;
    object-fit: cover;
  }
  .info {
    display: grid;
    gap: 5px;
  }
  .info span {
    font-size: 12px;
    color: var(--muted);
  }
  aside {
    text-align: right;
    display: grid;
    gap: 7px;
    justify-items: end;
  }
  aside small {
    color: #43853e;
  }
  aside button {
    height: 34px;
    border: 1px solid var(--p);
    border-radius: 7px;
    background: #fff;
    color: var(--p);
    padding: 0 11px;
  }
  @media (max-width: 550px) {
    grid-template-columns: 62px 1fr;
    img {
      width: 62px;
      height: 62px;
    }
    aside {
      grid-column: 2;
      text-align: left;
      justify-items: start;
    }
  }
`;
export const AddressGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  @media (max-width: 650px) {
    grid-template-columns: 1fr;
  }
`;
export const AddressCard = styled.article`
  border: 1px solid var(--border);
  border-radius: 13px;
  padding: 18px;
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: 13px;
  align-items: start;
  i {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #f3ede5;
    display: grid;
    place-items: center;
    font-style: normal;
  }
  div {
    display: grid;
    gap: 5px;
  }
  span {
    color: var(--muted);
    font-size: 12px;
  }
  small {
    color: #43853e;
    font-weight: 700;
  }
  button {
    border: 0;
    background: transparent;
    color: var(--p);
  }
`;
export const ModalOverlay = styled.div`
  position: fixed; inset: 0; z-index: 100; background: rgba(20, 16, 12, .56);
  display: grid; place-items: center; padding: 20px;
`;
export const AddressModalCard = styled.form`
  width: min(650px, 100%); max-height: 92vh; overflow-y: auto; background: #fff;
  border-radius: 20px; padding: 24px; box-shadow: 0 24px 70px rgba(30, 20, 12, .25);
  color: #191816;
  header { display: flex; justify-content: space-between; gap: 20px; align-items: start; }
  h2 { margin: 0 0 5px; color: #191816; font-size: 25px; } p { margin: 0; color: #70675f; }
  header button { border: 0; background: #f4eee8; border-radius: 50%; width: 38px; height: 38px; display: grid; place-items: center; }
  .default { display: flex; gap: 9px; align-items: center; margin-top: 17px; font-weight: 700; color: #292521; }
  .default input { accent-color: var(--p, #d64d08); }
  footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
  footer button { border: 1px solid var(--border, #ded5cc); border-radius: 11px; padding: 12px 18px; background: #fff; color: #292521; font-weight: 700; }
  footer .primary { border-color: var(--p, #d64d08); background: var(--p, #d64d08); color: #fff; box-shadow: 0 8px 18px rgba(214, 77, 8, .2); }
  footer .primary:disabled { opacity: .65; }
`;
export const AddressFormGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 22px;
  label { display: grid; gap: 7px; font-size: 12px; font-weight: 700; color: #39342f; }
  input { width: 100%; height: 48px; border: 1px solid var(--border, #ded5cc); border-radius: 11px; padding: 0 13px; outline: none; background: #fcfbf9; color: #191816; font: inherit; }
  input:hover { border-color: #bfb4aa; background: #fff; }
  input:focus { border-color: var(--p, #d64d08); background: #fff; box-shadow: 0 0 0 3px rgba(214, 77, 8, .12); }
  .street, .full { grid-column: 1 / -1; }
  @media (max-width: 560px) { grid-template-columns: 1fr; .street, .full { grid-column: auto; } }
`;
export const AddressMessage = styled.p`
  margin-top: 12px !important; color: var(--p, #d64d08) !important; font-size: 12px; font-weight: 700;
`;
export const FavoriteGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  @media (max-width: 850px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 520px) {
    display: flex;
    overflow-x: auto;
    width: calc(100% + 26px);
    margin-right: -13px;
    padding-right: 13px;
    scroll-snap-type: x mandatory;
  }
`;
export const FavoriteCard = styled.article`
  border: 1px solid var(--border);
  border-radius: 13px;
  overflow: hidden;
  min-width: 0;
  position: relative;
  > img {
    width: 100%;
    height: 145px;
    object-fit: cover;
  }
  .heart {
    position: absolute;
    right: 9px;
    top: 9px;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 50%;
    background: #fff;
    color: var(--p);
  }
  div {
    padding: 13px;
  }
  h3 {
    margin: 0;
    font-size: 16px;
  }
  p {
    height: 34px;
    color: var(--muted);
    font-size: 11px;
  }
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  footer strong {
    color: var(--p);
  }
  @media (max-width: 520px) {
    flex: 0 0 78vw;
    scroll-snap-align: center;
  }
`;
export const SettingsForm = styled.form`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 17px;
  label {
    display: grid;
    gap: 7px;
    font-size: 12px;
    font-weight: 700;
  }
  input {
    width: 100%;
    height: 48px;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0 12px;
    outline: 0;
  }
  label.full {
    grid-column: 1/-1;
  }
  footer {
    grid-column: 1/-1;
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid var(--border);
    padding-top: 17px;
  }
  button {
    height: 43px;
    border: 0;
    border-radius: 8px;
    background: var(--p);
    color: #fff;
    padding: 0 20px;
    font-weight: 700;
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    label.full,
    footer {
      grid-column: auto;
    }
    footer button {
      width: 100%;
    }
  }
`;
export const SecurityList = styled.div`
  display: grid;
  .security-row {
    min-height: 78px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .security-row > i {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #f3ede5;
    display: grid;
    place-items: center;
    font-style: normal;
  }
  .security-row div {
    display: grid;
    gap: 5px;
  }
  .security-row span {
    color: var(--muted);
    font-size: 12px;
  }
  .security-row button {
    margin-left: auto;
    border: 1px solid var(--p);
    border-radius: 8px;
    background: #fff;
    color: var(--p);
    height: 38px;
    padding: 0 13px;
  }
  @media (max-width: 520px) {
    .security-row {
      display: grid;
      grid-template-columns: 44px 1fr;
      padding: 14px 0;
    }
    .security-row button {
      grid-column: 1/-1;
      width: 100%;
      margin: 0;
    }
  }
`;
