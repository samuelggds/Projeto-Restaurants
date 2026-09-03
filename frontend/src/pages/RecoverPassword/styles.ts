import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { Button as SharedButton } from '../Login/styles';

export {
  lightTheme,
  darkTheme,
  Container,
  TopBar,
  ThemeToggleButton,
  BannerSection,
  BrandTitle,
  RestaurantLogo,
  BrandSubtitle,
  FormSection,
  FormWrapper,
  WelcomeText,
  FormSubtitle,
  Form,
  InputGroup,
  Label,
  Input,
} from '../Login/styles';

export const Button = styled(SharedButton)`
  &:disabled,
  &:disabled:hover {
    background-color: ${(props) => props.theme.primary};
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const SwitchRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
`;

export const SwitchButton = styled.button<{ $active: boolean }>`
  border: 1px solid ${(props) => props.theme.border};
  border-color: ${(props) => (props.$active ? props.theme.primary : props.theme.border)};
  background: ${(props) => (props.$active ? `${props.theme.primary}15` : props.theme.surface)};
  color: ${(props) => props.theme.text};
  border-radius: 10px;
  padding: 0.7rem 0.8rem;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export const AvailabilityNote = styled.p`
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: ${(props) => props.theme.textMuted};
`;

export const ActionRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

export const SecondaryButton = styled.button`
  min-height: 44px;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 10px;
  background: ${(props) => props.theme.surface};
  color: ${(props) => props.theme.text};
  font-size: 0.86rem;
  font-weight: 750;
  cursor: pointer;

  &:hover:not(:disabled),
  &:focus-visible {
    border-color: ${(props) => props.theme.primary};
    color: ${(props) => props.theme.primary};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const FooterRow = styled.div`
  margin-top: 1rem;
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  font-size: 0.9rem;
`;

export const BackLink = styled(Link)`
  color: ${(props) => props.theme.primary};
  font-weight: 700;
  text-decoration: none;

  &:hover {
    color: ${(props) => props.theme.primaryHover};
    text-decoration: underline;
  }
`;
