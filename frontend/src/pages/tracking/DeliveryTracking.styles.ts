import styled from 'styled-components';

export const Page = styled.div`
  --courier-line: #efece6;
  --courier-primary: #e85a2b;
  --tracking-ink: #1f1e1a;
  --tracking-muted: #72706b;
  min-height: 100vh;
  min-height: 100dvh;
  color: var(--tracking-ink);
  background-color: #fdfcf9;
  background-image: none;
  font-family: 'Inter', system-ui, sans-serif;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
`;

export const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 1100;
  border-bottom: 1px solid #eeeeee;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
`;

export const HeaderInner = styled.div`
  width: min(1120px, calc(100% - 48px));
  min-height: 80px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  @media (max-width: 900px) {
    width: 100%;
    min-height: 56px;
    padding: 0 20px;
  }
`;

export const BackButton = styled.button`
  min-height: 36px;
  padding: 0 8px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  color: #34443d;
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;

  svg {
    width: 24px;
    height: 24px;
  }

  &:hover {
    background: #f0f2ef;
  }

  &:focus-visible {
    outline: 3px solid rgba(228, 81, 24, 0.24);
    outline-offset: 2px;
  }

  @media (max-width: 900px) {
    width: auto;
    height: 36px;
    padding: 0;
    justify-content: center;
    color: #72706b;
    font-size: 14px;

    span {
      display: inline;
    }
  }
`;

export const Main = styled.main`
  width: min(1120px, calc(100% - 48px));
  margin: 0 auto;
  padding: 40px 0 64px;

  @media (max-width: 900px) {
    width: 100%;
    padding: 0 0 28px;
  }
`;

export const Warning = styled.p`
  margin: 0 0 16px;
  padding: 12px 14px;
  border: 1px solid #efc18f;
  border-radius: 8px;
  color: #8d3b15;
  background: #fff4e8;
  font-size: 12px;
  line-height: 1.5;
`;

export const CompletionNotice = styled.div`
  margin-bottom: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #a8d7ba;
  border-radius: 8px;
  color: #1f6340;
  background: #edf8f1;

  > svg {
    width: 27px;
    height: 27px;
    flex: 0 0 auto;
  }

  span {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  small {
    color: #47715a;
    line-height: 1.45;
  }
`;

export const CancelledNotice = styled(CompletionNotice)`
  border-color: #eab1b1;
  color: #8d2929;
  background: #fff0f0;

  small {
    color: #9b4949;
  }
`;

export const ReceiptConfirmation = styled.section<{ $highlight: boolean }>`
  margin-bottom: 16px;
  padding: 16px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  border: 1px solid ${({ $highlight }) => ($highlight ? '#62b47d' : '#bfd3c5')};
  border-radius: 10px;
  background: ${({ $highlight }) => ($highlight ? '#f0fbf3' : '#f7faf7')};
  box-shadow: ${({ $highlight }) =>
    $highlight ? '0 10px 30px rgba(47, 156, 91, 0.12)' : 'none'};

  .receipt-icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #fff;
    background: #2f8a50;
  }

  .receipt-icon svg {
    width: 22px;
    height: 22px;
  }

  > div {
    min-width: 0;
    display: grid;
    gap: 7px;
  }

  small {
    color: #3f7252;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
  }

  strong {
    color: #1d3d2b;
    font-size: 17px;
  }

  p {
    margin: 0;
    color: #4d6656;
    font-size: 12px;
    line-height: 1.5;
  }

  button {
    width: fit-content;
    min-height: 44px;
    margin-top: 2px;
    padding: 0 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 8px;
    color: #fff;
    background: #2f8a50;
    font: inherit;
    font-size: 13px;
    font-weight: 900;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    background: #277544;
  }

  button:disabled {
    cursor: wait;
    opacity: 0.68;
  }

  button:focus-visible {
    outline: 3px solid rgba(47, 138, 80, 0.25);
    outline-offset: 2px;
  }

  button svg {
    width: 17px;
    height: 17px;
  }

  em {
    color: #a2372a;
    font-size: 11px;
    font-style: normal;
    line-height: 1.45;
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;

    .receipt-icon {
      width: 38px;
      height: 38px;
    }

    button {
      width: 100%;
    }
  }
`;

export const ReceiptConfirmed = styled(CompletionNotice)`
  border-color: #b9ddc4;
  color: #285e3b;
  background: #f3fbf5;
`;

export const MapArea = styled.section`
  min-width: 0;

  .delivery-map-shell {
    height: min(68vh, 660px);
    min-height: 520px;
    margin-inline: 0;
    border: 1px solid var(--courier-line);
    border-radius: 8px;
  }

  @media (max-width: 900px) {
    .delivery-map-shell {
      width: 100%;
      height: 280px;
      min-height: 280px;
      margin-inline: 0;
      border: 0;
      border-radius: 0;
    }
  }
`;

export const DeliveryStatusList = styled.div`
  display: grid;
  gap: 12px;
`;

export const DeliveryStatusItem = styled.div<{ $active: boolean; $complete: boolean }>`
  display: flex;
  align-items: center;
  gap: 9px;
  color: ${p => p.$active ? '#e8562c' : p.$complete ? '#2f8a50' : '#85817b'};
  font-size: 12px;
  font-weight: ${p => p.$active ? 850 : 650};
  svg { width: 17px; height: 17px; }
