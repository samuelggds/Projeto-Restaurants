import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearRuntimeRecoveryAttempt, requestRuntimeReload } from './runtimeRecovery';

type AppRuntimeBoundaryProps = {
  children: ReactNode;
};

type AppRuntimeBoundaryState = {
  error: Error | null;
  reconnecting: boolean;
};

const shellStyle = {
  alignItems: 'center',
  background: '#f8fafc',
  color: '#1f2937',
  display: 'flex',
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  justifyContent: 'center',
  minHeight: '100vh',
  padding: '24px',
} as const;

const cardStyle = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '20px',
  boxShadow: '0 20px 55px rgba(15, 23, 42, 0.12)',
  maxWidth: '520px',
  padding: '30px',
  textAlign: 'center',
  width: '100%',
} as const;

const buttonStyle = {
  background: '#d45b3a',
  border: 0,
  borderRadius: '12px',
  color: '#ffffff',
  font: 'inherit',
  fontWeight: 700,
  marginTop: '20px',
  minHeight: '44px',
  padding: '10px 20px',
} as const;

export default class AppRuntimeBoundary extends Component<
  AppRuntimeBoundaryProps,
  AppRuntimeBoundaryState
> {
  state: AppRuntimeBoundaryState = { error: null, reconnecting: false };

  static getDerivedStateFromError(error: Error): AppRuntimeBoundaryState {
    return { error, reconnecting: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const reconnecting = requestRuntimeReload(error);
    if (reconnecting) this.setState({ reconnecting: true });

    if (import.meta.env.DEV) {
      console.error('[APP_RUNTIME_ERROR]', error, errorInfo.componentStack);
    }
  }

  private reload = () => {
    clearRuntimeRecoveryAttempt();
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const title = this.state.reconnecting
      ? 'Reconectando ao projeto…'
      : 'Não foi possível carregar a página';
    const description = this.state.reconnecting
      ? 'O frontend foi reiniciado. A página será atualizada automaticamente.'
      : 'Ocorreu uma falha durante a inicialização. Recarregue para tentar novamente.';

    return (
      <main style={shellStyle} role="alert" aria-live="assertive">
        <section style={cardStyle}>
          <p style={{ color: '#d45b3a', fontSize: '13px', fontWeight: 800, marginBottom: '8px' }}>
            PEÇA JÁ
          </p>
          <h1 style={{ fontSize: 'clamp(24px, 5vw, 32px)', lineHeight: 1.15 }}>{title}</h1>
          <p style={{ color: '#64748b', lineHeight: 1.6, marginTop: '12px' }}>{description}</p>
          {!this.state.reconnecting && (
            <button type="button" style={buttonStyle} onClick={this.reload}>
              Recarregar página
            </button>
          )}
        </section>
      </main>
    );
  }
}
