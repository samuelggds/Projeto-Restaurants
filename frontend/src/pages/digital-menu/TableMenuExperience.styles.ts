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
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  margin: 14px 0 22px;

  button {
    min-height: 72px;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: #fff;
    display: grid;
    grid-template-columns: 30% 1fr;
    align-items: stretch;
    text-align: left;
    font-weight: 850;
  }

  button.active {
    border-color: var(--primary);
    color: var(--primary);
    background: color-mix(in srgb, var(--primary) 5%, white);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary) 28%, transparent);
  }

  button > span:last-child {
    min-width: 0;
    padding: 0 14px;
    display: flex;
    align-items: center;
    line-height: 1.2;
  }

  @media (max-width: 700px) {
    display: flex;
    overflow-x: auto;
    padding-bottom: 3px;
    scrollbar-width: none;

    button {
      flex: 0 0 168px;
      min-height: 68px;
      grid-template-columns: 32% 1fr;
      font-size: 12px;
      border-radius: 14px;
    }

    button > span:last-child {
      padding: 0 10px;
    }
  }
`;

export const CategoryMedia = styled.span`
  width: 100%;
  height: 100%;
  min-height: inherit;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--primary) 7%, #f5f5f6);
  color: var(--primary);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    width: 26px;
    height: 26px;
    stroke-width: 1.8;
  }
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
    position: relative;
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


export const DiscountBadge = styled.span`
  position: absolute;
  top: 9px;
  left: 9px;
  z-index: 2;
  max-width: calc(100% - 18px);
  padding: 6px 9px;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 10px;
  line-height: 1;
  font-weight: 950;
  box-shadow: 0 4px 12px rgba(0,0,0,.14);
`;

export const ProductPrice = styled.div`
  display: flex;
  align-items: baseline;
  gap: 7px;
  flex-wrap: wrap;

  del {
    color: #8d8d94;
    font-size: 11px;
    font-weight: 650;
  }

  strong {
    color: var(--text);
    font-size: 15px;
  }
`;


export const HeroArrow = styled.button<{ $side: 'left' | 'right' }>`
  position: absolute;
  z-index: 3;
  top: 50%;
  ${({ $side }) => ($side === 'left' ? 'left: 12px;' : 'right: 12px;')}
  width: 42px;
  height: 42px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.28);
  background: rgba(15,15,18,.34);
  color: #fff;
  display: grid;
  place-items: center;
  transform: translateY(-50%)
    ${({ $side }) => ($side === 'left' ? 'rotate(180deg)' : 'none')};
  backdrop-filter: blur(8px);

  @media (max-width: 700px) {
    width: 34px;
    height: 34px;
    ${({ $side }) => ($side === 'left' ? 'left: 7px;' : 'right: 7px;')}
  }
`;

