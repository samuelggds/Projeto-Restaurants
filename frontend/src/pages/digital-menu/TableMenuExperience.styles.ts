import styled from 'styled-components';

export const Shell = styled.main<{ $primary: string }>`
  --primary: ${({ $primary }) => $primary};
  --text: #151515;
  --muted: #6d6d74;
  --line: #ececf0;
  min-height: 100vh;
  background: #f6f6f7;
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  *, *::before, *::after { box-sizing: border-box; }
  button, input { font: inherit; }
  button { cursor: pointer; }
`;

export const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 30;
  width: min(1180px, calc(100% - 32px));
  min-height: 76px;
  margin: 18px auto 0;
  padding: 12px 16px;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto minmax(260px, 1.5fr) auto;
  gap: 14px;
  align-items: center;
  background: rgba(255,255,255,.96);
  border: 1px solid rgba(20,20,20,.06);
  border-radius: 22px;
  box-shadow: 0 14px 40px rgba(28, 24, 22, .08);
  backdrop-filter: blur(18px);

  @media (max-width: 860px) {
    position: relative;
    width: 100%;
    margin: 0;
    min-height: auto;
    border-radius: 0;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 8px;
    box-shadow: none;
    border-inline: 0;
    padding: 12px;
  }
`;

export const Brand = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;

  > img, > span:first-child {
    width: 48px;
    height: 48px;
    flex: 0 0 48px;
    border-radius: 14px;
    object-fit: cover;
  }

  > span:last-child {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 18px;
    font-weight: 900;
  }

  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--muted);
    font-size: 11px;
  }

  @media (max-width: 560px) {
    > img, > span:first-child {
      width: 38px;
      height: 38px;
      flex-basis: 38px;
      border-radius: 11px;
    }
    b { font-size: 14px; }
    small { font-size: 9px; max-width: 150px; }
  }
`;

export const BrandMark = styled.span`
  display: block;
  background: linear-gradient(145deg, var(--primary), #ff4b55);
`;

export const TableBadge = styled.div`
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 800;
  background: #fff;

  .table-accessible-number {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 560px) {
    min-height: 38px;
    padding: 0 10px;
    font-size: 11px;
    svg { width: 15px; }
  }
`;

export const SearchBox = styled.label`
  min-height: 44px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 14px;
  background: #f4f4f6;
  border: 1px solid #ececef;

  input {
    min-width: 0;
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text);
  }

  @media (max-width: 860px) {
    grid-column: 1 / -1;
    grid-row: 2;
  }
`;

export const CartButton = styled.button`
  position: relative;
  min-height: 44px;
  padding: 0 14px;
  border: 0;
  border-radius: 14px;
  background: #fff;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 850;

  i {
    position: absolute;
    right: 2px;
    top: -6px;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--primary);
    color: #fff;
    font-style: normal;
    display: grid;
    place-items: center;
    font-size: 11px;
  }

  @media (max-width: 560px) {
    padding: 0 4px;
    span { display: none; }
  }
`;

export const Page = styled.section`
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 18px 0 64px;

  @media (max-width: 860px) {
    width: 100%;
    padding: 12px 12px 48px;
  }
`;

export const Hero = styled.section`
  position: relative;
  min-height: 300px;
  overflow: hidden;
  border-radius: 24px;
  margin-bottom: 16px;
  background: #1d1110;

  > img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(18,8,7,.9) 0%, rgba(18,8,7,.66) 38%, rgba(18,8,7,.08) 75%);
  }

  > div {
    position: relative;
    z-index: 1;
    width: min(520px, 70%);
    padding: 44px 46px;
    color: #fff;
  }

  small {
    display: block;
    margin-bottom: 8px;
    letter-spacing: .28em;
    font-size: 11px;
    font-weight: 900;
    color: #ff8e8e;
  }

  h1 {
    margin: 0 0 12px;
    font-size: clamp(36px, 5vw, 64px);
    line-height: .95;
    max-width: 500px;
  }

  p {
    margin: 0 0 22px;
    max-width: 430px;
    line-height: 1.45;
    color: rgba(255,255,255,.86);
  }

  @media (max-width: 700px) {
    min-height: 190px;
    border-radius: 18px;
    > div { width: 72%; padding: 20px; }
    h1 { font-size: 28px; }
    p { font-size: 12px; margin-bottom: 12px; }
    small { font-size: 8px; }
  }
`;

