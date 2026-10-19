import styled from 'styled-components';

// Keep Safari's scroll container separate from the wizard's header and action
// bar. The footer must never participate in scrollIntoView calculations.
export const ProductWizardScrollBody = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scroll-behavior: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 0 24px;

  @media (max-width: 600px) {
    gap: 14px;
    padding: 14px 0 20px;
  }
`;