export const HeroIndicators = styled.div`
  position: absolute;
  z-index: 3;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;

  button {
    width: 34px;
    height: 3px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: rgba(255,255,255,.45);
  }

  button[aria-current='true'] {
    background: #fff;
  }

  @media (max-width: 700px) {
    bottom: 10px;

    button {
      width: 22px;
    }
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


export const HomeHeader = styled.header`
  width: min(520px, 100%);
  margin: 0 auto;
  padding: 10px 12px 8px;
  background: #fff;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 10px;
  align-items: center;
  border-bottom: 1px solid #ececf0;

  ${Brand} {
    gap: 8px;

    > img, > span:first-child {
      width: 36px;
      height: 36px;
      flex-basis: 36px;
      border-radius: 10px;
    }

    b {
      font-size: 14px;
    }

    small {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
  }
`;

export const HomeHeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  button {
    position: relative;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: #fff;
    color: #161616;
    display: grid;
    place-items: center;
  }

  i {
    position: absolute;
    top: -2px;
    right: -2px;
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--primary);
    color: #fff;
    font-style: normal;
    font-size: 9px;
    display: grid;
    place-items: center;
  }
`;

export const HomeSearch = styled.label`
  grid-column: 1 / -1;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 14px;
  background: #f5f5f7;
  display: flex;
  align-items: center;
  gap: 8px;

  input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    font-size: 13px;
  }
`;

export const HomePage = styled.section`
  width: min(520px, 100%);
  margin: 0 auto;
  padding: 10px 10px 36px;
  background: #fff;

  ${Hero} {
    min-height: 210px;
    margin-bottom: 10px;
    border-radius: 14px;

    > div {
      width: 68%;
      padding: 22px 18px;
    }

    h1 {
      max-width: 230px;
      font-size: 28px;
      line-height: .98;
    }

    p {
      max-width: 240px;
      font-size: 10px;
      margin-bottom: 12px;
    }

    small {
      font-size: 8px;
    }

    ${PrimaryButton} {
      min-height: 38px;
      padding: 0 13px;
      border-radius: 9px;
      font-size: 11px;
    }
  }

  ${CategoryStrip} {
    display: flex;
    gap: 8px;
    margin: 8px 0 18px;
    overflow-x: auto;
    scrollbar-width: none;

    button {
      flex: 0 0 74px;
      min-width: 74px;
      min-height: 82px;
      grid-template-columns: 1fr;
      grid-template-rows: 52px auto;
      border: 0;
      border-radius: 10px;
      background: #f8f8f9;
      text-align: center;
      box-shadow: none;
    }

    button.active {
      border: 1px solid var(--primary);
      background: #fff;
      box-shadow: none;
    }

    button > span:last-child {
      justify-content: center;
      padding: 4px 3px 7px;
      font-size: 9px;
      font-weight: 850;
    }

    ${CategoryMedia} {
      min-height: 52px;
      border-radius: 10px 10px 0 0;
      background: #f4f4f5;

      img {
        object-fit: cover;
      }

      svg {
        width: 22px;
        height: 22px;
      }
    }
  }

  @media (min-width: 760px) {
    width: min(1180px, calc(100% - 32px));
    padding: 18px 0 56px;

    ${Hero} {
      min-height: 300px;

      > div {
        width: min(520px, 70%);
        padding: 44px 46px;
      }

      h1 {
        max-width: 500px;
        font-size: clamp(36px, 5vw, 64px);
      }

      p {
        max-width: 430px;
        font-size: 14px;
      }

      small {
        font-size: 11px;
      }
    }

    ${CategoryStrip} {
      gap: 10px;

      button {
        flex-basis: 96px;
        min-width: 96px;
        min-height: 98px;
        grid-template-rows: 64px auto;
      }

      ${CategoryMedia} {
        min-height: 64px;
      }
    }
  }
`;

export const HomeInfoRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 10px 0 16px;

  article {
    min-width: 0;
    padding: 8px 10px;
    border: 1px solid #eeeef1;
    border-radius: 10px;
    background: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  svg {
    flex: 0 0 auto;
    color: var(--primary);
  }

  span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  b {
    font-size: 9px;
  }

  small {
    color: var(--muted);
    font-size: 7px;
    line-height: 1.25;
  }
`;

export const HomeSectionHeader = styled.header`
  min-height: 28px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 950;
  }

  button {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--primary);
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 9px;
    font-weight: 850;
  }

  @media (min-width: 760px) {
    h2 { font-size: 20px; }
    button { font-size: 12px; }
  }
`;

export const HomeProductSection = styled.section`
  margin: 0 0 18px;
`;

export const HomeProductRail = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(112px, 1fr);
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;

  @media (min-width: 760px) {
    grid-auto-flow: initial;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    overflow: visible;
  }
`;

export const HomeProductTile = styled.button`
  position: relative;
  min-width: 0;
  padding: 0 0 8px;
  overflow: hidden;
  border: 1px solid #ededf0;
  border-radius: 11px;
  background: #fff;
  color: var(--text);
  text-align: left;

  .image {
    position: relative;
    height: 95px;
    overflow: hidden;
    background: #f3f3f4;
  }

  .image img,
  .image > span {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  > b {
    display: block;
    padding: 7px 8px 2px;
    font-size: 10px;
    line-height: 1.2;
  }

  ${ProductPrice} {
    padding: 0 8px;

    del {
      font-size: 8px;
    }

    strong {
      font-size: 10px;
    }
  }

  .add {
    position: absolute;
    right: 6px;
    bottom: 6px;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    background: var(--primary);
    color: #fff;
    display: grid;
    place-items: center;
  }

  @media (min-width: 760px) {
    .image {
      height: 150px;
    }

    > b {
      font-size: 14px;
    }

    ${ProductPrice} strong {
      font-size: 14px;
    }
  }
`;

