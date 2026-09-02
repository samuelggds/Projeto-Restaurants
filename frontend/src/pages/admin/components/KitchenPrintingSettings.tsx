import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  KeyRound,
  MonitorCheck,
  Power,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCw,
  Search,
  Unplug,
  X,
} from 'lucide-react';
import kitchenPrintingService, {
  type KitchenPrinterSettings,
  type KitchenPrintJobSummary,
  type KitchenPrintingConfiguration,
} from '../../../Services/kitchenPrintingService';
import { KitchenPrintPreview } from './KitchenPrintPreview';
import * as S from './KitchenPrintingSettingsGuide.styles';

const STATUS_REFRESH_MS = 30_000;

function errorMessage(error: unknown, fallback: string) {
  const typed = error as {
    message?: string;
    response?: { data?: { error?: string; message?: string } };
  };
  return String(
    typed.response?.data?.error || typed.response?.data?.message || typed.message || fallback,
  );
}

function sameSettings(left: KitchenPrinterSettings, right: KitchenPrinterSettings) {
  return (
    left.enabled === right.enabled &&
    left.autoPrintEnabled === right.autoPrintEnabled &&
    left.autoPrintTrigger === right.autoPrintTrigger &&
    left.paperWidth === right.paperWidth &&
    left.copies === right.copies
  );
}

