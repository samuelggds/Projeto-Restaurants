import styled from 'styled-components';

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
