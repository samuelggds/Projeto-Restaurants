import styled from 'styled-components';

export const Badge = styled.span`
  position: absolute;
  left: 10px;
  bottom: 10px;
  max-width: calc(100% - 20px);
  min-height: 30px;
  padding: 6px 10px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid rgba(255, 255, 255, 0.48);
  border-radius: 999px;
  overflow: visible;
  color: #fff;
  background: linear-gradient(135deg, #db3b31, #b8221d);
  box-shadow: 0 7px 20px rgba(128, 24, 20, 0.3);
  font-size: 11px;
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: 0.025em;
  overflow-wrap: anywhere;
  text-align: center;
  text-transform: uppercase;
  white-space: normal;

  svg {
    flex: 0 0 auto;
  }

  @media (max-width: 760px) {
    right: 6px;
    left: 6px;
    bottom: 6px;
    width: auto;
    max-width: none;
    min-height: 24px;
    padding: 5px 6px;
    justify-content: center;
    font-size: 8.5px;
    line-height: 1.15;

    svg {
      display: none;
    }
  }
`;

export const InlineBadge = styled.span`
  width: fit-content;
  max-width: 100%;
  min-height: 24px;
  margin-bottom: 7px;
  padding: 4px 8px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid color-mix(in srgb, var(--home-primary) 24%, #eadfd3);
  border-radius: 999px;
  color: var(--home-primary);
  background: color-mix(in srgb, var(--home-primary) 7%, #fff);
  font-size: 9px;
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: 0.035em;
  overflow-wrap: anywhere;
  text-transform: uppercase;
  white-space: normal;

  svg {
    flex: 0 0 auto;
  }

  @media (max-width: 390px) {
    min-height: 22px;
    margin-bottom: 5px;
    padding: 3px 6px;
    font-size: 8px;

    svg {
      display: none;
    }
  }
`;

export const Price = styled.span`
  display: grid;
  gap: 1px;
  line-height: 1.1;

  del {
    color: #8b827a;
    font-size: 11px;
  }

  strong {
    color: var(--home-primary);
    font-size: 17px;
  }
`;