export function KitchenPrintingSettings() {
  const mountedRef = useRef(true);
  const [configuration, setConfiguration] = useState<KitchenPrintingConfiguration | null>(null);
  const [draft, setDraft] = useState<KitchenPrinterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'save' | 'credential' | 'test' | 'revoke' | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(
    null,
  );
  const [credential, setCredential] = useState('');
  const [jobs, setJobs] = useState<KitchenPrintJobSummary[]>([]);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState('Agente principal da cozinha');
  const [copied, setCopied] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [jobPage, setJobPage] = useState(0);

  const loadConfiguration = useCallback(async (showLoading = false) => {
    if (showLoading && mountedRef.current) setLoading(true);
    try {
      const result = await kitchenPrintingService.getConfiguration();
      if (!mountedRef.current) return;
      setConfiguration(result);
      setDraft((current) => current ?? result.settings);
      setDeviceName((current) => result.agent?.name || current);
      setFeedback((current) => (current?.tone === 'error' ? null : current));
      kitchenPrintingService
        .listJobs(50)
        .then((recentJobs) => {
          if (mountedRef.current) setJobs(recentJobs);
        })
        .catch(() => undefined);
    } catch (error) {
      if (!mountedRef.current) return;
      setFeedback({
        tone: 'error',
        message: errorMessage(error, 'Não foi possível carregar a configuração de impressão.'),
      });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const initialLoadTimer = window.setTimeout(() => void loadConfiguration(), 0);
    const interval = window.setInterval(() => void loadConfiguration(), STATUS_REFRESH_MS);
    return () => {
      mountedRef.current = false;
      window.clearTimeout(initialLoadTimer);
      window.clearInterval(interval);
    };
  }, [loadConfiguration]);

  const dirty = useMemo(
    () => Boolean(draft && configuration && !sameSettings(draft, configuration.settings)),
    [configuration, draft],
  );
  const filteredJobs = useMemo(
    () =>
      orderSearch
        ? jobs.filter((job) => job.orderId !== null && String(job.orderId).includes(orderSearch))
        : jobs,
    [jobs, orderSearch],
  );
  const jobPageCount = Math.max(1, Math.ceil(filteredJobs.length / 5));
  const currentJobPage = Math.min(jobPage, jobPageCount - 1);
  const firstVisibleJob = currentJobPage * 5;
  const visibleJobs = filteredJobs.slice(firstVisibleJob, firstVisibleJob + 5);

  const updateDraft = <K extends keyof KitchenPrinterSettings>(
    key: K,
    value: KitchenPrinterSettings[K],
  ) => setDraft((current) => (current ? { ...current, [key]: value } : current));

  const save = async () => {
    if (!draft || busy) return;
    setBusy('save');
    setFeedback(null);
    try {
      const saved = await kitchenPrintingService.updateSettings(draft);
      if (!mountedRef.current) return;
      setConfiguration((current) => (current ? { ...current, settings: saved } : current));
      setDraft(saved);
      setFeedback({ tone: 'success', message: 'Configuração de impressão salva com segurança.' });
    } catch (error) {
      if (!mountedRef.current) return;
      setFeedback({
        tone: 'error',
        message: errorMessage(error, 'Não foi possível salvar a configuração de impressão.'),
      });
    } finally {
      if (mountedRef.current) setBusy(null);
    }
  };

  const issueCredential = async () => {
    if (busy) return;
    setBusy('credential');
    setFeedback(null);
    setCredential('');
    setCopied(false);
    try {
      const result = await kitchenPrintingService.issueCredential({
        ...(configuration?.agent?.publicId ? { devicePublicId: configuration.agent.publicId } : {}),
        name: deviceName.trim() || 'Agente principal da cozinha',
      });
      if (!mountedRef.current) return;
      setCredential(result.credential);
      setFeedback({
        tone: 'success',
        message: configuration?.agent
          ? 'Credencial rotacionada. A chave anterior já deixou de funcionar.'
          : 'Credencial criada. Configure-a agora no computador da cozinha.',
      });
      await loadConfiguration();
    } catch (error) {
      if (!mountedRef.current) return;
      setFeedback({
        tone: 'error',
        message: errorMessage(error, 'Não foi possível gerar a credencial do agente.'),
      });
    } finally {
      if (mountedRef.current) setBusy(null);
    }
  };

  const revokeCredential = async () => {
    const publicId = configuration?.agent?.publicId;
    if (!publicId || busy) return;
    setBusy('revoke');
    setFeedback(null);
    try {
      await kitchenPrintingService.revokeCredential(publicId);
      if (!mountedRef.current) return;
      setCredential('');
      setConfiguration((current) => (current ? { ...current, agent: null } : current));
      setFeedback({ tone: 'success', message: 'Acesso do agente revogado.' });
    } catch (error) {
      if (!mountedRef.current) return;
      setFeedback({
        tone: 'error',
        message: errorMessage(error, 'Não foi possível revogar o agente.'),
      });
    } finally {
      if (mountedRef.current) setBusy(null);
    }
  };

  const printTest = async () => {
    if (busy || !draft?.enabled || dirty) return;
    setBusy('test');
    setFeedback(null);
    try {
      await kitchenPrintingService.printTest();
      if (!mountedRef.current) return;
      setFeedback({
        tone: 'success',
        message:
          'Teste adicionado à fila. Ele será impresso assim que o agente estiver disponível.',
      });
      await loadConfiguration();
    } catch (error) {
      if (!mountedRef.current) return;
      setFeedback({
        tone: 'error',
        message: errorMessage(error, 'Não foi possível adicionar o teste à fila.'),
      });
    } finally {
      if (mountedRef.current) setBusy(null);
    }
  };

  const copyCredential = async () => {
    if (!credential) return;
    try {
      await navigator.clipboard.writeText(credential);
      if (!mountedRef.current) return;
      setCopied(true);
    } catch {
      setFeedback({
        tone: 'error',
        message: 'Não foi possível copiar automaticamente. Selecione a credencial e copie.',
      });
    }
  };

  const retryJob = async (jobPublicId: string) => {
    if (retryingJobId) return;
    setRetryingJobId(jobPublicId);
    setFeedback(null);
    try {
      await kitchenPrintingService.retryJob(jobPublicId);
      if (!mountedRef.current) return;
      setFeedback({
        tone: 'success',
        message: 'Job devolvido à fila. O agente tentará imprimir novamente.',
      });
      await loadConfiguration();
    } catch (error) {
      if (!mountedRef.current) return;
      setFeedback({
        tone: 'error',
        message: errorMessage(error, 'Não foi possível repetir este job.'),
      });
    } finally {
      if (mountedRef.current) setRetryingJobId(null);
    }
  };

  if (loading && !draft) {
    return (
      <S.Root>
        <div className="load-state" role="status">
          Carregando configuração segura da impressora…
        </div>
      </S.Root>
    );
  }

  if (!draft || !configuration) {
    return (
      <S.Root>
        <div className="load-state error" role="alert">
          <span>{feedback?.message || 'A configuração de impressão não está disponível.'}</span>
          <button className="secondary" type="button" onClick={() => void loadConfiguration(true)}>
            Tentar novamente
          </button>
        </div>
      </S.Root>
    );
  }

  const { agent, queue } = configuration;
  const pendingJobs = (queue.PENDING || 0) + (queue.PROCESSING || 0);
  const canConfigureAgent = draft.enabled && !dirty;
  const setupComplete = Boolean(draft.enabled && !dirty && agent?.online && agent.printerName);
  const nextAction = !draft.enabled
    ? 'Ative a impressão no passo 1 para começar.'
    : dirty
      ? 'Salve suas escolhas para continuar a configuração.'
      : !agent
        ? 'Gere uma chave no passo 3 e conecte o computador da cozinha.'
        : !agent.online
          ? 'Abra o Print Agent no computador da cozinha para ele ficar online.'
          : !agent.printerName
            ? 'Escolha a impressora térmica dentro do Print Agent.'
            : 'Tudo pronto. Faça uma impressão de teste para conferir a comanda.';

  return (
    <S.Root>
      <header className="setup-intro">
        <span className="intro-icon" aria-hidden="true">
          <Printer />
        </span>
        <div>
          <span className="eyebrow">Operação da cozinha</span>
          <h2>Comandas impressas sem complicação</h2>
          <p>
            Defina como os pedidos chegam à impressora e acompanhe a conexão do computador da
            cozinha.
          </p>
        </div>
      </header>

      <div className="status-summary" aria-label="Resumo da impressão">
        <div className={draft.enabled ? 'success' : ''}>
          <span className="status-icon">
            <Power aria-hidden="true" />
          </span>
          <span>
            <b>{draft.enabled ? 'Impressão ativada' : 'Impressão desativada'}</b>
            <small>Recurso da cozinha</small>
          </span>
        </div>
        <div className={agent?.online ? 'success' : ''}>
          <span className="status-icon">
            <MonitorCheck aria-hidden="true" />
          </span>
          <span>
            <b>{agent?.online ? 'Conectado' : 'Desconectado'}</b>
            <small>Computador da cozinha</small>
          </span>
        </div>
        <div className={pendingJobs > 0 ? 'attention' : ''}>
          <span className="status-icon">
            <ReceiptText aria-hidden="true" />
          </span>
          <span>
            <b>{pendingJobs}</b>
            <small>{pendingJobs === 1 ? 'Comanda aguardando' : 'Comandas aguardando'}</small>
          </span>
        </div>
      </div>

      <div className={`next-action ${setupComplete ? 'complete' : ''}`} role="status">
        <span>{setupComplete ? <CheckCircle2 /> : <span className="next-number">→</span>}</span>
        <div>
          <b>{setupComplete ? 'Configuração concluída' : 'Próximo passo'}</b>
          <p>{nextAction}</p>
        </div>
      </div>

      {feedback && (
        <div
          className={`feedback ${feedback.tone}`}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </div>
      )}

      <div className="setup-flow">
        <section className="step-card activation-step">
          <div className="step-header">
            <span className="step-number">1</span>
            <div>
              <h3>Ative a impressora da cozinha</h3>
              <p>Use esta opção somente se o restaurante possui uma impressora térmica.</p>
            </div>
            <label className="switch" aria-label="Usar impressora da cozinha">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(event) => updateDraft('enabled', event.target.checked)}
              />
              <span />
            </label>
          </div>
          <div className={`activation-note ${draft.enabled ? 'active' : ''}`}>
            <b>{draft.enabled ? 'Recurso ativado' : 'Recurso desativado'}</b>
            <span>
              {draft.enabled
                ? 'Continue no passo 2 para definir como as comandas serão impressas.'
                : 'Nenhuma comanda será criada ou enviada para a impressora.'}
            </span>
          </div>
        </section>

        <section className={`step-card print-rules-step ${draft.enabled ? '' : 'locked'}`}>
          <div className="step-header">
            <span className="step-number">2</span>
            <div>
              <h3>Escolha como imprimir</h3>
              <p>Defina o momento, o tamanho do papel e a quantidade de cópias.</p>
            </div>
          </div>

          {draft.enabled ? (
            <div className="configuration">
              <div className="toggle-line">
                <div>
                  <b>Imprimir novos pedidos automaticamente</b>
                  <small>
                    Quando desligado, a equipe ainda poderá solicitar impressões manualmente.
                  </small>
                </div>
                <label className="switch" aria-label="Ativar impressão automática">
                  <input
                    type="checkbox"
                    checked={draft.autoPrintEnabled}
                    onChange={(event) => updateDraft('autoPrintEnabled', event.target.checked)}
                  />
                  <span />
                </label>
              </div>

              {draft.autoPrintEnabled && (
                <fieldset>
                  <legend className="field-title">Quando a comanda deve ser impressa?</legend>
                  <span className="field-help">Escolha a opção que combina com sua operação.</span>
                  <div className="choice-grid">
                    <label
                      className={`choice ${draft.autoPrintTrigger === 'NEW_ORDER' ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="printer-trigger"
                        value="NEW_ORDER"
                        checked={draft.autoPrintTrigger === 'NEW_ORDER'}
                        onChange={() => updateDraft('autoPrintTrigger', 'NEW_ORDER')}
                      />
                      <span className="recommended">Recomendado</span>
                      <b>Quando o pedido entrar na cozinha</b>
                      <small>
                        A equipe recebe a comanda e pode iniciar o preparo imediatamente.
                      </small>
                    </label>
                    <label
                      className={`choice ${draft.autoPrintTrigger === 'PAYMENT_CONFIRMED' ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="printer-trigger"
                        value="PAYMENT_CONFIRMED"
                        checked={draft.autoPrintTrigger === 'PAYMENT_CONFIRMED'}
                        onChange={() => updateDraft('autoPrintTrigger', 'PAYMENT_CONFIRMED')}
                      />
                      <b>Depois de confirmar o pagamento</b>
                      <small>A comanda espera o pedido ficar com o status de pago.</small>
                    </label>
                  </div>
                </fieldset>
              )}

              {draft.autoPrintEnabled && draft.autoPrintTrigger === 'PAYMENT_CONFIRMED' && (
                <div className="warning">
                  <AlertTriangle />
                  <span>
                    Pedidos com pagamento na entrega e contas de mesa podem demorar a imprimir. Se a
                    cozinha precisa receber tudo imediatamente, escolha a opção recomendada.
                  </span>
                </div>
              )}

              <div className="print-format">
                <fieldset>
                  <legend className="field-title">Qual é a largura do papel?</legend>
                  <div className="choice-grid paper-options">
                    {(['MM58', 'MM80'] as const).map((width) => (
                      <label
                        key={width}
                        className={`choice compact ${draft.paperWidth === width ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="paper-width"
                          value={width}
                          checked={draft.paperWidth === width}
                          onChange={() => updateDraft('paperWidth', width)}
                        />
                        <b>{width === 'MM58' ? '58 mm' : '80 mm'}</b>
                        <small>
                          {width === 'MM58' ? 'Bobina estreita' : 'Bobina larga e mais legível'}
                        </small>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="copies">
                  <span className="field-title">Quantas cópias?</span>
                  <small>De 1 a 5 por pedido.</small>
                  <input
                    aria-label="Número de cópias"
                    type="number"
                    min="1"
                    max="5"
                    value={draft.copies}
                    onChange={(event) =>
                      updateDraft(
                        'copies',
                        Math.max(1, Math.min(5, Math.round(Number(event.target.value) || 1))),
                      )
                    }
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="locked-message">
              <b>Este passo será liberado depois da ativação</b>
              <span>Ligue a opção do passo 1 para visualizar as escolhas de impressão.</span>
            </div>
          )}

          <div className={`save-strip ${dirty ? 'pending' : ''}`}>
            <div>
              <b>
                {dirty ? 'Existem alterações que ainda não foram salvas' : 'Configuração salva'}
              </b>
              <span>
                {dirty
                  ? 'Salve agora para aplicar as escolhas e liberar o próximo passo.'
                  : draft.enabled
                    ? 'As escolhas acima já estão valendo para este restaurante.'
                    : 'A impressão da cozinha permanece desativada.'}
              </span>
            </div>
            {dirty && (
              <button
                className="primary"
                type="button"
                disabled={busy !== null}
                onClick={() => void save()}
              >
                {busy === 'save' ? 'Salvando…' : 'Salvar configuração'}
              </button>
            )}
          </div>
        </section>

        <section className={`step-card connection-step ${canConfigureAgent ? '' : 'locked'}`}>
          <div className="step-header">
            <span className="step-number">3</span>
            <div>
              <h3>Conecte o computador da cozinha</h3>
              <p>O Print Agent faz a ponte segura entre o sistema e a impressora do Windows.</p>
            </div>
            {canConfigureAgent && (
              <button
                className="icon-button"
                type="button"
                aria-label="Atualizar status do agente"
                disabled={loading}
                onClick={() => void loadConfiguration(true)}
              >
                <RefreshCw size={16} />
              </button>
            )}
          </div>

          {!canConfigureAgent ? (
            <div className="locked-message">
              <b>{draft.enabled ? 'Salve antes de conectar' : 'Conclua os passos anteriores'}</b>
              <span>
                {draft.enabled
                  ? 'A conexão será liberada assim que as alterações forem salvas.'
                  : 'Ative e salve a configuração da impressora para continuar.'}
              </span>
            </div>
          ) : (
            <div className="agent-content">
              <div className={`agent-state ${agent?.online ? 'online' : ''}`}>
                <span className="agent-icon">{agent?.online ? <CheckCircle2 /> : <Unplug />}</span>
                <div>
                  <b>
                    {agent?.online
                      ? 'Computador conectado'
                      : agent
                        ? 'Computador desconectado'
                        : 'Nenhum computador conectado'}
                  </b>
                  <small>
                    {agent?.online
                      ? 'O Print Agent está pronto para receber comandas.'
                      : agent
                        ? 'Abra o Print Agent no computador da cozinha.'
                        : 'Siga as instruções abaixo para fazer o primeiro acesso.'}
                  </small>
                </div>
              </div>

              {!agent && (
                <ol className="pairing-guide">
                  <li>
                    <span>1</span>
                    <div>
                      <b>Dê um nome ao computador</b>
                      <small>Use um nome fácil, como “Computador da cozinha”.</small>
                    </div>
                  </li>
                  <li>
                    <span>2</span>
                    <div>
                      <b>Gere uma chave de conexão</b>
                      <small>A chave identifica este restaurante com segurança.</small>
                    </div>
                  </li>
                  <li>
                    <span>3</span>
                    <div>
                      <b>Abra o Print Agent e informe a chave</b>
                      <small>Depois, escolha a impressora térmica instalada no Windows.</small>
                    </div>
                  </li>
                </ol>
              )}

              <div className="agent-setup">
                <label className="device-name">
                  <span>Nome deste computador</span>
                  <small>Este nome aparecerá somente para a equipe administrativa.</small>
                  <input
                    aria-label="Nome do computador do Print Agent"
                    maxLength={80}
                    value={deviceName}
                    onChange={(event) => setDeviceName(event.target.value)}
                  />
                </label>
                <button
                  className="secondary"
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void issueCredential()}
                >
                  <RotateCw size={15} />
                  {busy === 'credential'
                    ? 'Gerando…'
                    : agent
                      ? 'Gerar uma nova chave'
                      : 'Gerar chave de conexão'}
                </button>
              </div>

              {credential && (
                <div className="credential" role="region" aria-label="Credencial do agente">
                  <div className="credential-head">
                    <KeyRound />
                    <div>
                      <h4>Copie esta chave agora</h4>
                      <p>Ela será exibida apenas uma vez e deve ser informada no Print Agent.</p>
                    </div>
                  </div>
                  <div className="credential-row">
                    <input aria-label="Credencial do Print Agent" readOnly value={credential} />
                    <button className="copy" type="button" onClick={() => void copyCredential()}>
                      <Copy size={15} /> {copied ? 'Copiado' : 'Copiar chave'}
                    </button>
                  </div>
                  <small className="credential-note">
                    Por segurança, o servidor armazena somente o hash e não poderá mostrar esta
                    chave novamente. Uma nova chave invalida imediatamente a anterior.
                  </small>
                </div>
              )}

              {agent && (
                <div className="agent-details">
                  <dl className="facts">
                    <div>
                      <dt>Impressora escolhida</dt>
                      <dd title={agent.printerName || undefined}>
                        {agent.printerName || 'Ainda não escolhida'}
                      </dd>
                    </div>
                    <div>
                      <dt>Nome do computador</dt>
                      <dd>{agent.name}</dd>
                    </div>
                    <div>
                      <dt>Último contato</dt>
                      <dd>
                        {agent.lastSeenAt
                          ? new Date(agent.lastSeenAt).toLocaleString('pt-BR')
                          : 'Nunca'}
                      </dd>
                    </div>
                  </dl>
                  <div className="agent-actions">
                    <button
                      className="secondary"
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void printTest()}
                    >
                      <Printer size={15} />
                      {busy === 'test' ? 'Enviando teste…' : 'Imprimir página de teste'}
                    </button>
                    <button
                      className="danger"
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void revokeCredential()}
                    >
                      {busy === 'revoke' ? 'Desconectando…' : 'Desconectar computador'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <KitchenPrintPreview settings={draft} />
      </div>

      <details className="history" open={jobs.length > 0}>
        <summary>
          <div>
            <h3>Histórico de impressão</h3>
            <p>Consulte testes, comandas impressas e tentativas que precisam de atenção.</p>
          </div>
          <span>
            {jobs.length
              ? orderSearch
                ? `${filteredJobs.length} de ${jobs.length} registro(s)`
                : `${jobs.length} registro(s)`
              : 'Nenhuma impressão ainda'}
          </span>
        </summary>
        {jobs.length ? (
          <div className="history-content">
            <div className="history-toolbar">
              <label className="history-search">
                <Search aria-hidden="true" />
                <input
                  aria-label="Pesquisar histórico pelo número do pedido"
                  inputMode="numeric"
                  placeholder="Buscar número do pedido"
                  value={orderSearch}
                  onChange={(event) => {
                    setOrderSearch(event.target.value.replace(/\D/g, ''));
                    setJobPage(0);
                  }}
                />
                {orderSearch ? (
                  <button
                    aria-label="Limpar pesquisa do histórico"
                    onClick={() => {
                      setOrderSearch('');
                      setJobPage(0);
                    }}
                    type="button"
                  >
                    <X aria-hidden="true" />
                  </button>
                ) : null}
              </label>
            </div>

            {visibleJobs.length ? (
              <div className="jobs-list">
                {visibleJobs.map((job) => (
                  <div className="job" key={job.publicId}>
                    <span className={`job-status ${job.status.toLocaleLowerCase('pt-BR')}`}>
                      {job.status === 'PENDING'
                        ? 'Aguardando'
                        : job.status === 'PROCESSING'
                          ? 'Imprimindo'
                          : job.status === 'PRINTED'
                            ? 'Impresso'
                            : job.status === 'FAILED'
                              ? 'Falhou'
                              : 'Cancelado'}
                    </span>
                    <span className="job-identity">
                      <b>{job.type === 'TEST' ? 'Teste de impressão' : `Pedido #${job.orderId}`}</b>
                      <small>
                        {job.source === 'MANUAL'
                          ? 'Reimpressão manual'
                          : job.source === 'AUTOMATIC'
                            ? 'Impressão automática'
                            : 'Teste'}{' '}
                        • {new Date(job.createdAt).toLocaleString('pt-BR')}
                      </small>
                    </span>
                    <span className="job-attempts">{job.attempts} tentativa(s)</span>
                    {job.status === 'FAILED' && (
                      <button
                        className="secondary"
                        type="button"
                        disabled={retryingJobId !== null}
                        onClick={() => void retryJob(job.publicId)}
                      >
                        {retryingJobId === job.publicId ? 'Reenfileirando…' : 'Tentar novamente'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="jobs-empty">
                Nenhum pedido encontrado com o número <b>#{orderSearch}</b>.
              </div>
            )}

            {filteredJobs.length > 5 ? (
              <footer className="history-pagination">
                <span>
                  {firstVisibleJob + 1}–{Math.min(firstVisibleJob + 5, filteredJobs.length)} de{' '}
                  {filteredJobs.length}
                </span>
                <div>
                  <button
                    aria-label="Voltar 5 impressões"
                    className="secondary"
                    disabled={currentJobPage === 0}
                    onClick={() => setJobPage((current) => Math.max(0, current - 1))}
                    type="button"
                  >
                    <ChevronLeft aria-hidden="true" /> Voltar 5
                  </button>
                  <button
                    aria-label="Mostrar próximas 5 impressões"
                    className="secondary"
                    disabled={currentJobPage >= jobPageCount - 1}
                    onClick={() => setJobPage((current) => Math.min(jobPageCount - 1, current + 1))}
                    type="button"
                  >
                    Próximas 5 <ChevronRight aria-hidden="true" />
                  </button>
                </div>
              </footer>
            ) : null}
          </div>
        ) : (
          <div className="jobs-empty">O histórico aparecerá depois da primeira impressão.</div>
        )}
      </details>
    </S.Root>
  );
}
