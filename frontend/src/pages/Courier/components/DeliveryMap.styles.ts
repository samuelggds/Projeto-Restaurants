import styled from 'styled-components';

export const MapShell = styled.section`
  position: relative;
  height: min(64vh, 620px);
  min-height: 430px;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  background: #edf1ed;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.08);

  .delivery-map {
    width: 100%;
    height: 100%;
    background: #edf1ed;
  }

  .leaflet-tile-pane {
    filter: grayscale(0.72) saturate(0.56) brightness(1.13) contrast(0.82) opacity(0.82);
  }

  .leaflet-control-attribution {
    color: #76817c;
    background: rgba(255, 255, 255, 0.76);
    font-size: 8px;
    backdrop-filter: blur(6px);
  }

  .delivery-courier-marker,
  .delivery-destination-marker {
    border: 0;
    background: transparent;
  }

  .delivery-courier-marker__halo {
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(37, 99, 235, 0.14);
    box-shadow: 0 0 0 7px rgba(37, 99, 235, 0.08);
  }

  .delivery-courier-marker__pin {
    position: relative;
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border: 3px solid #fff;
    border-radius: 50%;
    background: #2563eb;
    box-shadow: 0 8px 22px rgba(37, 99, 235, 0.3);
  }

  .delivery-courier-marker__pin svg {
    width: 23px;
    height: 23px;
    fill: none;
    stroke: #fff;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.9;
  }

  .delivery-destination-marker__pin {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border: 4px solid #fff;
    border-radius: 50% 50% 50% 8px;
    background: #ef4444;
    box-shadow: 0 9px 24px rgba(239, 68, 68, 0.28);
    transform: rotate(-45deg);
  }

  .delivery-destination-marker__pin span {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #fff;
  }

  .leaflet-popup-content-wrapper,
  .leaflet-popup-tip {
    color: #15211c;
    background: rgba(255, 255, 255, 0.96);
  }

  .leaflet-popup-content-wrapper {
    border-radius: 10px;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
  }

  @media (max-width: 560px) {
    height: calc(100dvh - 270px);
    min-height: 460px;
    margin-inline: -8px;
    border-radius: 12px;
  }
`;

export const RecenterControl = styled.button`
  position: absolute;
  right: 16px;
  bottom: 106px;
  z-index: 1000;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(15, 23, 42, 0.09);
  border-radius: 12px;
  color: #17231d;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(8px);
  cursor: pointer;

  &:hover {
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 3px solid rgba(37, 99, 235, 0.24);
    outline-offset: 2px;
  }
`;

export const MapStatus = styled.div`
  position: absolute;
  right: 16px;
  bottom: 16px;
  left: 16px;
  z-index: 1000;
  min-height: 70px;
  padding: 12px 14px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 14px;
  color: #17231d;
  background: rgba(255, 255, 255, 0.93);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(12px);

  & > span:first-child {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: #1d4ed8;
    background: #dbeafe;
  }

  & > span:nth-child(2) {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  strong {
    color: #111827;
    font-size: 13px;
  }

  small {
    color: #66736d;
    font-size: 10px;
    line-height: 1.4;
  }

  & > i {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #16713a;
    font-size: 9px;
    font-style: normal;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  & > i::before {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.12);
    content: '';
  }

  @media (max-width: 560px) {
    grid-template-columns: 38px minmax(0, 1fr);
    min-height: 66px;
    padding: 10px 12px;

    & > i {
      display: none;
    }
  }
`;
