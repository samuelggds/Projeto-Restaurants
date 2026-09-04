import styled from 'styled-components';

type Tone = 'neutral' | 'success' | 'danger' | 'info' | 'warning';

const toneStyles: Record<Tone, { border: string; background: string; color: string }> = {
  neutral: {
    border: '#dedbd6',
    background: '#fff',
    color: '#25221f',
  },
  success: {
    border: '#b8ddc2',
    background: '#f2faf4',
    color: '#176b32',
  },
  danger: {
    border: '#efc3bb',
    background: '#fff4f2',
    color: '#a93425',
  },
  info: {
    border: '#b8d9e6',
    background: '#f1f9fc',
    color: '#14627f',
  },
  warning: {
    border: '#ecd6a5',
    background: '#fff9e9',
    color: '#7b5711',
  },
};

export const Card = styled.article<{ $status: string }>`
  position: relative;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--courier-line);
  border-top: 3px solid
    ${(props) =>
      props.$status === 'PRONTO'
        ? '#d97706'
        : props.$status === 'SAIU_PARA_ENTREGA'
          ? '#197492'
          : '#3f8153'};
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(54, 36, 20, 0.06);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 34px rgba(54, 36, 20, 0.09);
  }

  @media (max-width: 600px) {
    gap: 12px;
    padding: 15px;
    border-radius: 12px;
  }
`;

export const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
`;

export const HeaderIdentity = styled.div`
  min-width: 0;
  display: grid;
  gap: 9px;
`;

export const OrderId = styled.strong`
  color: #191816;
  font-size: 20px;
  font-weight: 850;
  letter-spacing: -0.025em;
  line-height: 1.1;

  @media (max-width: 600px) {
    font-size: 18px;
  }
`;

export const StatusBadge = styled.span<{ $color: string }>`
  width: max-content;
  max-width: 100%;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, ${(props) => props.$color} 35%, #fff);
  border-radius: 8px;
  color: color-mix(in srgb, ${(props) => props.$color} 82%, #3c2d23);
  background: color-mix(in srgb, ${(props) => props.$color} 9%, #fff);
  font-size: 11px;
  font-weight: 850;
  line-height: 1.1;
  text-transform: uppercase;
`;

export const Total = styled.strong`
  flex-shrink: 0;
  color: #191816;
  font-size: 20px;
  font-weight: 850;
  letter-spacing: -0.025em;
  line-height: 1.1;
  text-align: right;

  @media (max-width: 600px) {
    font-size: 18px;
  }
`;

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 0.9fr) minmax(0, 0.9fr);
  gap: 8px;

  @media (max-width: 430px) {
    grid-template-columns: 1fr 1fr;

    > :first-child {
      grid-column: 1 / -1;
    }
  }
`;

export const SummaryItem = styled.div<{ $tone?: Tone }>`
  min-width: 0;
  min-height: 66px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  column-gap: 8px;
  align-content: center;
  padding: 10px;
  border: 1px solid ${(props) => toneStyles[props.$tone || 'neutral'].border};
  border-radius: 9px;
  color: ${(props) => toneStyles[props.$tone || 'neutral'].color};
  background: ${(props) => toneStyles[props.$tone || 'neutral'].background};

  > svg {
    grid-row: 1 / 3;
    align-self: center;
    width: 17px;
    height: 17px;
    color: currentColor;
    opacity: 0.8;
  }

  small {
    overflow: hidden;
    color: #716b65;
    font-size: 10px;
    font-weight: 650;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    overflow: hidden;
    color: currentColor;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const EarningBar = styled.div<{ $available: boolean }>`
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 12px;
  border: 1px solid ${(props) => (props.$available ? '#b9ddc3' : '#ecd6a5')};
  border-radius: 9px;
  color: ${(props) => (props.$available ? '#176b32' : '#7b5711')};
  background: ${(props) => (props.$available ? '#f1faf4' : '#fff9e9')};
  font-size: 12px;
  font-weight: 700;

  strong {
    font-size: 13px;
    font-weight: 850;
  }
`;

export const PayOnDelivery = styled.div`
  width: max-content;
  max-width: 100%;
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border: 1px solid #b8d9e6;
  border-radius: 8px;
  color: #14627f;
  background: #f1f9fc;
  font-size: 11px;
  font-weight: 800;
`;

export const AddressBox = styled.div`
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-height: 74px;
  padding: 12px;
  border: 1px solid #e4e1dc;
  border-radius: 10px;
  background: #faf9f7;
`;

export const AddressIcon = styled.span`
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: var(--courier-primary);
  background: color-mix(in srgb, var(--courier-primary) 10%, #fff);

  svg {
    width: 20px;
    height: 20px;
  }
`;

export const AddressContent = styled.span`
  min-width: 0;
  display: grid;
  gap: 3px;

  small {
    color: #77706a;
    font-size: 10px;
    font-weight: 650;
  }

  strong {
    color: #2b2926;
    font-size: 12px;
    font-weight: 750;
    line-height: 1.45;
  }
`;

export const ContextRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #5f5a54;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.45;

  svg {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    margin-top: 1px;
    color: #7f776f;
  }
`;

export const ActionArea = styled.div`
  display: grid;
  gap: 10px;
  padding-top: 2px;
`;

export const Hint = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #625c56;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.45;

  svg {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    margin-top: 1px;
    color: var(--courier-primary);
  }
`;

export const PrimaryButton = styled.button`
  width: 100%;
  min-height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 16px;
  border: 1px solid var(--courier-primary);
  border-radius: 9px;
  color: #fff;
  background: var(--courier-primary);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--courier-primary) 22%, transparent);
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    filter 0.18s ease,
    box-shadow 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: brightness(1.04);
    box-shadow: 0 10px 22px color-mix(in srgb, var(--courier-primary) 28%, transparent);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--courier-primary) 24%, transparent);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.62;
    box-shadow: none;
  }
`;

export const DeliveryActions = styled.div`
  display: grid;
  gap: 9px;
`;

export const DeliverButton = styled.button`
  width: 100%;
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #238447;
  border-radius: 9px;
  color: #fff;
  background: #238447;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;

  &:hover:not(:disabled) {
    filter: brightness(1.04);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.52;
  }
`;

export const DetailsButton = styled.button`
  width: 100%;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #dedbd6;
  border-radius: 9px;
  color: #4d4945;
  background: #fff;
  font-size: 11px;
  font-weight: 750;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    background 0.18s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--courier-primary) 38%, #d0cbc5);
    color: var(--courier-primary);
    background: color-mix(in srgb, var(--courier-primary) 4%, #fff);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--courier-primary) 16%, transparent);
    outline-offset: 2px;
  }
`;
