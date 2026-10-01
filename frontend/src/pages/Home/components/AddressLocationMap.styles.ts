import styled, { keyframes } from 'styled-components';

const reveal = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const Root = styled.div<{ $primary: string }>`
  --address-map-primary: ${({ $primary }) => $primary || '#e85a2b'};
  display: grid;
  gap: 12px;
  animation: ${reveal} 260ms cubic-bezier(.22, 1, .36, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const MapFrame = styled.div`
  position: relative;
  height: 300px;
  overflow: hidden;
  border: 1px solid #e1e7ed;
  border-radius: 14px;
  background: #eef2f3;
  isolation: isolate;

  @media (max-width: 760px) {
    height: 220px;
    border-radius: 16px;
  }
`;

export const MapCanvas = styled.div<{ $visible: boolean }>`
  position: absolute;
  inset: 0;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 220ms ease;

  .leaflet-container {
    width: 100%;
    height: 100%;
    background: #eef2f3;
  }

  .leaflet-control-attribution {
    max-width: calc(100% - 16px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 9px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const StateOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  padding: 28px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  background: linear-gradient(180deg, rgba(248, 250, 251, .98), rgba(241, 245, 247, .98));
  color: #657078;
  text-align: center;

  svg {
    width: 28px;
    height: 28px;
    color: var(--address-map-primary);
  }

  strong {
    color: #242a2e;
    font-size: 14px;
    line-height: 1.3;
  }

  > span:not(.spinner) {
    max-width: 360px;
    font-size: 12px;
    line-height: 1.5;
  }

  .spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #dce3e7;
    border-top-color: var(--address-map-primary);
    border-radius: 50%;
    animation: ${spin} 760ms linear infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
      border-top-color: #dce3e7;
      box-shadow: inset 0 0 0 3px var(--address-map-primary);
    }
  }
`;

export const MapMeta = styled.div`
  min-width: 0;
  padding: 12px 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border: 1px solid #ece9e3;
  border-radius: 12px;
  background: #fff;
  animation: ${reveal} 220ms ease-out both;

  > svg {
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
    margin-top: 1px;
    color: var(--address-map-primary);
  }

  > span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  strong {
    color: #24211f;
    font-size: 12px;
    line-height: 1.4;
  }

  small {
    overflow-wrap: anywhere;
    color: #74706b;
    font-size: 12px;
    line-height: 1.45;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