export const HomeBottomBanner = styled.article`
  position: relative;
  min-height: 72px;
  margin-top: 18px;
  overflow: hidden;
  border-radius: 12px;
  background: #191919;
  color: #fff;

  > img {
    position: absolute;
    inset: 0 0 0 auto;
    width: 52%;
    height: 100%;
    object-fit: cover;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(15,15,15,.96) 0 54%, rgba(15,15,15,.18) 100%);
  }

  > div {
    position: relative;
    z-index: 1;
    width: 58%;
    min-height: 72px;
    padding: 12px;
    display: grid;
    align-content: center;
    gap: 2px;
  }

  b {
    font-size: 11px;
    line-height: 1.15;
  }

  small {
    color: rgba(255,255,255,.76);
    font-size: 7px;
    line-height: 1.25;
  }

  @media (min-width: 760px) {
    min-height: 110px;

    > div {
      min-height: 110px;
      padding: 20px;
    }

    b {
      font-size: 18px;
    }

    small {
      font-size: 11px;
    }
  }
`;


export const CategoryListing = styled.section`
  width: min(520px, 100%);
  margin: 0 auto;
  padding: 4px 0 24px;

  @media (min-width: 760px) {
    width: min(760px, 100%);
  }
`;

export const CategoryListingHeader = styled.header`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;

  > button {
    width: 34px;
    height: 34px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: #fff;
    color: #171717;
    display: grid;
    place-items: center;
  }
`;

export const CategoryListingTitle = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 10px;
  align-items: center;

  h1 {
    margin: 0;
    font-size: 18px;
    line-height: 1.05;
    font-weight: 950;
  }

  p {
    margin: 3px 0 0;
    color: var(--muted);
    font-size: 9px;
  }

  @media (min-width: 760px) {
    grid-template-columns: 64px minmax(0, 1fr);

    h1 { font-size: 22px; }
    p { font-size: 11px; }
  }
`;

export const CategoryListingMedia = styled.div`
  width: 54px;
  height: 54px;
  overflow: hidden;
  border-radius: 999px;
  background: #f4f4f5;
  display: grid;
  place-items: center;
  color: var(--primary);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    width: 22px;
    height: 22px;
  }

  @media (min-width: 760px) {
    width: 64px;
    height: 64px;
  }
`;

export const CategoryTabs = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 2px 0 10px;
  margin-bottom: 4px;
  scrollbar-width: none;

  button {
    flex: 0 0 auto;
    min-height: 30px;
    padding: 0 11px;
    border: 0;
    border-radius: 8px;
    background: #f4f4f5;
    color: #4d4d53;
    font-size: 9px;
    font-weight: 800;
  }

  button.active {
    background: var(--primary);
    color: #fff;
  }

  @media (min-width: 760px) {
    button {
      min-height: 34px;
      padding: 0 14px;
      font-size: 11px;
    }
  }
`;

export const CategoryProductList = styled.div`
  display: grid;
  gap: 8px;
`;

export const CategoryProductRow = styled.article`
  position: relative;
  min-height: 92px;
  padding: 0;
  border: 1px solid #ececf0;
  border-radius: 11px;
  background: #fff;
  overflow: hidden;

  .main {
    width: 100%;
    min-height: 92px;
    padding: 7px 44px 7px 7px;
    border: 0;
    background: transparent;
    color: var(--text);
    text-align: left;
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
  }

  .image {
    position: relative;
    width: 76px;
    height: 76px;
    overflow: hidden;
    border-radius: 9px;
    background: #f3f3f4;
  }

  .image img,
  .image > span {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .content {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .content > b {
    font-size: 11px;
    line-height: 1.15;
  }

  .content > p {
    margin: 0;
    color: var(--muted);
    font-size: 8px;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .add {
    position: absolute;
    right: 8px;
    bottom: 10px;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: var(--primary);
    color: #fff;
    display: grid;
    place-items: center;
  }

  ${ProductPrice} {
    gap: 5px;

    del { font-size: 8px; }
    strong { font-size: 10px; }
  }

  @media (min-width: 760px) {
    min-height: 112px;

    .main {
      min-height: 112px;
      grid-template-columns: 96px minmax(0, 1fr);
      padding: 8px 52px 8px 8px;
    }

    .image {
      width: 96px;
      height: 96px;
    }

    .content > b { font-size: 14px; }
    .content > p { font-size: 11px; }
    ${ProductPrice} strong { font-size: 13px; }

    .add {
      width: 30px;
      height: 30px;
      right: 10px;
      bottom: 12px;
    }
  }
`;


