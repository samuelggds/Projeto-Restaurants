import styled from 'styled-components';
import { Button as SharedButton } from '../Login/styles';

export * from '../Login/styles';

export const Button = styled(SharedButton)`
  &:disabled,
  &:disabled:hover {
    background-color: ${(props) => props.theme.primary};
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.55;
  }
`;
