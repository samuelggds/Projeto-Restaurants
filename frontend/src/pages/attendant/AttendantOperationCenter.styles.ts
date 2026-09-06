import styled from 'styled-components';

export const Shell = styled.div`
  --brand: #e16a3d;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  background: #f5f7f8;
  color: #18231d;
  font-family: Inter, system-ui, sans-serif;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    padding-bottom: 72px;
  }
`;

export const Sidebar = styled.aside`
  position: sticky;
  top: 0;
  height: 100dvh;
  padding: 20px 14px;
  display: flex;
  flex-direction: column;
  background: #153729;
  color: #fff;
  z-index: 20;

  @media (max-width: 900px) {
    position: fixed;
    inset: auto 0 0;
    width: 100%;
    height: 68px;
    padding: 7px 8px;
    display: block;
  }
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 3px 7px 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  > span {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: var(--brand);
    font-weight: 900;
  }

  strong,
  small {
    display: block;
  }

  strong { font-size: 13px; }
  small { margin-top: 2px; font-size: 9px; opacity: 0.65; }

  @media (max-width: 900px) { display: none; }
`;

export const Nav = styled.nav`
  display: grid;
  gap: 5px;
  margin-top: 18px;

  button {
    min-height: 43px;
    padding: 0 11px;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 0;
    border-radius: 11px;
    background: transparent;
    color: rgba(255, 255, 255, 0.68);
    text-align: left;
    font-size: 11px;
    font-weight: 750;
    cursor: pointer;
  }

  button svg { width: 17px; }
  button:hover,
  button.active { background: rgba(255, 255, 255, 0.1); color: #fff; }
  button.active { box-shadow: inset 3px 0 var(--brand); }

  @media (max-width: 900px) {
    display: flex;
    gap: 2px;
    height: 54px;
    margin: 0;
    overflow-x: auto;

    button {
      min-width: 68px;
      min-height: 54px;
      padding: 4px;
      flex: 1;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
      font-size: 7px;
    }

    button svg { width: 16px; }
    button.active { box-shadow: inset 0 3px var(--brand); }
  }
`;

export const Profile = styled.div`
  margin-top: auto;
  padding: 15px 6px 0;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 30px;
  gap: 8px;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  > span {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    font-size: 10px;
    font-weight: 900;
  }

  b,
  small { display: block; }
  b { overflow: hidden; font-size: 10px; white-space: nowrap; text-overflow: ellipsis; }
  small { font-size: 8px; opacity: 0.55; }
  button { border: 0; background: transparent; color: rgba(255, 255, 255, 0.75); cursor: pointer; }
  button svg { width: 16px; }

  @media (max-width: 900px) { display: none; }
`;

export const Main = styled.main`min-width: 0;`;

export const Topbar = styled.header`
  padding: 25px clamp(18px, 3vw, 42px) 18px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-end;
  background: #fff;
  border-bottom: 1px solid #e8ece9;

  .eyebrow { font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: #6f7e75; font-weight: 900; }
  h1 { margin: 4px 0; font-size: clamp(23px, 3vw, 34px); letter-spacing: -0.04em; }
  p { margin: 0; color: #69776f; font-size: 11px; }
  .sync { display: flex; align-items: center; gap: 10px; }
  .sync > span { font-size: 9px; font-weight: 800; }
  .online { color: #2f7a4c; }
  .offline { color: #ad6b17; }
  .sync button {
    height: 38px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1px solid #dce4df;
    border-radius: 11px;
    background: #fff;
    font-size: 9px;
    font-weight: 800;
    cursor: pointer;
  }
  .sync button svg { width: 14px; }

  @media (max-width: 700px) {
    align-items: flex-start;
    flex-direction: column;
    .sync { width: 100%; justify-content: space-between; }
  }
`;

export const Content = styled.div`
  max-width: 1500px;
  margin: auto;
  padding: 22px clamp(16px, 3vw, 42px) 50px;
`;

