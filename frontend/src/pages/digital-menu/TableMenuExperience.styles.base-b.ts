import styled from 'styled-components';

export const PayChoice = styled.section`
  padding: 20px;
  border-radius: 20px;
  background: #fff7f5;
  border: 1px solid #ffe1dc;
  display: grid;
  gap: 12px;
  align-content: start;

  > svg { color: var(--primary); }
  h2 { margin: 0; }
  p { margin: 0 0 4px; color: var(--muted); line-height: 1.45; }
  .or { text-align: center; color: var(--muted); font-size: 12px; }
`;

export const TrackingHero = styled.section`
  padding: 30px;
  min-height: 170px;
  border-radius: 22px;
  color: #fff;
  background: linear-gradient(120deg, #350706, #92120f 60%, #c4251d);
  display: grid;
  align-content: center;

  small { letter-spacing: .28em; color: #ffaaa6; font-weight: 800; }
  h1 { margin: 7px 0 4px; font-size: clamp(34px, 4vw, 54px); }
  p { margin: 0; }
`;

export const ProgressRow = styled.div`
  margin: 24px 0;
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 6px;

  @media (max-width: 640px) { gap: 2px; }
`;

export const ProgressStep = styled.div<{ $active: boolean }>`
  position: relative;
  display: grid;
  justify-items: center;
  gap: 7px;
  text-align: center;
  color: ${({ $active }) => ($active ? 'var(--primary)' : '#a9a9ad')};

  &::after {
    content: "";
    position: absolute;
    top: 18px;
    left: calc(50% + 22px);
    width: calc(100% - 44px);
    height: 3px;
    background: ${({ $active }) => ($active ? 'var(--primary)' : '#dedee1')};
  }

  &:last-child::after { display: none; }

  > span {
    position: relative;
    z-index: 1;
    width: 38px;
    height: 38px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: ${({ $active }) => ($active ? 'var(--primary)' : '#ececee')};
    color: ${({ $active }) => ($active ? '#fff' : '#888891')};
    font-weight: 900;
  }

  b { font-size: 12px; }

  @media (max-width: 560px) {
    b { font-size: 10px; }
  }
`;

export const TrackingGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0,1.4fr) minmax(280px,.7fr);
  gap: 16px;

  @media (max-width: 760px) { grid-template-columns: 1fr; }
`;

export const StatusPanel = styled.section`
  min-height: 150px;
  padding: 22px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff1ef;
  border: 1px solid #ffd9d4;

  > svg { color: var(--primary); width: 42px; height: 42px; }
  h2 { margin: 0 0 5px; }
  p { margin: 0; color: var(--muted); }
`;

export const WaiterPanel = styled(StatusPanel)`
  background: #fff;
  border-color: var(--line);
  align-items: flex-start;

  h3 { margin: 0 0 5px; }
  p { margin-bottom: 14px; }
`;

export const OrderItems = styled.section`
  margin-top: 16px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: #fff;

  h2 { margin-top: 0; }
  article {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    padding: 12px 0;
    border-top: 1px solid var(--line);
  }
  article div { display: grid; gap: 3px; }
  article small { color: var(--muted); }
`;

export const CenteredPage = styled.section`
  width: min(720px, calc(100% - 24px));
  margin: 0 auto;
  padding: 28px 0 60px;
`;

export const PixCard = styled.section`
  padding: 28px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: #fff;
  display: grid;
  justify-items: center;
  gap: 12px;
  text-align: center;

  > small {
    color: var(--primary);
    font-weight: 900;
    letter-spacing: .1em;
  }

  h1 { margin: 0; font-size: 36px; }
  p { margin: 0; max-width: 520px; color: var(--muted); line-height: 1.5; }
  .amount { font-size: 32px; }
`;

export const QrFrame = styled.div`
  width: 238px;
  height: 238px;
  margin: 4px 0;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: #fff;

  svg {
    width: 210px;
    height: 210px;
  }
`;

export const PixCode = styled.code`
  width: 100%;
  max-height: 86px;
  overflow: auto;
  padding: 12px;
  border-radius: 12px;
  background: #f5f5f6;
  color: #4d4d55;
  word-break: break-all;
  text-align: left;
  font-size: 11px;
