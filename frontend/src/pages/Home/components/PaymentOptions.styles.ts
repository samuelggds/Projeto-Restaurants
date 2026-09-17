import styled from 'styled-components';

export const PaymentIntro = styled.div`
  display: grid;
  gap: 4px;
  margin: 4px 0 10px;

  strong {
    color: var(--home-text);
    font-size: 16px;
    font-weight: 900;
  }

  span {
    color: #747b77;
    font-size: 11px;
    line-height: 1.45;
  }
`;

export const AccountShortcut = styled.a`
  width: 100%;
  min-height: 62px;
  padding: 11px 12px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  border: 1px solid #e2ddd8;
  border-radius: 14px;
  background: #fff;
  color: var(--home-text);
  text-decoration: none;
  box-shadow: 0 5px 18px rgba(33, 27, 22, 0.04);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--home-primary) 45%, #e2ddd8);
    box-shadow: 0 9px 24px rgba(33, 27, 22, 0.08);
  }

  .shortcut-icon {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: color-mix(in srgb, var(--home-primary) 10%, #fff);
    color: var(--home-primary);
  }

  .shortcut-copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .shortcut-copy b {
    color: #27231f;
    font-size: 13px;
    font-weight: 900;
  }

  .shortcut-copy small {
    overflow: hidden;
    color: #7b746e;
    font-size: 10px;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shortcut-arrow {
    color: #978f88;
  }
`;

export const PaymentMethodHeading = styled.div`
  display: grid;
  gap: 3px;
  margin-bottom: 10px;

  b {
    color: #292521;
    font-size: 13px;
    font-weight: 900;
  }

  small {
    color: #7b756f;
    font-size: 10px;
    line-height: 1.4;
  }
`;

export const PaymentModeHint = styled.p`
  margin: 2px 0 0;
  color: #7b827e;
  font-size: 10px;
  line-height: 1.45;
`;

export const SecurePaymentNote = styled.div`
  min-height: 42px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #dce7ef;
  border-radius: 12px;
  background: #f3f8fc;
  color: #496172;
  font-size: 10px;
  line-height: 1.4;
  text-align: center;

  svg {
    flex: 0 0 auto;
    color: #2f69a3;
  }
`;