export const TrackingReferenceHeader = styled.header`
  width: min(520px, 100%);
  margin: 0 auto;
  min-height: 58px;
  padding: 9px 10px;
  background: #fff;
  border-bottom: 1px solid #ececf0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;

  > button,
  .actions button {
    position: relative;
    width: 34px;
    height: 34px;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: #fff;
    display: grid;
    place-items: center;
    color: #171717;
  }

  .actions i {
    position: absolute;
    top: -2px;
    right: -2px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--primary);
    color: #fff;
    font-style: normal;
    font-size: 8px;
    display: grid;
    place-items: center;
  }

  ${CartReferenceBrand} {
    justify-self: start;

    img,
    > span:first-child {
      width: 30px;
      height: 30px;
      border-radius: 999px;
    }

    b {
      font-size: 12px;
    }
  }

  @media (min-width: 760px) {
    width: min(900px, calc(100% - 32px));
  }
`;

export const TrackingReferencePage = styled.section`
  width: min(520px, 100%);
  margin: 0 auto;
  padding: 18px 12px 36px;
  background: #fff;
  display: grid;
  gap: 18px;

  @media (min-width: 760px) {
    width: min(900px, calc(100% - 32px));
    padding: 26px 0 56px;
  }
`;

export const TrackingReferenceTitle = styled.header`
  display: grid;
  gap: 4px;

  h1 {
    margin: 0;
    font-size: 20px;
    line-height: 1.05;
    font-weight: 950;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 10px;
  }

  @media (min-width: 760px) {
    h1 { font-size: 30px; }
    p { font-size: 13px; }
  }
`;

export const TrackingReferenceProgress = styled.div`
  display: grid;
  gap: 0;
`;

export const TrackingReferenceStep = styled.div<{ $active: boolean }>`
  position: relative;
  min-height: 54px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 10px;
  align-items: start;

  &:not(:last-child)::after {
    content: "";
    position: absolute;
    left: 13px;
    top: 28px;
    width: 2px;
    height: 27px;
    background: ${({ $active }) => ($active ? 'var(--primary)' : '#e4e4e7')};
  }

  > span {
    position: relative;
    z-index: 1;
    width: 28px;
    height: 28px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: ${({ $active }) => ($active ? 'var(--primary)' : '#fff')};
    border: 2px solid ${({ $active }) => ($active ? 'var(--primary)' : '#dedee3')};
    color: ${({ $active }) => ($active ? '#fff' : '#9a9aa1')};
    font-size: 10px;
    font-weight: 900;
  }

  > div {
    padding-top: 4px;
    display: grid;
    gap: 3px;
  }

  b {
    font-size: 11px;
    color: ${({ $active }) => ($active ? '#171717' : '#8e8e95')};
  }

  small {
    max-width: 280px;
    color: var(--muted);
    font-size: 8px;
    line-height: 1.35;
  }

  @media (min-width: 760px) {
    grid-template-columns: 34px minmax(0, 1fr);
    min-height: 62px;

    > span {
      width: 32px;
      height: 32px;
    }

    &:not(:last-child)::after {
      left: 15px;
      top: 32px;
      height: 31px;
    }

    b {
      font-size: 13px;
      padding-top: 7px;
    }
  }
`;

export const TrackingReferenceStatus = styled.section`
  padding: 14px;
  border: 1px solid #eeeeef;
  border-radius: 14px;
  background: #fff;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;

  .icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #fff2ef;
    color: var(--primary);
    display: grid;
    place-items: center;
  }

  h2 {
    margin: 0 0 3px;
    font-size: 15px;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 9px;
    line-height: 1.35;
  }

  @media (min-width: 760px) {
    padding: 18px;

    .icon {
      width: 52px;
      height: 52px;
    }

    h2 { font-size: 19px; }
    p { font-size: 12px; }
  }
`;

export const TrackingReferenceItems = styled.section`
  padding: 14px;
  border: 1px solid #eeeeef;
  border-radius: 14px;
  background: #fff;

  h2 {
    margin: 0 0 8px;
    font-size: 13px;
  }

  article {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 0;
    border-top: 1px solid #f0f0f2;
  }

  article div {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  article b {
    font-size: 10px;
  }

  article small {
    color: var(--muted);
    font-size: 8px;
  }

  article strong {
    font-size: 10px;
  }

  @media (min-width: 760px) {
    h2 { font-size: 17px; }
    article b, article strong { font-size: 13px; }
    article small { font-size: 10px; }
  }
`;

