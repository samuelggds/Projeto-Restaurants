import styled from 'styled-components';

export const MapShell = styled.section`
  position: relative;
  height: min(68vh, 660px);
  min-height: 440px;
  overflow: hidden;
  border: 1px solid var(--courier-line);
  border-radius: 8px;
  background: #e5e9e5;

  .delivery-map {
    width: 100%;
    height: 100%;
  }

  .leaflet-tile-pane {
    filter: grayscale(0.72) sepia(0.1) brightness(1.07) contrast(0.86) opacity(0.9);
  }

  .leaflet-control-attribution {
    color: #64716b;
    background: rgba(255, 255, 255, 0.8);
    font-size: 8px;
  }

  .delivery-courier-marker,
  .delivery-destination-marker {
    border: 0;
    background: transparent;
  }

  .delivery-courier-marker__pin {
    position: relative;
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    border: 4px solid #fff;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 8px 24px rgba(15, 23, 20, 0.26);
  }

  .delivery-courier-marker__pin::after {
    position: absolute;
    inset: 6px;
    z-index: 0;
    border-radius: 50%;
    background: var(--courier-primary);
    content: '';
  }

  .delivery-courier-marker__pin svg {
    position: relative;
    z-index: 1;
    width: 30px;
    height: 30px;
    fill: none;
    stroke: #fff;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.9;
  }

  .delivery-destination-marker__pin {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    border: 4px solid #fff;
    border-radius: 50% 50% 50% 7px;
    color: #fff;
    background: #1d2823;
    box-shadow: 0 8px 22px rgba(15, 23, 20, 0.26);
    transform: rotate(-45deg);
  }

  .delivery-destination-marker__pin span {
    width: 13px;
    height: 13px;
    border: 3px solid #d8f06a;
    border-radius: 50%;
  }

  @media (max-width: 560px) {
    height: calc(100dvh - 248px);
    min-height: 470px;
    margin-inline: -10px;
    border-right: 0;
    border-left: 0;
    border-radius: 0;
  }
`;

export const RecenterControl = styled.button`
  position: absolute;
  right: 14px;
  bottom: 112px;
  z-index: 1000;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(24, 32, 29, 0.16);
  border-radius: 7px;
  color: #1d2823;
  background: #fff;
  box-shadow: 0 6px 20px rgba(15, 23, 20, 0.18);

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--courier-primary) 24%, transparent);
    outline-offset: 2px;
  }
`;

export const MapStatus = styled.div`
  position: absolute;
  right: 14px;
  bottom: 14px;
  left: 14px;
  z-index: 1000;
  min-height: 78px;
  padding: 13px 15px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 8px;
  color: #fff;
  background: rgba(24, 32, 29, 0.94);
  box-shadow: 0 10px 26px rgba(15, 23, 20, 0.24);
  backdrop-filter: blur(9px);

  & > span:first-child {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 7px;
    color: #1d2823;
    background: #d8f06a;
  }

  & > span:nth-child(2) {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  strong {
    font-size: 13px;
  }

  small {
    color: rgba(255, 255, 255, 0.7);
    font-size: 10px;
    line-height: 1.4;
  }

  & > i {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #bfe9ca;
    font-size: 9px;
    font-style: normal;
    font-weight: 800;
    text-transform: uppercase;
  }

  & > i::before {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #66d184;
    box-shadow: 0 0 0 4px rgba(102, 209, 132, 0.15);
    content: '';
  }

  @media (max-width: 560px) {
    grid-template-columns: 38px minmax(0, 1fr);
    min-height: 72px;
    padding: 11px;

    & > i {
      display: none;
    }
  }
`;