export const PrimaryButton = styled.button`
  min-height: 48px;
  border: 0;
  border-radius: 13px;
  padding: 0 18px;
  background: var(--primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font-weight: 900;

  &:disabled {
    opacity: .55;
    cursor: not-allowed;
  }
`;

export const SecondaryButton = styled.button`
  min-height: 48px;
  width: 100%;
  border: 1px solid #dcdce2;
  border-radius: 13px;
  padding: 0 18px;
  background: #fff;
  color: #24242a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font-weight: 850;

  &:disabled { opacity: .55; }
`;

export const CategoryStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin: 14px 0 22px;

  button {
    min-height: 64px;
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    font-weight: 850;
  }

  button.active {
    border-color: var(--primary);
    color: var(--primary);
    background: color-mix(in srgb, var(--primary) 6%, white);
  }

  img, > button > span:first-child {
    width: 38px;
    height: 38px;
    border-radius: 999px;
    object-fit: cover;
  }

  @media (max-width: 700px) {
    display: flex;
    overflow-x: auto;
    padding-bottom: 3px;
    scrollbar-width: none;
    button {
      flex: 0 0 auto;
      min-width: 78px;
      min-height: 74px;
      flex-direction: column;
      font-size: 11px;
      border-radius: 14px;
    }
  }
`;

export const CategoryIcon = styled.span`
  display: inline-block;
  background: #f2f2f3;
`;

export const Section = styled.section`
  margin: 26px 0 34px;

  > header {
    min-height: 38px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 12px;
  }

  h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
  }

  h2::before {
    content: "";
    display: inline-block;
    width: 4px;
    height: 20px;
    margin-right: 8px;
    border-radius: 5px;
    background: var(--primary);
    vertical-align: -3px;
  }

  header button {
    border: 0;
    background: transparent;
    color: var(--primary);
    font-weight: 800;
  }
