import { Check, ShoppingBag, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import styled from 'styled-components';

type Props = {
  value: 'delivery' | 'pickup';
  allowDelivery?: boolean;
  allowPickup?: boolean;
  onChange: (value: 'delivery' | 'pickup') => void;
};

type MethodCardProps = {
  active: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
};

function MethodCard({ active, icon, title, description, onClick }: MethodCardProps) {
  return (
    <Card type="button" $active={active} onClick={onClick} aria-pressed={active}>
      <span className="method-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="method-copy">
        <b>{title}</b>
        <small>{description}</small>
      </span>
      <span className="method-check" aria-hidden="true">
        {active ? <Check size={12} strokeWidth={3} /> : null}
      </span>
    </Card>
  );
}

export function DeliveryMethodSelector({
  value,
  allowDelivery = true,
  allowPickup = true,
  onChange,
}: Props) {
  const availableCount = Number(allowDelivery) + Number(allowPickup);

  return (
    <Section aria-label="Como deseja receber o pedido">
      <Heading>
        <Truck size={18} aria-hidden="true" />
        <strong>Como deseja receber?</strong>
      </Heading>

      {availableCount === 0 ? (
        <Unavailable role="status">
          O restaurante não está aceitando delivery ou retirada neste momento.
        </Unavailable>
      ) : (
        <Grid $single={availableCount === 1}>
          {allowDelivery && (
            <MethodCard
              active={value === 'delivery'}
              icon={<Truck size={21} />}
              title="Delivery"
              description="Receba no seu endereço"
              onClick={() => onChange('delivery')}
            />
          )}

          {allowPickup && (
            <MethodCard
              active={value === 'pickup'}
              icon={<ShoppingBag size={21} />}
              title="Retirada"
              description="Busque no restaurante"
              onClick={() => onChange('pickup')}
            />
          )}
        </Grid>
      )}
    </Section>
  );
}

const Section = styled.section`
  display: grid;
  gap: 10px;
`;

const Heading = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--home-text);

  svg {
    color: var(--home-primary);
  }

  strong {
    font-size: 15px;
    font-weight: 900;
  }
`;

const Grid = styled.div<{ $single: boolean }>`
  display: grid;
  grid-template-columns: ${({ $single }) => ($single ? '1fr' : 'repeat(2, minmax(0, 1fr))')};
  gap: 10px;
`;

const Card = styled.button<{ $active: boolean }>`
  position: relative;
  min-height: 92px;
  padding: 13px 34px 13px 13px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: 11px;
  border: 1px solid ${({ $active }) => ($active ? 'var(--home-primary)' : '#ded8d2')};
  border-radius: 15px;
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--home-primary) 6%, #fff)' : '#fff'};
  color: var(--home-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: ${({ $active }) =>
    $active ? '0 9px 22px color-mix(in srgb, var(--home-primary) 12%, transparent)' : '0 3px 12px rgba(34, 28, 23, 0.04)'};
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--home-primary) 55%, #ded8d2);
  }

  .method-icon {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: ${({ $active }) =>
      $active ? 'color-mix(in srgb, var(--home-primary) 12%, #fff)' : '#f4f1ed'};
    color: ${({ $active }) => ($active ? 'var(--home-primary)' : '#34302c')};
  }

  .method-copy {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .method-copy b {
    color: #27231f;
    font-size: 14px;
    font-weight: 900;
  }

  .method-copy small {
    color: #7a746e;
    font-size: 10px;
    line-height: 1.35;
  }

  .method-check {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 21px;
    height: 21px;
    display: grid;
    place-items: center;
    border: 1px solid ${({ $active }) => ($active ? 'var(--home-primary)' : '#cfc8c1')};
    border-radius: 50%;
    background: ${({ $active }) => ($active ? 'var(--home-primary)' : '#fff')};
    color: #fff;
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-primary) 18%, transparent);
    outline-offset: 2px;
  }

  @media (max-width: 380px) {
    min-height: 86px;
    padding-left: 10px;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 8px;

    .method-icon {
      width: 34px;
      height: 34px;
    }
  }
`;

const Unavailable = styled.p`
  margin: 0;
  padding: 12px 14px;
  border: 1px solid #efc9b8;
  border-radius: 12px;
  background: #fff7f2;
  color: #8a3d20;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.45;
`;
