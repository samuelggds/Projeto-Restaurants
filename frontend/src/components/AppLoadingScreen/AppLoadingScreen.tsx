type AppLoadingScreenProps = {
  message?: string;
};

const loadingStyle = {
  alignItems: 'center',
  background: '#faf9f5',
  color: '#475569',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
  justifyContent: 'center',
  minHeight: '100dvh',
  padding: '24px',
  animation: 'none',
};

export default function AppLoadingScreen({ message = 'Carregando...' }: AppLoadingScreenProps) {
  return (
    <main
      className="app-route-loading"
      style={loadingStyle}
      aria-busy="true"
      aria-live="polite"
    >
      <img src="/gastronexa-logo.svg" width="72" height="63" alt="GastroNexa" />
      <strong style={{ color: '#1f2937', fontSize: '18px', lineHeight: 1 }}>GastroNexa</strong>
      <span role="status" style={{ fontSize: '14px' }}>
        {message}
      </span>
    </main>
  );
}