export const TrackingReferenceWaiter = styled.section`
  padding: 14px;
  border: 1px solid #eeeeef;
  border-radius: 14px;
  background: #fff;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  color: var(--primary);

  > div {
    display: grid;
    gap: 4px;
  }

  h3 {
    margin: 0;
    color: #171717;
    font-size: 13px;
  }

  p {
    margin: 0 0 6px;
    color: var(--muted);
    font-size: 9px;
    line-height: 1.35;
  }

  button {
    justify-self: start;
    min-height: 34px;
    padding: 0 13px;
    border: 0;
    border-radius: 9px;
    background: var(--primary);
    color: #fff;
    font-size: 10px;
    font-weight: 850;
  }

  @media (min-width: 760px) {
    padding: 18px;

    h3 { font-size: 17px; }
    p { font-size: 12px; }
    button {
      min-height: 40px;
      font-size: 12px;
    }
  }
`;


export const ProductPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: transparent;
  color: #b8b8be;

  svg {
    width: 32px;
    height: 32px;
    stroke-width: 1.5;
  }
`;

export const CompleteProductPlaceholder = styled(ProductPlaceholder)`
  min-height: 300px;
  background: #f6f6f7;

  svg {
    width: 54px;
    height: 54px;
  }
`;

export const CartReferenceHeader = styled.header`
  width: min(520px, 100%);
  min-height: 58px;
  margin: 0 auto;
  padding: 9px 10px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  background: #fff;
  border-bottom: 1px solid #ececf0;

  > button,
  .actions button {
    position: relative;
    width: 34px;
    height: 34px;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: #171717;
    display: grid;
    place-items: center;
  }

  .actions {
    display: inline-flex;
    gap: 4px;
  }

  .actions i {
    position: absolute;
    right: -2px;
    top: -2px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--primary);
    color: #fff;
    font-style: normal;
    font-size: 8px;
    display: grid;
    place-items: center;
  }

  @media (min-width: 760px) {
    width: min(760px, calc(100% - 32px));
  }
`;

export const CartReferenceBrand = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;

  img,
  > span:first-child {
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    border-radius: 999px;
    object-fit: cover;
  }

  b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 900;
  }
`;

export const CartReferencePage = styled.section`
  width: min(520px, 100%);
  margin: 0 auto;
  padding: 18px 12px 36px;
  background: #fff;

  > h1 {
    margin: 0 0 14px;
    font-size: 22px;
    line-height: 1;
    font-weight: 950;
  }

  @media (min-width: 760px) {
    width: min(760px, calc(100% - 32px));
    padding: 28px 0 60px;

    > h1 {
      font-size: 32px;
      margin-bottom: 20px;
    }
  }
`;

export const CartReferenceList = styled.div`
  display: grid;
  gap: 8px;
`;

export const CartReferenceItem = styled.article`
  position: relative;
  min-height: 94px;
  padding: 7px;
  border: 1px solid #ececf0;
  border-radius: 12px;
  background: #fff;
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr);
  gap: 10px;

  > img,
  > span:first-child,
  > div:first-child {
    width: 78px;
    height: 78px;
    border-radius: 9px;
    object-fit: cover;
  }

  .info {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .title-row > b {
    font-size: 11px;
    line-height: 1.25;
  }

  .title-row > button,
  .remove-secondary {
    border: 0;
    background: transparent;
    color: #8a8a91;
    padding: 0;
  }

  .info > small {
    color: var(--muted);
    font-size: 8px;
    line-height: 1.3;
  }

  .item-footer {
    margin-top: auto;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 9px;
  }

  .item-footer > strong {
    justify-self: end;
    font-size: 11px;
  }

  @media (min-width: 760px) {
    min-height: 112px;
    grid-template-columns: 96px minmax(0, 1fr);
    padding: 8px;

    > img,
    > span:first-child,
    > div:first-child {
      width: 96px;
      height: 96px;
    }

    .title-row > b { font-size: 14px; }
    .info > small { font-size: 10px; }
    .item-footer > strong { font-size: 14px; }
  }
`;

export const CartReferenceQuantity = styled.div`
  display: inline-grid;
  grid-template-columns: 26px 24px 26px;
  align-items: center;
  text-align: center;
  border: 1px solid #e3e3e7;
  border-radius: 8px;
  overflow: hidden;

  button {
    width: 26px;
    height: 26px;
    padding: 0;
    border: 0;
    background: #fff;
    color: var(--primary);
    display: grid;
    place-items: center;
  }

  span {
    font-size: 10px;
    font-weight: 850;
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

export const CartReferenceSummary = styled.section`
  padding: 14px 0 10px;
  border-top: 1px solid #ececf0;
  display: grid;
  gap: 8px;

  > div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: #5f5f66;
    font-size: 11px;
  }

  > div b {
    color: #222;
  }

  .total {
    padding-top: 8px;
    border-top: 1px solid #f0f0f2;
    color: #171717;
    font-size: 14px;
  }

  .total b {
    color: var(--primary);
    font-size: 18px;
  }