`;

export const State = styled.section`
  min-height: min(68vh, 560px);
  padding: 32px 20px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;
  border: 1px solid #d8dcd7;
  border-radius: 8px;
  color: var(--tracking-muted);
  background: rgba(255, 255, 255, 0.84);
  text-align: center;

  > svg {
    width: 38px;
    height: 38px;
    color: #e45118;
  }

  .spinning {
    animation: tracking-spin 1s linear infinite;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h1,
  h2 {
    max-width: 520px;
    color: #273a33;
    font:
      700 24px/1.25 Georgia,
      serif;
  }

  p {
    max-width: 460px;
    font-size: 13px;
    line-height: 1.55;
  }

  @keyframes tracking-spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const MapPlaceholder = styled(State)`
  min-height: 520px;

  @media (max-width: 560px) {
    min-height: 430px;
  }
`;

export const RetryButton = styled.button`
  min-height: 44px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 7px;
  color: #fff;
  background: #e45118;
  font: inherit;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;

  svg {
    width: 17px;
    height: 17px;
  }

  &:hover {
    background: #c94210;
  }

  &:focus-visible {
    outline: 3px solid rgba(228, 81, 24, 0.25);
    outline-offset: 2px;
  }
`;
export const FigmaTrackingLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 660px) minmax(340px, 420px);
  justify-content: center;
  align-items: start;
  gap: 40px;

  @media (max-width: 900px) {
    display: block;
  }
`;

export const TrackingMapColumn = styled.section`
  min-width: 0;
  grid-column: 1;
  grid-row: 1 / span 2;

  @media (max-width: 900px) {
    grid-column: auto;
    grid-row: auto;
  }
`;

export const DesktopTrackingTitle = styled.h1`
  margin: 0 0 16px;
  color: var(--tracking-ink);
  font: 800 28px/1.15 'Gabarito', 'Inter', sans-serif;

  @media (max-width: 900px) {
    display: none;
  }
`;

export const TrackingSideColumn = styled.aside`
  grid-column: 2;
  grid-row: 1;
  display: grid;
  gap: 24px;

  @media (max-width: 900px) {
    display: none;
  }
`;

export const DesktopStatusCard = styled.section`
  padding: 24px;
  display: grid;
  gap: 20px;
  border: 1px solid #efece6;
  border-radius: 20px;
  background: #fff;

  h2 {
    margin: 0;
    color: #1f1e1a;
    font: 800 18px/1.2 'Gabarito', 'Inter', sans-serif;
  }
`;

export const CourierCard = styled.section`
  min-width: 0;
  padding: 16px;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  border: 1px solid #efece6;
  border-radius: 16px;
  background: #fff;

  > span { min-width: 0; display: grid; gap: 2px; }
  strong { overflow: hidden; color: #1f1e1a; font-size: 15px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
  a { color: #268c43; font-size: 12px; font-weight: 700; text-decoration: none; }
  .call { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 20px; color: #e85a2b; background: #fdf2ec; }
  .call svg { width: 20px; height: 20px; }

  @media (max-width: 900px) {
    padding: 20px 0;
    border: 0;
    border-bottom: 1px solid #efece6;
    border-radius: 0;
  }
`;

export const CourierAvatar = styled.span`
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  color: #315d53;
  background: #eef3ef;
  img { width: 100%; height: 100%; object-fit: cover; }
  svg { width: 24px; height: 24px; }
`;

export const MobileTrackingDetails = styled.section`
  display: none;
  @media (max-width: 900px) {
    display: block;
    padding: 0 20px 16px;
    border-top: 1px solid #efece6;
    border-bottom: 1px solid #efece6;
    background: #fff;
  }
`;

export const MobileStatusList = styled.div`
  padding: 0 0 20px;
  display: grid;
  gap: 12px;
`;

export const MobileStatusItem = styled.div<{ $active: boolean; $complete: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  color: ${({ $active, $complete }) => ($active ? '#e85a2b' : $complete ? '#72706b' : '#aaa69f')};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 800 : 500)};
  i {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
    border: 2px solid currentColor;
    border-radius: 50%;
    background: ${({ $complete }) => ($complete ? '#268c43' : '#fff')};
    box-shadow: inset 0 0 0 3px #fff;
  }
`;

export const DesktopRestaurantBrand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-right: auto;
  .brand-mark { width: 40px; height: 40px; display: grid; place-items: center; overflow: hidden; border-radius: 12px; color: #fff; background: #e85a2b; font: 800 20px 'Gabarito', 'Inter', sans-serif; }
  .brand-mark img { width: 100%; height: 100%; object-fit: cover; }
  > span:last-child { display: grid; gap: 2px; }
  strong { color: #1f1e1a; font-size: 18px; font-weight: 800; }
  small { display: flex; align-items: center; gap: 6px; color: #72706b; font-size: 13px; font-weight: 500; }
  small i { width: 8px; height: 8px; border-radius: 50%; background: #268c43; }
  @media (max-width: 900px) { display: none; }
`;

export const MobileHeaderTitle = styled.h1`
  display: none;
  margin: 0;
  color: #1f1e1a;
  font: 800 18px/1 'Gabarito', 'Inter', sans-serif;
  @media (max-width: 900px) { display: block; position: absolute; left: 50%; transform: translateX(-50%); white-space: nowrap; }
`;

export const DesktopHeaderOrder = styled.div`
  color: #1f1e1a;
  font-size: 14px;
  font-weight: 800;
  @media (max-width: 900px) { width: 50px; color: transparent; user-select: none; }
`;

export const TrackingChatSlot = styled.div`
  grid-column: 2;
  grid-row: 2;
  min-width: 0;

  @media (max-width: 900px) {
    padding: 0 20px 16px;
    background: #fff;
  }
`;
