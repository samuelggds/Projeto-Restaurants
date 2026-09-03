import { Plus, RotateCcw } from 'lucide-react';
import styled from 'styled-components';

export const KITCHEN_LIST_BATCH_SIZE = 10;

const Controls = styled.div`
  min-height: 56px;
  margin-top: 10px;
  padding: 10px 2px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-top: 1px solid var(--border);

  > span {
    color: var(--muted);
    font-size: 11px;
    font-weight: 650;
  }

  > div {
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
    border: 1px solid var(--border);
    border-radius: 7px;
    color: #354348;
    background: #fff;
    font: inherit;
    font-size: 11px;
    font-weight: 750;
  }

  button:last-child {
    color: #fff;
    border-color: var(--brand);
    background: var(--brand);
  }

  svg {
    width: 15px;
  }

  @media (max-width: 540px) {
    align-items: stretch;
    flex-direction: column;

    > span {
      text-align: center;
    }

    > div,
    button {
      flex: 1;
    }
  }
`;

export function KitchenListControls({
  visibleCount,
  totalCount,
  onShowMore,
  onReset,
}: {
  visibleCount: number;
  totalCount: number;
  onShowMore: () => void;
  onReset: () => void;
}) {
  if (totalCount <= KITCHEN_LIST_BATCH_SIZE) return null;

  return (
    <Controls aria-label="Controles de exibição da lista">
      <span aria-live="polite">
        Exibindo {visibleCount} de {totalCount} pedidos
      </span>
      <div>
        {visibleCount > KITCHEN_LIST_BATCH_SIZE && (
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