`;

export const CartReferenceSubmit = styled.button`
  width: 100%;
  min-height: 48px;
  margin-top: 8px;
  border: 0;
  border-radius: 12px;
  background: var(--primary);
  color: #fff;
  font-size: 12px;
  font-weight: 900;

  &:disabled {
    opacity: .55;
    cursor: not-allowed;
  }
`;

export const ConfirmationReferenceHeader = styled(CartReferenceHeader)`
  grid-template-columns: minmax(0, 1fr) auto;

  .actions {
    justify-self: end;
  }
`;

export const ConfirmationReferencePage = styled.section`
  width: min(520px, 100%);
  margin: 0 auto;
  padding: 24px 12px 42px;
  background: #fff;
  display: grid;
  gap: 14px;

  @media (min-width: 760px) {
    width: min(760px, calc(100% - 32px));
    padding: 34px 0 64px;
  }
`;

export const ConfirmationReferenceHero = styled.section`
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 7px;
  padding: 10px 12px 4px;

  h1 {
    margin: 3px 0 0;
    font-size: 24px;
    line-height: 1;
    font-weight: 950;
  }

  > strong {
    font-size: 11px;
    color: #5f5f66;
  }

  > p {
    max-width: 390px;
    margin: 0;
    color: var(--muted);
    font-size: 10px;
    line-height: 1.45;
  }

  @media (min-width: 760px) {
    h1 { font-size: 32px; }
    > strong { font-size: 13px; }
    > p { font-size: 12px; }
  }
`;

export const ConfirmationCheck = styled.div`
  width: 58px;
  height: 58px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #23ad50;
  color: #fff;
  box-shadow: 0 0 0 7px #eaf8ee;
`;

export const ConfirmationPending = styled.div`
  margin-top: 6px;
  padding: 7px 10px;
  border-radius: 999px;
  background: #fff4e8;
  color: #a9630e;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  font-weight: 850;
