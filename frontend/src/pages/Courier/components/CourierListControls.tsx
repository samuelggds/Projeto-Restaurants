import { Plus, RotateCcw } from 'lucide-react';
import styled from 'styled-components';

export const COURIER_LIST_BATCH_SIZE = 10;

type Props = {
  visibleCount: number;
  totalCount: number;
  itemLabel?: string;
  onShowMore: () => void;
  onReset: () => void;
};

const Controls = styled.div`
  min-height: 58px;
  margin-top: 12px;
  padding: 9px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-top: 1px solid var(--courier-line);

  span {
    color: var(--courier-muted);
    font-size: 11px;
    font-weight: 650;
  }

  div {
    display: flex;
    gap: 7px;
  }

  button {
    min-height: 40px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 1px solid var(--courier-line);
    border-radius: 7px;
    color: #48554e;
    background: #fff;
    font: inherit;
    font-size: 11px;
    font-weight: 750;
  }

  button:last-child {
    color: #fff;
    border-color: var(--courier-primary);
    background: var(--courier-primary);
  }

  svg {
    width: 15px;
  }

  @media (max-width: 540px) {
    align-items: stretch;
    flex-direction: column;

    div,
    button {
      flex: 1;
    }
  }
`;

export function CourierListControls({
  visibleCount,
  totalCount,
  itemLabel = 'itens',
  onShowMore,
  onReset,
}: Props) {
  if (totalCount <= COURIER_LIST_BATCH_SIZE) return null;

  return (
    <Controls aria-label="Controles de exibição da lista">
      <span aria-live="polite">
        Exibindo {visibleCount} de {totalCount} {itemLabel}
      </span>
      <div>
        {visibleCount > COURIER_LIST_BATCH_SIZE && (
          <button type="button" onClick={onReset}>
            <RotateCcw /> Voltar para 10
          </button>
        )}
        {visibleCount < totalCount && (
          <button type="button" onClick={onShowMore}>
            <Plus /> Mostrar mais 10
          </button>
        )}
      </div>
    </Controls>
  );
}