export const ErrorBanner = styled.div`
  margin: 16px clamp(16px, 3vw, 42px) 0;
  padding: 12px 15px;
  display: flex;
  gap: 10px;
  border: 1px solid #f1d9ad;
  border-radius: 13px;
  background: #fff7e8;
  color: #79501d;
  svg { width: 19px; }
  b,
  span { display: block; }
  b { font-size: 11px; }
  span { margin-top: 2px; font-size: 9px; }
`;

export const SectionTitle = styled.div`
  margin-bottom: 12px;
  h2 { margin: 0; font-size: 16px; }
  p { margin: 4px 0 0; color: #718078; font-size: 10px; }
`;

export const PriorityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 11px;
  @media (max-width: 1100px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

export const PriorityCard = styled.button<{ $tone: 'danger' | 'warning' | 'success' | 'info' }>`
  padding: 15px;
  display: grid;
  grid-template-columns: 38px 1fr 18px;
  gap: 10px;
  align-items: start;
  border: 1px solid ${({ $tone }) => $tone === 'danger' ? '#f0c9c4' : $tone === 'warning' ? '#edd7a8' : $tone === 'success' ? '#c9e5d3' : '#caddea'};
  border-radius: 17px;
  background: #fff;
  box-shadow: 0 7px 22px rgba(32, 55, 43, 0.05);
  text-align: left;
  cursor: pointer;

  .icon {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: ${({ $tone }) => $tone === 'danger' ? '#fff0ee' : $tone === 'warning' ? '#fff7e6' : $tone === 'success' ? '#edf9f1' : '#eff7fc'};
  }
  .icon svg { width: 18px; }
  small,
  strong { display: block; }
  small { color: #738078; font-size: 8px; font-weight: 900; text-transform: uppercase; }
  strong { margin: 1px 0; font-size: 25px; }
  p { margin: 0; color: #6d7972; font-size: 9px; line-height: 1.4; }
  > svg { width: 16px; margin-top: 10px; color: #9aa59f; }
`;

export const Guide = styled.div`
  margin: 14px 0 18px;
  padding: 13px 15px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid #dfe8e2;
  border-radius: 14px;
  background: linear-gradient(135deg, #f4faf6, #fff);
  > svg { width: 18px; flex: none; color: #357553; }
  strong { display: block; font-size: 10px; }
  p { margin: 3px 0 0; color: #66766c; font-size: 9px; line-height: 1.5; }
`;

export const TwoCols = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

export const Panel = styled.section`
  min-width: 0;
  padding: 14px;
  border: 1px solid #e1e7e3;
  border-radius: 17px;
  background: #fff;
  box-shadow: 0 7px 24px rgba(30, 50, 40, 0.04);
`;

export const PanelHead = styled.header`
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  > div { display: flex; align-items: center; gap: 9px; }
  > div > svg { width: 18px; color: #3b7354; }
  strong,
  small { display: block; }
  strong { font-size: 11px; }
  small { margin-top: 2px; color: #79867e; font-size: 8px; }
`;

export const TextButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: #376e50;
  font-size: 9px;
  font-weight: 850;
  cursor: pointer;
  svg { width: 13px; }
`;

export const MiniRow = styled.div`
  padding: 10px 4px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 9px;
  align-items: center;
  border-top: 1px solid #edf0ee;
  .badge { padding: 6px 8px; border-radius: 8px; background: #eef4f0; font-size: 8px; font-weight: 900; }
  b,
  small { display: block; }
  b { font-size: 10px; }
  small { margin-top: 2px; color: #76837b; font-size: 8px; }
  time { color: #8a958f; font-size: 8px; }
`;

export const Empty = styled.div`
  min-height: 150px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #7d8a82;
  text-align: center;
  svg { width: 25px; margin-bottom: 8px; color: #8fa096; }
  b { color: #536159; font-size: 11px; }
  span { max-width: 310px; margin-top: 4px; font-size: 9px; line-height: 1.45; }
`;

export const Toolbar = styled.div`
  margin-bottom: 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

export const SearchBox = styled.label`
  min-width: 260px;
  height: 42px;
  padding: 0 12px;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #dce4df;
  border-radius: 12px;
  background: #fff;
  svg { width: 16px; color: #7c8981; }
  input { flex: 1; border: 0; outline: 0; background: transparent; font-size: 10px; }
  @media (max-width: 600px) { min-width: 100%; }
`;

export const Filters = styled.div`
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  button {
    padding: 9px 11px;
    border: 1px solid #dfe5e1;
    border-radius: 10px;
    background: #fff;
    color: #66736c;
    font-size: 8px;
    font-weight: 850;
    cursor: pointer;
  }
  button.active { border-color: #244d38; background: #244d38; color: #fff; }
`;

export const OrderList = styled.div`display: grid; gap: 9px;`;

export const OrderCard = styled.article<{ $attention?: boolean }>`
  padding: 12px 14px;
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) 90px auto;
  gap: 12px;
  align-items: center;
  border: 1px solid ${({ $attention }) => $attention ? '#e8c69a' : '#e1e7e3'};
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(30, 50, 40, 0.035);

  .status span,
  .status em,
  .main strong,
  .main small { display: block; }
  .status span { font-size: 12px; font-weight: 900; }
  .status em { margin-top: 3px; color: ${({ $attention }) => $attention ? '#a06417' : '#4f785e'}; font-size: 8px; font-style: normal; }
  .main strong { font-size: 11px; }
  .main small { margin-top: 3px; overflow: hidden; color: #77847c; font-size: 8px; white-space: nowrap; text-overflow: ellipsis; }
  .time { display: flex; align-items: center; gap: 5px; color: #7d8982; font-size: 8px; }
  .time svg { width: 13px; }
  > button { height: 34px; padding: 0 10px; display: flex; align-items: center; gap: 4px; border: 1px solid #d8e2dc; border-radius: 10px; background: #f8fbf9; color: #315e45; font-size: 8px; font-weight: 850; cursor: pointer; }
  > button svg { width: 12px; }

  @media (max-width: 760px) {
    grid-template-columns: 80px 1fr;
    .time { display: none; }
    .main small { white-space: normal; }
    > button { grid-column: 1 / -1; justify-content: center; }
  }
`;

export const DrawerBackdrop = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 28, 21, 0.48);
  backdrop-filter: blur(4px);
  z-index: 120;
`;

export const Drawer = styled.aside`
  width: min(480px, 100%);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8faf9;
  box-shadow: -30px 0 80px rgba(15, 30, 22, 0.2);
`;

export const DrawerHead = styled.header`
  padding: 19px 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #e2e8e4;
  background: #fff;
  small,
  strong,
  span { display: block; }
  small { color: #7b8980; font-size: 8px; text-transform: uppercase; }
  strong { font-size: 22px; }
  span { margin-top: 3px; color: #3b7654; font-size: 9px; }
  button { width: 34px; height: 34px; border: 0; border-radius: 10px; background: #f3f6f4; cursor: pointer; }
  button svg { width: 16px; }
`;

export const DrawerBody = styled.div`
  padding: 16px;
  display: grid;
  gap: 13px;
  overflow: auto;
`;

export const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  @media (max-width: 430px) { grid-template-columns: 1fr; }
`;

export const Info = styled.div`
  padding: 12px;
  border: 1px solid #e2e8e4;
  border-radius: 13px;
  background: #fff;
  small,
  b,
  span { display: block; }
  small { color: #7c8981; font-size: 8px; font-weight: 850; text-transform: uppercase; }
  b { margin-top: 4px; font-size: 10px; }
  b svg { width: 13px; vertical-align: middle; }
  span { margin-top: 3px; color: #76837b; font-size: 8px; }
`;

export const Subhead = styled.h3`margin: 2px 0 7px; font-size: 11px;`;

export const ItemList = styled.ul`
  margin: 0;
  padding: 0;
  overflow: hidden;
  list-style: none;
  border: 1px solid #e2e8e4;
  border-radius: 13px;
  background: #fff;
  li { padding: 10px 12px; border-bottom: 1px solid #edf1ee; }
  li:last-child { border-bottom: 0; }
  b,
  span { display: block; }
  b { font-size: 9px; }
  span { margin-top: 2px; color: #77847c; font-size: 8px; }
`;

export const ActionBox = styled.div<{ $warning?: boolean }>`
  padding: 13px;
  border: 1px solid ${({ $warning }) => $warning ? '#efd3a2' : '#cce4d4'};
  border-radius: 14px;
  background: ${({ $warning }) => $warning ? '#fff8e9' : '#f0faf3'};
  strong { font-size: 10px; }
  p { color: #6d786f; font-size: 8px; line-height: 1.5; }
  button { width: 100%; height: 38px; display: flex; align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: 10px; background: #2f6f4a; color: #fff; font-size: 9px; font-weight: 850; cursor: pointer; }
  button:disabled { opacity: 0.45; cursor: not-allowed; }
  button svg { width: 15px; }
`;

export const Form = styled.form`display: grid; gap: 12px; max-width: 1050px;`;

export const Step = styled.section`
  padding: 16px;
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 12px;
  border: 1px solid #e1e7e3;
  border-radius: 16px;
  background: #fff;
  > span { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 10px; background: #234d38; color: #fff; font-size: 10px; font-weight: 900; }
  h3 { margin: 0; font-size: 13px; }
  p { margin: 3px 0 12px; color: #75827a; font-size: 9px; }
`;

export const ChoiceRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  button { min-height: 40px; padding: 0 13px; display: flex; align-items: center; gap: 6px; border: 1px solid #dbe3de; border-radius: 11px; background: #fff; font-size: 9px; font-weight: 800; cursor: pointer; }
  button svg { width: 15px; }
  button.active { border-color: #79a98b; background: #eef8f1; color: #265f3e; }
`;

export const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
  label { color: #647169; font-size: 8px; font-weight: 800; }
  input { width: 100%; height: 39px; margin-top: 4px; padding: 0 10px; border: 1px solid #dce4df; border-radius: 9px; outline: 0; font-size: 9px; }
  .wide { grid-column: span 2; }
  @media (max-width: 700px) { grid-template-columns: 1fr 1fr; }
  @media (max-width: 480px) { grid-template-columns: 1fr; .wide { grid-column: auto; } }
`;

export const Products = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  @media (max-width: 700px) { grid-template-columns: 1fr; }
`;

export const ProductRow = styled.div<{ $disabled?: boolean }>`
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  border: 1px solid #e1e7e3;
  border-radius: 11px;
  opacity: ${({ $disabled }) => $disabled ? 0.55 : 1};
  b,
  small { display: block; }
  b { font-size: 9px; }
  small { margin-top: 2px; color: #77847c; font-size: 8px; }
  > div { display: flex; align-items: center; gap: 8px; }
  > div button { width: 29px; height: 29px; border: 1px solid #d8e2dc; border-radius: 8px; background: #f8fbf9; font-weight: 900; cursor: pointer; }
  > div button:disabled { opacity: 0.35; }
  > div strong { min-width: 15px; font-size: 10px; text-align: center; }
`;

export const Review = styled.div`
  position: sticky;
  bottom: 12px;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border-radius: 16px;
  background: #153729;
  color: #fff;
  box-shadow: 0 18px 45px rgba(21, 55, 41, 0.24);
  small,
  strong,
  p { display: block; }
  small { font-size: 8px; opacity: 0.65; }
  strong { font-size: 18px; }
  p { margin: 2px 0 0; font-size: 8px; opacity: 0.65; }
  button { min-height: 42px; padding: 0 16px; display: flex; align-items: center; gap: 6px; border: 0; border-radius: 11px; background: var(--brand); color: #fff; font-size: 9px; font-weight: 900; cursor: pointer; }
  button:disabled { opacity: 0.45; }
  button svg { width: 15px; }
`;

export const CallCard = styled.article`
  padding: 12px;
  display: grid;
  grid-template-columns: 90px 1fr 70px auto;
  gap: 11px;
  align-items: center;
  border: 1px solid #e1e7e3;
  border-radius: 14px;
  background: #fff;
  .table { padding: 8px; border-radius: 9px; background: #eef4f0; font-size: 9px; font-weight: 900; text-align: center; }
  strong,
  small { display: block; }
  strong { font-size: 10px; }
  small { margin-top: 3px; color: #76837b; font-size: 8px; }
  time { color: #849088; font-size: 8px; }
  button { height: 34px; padding: 0 11px; border: 0; border-radius: 9px; background: #244d38; color: #fff; font-size: 8px; font-weight: 850; cursor: pointer; }
  button.success { background: #2f7850; }
  @media (max-width: 700px) { grid-template-columns: 80px 1fr; time { display: none; } button { grid-column: 1 / -1; } }
`;

export const TableGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 11px;
  @media (max-width: 1000px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

export const TableCard = styled.article<{ $attention?: boolean }>`
  padding: 14px;
  border: 1px solid ${({ $attention }) => $attention ? '#e9c999' : '#e1e7e3'};
  border-radius: 16px;
  background: #fff;
  header { display: flex; justify-content: space-between; align-items: center; }
  header small,
  header strong { display: block; }
  header small { color: #77847c; font-size: 7px; text-transform: uppercase; }
  header strong { font-size: 22px; }
  header em { padding: 6px 8px; border-radius: 8px; background: ${({ $attention }) => $attention ? '#fff4df' : '#edf8f1'}; color: ${({ $attention }) => $attention ? '#956015' : '#36734f'}; font-size: 8px; font-style: normal; font-weight: 850; }
  > div { margin: 12px 0; display: flex; gap: 12px; flex-wrap: wrap; }
  > div span { display: flex; align-items: center; gap: 4px; color: #6e7b73; font-size: 8px; }
  > div svg { width: 13px; }
  p { margin: 0; color: #748179; font-size: 8px; line-height: 1.45; }
`;

export const SupportLayout = styled.div`
  min-height: 570px;
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 12px;
  @media (max-width: 850px) { grid-template-columns: 1fr; }
`;

export const SupportList = styled.div`
  display: grid;
  gap: 6px;
  button { padding: 10px; display: flex; justify-content: space-between; gap: 8px; border: 1px solid #e2e8e4; border-radius: 11px; background: #fff; text-align: left; cursor: pointer; }
  button.active { border-color: #78a98a; background: #f1f9f3; }
  b,
  small { display: block; }
  b { font-size: 9px; }
  small { max-width: 230px; margin-top: 3px; overflow: hidden; color: #75827a; font-size: 8px; white-space: nowrap; text-overflow: ellipsis; }
  em { color: #4f785e; font-size: 7px; font-style: normal; }
`;

export const Chat = styled.div`
  height: 410px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  overflow: auto;
  border-radius: 12px;
  background: #f6f8f7;
`;

export const Bubble = styled.div<{ $staff?: boolean }>`
  max-width: 82%;
  align-self: ${({ $staff }) => $staff ? 'flex-end' : 'flex-start'};
  padding: 9px 10px;
  border: 1px solid ${({ $staff }) => $staff ? '#c2dfcb' : '#e1e7e3'};
  border-radius: 12px;
  background: ${({ $staff }) => $staff ? '#dff2e5' : '#fff'};
  b { color: #66756c; font-size: 7px; }
  p { margin: 3px 0; font-size: 9px; line-height: 1.45; }
  time { color: #849087; font-size: 7px; }
`;

export const Resolved = styled.div`
  padding: 7px 10px;
  align-self: center;
  display: flex;
  align-items: center;
  gap: 5px;
  border-radius: 20px;
  background: #e8f5ec;
  color: #397351;
  font-size: 8px;
  svg { width: 13px; }
`;

export const Composer = styled.form`
  margin-top: 9px;
  display: grid;
  grid-template-columns: 1fr 42px;
  gap: 7px;
  textarea { min-height: 55px; padding: 9px; resize: none; border: 1px solid #dce4df; border-radius: 11px; outline: 0; font: inherit; font-size: 9px; }
  button { border: 0; border-radius: 11px; background: #244d38; color: #fff; cursor: pointer; }
  button:disabled { opacity: 0.4; }
  button svg { width: 16px; }
`;