`;

export const ConfirmationReferenceSummary = styled.section`
  padding: 14px;
  border: 1px solid #ececf0;
  border-radius: 12px;
  background: #fff;

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 4px;
  }

  h2 {
    margin: 0;
    font-size: 13px;
  }

  header button {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--primary);
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 9px;
    font-weight: 850;
  }

  article {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr) auto;
    gap: 9px;
    align-items: center;
    padding: 9px 0;
    border-bottom: 1px solid #f0f0f2;
  }

  article img,
  article > span:first-child,
  article > div:first-child {
    width: 52px;
    height: 46px;
    border-radius: 8px;
    object-fit: cover;
  }

  article div {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  article b,
  article strong {
    font-size: 10px;
  }

  article small {
    color: var(--muted);
    font-size: 8px;
  }

  footer {
    padding-top: 12px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    font-size: 12px;
  }

  footer strong {
    color: var(--primary);
    font-size: 18px;
  }

  @media (min-width: 760px) {
    padding: 18px;

    h2 { font-size: 16px; }
    article { grid-template-columns: 62px minmax(0, 1fr) auto; }
    article img,
    article > span:first-child,
    article > div:first-child {
      width: 62px;
      height: 54px;
    }
    article b,
    article strong { font-size: 12px; }
    article small { font-size: 10px; }
  }
`;

export const ConfirmationReferencePay = styled.section`
  padding: 14px;
  border: 1px solid #ececf0;
  border-radius: 12px;
  background: #fff;
  display: grid;
  gap: 9px;

  .title {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    gap: 9px;
    color: var(--primary);
  }

  .title > span {
    display: grid;
    gap: 3px;
  }

  .title b {
    color: #171717;
    font-size: 12px;
  }

  .title small {
    color: var(--muted);
    font-size: 9px;
    line-height: 1.4;
  }

  .or {
    text-align: center;
    color: #9a9aa1;
    font-size: 9px;
  }
`;

export const ConfirmationPixButton = styled.button`
  min-height: 44px;
  border: 0;
  border-radius: 10px;
  padding: 0 13px;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 11px;
  font-weight: 900;

  &:disabled { opacity: .55; }
`;

export const ConfirmationLaterButton = styled.button`
  min-height: 42px;
  border: 1px solid #dedee3;
  border-radius: 10px;
  padding: 0 13px;
  background: #fff;
  color: #25252b;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 11px;
  font-weight: 850;
`;

export const ConfirmationTrackButton = styled(ConfirmationLaterButton)`
  border-color: transparent;
  background: #f7f7f8;
`;

export const PixReferenceHeader = styled(CartReferenceHeader)`
  grid-template-columns: auto minmax(0, 1fr) auto;
`;

export const PixReferencePage = styled.section`
  width: min(520px, 100%);
  margin: 0 auto;
  padding: 26px 16px 40px;
  background: #fff;
  display: grid;
  justify-items: center;
  gap: 11px;
  text-align: center;

  > h1 {
    margin: 0;
    font-size: 24px;
    line-height: 1;
    font-weight: 950;
  }

  > p {
    max-width: 340px;
    margin: 0 0 4px;
    color: var(--muted);
    font-size: 10px;
    line-height: 1.45;
  }

  @media (min-width: 760px) {
    width: min(640px, calc(100% - 32px));
    padding: 38px 0 60px;

    > h1 { font-size: 32px; }
    > p { font-size: 12px; }
  }
`;

export const PixReferenceMark = styled.div`
  width: 44px;
  height: 44px;
  position: relative;
  margin-bottom: 2px;
  transform: rotate(45deg);

  i {
    position: absolute;
    width: 19px;
    height: 19px;
    border-radius: 6px;
    background: #20c7b7;
  }

  i:nth-child(1) { left: 0; top: 12px; }
  i:nth-child(2) { right: 0; top: 12px; }
  i:nth-child(3) { left: 12px; top: 0; }
  i:nth-child(4) { left: 12px; bottom: 0; }
`;

export const PixReferenceQr = styled.div`
  width: 232px;
  height: 232px;
  padding: 10px;
  border: 1px solid #e4e4e8;
  border-radius: 12px;
  background: #fff;
  display: grid;
  place-items: center;

  svg {
    width: 210px;
    height: 210px;
  }

  @media (max-width: 360px) {
    width: 210px;
    height: 210px;
    svg {
      width: 190px;
      height: 190px;
    }
  }
`;

export const PixReferenceCopy = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: stretch;
  border: 1px solid #e4e4e8;
  border-radius: 10px;
  overflow: hidden;
  background: #fafafa;
  text-align: left;

  > div {
    min-width: 0;
    padding: 10px 11px;
    display: grid;
    gap: 4px;
  }

  small {
    color: #65656c;
    font-size: 8px;
  }

  code {
    max-height: 44px;
    overflow: hidden;
    word-break: break-all;
    color: #4d4d54;
    font-family: inherit;
    font-size: 8px;
    line-height: 1.35;
  }

  button {
    min-width: 62px;
    border: 0;
    border-left: 1px solid #e4e4e8;
    background: #fff;
    color: var(--primary);
    display: grid;
    place-items: center;
    align-content: center;
    gap: 3px;
    font-size: 8px;
    font-weight: 850;
  }
`;

export const PixReferenceWaiting = styled.div`
  width: 100%;
  padding: 11px 12px;
  border-radius: 10px;
  background: #fff2ef;
  color: var(--primary);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  text-align: left;

  > div {
    display: grid;
    gap: 2px;
  }

  b {
    font-size: 9px;
  }

  span {
    color: #66666c;
    font-size: 8px;
  }

  > strong {
    padding: 5px 7px;
    border-radius: 8px;
    background: #ffdcd8;
    font-size: 10px;
  }
`;

export const PixReferenceBack = styled.button`
  width: 100%;
  min-height: 42px;
  margin-top: 2px;
  border: 1px solid var(--primary);
  border-radius: 10px;
  background: #fff;
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 10px;
  font-weight: 850;
`;

export const CompleteProductDetail = styled.section`
  width: min(520px, 100%);
  min-height: 100%;
  margin: 0 auto;
  background: #fff;
  display: grid;
  grid-template-rows: auto 1fr;

  .media {
    position: relative;
    min-height: 300px;
    background: #f3f3f4;
    overflow: hidden;
  }

  .media > img {
    width: 100%;
    height: 300px;
    object-fit: cover;
    display: block;
  }

  .back,
  .favorite {
    position: absolute;
    top: 14px;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: rgba(255,255,255,.94);
    color: #161616;
    box-shadow: 0 3px 10px rgba(0,0,0,.12);
  }

  .back {
    left: 14px;
    border: 0;
  }

  .favorite {
    right: 14px;
  }

  ${DiscountBadge} {
    top: auto;
    left: 14px;
    bottom: 14px;
  }

  .content {
    padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
    display: grid;
    align-content: start;
    gap: 11px;
  }

  .title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    line-height: 1.05;
    font-weight: 950;
  }

  .rating {
    flex: 0 0 auto;
    padding-top: 3px;
    color: #e1a300;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 850;
  }

  .price strong {
    color: var(--primary);
    font-size: 20px;
  }

  .description {
    margin: 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
  }

  .observation {
    margin-top: 4px;
    display: grid;
    gap: 6px;
  }

  .observation > span {
    font-size: 11px;
    font-weight: 850;
  }

  .observation textarea {
    width: 100%;
    min-height: 74px;
    resize: vertical;
    padding: 10px 11px;
    border: 1px solid #dedee3;
    border-radius: 10px;
    outline: 0;
    font: inherit;
    font-size: 10px;
    line-height: 1.45;
  }

  .observation textarea:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 10%, transparent);
  }

  .observation small {
    justify-self: end;
    color: #99999f;
    font-size: 8px;
  }

  .bottom-action {
    position: sticky;
    bottom: 0;
    margin: 8px -16px -18px;
    padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
    border-top: 1px solid #eeeeef;
    background: rgba(255,255,255,.97);
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 10px;
    align-items: center;
  }

  @media (min-width: 760px) {
    width: min(980px, calc(100% - 36px));
    min-height: 600px;
    border-radius: 18px;
    overflow: hidden;
    grid-template-columns: minmax(0, 1.05fr) minmax(340px, .95fr);
    grid-template-rows: 1fr;

    .media {
      min-height: 600px;
    }

    .media > img {
      height: 100%;
      min-height: 600px;
    }

    .content {
      padding: 34px 30px;
      align-content: center;
      gap: 16px;
    }

    h1 { font-size: 36px; }
    .description { font-size: 13px; }

    .bottom-action {
      position: static;
      margin: 14px 0 0;
      padding: 0;
      border: 0;
      background: transparent;
    }
  }
`;

export const CompleteProductQuantity = styled.div`
  display: grid;
  grid-template-columns: 34px 28px 34px;
  align-items: center;
  border: 1px solid #dedee3;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;

  button {
    width: 34px;
    height: 42px;
    border: 0;
    background: #fff;
    color: var(--primary);
    display: grid;
    place-items: center;
  }

  button:disabled {
    color: #c9c9ce;
  }

  strong {
    text-align: center;
    font-size: 11px;
  }
`;

export const CompleteProductAdd = styled.button`
  min-height: 44px;
  border: 0;
  border-radius: 10px;
  padding: 0 14px;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  font-weight: 900;

  strong {
    color: inherit;
    font-size: 11px;
  }
`;


export const HomeTableBadge = styled.span`
  min-height: 30px;
  padding: 0 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 8%, #fff);
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 900;

  svg {
    width: 14px;
    height: 14px;
  }

  @media (min-width: 760px) {
    min-height: 34px;
    padding-inline: 10px;
    font-size: 11px;
  }
`;


export const TrackingTableCard = styled.section`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #eeeeef;
  border-radius: 12px;
  background: #fff;
  display: grid;
  justify-items: start;
  gap: 2px;

  small {
    color: var(--muted);
    font-size: 8px;
    font-weight: 700;
  }

  strong {
    font-size: 17px;
    line-height: 1;
  }

  @media (min-width: 760px) {
    small { font-size: 10px; }
    strong { font-size: 22px; }
  }
`;

export const TrackingCurrentStatus = styled.section`
  padding: 18px 14px 10px;
  display: grid;
  justify-items: center;
  gap: 6px;
  text-align: center;

  .status-icon {
    width: 76px;
    height: 76px;
    margin-bottom: 2px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--primary) 8%, #fff);
    color: var(--primary);
    display: grid;
    place-items: center;
  }

  h2 {
    margin: 0;
    font-size: 18px;
    line-height: 1.05;
    font-weight: 950;
  }

  p {
    max-width: 360px;
    margin: 0;
    color: var(--muted);
    font-size: 9px;
    line-height: 1.45;
  }

  @media (min-width: 760px) {
    .status-icon {
      width: 92px;
      height: 92px;
    }

    h2 { font-size: 24px; }
    p { font-size: 12px; }
  }
`;
