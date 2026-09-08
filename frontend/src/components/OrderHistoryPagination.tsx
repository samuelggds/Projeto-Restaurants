type Props = { loading: boolean; error: string; hasMore: boolean; loadMore: () => unknown; refresh: () => unknown };

export function OrderHistoryPagination({ loading, error, hasMore, loadMore, refresh }: Props) {
  return (
    <div aria-label="Paginação do histórico" aria-busy={loading} style={{ padding: '16px', display: 'grid', gap: '8px' }}>
      {error && <p role="alert">{error}</p>}
      {loading && <span role="status">Carregando histórico...</span>}
      {(hasMore || error) && <button type="button" disabled={loading} onClick={() => void (hasMore ? loadMore() : refresh())}>
        {error ? 'Tentar carregar novamente' : 'Carregar mais pedidos do histórico'}
      </button>}
    </div>
  );
}