`;

export const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const ProductCard = styled.button`
  position: relative;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #fff;
  text-align: left;
  color: var(--text);
  box-shadow: 0 8px 24px rgba(25,25,27,.04);

  .image {
    height: 150px;
    overflow: hidden;
    background: #f1f1f2;
  }

  .image img, .image > span {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .copy {
    padding: 12px 44px 13px 12px;
    display: grid;
    gap: 5px;
  }

  .copy b { font-size: 14px; }
  .copy p {
    margin: 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.35;
    min-height: 30px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .copy strong { font-size: 15px; }

  .add {
    position: absolute;
    right: 10px;
    bottom: 12px;
    width: 30px;
    height: 30px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: var(--primary);
    color: #fff;
  }

  @media (max-width: 560px) {
    display: grid;
    grid-template-columns: 105px minmax(0,1fr);
    min-height: 108px;
    .image { height: 100%; min-height: 108px; }
    .copy { padding: 12px 44px 12px 12px; }
    .copy p { min-height: 0; }
  }
`;

export const ImagePlaceholder = styled.span`
  display: block;
  width: 100%;
  height: 100%;
  background:
    linear-gradient(135deg, #f2f2f3, #e8e8eb);
`;

export const LargeImagePlaceholder = styled(ImagePlaceholder)`
  min-height: 440px;
  border-radius: 20px;

  @media (max-width: 720px) { min-height: 220px; }
`;

export const BackButton = styled.button`
  margin: 4px 0 16px;
  padding: 0;
  border: 0;
  background: transparent;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--primary);
  font-weight: 850;
`;

export const CartTitle = styled.div`
  margin: 8px 0 18px;
  h1 {
    margin: 0;
    font-size: clamp(34px, 5vw, 54px);
    font-weight: 950;
  }
  h1 span { color: var(--primary); }
  p { margin: 4px 0 0; color: var(--muted); }
`;

export const CartLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0,1.45fr) minmax(300px,.8fr);
  gap: 18px;
  align-items: start;

  @media (max-width: 820px) { grid-template-columns: 1fr; }
`;

export const CartList = styled.div`
  display: grid;
  gap: 12px;
`;

export const CartItem = styled.article`
  display: grid;
  grid-template-columns: 150px minmax(0,1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 12px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 18px;

  > img, > span:first-child {
    width: 150px;
    height: 110px;
    object-fit: cover;
    border-radius: 14px;
  }

  .content {
    min-width: 0;
    display: grid;
    gap: 6px;
  }

  .content > b { font-size: 17px; }
  .content small { color: var(--muted); line-height: 1.35; }

  .quantity {
    display: inline-flex;
    align-items: center;
    gap: 12px;
  }

  .quantity button {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    border: 0;
    background: color-mix(in srgb, var(--primary) 10%, white);
    color: var(--primary);
    display: grid;
    place-items: center;
  }

  > strong { font-size: 18px; }

  @media (max-width: 560px) {
    grid-template-columns: 96px minmax(0,1fr);
    > img, > span:first-child { width: 96px; height: 96px; }
    > strong { grid-column: 2; justify-self: end; margin-top: -30px; }
    .content > b { font-size: 14px; }
    .content small { font-size: 10px; }
  }
`;

export const CheckoutCard = styled.aside`
  position: sticky;
  top: 112px;
  padding: 18px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 20px;
  display: grid;
  gap: 16px;

  > div:first-child {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  > div:first-child > span {
    display: grid;
    gap: 3px;
  }

  small { color: var(--muted); }

  @media (max-width: 820px) { position: static; }
`;

export const SummaryLine = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
`;

export const SummaryTotal = styled(SummaryLine)`
  align-items: baseline;
  font-size: 17px;
  strong { font-size: 27px; color: var(--primary); }
`;

export const EmptyCart = styled.div`
  min-height: 220px;
  display: grid;
  place-items: center;
  color: var(--muted);
  background: #fff;
  border: 1px dashed #d9d9dd;
  border-radius: 18px;
`;

export const ConfirmationHero = styled.section`
  min-height: 220px;
  padding: 28px;
  display: grid;
  grid-template-columns: auto minmax(0,1fr) minmax(240px,.5fr);
  gap: 22px;
  align-items: center;
  border-radius: 22px;
  background:
    linear-gradient(90deg, rgba(235,255,239,.95), rgba(255,255,255,.9));
  border: 1px solid #dceee0;

  small { color: #17823a; font-weight: 900; letter-spacing: .08em; }
  h1 { margin: 3px 0 8px; font-size: clamp(34px, 4vw, 52px); }
  p { margin: 0; max-width: 620px; line-height: 1.45; }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    text-align: center;
    padding: 22px 16px;
    justify-items: center;
  }
`;

export const StatusIcon = styled.div<{ $success?: boolean }>`
  width: 74px;
  height: 74px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: ${({ $success }) => ($success ? '#1faa4b' : '#fff1ef')};
  color: ${({ $success }) => ($success ? '#fff' : 'var(--primary)')};
  box-shadow: inset 0 0 0 8px rgba(255,255,255,.55);

  svg { width: 36px; height: 36px; }
`;

export const PaymentPending = styled.div`
  padding: 16px;
  border-radius: 16px;
  background: #fff7f5;
  border: 1px solid #ffd5ce;
  color: #cf261f;
  display: flex;
  align-items: flex-start;
  gap: 10px;

  div { display: grid; gap: 3px; }
  span { color: #5f5f66; font-size: 12px; line-height: 1.35; }
`;

export const ConfirmationGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0,1.2fr) minmax(300px,.85fr);
  gap: 18px;
  margin-top: 18px;

  @media (max-width: 820px) { grid-template-columns: 1fr; }
`;

export const OrderSummary = styled.section`
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: #fff;

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  h2 { margin: 0; }

  header button {
    border: 0;
    background: transparent;
    color: var(--primary);
    font-weight: 800;
    display: inline-flex;
    align-items: center;
  }

  article {
    display: grid;
    grid-template-columns: 70px minmax(0,1fr) auto;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid var(--line);
  }

  article img, article > span:first-child {
    width: 70px;
    height: 56px;
    border-radius: 10px;
    object-fit: cover;
  }

  article div { display: grid; gap: 3px; }
  article small { color: var(--muted); }

  footer {
    padding-top: 16px;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    font-size: 18px;
  }
  footer strong { font-size: 26px; }
`;

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