`;

export const PaymentState = styled.div<{ $success?: boolean }>`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: ${({ $success }) => ($success ? '#eaf9ee' : '#fff5e9')};
  color: ${({ $success }) => ($success ? '#18733a' : '#9a5c10')};
  font-weight: 850;
`;

export const ProductOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 80;
  padding: 26px;
  background: rgba(18,18,20,.55);
  display: grid;
  place-items: center;
  overflow: auto;

  @media (max-width: 720px) { padding: 0; }
`;

export const ProductDetail = styled.section`
  position: relative;
  width: min(1080px, 100%);
  min-height: 560px;
  padding: 54px 20px 20px;
  border-radius: 24px;
  background: #fff;
  display: grid;
  grid-template-columns: minmax(0,1.1fr) minmax(330px,.9fr);
  gap: 26px;

  .back {
    position: absolute;
    top: 18px;
    left: 20px;
    border: 0;
    background: transparent;
    color: var(--primary);
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-weight: 850;
  }

  .visual img {
    width: 100%;
    height: min(62vh, 540px);
    border-radius: 20px;
    object-fit: cover;
  }

  .info {
    display: grid;
    align-content: center;
    gap: 14px;
    padding: 10px;
  }

  .info h1 { margin: 0; font-size: clamp(34px,4vw,56px); }
  .info p { margin: 0; color: var(--muted); line-height: 1.5; }
  .info > strong { font-size: 34px; color: var(--primary); }

  @media (max-width: 720px) {
    min-height: 100vh;
    border-radius: 0;
    grid-template-columns: 1fr;
    align-content: start;
    .visual img { height: 300px; }
    .info { align-content: start; }
  }
`;

export const PaymentHeader = styled.header`
  width: min(1180px, calc(100% - 32px));
  min-height: 82px;
  margin: 0 auto;
  padding: 14px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  background: #fff;

  @media (max-width: 700px) {
    width: 100%;
    min-height: 74px;
    padding: 12px 16px;
  }
`;

export const PaymentBack = styled.button`
  min-height: 46px;
  padding: 0 18px;
  border: 1px solid #d4d4d8;
  border-radius: 999px;
  background: #fff;
  color: #202024;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 850;

  @media (max-width: 700px) {
    width: 42px;
    height: 42px;
    min-height: 42px;
    padding: 0;
    justify-content: center;
    border: 0;

    svg { width: 22px; height: 22px; }
    font-size: 0;
  }
`;

export const PixPage = styled.section`
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 26px 0 56px;
  display: grid;
  grid-template-columns: minmax(0, .95fr) minmax(400px, 1fr);
  gap: 18px;
  align-items: stretch;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    width: 100%;
    padding: 0 12px 34px;
  }
`;

export const PixSummary = styled.section`
  min-height: 620px;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: #fff;
  display: grid;
  align-content: start;
  gap: 18px;

  > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--line);
  }

  h2 { margin: 0; font-size: 24px; }
  header > span {
    padding: 9px 12px;
    border-radius: 999px;
    background: #fff0ef;
    color: var(--primary);
    font-weight: 850;
  }

  .items { display: grid; gap: 12px; }

  article {
    display: grid;
    grid-template-columns: 72px minmax(0,1fr) auto auto;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
  }

  article img,
  article > span:first-child {
    width: 72px;
    height: 62px;
    border-radius: 12px;
    object-fit: cover;
  }

  article div {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  article small {
    color: var(--muted);
    line-height: 1.35;
  }

  article > span { color: #5d5d64; }
  article > strong { white-space: nowrap; }

  @media (max-width: 860px) {
    display: none;
  }
`;

export const PixTotals = styled.div`
  margin-top: 6px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
  display: grid;
  gap: 12px;

  > span {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 14px;
  }

  small { color: var(--muted); font-size: 15px; }

  .total {
    padding-top: 6px;
    font-size: 21px;
  }

  .total b {
    color: var(--primary);
    font-size: 29px;
  }
`;

