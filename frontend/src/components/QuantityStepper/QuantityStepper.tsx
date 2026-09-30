import styled from 'styled-components';

type QuantityStepperProps = {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel: string;
  increaseLabel: string;
  ariaLabel?: string;
  decreaseDisabled?: boolean;
  increaseDisabled?: boolean;
  accentColor?: string;
  className?: string;
};

export function QuantityStepper({
  value,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
  ariaLabel,
  decreaseDisabled = false,
  increaseDisabled = false,
  accentColor,
  className,
}: QuantityStepperProps) {
  return (
    <Root
      className={className}
      aria-label={ariaLabel}
      $accent={accentColor}
      data-quantity-stepper
    >
      <button
        type="button"
        aria-label={decreaseLabel}
        disabled={decreaseDisabled}
        onClick={onDecrease}
      >
        <span aria-hidden="true">—</span>
      </button>
      <strong aria-live="polite">{value}</strong>
      <button
        className="increase"
        type="button"
        aria-label={increaseLabel}
        disabled={increaseDisabled}
        onClick={onIncrease}
      >
        <span aria-hidden="true">+</span>
      </button>
    </Root>
  );
}

const Root = styled.div<{ $accent?: string }>`
  --quantity-accent: ${({ $accent }) =>
    $accent || 'var(--checkout-primary, var(--config-primary, var(--primary, #e85a2b)))'};

  width: 103px;
  height: 42px;
  flex: 0 0 103px;
  padding: 0 14px;
  box-sizing: border-box;
  display: inline-grid;
  grid-template-columns: 18px 1fr 18px;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  background: #fafaf8;
  color: #1f1e1a;

  && button {
    position: relative;
    width: 18px;
    min-width: 0;
    max-width: 18px;
    min-height: 0;
    height: 22px;
    padding: 0;
    flex: 0 0 18px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    color: #72706b;
    cursor: pointer;
    font: inherit;
    line-height: 1;
  }

  && button::before {
    content: '';
    position: absolute;
    inset: -8px -6px;
  }

  && button > span {
    display: block;
    font-size: 18px;
    font-weight: 700;
    line-height: 1;
  }

  && button.increase {
    color: var(--quantity-accent);
  }

  && button:disabled {
    color: #aaa49b;
    opacity: 0.62;
    cursor: not-allowed;
  }

  && button.increase:disabled {
    color: color-mix(in srgb, var(--quantity-accent) 45%, #aaa49b);
  }

  > strong {
    min-width: 8px;
    color: #1f1e1a;
    font-size: 16px;
    font-weight: 700;
    line-height: 19px;
    text-align: center;
  }

  @media (max-width: 620px) {
    height: 38px;
    padding: 8px 12px;
    background: #f7f5f0;

    && button > span {
      font-weight: 600;
    }
  }
`;
