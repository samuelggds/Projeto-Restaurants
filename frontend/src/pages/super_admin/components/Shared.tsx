import { AlertCircle, FileDown, Inbox, LoaderCircle, RefreshCw, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as S from '../SuperAdmin.styles';

export function Metrics({
  items,
}: {
  items: { label: string; value: ReactNode; icon: ReactNode; hint?: string }[];
}) {
  return (
    <S.Metrics>
      {items.map((item) => (
        <S.Metric key={item.label}>
          <i aria-hidden="true">{item.icon}</i>
          <span className="copy">
            <span>{item.label}</span>
            <b>{item.value}</b>
            {item.hint ? <small>{item.hint}</small> : null}
          </span>
        </S.Metric>
      ))}
    </S.Metrics>
  );
}

export function Toolbar({
  query,
  onQuery,
  placeholder,
  children,
  onExport,
  resultCount,
}: {
  query: string;
  onQuery: (value: string) => void;
  placeholder: string;
  children?: ReactNode;
  onExport?: () => void;
  resultCount?: number;
}) {
  return (
    <S.Toolbar role="search">
      <label className="sr-only" htmlFor="super-admin-search">
        Buscar
      </label>
      <input
        id="super-admin-search"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder={placeholder}
      />
      {children}
      {onExport ? (
        <button type="button" onClick={onExport}>
          <FileDown size={16} /> Exportar{resultCount == null ? '' : ` (${resultCount})`}
        </button>
      ) : null}
    </S.Toolbar>
  );
}

export function Empty({
  title = 'Nenhum registro encontrado',
  description = 'Ajuste os filtros ou atualize os dados para tentar novamente.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <S.EmptyState>
      <Inbox aria-hidden="true" />
      <b>{title}</b>
      <p>{description}</p>
    </S.EmptyState>
  );
}

export function Chart({
  data,
  valueKey,
}: {
  data: { label: string; count?: number; value?: number }[];
  valueKey: 'count' | 'value';
}) {
  if (!data.length)
    return (
      <Empty
        title="Sem histórico para o período"
        description="O gráfico aparecerá quando o backend tiver registros mensais suficientes."
      />
    );
  const maximum = Math.max(...data.map((item) => Number(item[valueKey] || 0)), 1);
  return (
    <S.Chart aria-label="Gráfico mensal">
      {data.map((item) => (
        <div
          key={item.label}
          className="bar"
          title={`${item.label}: ${item[valueKey] ?? 0}`}
          style={{
            height: `${Math.max(3, Math.round((Number(item[valueKey] || 0) / maximum) * 100))}%`,
          }}
        >
          <span>{item.label}</span>
        </div>
      ))}
    </S.Chart>
  );
}

export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  drawer = false,
  ariaLabel,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  drawer?: boolean;
  ariaLabel?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', escape);
    panel.current?.querySelector<HTMLElement>('button, input, select, textarea')?.focus();
    return () => {
      document.removeEventListener('keydown', escape);
      previous?.focus?.();
    };
  }, [onClose]);
  return (
    <S.ModalBackdrop onMouseDown={onClose}>
      <S.ModalPanel
        ref={panel}
        $drawer={drawer}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="close" aria-label="Fechar" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        {children}
        {footer ? <footer>{footer}</footer> : null}
      </S.ModalPanel>
    </S.ModalBackdrop>
  );
}

export function LoadState({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading)
    return (
      <S.StatePage aria-live="polite">
        <LoaderCircle className="spin" />
        <h1>Carregando o painel</h1>
        <p>Consultando restaurantes, assinaturas, faturamento e segurança.</p>
        <S.SkeletonGrid>
          <span />
          <span />
          <span />
        </S.SkeletonGrid>
      </S.StatePage>
    );
  return (
    <S.StatePage role="alert">
      <AlertCircle />
      <h1>Não foi possível abrir o painel</h1>
      <p>{error}</p>
      <S.Button $variant="primary" onClick={onRetry}>
        <RefreshCw size={16} /> Tentar novamente
      </S.Button>
    </S.StatePage>
  );
}

export function ConfirmAction({
  title,
  description,
  confirmLabel,
  danger,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (reason.trim().length < 8) {
      setError('Informe um motivo com pelo menos 8 caracteres para a auditoria.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'A operação não pôde ser concluída.',
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <S.Button onClick={onClose}>Cancelar</S.Button>
          <S.Button
            $variant={danger ? 'danger' : 'primary'}
            disabled={saving}
            onClick={() => void submit()}
          >
            {saving ? 'Salvando…' : confirmLabel}
          </S.Button>
        </>
      }
    >
      <S.Fields>
        <label className="wide">
          Motivo da alteração
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explique por que esta ação é necessária"
          />
        </label>
      </S.Fields>
      {error ? (
        <S.InlineAlert $tone="error" role="alert">
          {error}
        </S.InlineAlert>
      ) : null}
    </Modal>
  );
}
