import styled from 'styled-components';

export const Panel = styled.section`
  min-width: 0;
  padding: 15px;
  border: 1px solid #e6dbd2;
  border-radius: 16px;
  background:
    radial-gradient(
      circle at 96% 0%,
      color-mix(in srgb, var(--home-primary) 12%, transparent),
      transparent 35%
    ),
    #fff;
`;

export const Heading = styled.header`
  display: flex;
  align-items: center;
  gap: 10px;

  > i {
    width: 36px;
    height: 36px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 11px;
    color: var(--home-primary);
    background: color-mix(in srgb, var(--home-primary) 11%, #fff);
  }
  svg {
    width: 18px;
  }
  > div {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  strong {
    color: #211c18;
    font-size: 13px;
  }
  small {
    color: #81766e;
    font-size: 10px;
    line-height: 1.3;
  }
`;

export const Empty = styled.div`
  min-height: 45px;
  margin-top: 11px;
  padding: 10px 11px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 11px;
  color: #756a62;
  background: #faf7f4;
  font-size: 11px;
  line-height: 1.35;

  > svg {
    width: 16px;
    flex: 0 0 auto;
    color: var(--home-primary);
  }
  > span {
    flex: 1;
  }
  button {
    flex: 0 0 auto;
    min-height: 32px;
    padding: 0 11px;
    border: 0;
    border-radius: 9px;
    color: #fff;
    background: var(--home-primary);
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }
`;

export const CouponList = styled.div`
  margin-top: 11px;
  display: grid;
  gap: 8px;

  > button {
    width: 100%;
    min-width: 0;
    padding: 10px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 9px;
    border: 1px solid #eadfd7;
    border-radius: 12px;
    color: #28221e;
    background: #fff;
    text-align: left;
    cursor: pointer;
  }
  > button.selected {
    border-color: var(--home-primary);
    background: color-mix(in srgb, var(--home-primary) 6%, #fff);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--home-primary) 20%, transparent);
  }
  .coupon-icon {
    width: 31px;
    height: 31px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    color: var(--home-primary);
    background: color-mix(in srgb, var(--home-primary) 10%, #fff);
  }
  svg {
    width: 15px;
  }
  button > span:nth-child(2) {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  b {
    overflow: hidden;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    color: #7e736b;
    font-size: 9px;
  }
  em {
    color: var(--home-primary);
    font-size: 10px;
    font-style: normal;
    font-weight: 900;
  }
`;

export const Earned = styled(Empty)`
  border: 1px solid color-mix(in srgb, var(--home-primary) 20%, #eadfd7);
  background: color-mix(in srgb, var(--home-primary) 6%, #fff);
  > div {
    min-width: 0;
    flex: 1;
    display: grid;
    gap: 2px;
  }
  b {
    color: #2a231f;
    font-size: 11px;
  }
  small {
    font-size: 9px;
  }
  button:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;