export const AfterPayment = styled.div`
  margin-top: auto;
  padding: 18px;
  border-radius: 16px;
  background: #fff2f1;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: var(--primary);

  svg { flex: 0 0 auto; }
  div { display: grid; gap: 5px; }
  p {
    margin: 0;
    color: #65656c;
    line-height: 1.45;
  }
`;

export const PixPaymentCard = styled.section`
  min-height: 620px;
  padding: 28px;
  border: 1px solid #f0e5e3;
  border-radius: 22px;
  background: linear-gradient(160deg, #fffafa 0%, #fff 65%);
  display: grid;
  align-content: start;
  justify-items: center;
  gap: 12px;
  text-align: center;

  h1 {
    margin: 2px 0 0;
    font-size: 30px;
  }

  > p {
    margin: 0 0 4px;
    max-width: 340px;
    color: var(--muted);
    line-height: 1.45;
  }

  @media (max-width: 860px) {
    min-height: 0;
    border-radius: 18px;
    padding: 24px 16px;
  }
`;

export const PixMark = styled.div`
  width: 52px;
  height: 52px;
  position: relative;
  transform: rotate(45deg);

  i {
    position: absolute;
    width: 22px;
    height: 22px;
    border-radius: 7px;
    background: #20c7b7;
  }

  i:nth-child(1) { left: 0; top: 15px; }
  i:nth-child(2) { right: 0; top: 15px; }
  i:nth-child(3) { left: 15px; top: 0; }
  i:nth-child(4) { left: 15px; bottom: 0; }
`;

export const CopyArea = styled.div`
  width: 100%;
  padding: 14px 14px 14px 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fafafa;
  display: grid;
  grid-template-columns: minmax(0,1fr) auto;
  gap: 12px;
  align-items: center;
  text-align: left;

  > div {
    min-width: 0;
    display: grid;
    gap: 6px;
  }

  small { color: #62626a; }

  code {
    max-height: 76px;
    overflow: auto;
    color: #54545b;
    font-family: inherit;
    font-size: 12px;
    line-height: 1.45;
    word-break: break-all;
  }

  button {
    min-width: 68px;
    min-height: 44px;
    border: 0;
    background: transparent;
    color: var(--primary);
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 4px;
    font-weight: 850;
    font-size: 12px;
  }
`;

export const WaitingPayment = styled.div`
  width: 100%;
  padding: 15px 16px;
  border-radius: 14px;
  background: #fff0ef;
  display: grid;
  grid-template-columns: auto minmax(0,1fr) auto;
  gap: 12px;
  align-items: center;
  text-align: left;
  color: var(--primary);

  > div {
    display: grid;
    gap: 3px;
  }

  > div span {
    color: #55555d;
    font-size: 12px;
  }

  > strong {
    padding: 7px 10px;
    border-radius: 10px;
    background: #ffdcd9;
    font-size: 16px;
  }
`;

export const PaymentBackWide = styled.button`
  width: 100%;
  min-height: 52px;
  margin-top: 8px;
  border: 1.5px solid var(--primary);
  border-radius: 16px;
  background: #fff;
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font-weight: 900;
`;

export const TableActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 700px) {
    gap: 4px;
  }
`;

export const WaiterButton = styled.button`
  min-height: 44px;
  padding: 0 13px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  color: var(--text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 850;

  @media (max-width: 700px) {
    min-height: 38px;
    width: 38px;
    padding: 0;
    border-radius: 12px;

    span { display: none; }
  }
`;

export const TrackingHeading = styled.section`
  padding: 8px 2px 2px;
  display: grid;
  gap: 4px;

  small {
    color: var(--primary);
    font-size: 11px;
    font-weight: 900;
    letter-spacing: .18em;
  }

  h1 {
    margin: 2px 0 0;
    font-size: clamp(28px, 4vw, 42px);
    line-height: 1.05;
    font-weight: 950;
  }

  p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  @media (max-width: 560px) {
    padding-inline: 2px;

    h1 {
      font-size: 28px;
    }
  }
`;

export const AddMoreItemsButton = styled.button`
  width: 100%;
  min-height: 38px;
  margin: 10px 0 16px;
  border: 1px dashed #d8d8dd;
  border-radius: 10px;
  background: #fff;
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 850;
`;
