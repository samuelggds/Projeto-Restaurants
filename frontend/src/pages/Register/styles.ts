import styled from 'styled-components';
import { LoginSubmitButton as SharedButton } from '../Login/styles';

export * from '../Login/styles';

export const Button = styled(SharedButton)`
  .loading-icon {
    width: 18px;
    height: 18px;
    animation: register-spin 800ms linear infinite;
  }

  @keyframes register-spin {
    to {
      transform: rotate(360deg);
    }
  }

  &:disabled,
  &:disabled:hover {
    background-color: ${(props) => props.theme.primary};
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.55;
    transform: none;
  }
`;

export const FormError = styled.p`
  margin: 0;
  padding: 11px 12px;
  border: 1px solid color-mix(in srgb, #c93b32 45%, ${(props) => props.theme.border});
  border-radius: 8px;
  color: ${(props) => (props.theme.background === '#15110e' ? '#ffb4ad' : '#98251f')};
  background: color-mix(in srgb, #c93b32 9%, ${(props) => props.theme.surface});
  font-size: 0.82rem;
  line-height: 1.45;
`;
