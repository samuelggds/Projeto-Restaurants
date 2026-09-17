import styled from 'styled-components';

export const Shell = styled.div`
  position: relative;
  width: 100%;
  min-height: 430px;
  overflow: hidden;
  border-radius: inherit;
  background: #e8eef0;
  isolation: isolate;
`;

export const Canvas = styled.div`
  position: absolute;
  inset: 0;
`;

export const EtaCard = styled.div`
  position: absolute;
  z-index: 5;
  top: 16px;
  left: 16px;
  min-width: 164px;
  padding: 12px 14px;
  display: grid;
  gap: 3px;
  border: 1px solid rgba(18, 42, 49, 0.1);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 30px rgba(29, 50, 57, 0.18);
  backdrop-filter: blur(12px);

  small {
    color: #65747a;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  strong {
    color: #172f36;
    font-size: 23px;
    line-height: 1;
  }

  span {
    color: #506168;
    font-size: 11px;
    font-weight: 800;
  }

  @media (max-width: 520px) {
    top: 12px;
    left: 12px;
    min-width: 146px;
    padding: 10px 12px;

    strong {
      font-size: 20px;
    }
  }
`;

export const LiveBadge = styled.div`
  position: absolute;
  z-index: 5;
  left: 16px;
  bottom: 26px;
  max-width: calc(100% - 88px);
  padding: 9px 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(18, 42, 49, 0.1);
  border-radius: 999px;
  color: #24414a;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 24px rgba(29, 50, 57, 0.16);
  font-size: 11px;
  font-weight: 850;
  backdrop-filter: blur(10px);

  i {
    width: 8px;
    height: 8px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: #20a561;
    box-shadow: 0 0 0 4px rgba(32, 165, 97, 0.14);
  }

  @media (max-width: 520px) {
    left: 12px;
    bottom: 24px;
  }
`;

export const RecenterButton = styled.button`
  position: absolute;
  z-index: 5;
  top: 16px;
  right: 16px;
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(18, 42, 49, 0.1);
  border-radius: 14px;
  color: #214b58;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 26px rgba(29, 50, 57, 0.16);
  cursor: pointer;
  backdrop-filter: blur(10px);

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: #fff;
  }

  &:focus-visible {
    outline: 3px solid rgba(37, 99, 235, 0.25);
    outline-offset: 2px;
  }

  @media (max-width: 520px) {
    top: 12px;
    right: 12px;
    width: 42px;
    height: 42px;
  }
`;

export const ErrorState = styled.div`
  position: absolute;
  inset: 0;
  z-index: 6;
  padding: 28px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: #5e6c71;
  background:
    radial-gradient(circle at 22% 26%, rgba(74, 144, 164, 0.12), transparent 24%),
    linear-gradient(145deg, #edf3f4, #f8faf9);
  text-align: center;

  svg {
    width: 34px;
    height: 34px;
    color: #e45118;
  }

  strong {
    color: #223a42;
    font-size: 16px;
  }

  p {
    max-width: 390px;
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
  }
`;
