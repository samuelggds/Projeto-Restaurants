import styled from 'styled-components';

export const ResendButton = styled.button`
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border: 0;
  border-radius: 10px;
  padding: 0.7rem 0.6rem;
  background: ${(props) => props.theme.surface};
  color: ${(props) => props.theme.primaryReadable};
  box-shadow: inset 0 0 0 1px ${(props) => props.theme.border};
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 750;
  cursor: pointer;
  transition: background-color 180ms ease, box-shadow 180ms ease;

  &[data-cooling='true'] {
    background: color-mix(in srgb, currentColor 6%, ${(props) => props.theme.surface});
  }

  &:hover:not(:disabled) {
    background: color-mix(in srgb, currentColor 9%, ${(props) => props.theme.surface});
    box-shadow: inset 0 0 0 1px currentColor, 0 3px 10px -6px currentColor;
  }

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 3px;
  }

  &:disabled {
    cursor: not-allowed;
    /* Keep the countdown readable rather than dimming the entire control. */
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const Outline = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  overflow: visible;
`;

export const OutlineProgress = styled.rect`
  width: calc(100% - 2px);
  height: calc(100% - 2px);
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  transition: stroke-dashoffset 250ms linear;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const ButtonContent = styled.span`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 20px;
  line-height: 1.25;

  svg {
    flex-shrink: 0;
  }
`;

export const TimeBadge = styled.span`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: 3.2ch;
  padding: 0.2rem 0.35rem;
  border-radius: 5px;
  background: color-mix(in srgb, currentColor 10%, ${(props) => props.theme.surface});
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
  font-weight: 800;
  line-height: 1;
`;

export const ScreenReaderStatus = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`;
