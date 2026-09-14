import { ChevronDown, History, LoaderCircle, RotateCcw } from 'lucide-react';
import styled, { keyframes } from 'styled-components';

type Props = {
  className?: string;
  loading: boolean;
  error: string;
  hasMore: boolean;
  loadMore: () => unknown;
  refresh: () => unknown;
};

export function OrderHistoryPagination({
  className,
  loading,
  error,
  hasMore,
  loadMore,
  refresh,
}: Props) {
  return (
    <Pagination className={className} aria-label="Paginação do histórico" aria-busy={loading}>
      {error && <p role="alert">{error}</p>}
      {loading && (
        <span className="loading-message" role="status">
          Carregando histórico...
        </span>
      )}
      {(hasMore || error) && (
        <LoadMoreButton
          type="button"
          disabled={loading}
          onClick={() => void (hasMore ? loadMore() : refresh())}
        >
          {loading ? (
            <LoaderCircle className="spinner" aria-hidden="true" />
          ) : error ? (
            <RotateCcw aria-hidden="true" />
          ) : (
            <History aria-hidden="true" />
          )}
          <span>
            {loading ? 'Carregando...' : error ? 'Tentar novamente' : 'Carregar histórico'}
          </span>
          {!loading && !error && <ChevronDown className="chevron" aria-hidden="true" />}
        </LoadMoreButton>
      )}
    </Pagination>
  );
}

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Pagination = styled.div`
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 20px 16px 12px;
  min-width: 0;
  text-align: center;
  p {
    margin: 0;
    max-width: 480px;
    padding: 10px 14px;
    border: 1px solid #edd6c5;
    border-radius: 10px;
    color: #914821;
    background: #fff8f2;
    font-size: 13px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .loading-message {
    color: #617169;
    font-size: 13px;
    line-height: 1.5;
  }
  &:has(button) .loading-message {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
`;

const LoadMoreButton = styled.button`
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  max-width: 100%;
  min-height: 48px;
  padding: 12px 20px;
  border: 1px solid #cbdcd2;
  border-radius: 12px;
  background: #fff;
  color: #285745;
  box-shadow: 0 3px 10px #233f3010;
  && {
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.5;
  }
  text-align: center;
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
  svg {
    width: 19px;
    height: 19px;
    flex-shrink: 0;
  }
  .chevron {
    width: 16px;
    height: 16px;
    color: #768d7f;
  }
  .spinner {
    animation: ${spin} 900ms linear infinite;
  }
  &:hover:not(:disabled) {
    background: #f1f7f3;
    border-color: #8cae98;
    box-shadow: 0 4px 14px #233f3018;
  }
  &:active:not(:disabled) {
    background: #e7f0e9;
  }
  &&:focus-visible {
    outline: 3px solid #377456;
    outline-offset: 3px;
  }
  &:disabled {
    cursor: wait;
    color: #667c6e;
    background: #f1f5f1;
    box-shadow: none;
  }
  @media (max-width: 480px) {
    padding: 11px 14px;
    gap: 8px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    .spinner {
      animation: none;
    }
  }
`;
