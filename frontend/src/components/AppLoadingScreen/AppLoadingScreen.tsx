type AppLoadingScreenProps = {
  message?: string;
};

export default function AppLoadingScreen({ message = 'Carregando...' }: AppLoadingScreenProps) {
  return (
    <main className="app-route-loading" aria-busy="true" aria-live="polite">
      <img
        className="app-route-loading-logo"
        src="/gastronexa-logo.svg"
        width="72"
        height="63"
        alt="GastroNexa"
      />
      <span role="status">{message}</span>
    </main>
  );
}
