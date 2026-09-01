import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  KeyRound,
  Printer,
  RefreshCw,
  RotateCw,
  Unplug,
} from 'lucide-react';
import kitchenPrintingService, {
  type KitchenPrinterSettings,
  type KitchenPrintJobSummary,
  type KitchenPrintingConfiguration,
} from '../../../Services/kitchenPrintingService';
import * as S from './KitchenPrintingSettings.styles';

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
        .listJobs()
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

  return (
    <S.Root>
      <div className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <Printer size={15} /> Integração local e opcional
          </span>
          <h2>Comandas chegando direto na cozinha</h2>
          <p>
            O pedido é guardado em uma fila segura e o agente local envia a comanda para a
            impressora escolhida. Se o computador estiver offline, nada é perdido.
          </p>
        </div>
        <div className="hero-status" aria-label="Resumo da impressão">
          <span className={`status-pill ${draft.enabled ? 'online' : ''}`}>
            <span className="dot" /> {draft.enabled ? 'Impressão ativada' : 'Impressão desativada'}
          </span>
          <span className={`status-pill ${agent?.online ? 'online' : ''}`}>
            <span className="dot" /> {agent?.online ? 'Agente conectado' : 'Agente offline'}
          </span>
          <span className="status-pill">
            {pendingJobs} {pendingJobs === 1 ? 'job aguardando' : 'jobs aguardando'}
          </span>
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

      {credential && (
        <div className="credential" role="region" aria-label="Credencial do agente">
          <div className="credential-head">
            <KeyRound />
            <div>
              <h3>Credencial exibida uma única vez</h3>
              <p>Copie e use no comando de pareamento do Print Agent neste computador.</p>
            </div>
          </div>
          <div className="credential-row">
            <input aria-label="Credencial do Print Agent" readOnly value={credential} />
            <button className="copy" type="button" onClick={() => void copyCredential()}>
              <Copy size={15} /> {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <small className="credential-note">
            Por segurança, o servidor armazena somente o hash e não poderá mostrar esta chave
            novamente. Uma rotação invalida imediatamente a chave anterior.
          </small>
        </div>
      )}

      <div className="grid">
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Automação da cozinha</h3>
              <p>Ative apenas se este restaurante utiliza uma impressora térmica.</p>
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

          <div className={`configuration ${draft.enabled ? '' : 'disabled'}`}>
            <div className="toggle-line">
              <div>
                <b>Impressão automática</b>
                <small>Novas comandas entram na fila sem ação manual da equipe.</small>
              </div>
              <label className="switch" aria-label="Ativar impressão automática">
                <input
                  type="checkbox"
                  disabled={!draft.enabled}
                  checked={draft.autoPrintEnabled}
                  onChange={(event) => updateDraft('autoPrintEnabled', event.target.checked)}
                />
                <span />
              </label>
            </div>

            <fieldset disabled={!draft.enabled}>
              <legend className="field-title">Quando imprimir automaticamente?</legend>
              <span className="field-help">Escolha o momento que corresponde ao seu fluxo.</span>
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
                  <b>Ao entrar na cozinha</b>
                  <small>
                    Ideal para pedidos na entrega e para começar o preparo imediatamente.
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
                  <b>Após pagamento confirmado</b>
                  <small>Espera a transição segura do pedido para pago.</small>
                </label>
              </div>
            </fieldset>

            {draft.autoPrintTrigger === 'PAYMENT_CONFIRMED' && (
              <div className="warning">
                <AlertTriangle />
                <span>
                  Pedidos com pagamento na entrega e contas de mesa podem demorar a imprimir até a
                  confirmação. Se a cozinha precisa recebê-los imediatamente, use “Ao entrar na
                  cozinha”.
                </span>
              </div>
            )}

            <div className="compact-grid">
              <fieldset disabled={!draft.enabled}>
                <legend className="field-title">Largura do papel</legend>
                <div className="choice-grid">
                  {(['MM58', 'MM80'] as const).map((width) => (
                    <label
                      key={width}
                      className={`choice ${draft.paperWidth === width ? 'selected' : ''}`}
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
                        {width === 'MM58' ? 'Comanda compacta' : 'Mais espaço e leitura'}
                      </small>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="copies">
                <span className="field-title">Número de cópias</span>
                <input
                  aria-label="Número de cópias"
                  type="number"
                  min="1"
                  max="5"
                  disabled={!draft.enabled}
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

            <div className="footer">
              {dirty && <span className="dirty">Alterações ainda não aplicadas</span>}
              <button
                className="primary"
                type="button"
                disabled={!dirty || busy !== null}
                onClick={() => void save()}
              >
                {busy === 'save' ? 'Salvando…' : 'Salvar configuração'}
              </button>
            </div>
          </div>
        </div>

        <aside className="card agent-card">
          <div className="card-header">
            <div>
              <h3>Print Agent</h3>
              <p>Conecta este restaurante à impressora instalada no Windows.</p>
            </div>
            <button
              className="secondary"
              type="button"
              aria-label="Atualizar status do agente"
              disabled={loading}
              onClick={() => void loadConfiguration(true)}
            >
              <RefreshCw size={15} />
            </button>
          </div>

          <div className={`agent-state ${agent?.online ? 'online' : ''}`}>
            <span className="agent-icon">{agent?.online ? <CheckCircle2 /> : <Unplug />}</span>
            <div>
              <b>{agent?.online ? 'Agente conectado' : agent ? 'Agente offline' : 'Não pareado'}</b>
              <small>
                {agent?.online
                  ? 'Heartbeat recebido recentemente'
                  : agent
                    ? 'Abra o agente no computador da cozinha'
                    : 'Gere uma credencial para começar'}
              </small>
            </div>
          </div>

          <dl className="facts">
            <div>
              <dt>Impressora</dt>
              <dd title={agent?.printerName || undefined}>
                {agent?.printerName || 'Não informada'}
              </dd>
            </div>
            <div>
              <dt>Dispositivo</dt>
              <dd>{agent?.name || 'Não configurado'}</dd>
            </div>
            <div>
              <dt>Último contato</dt>
              <dd>
                {agent?.lastSeenAt ? new Date(agent.lastSeenAt).toLocaleString('pt-BR') : 'Nunca'}
              </dd>
            </div>
          </dl>

          <label className="device-name">
            <span>Nome deste computador</span>
            <input
              aria-label="Nome do computador do Print Agent"
              maxLength={80}
              value={deviceName}
              onChange={(event) => setDeviceName(event.target.value)}
            />
          </label>

          <div className="agent-actions">
            <button
              className="secondary"
              type="button"
              disabled={busy !== null}
              onClick={() => void issueCredential()}
            >
              <RotateCw size={15} />
              {busy === 'credential' ? 'Gerando…' : agent ? 'Rotacionar chave' : 'Gerar chave'}
            </button>
            <button
              className="secondary"
              type="button"
              disabled={!draft.enabled || dirty || busy !== null}
              title={dirty ? 'Salve a configuração antes do teste.' : undefined}
              onClick={() => void printTest()}
            >
              <Printer size={15} /> {busy === 'test' ? 'Enfileirando…' : 'Imprimir teste'}
            </button>
          </div>

          {agent && (
            <button
              className="danger"
              type="button"
              disabled={busy !== null}
              onClick={() => void revokeCredential()}
            >
              {busy === 'revoke' ? 'Revogando…' : 'Revogar acesso do agente'}
            </button>
          )}
        </aside>
      </div>

      <div className="card jobs-card">
        <div className="card-header">
          <div>
            <h3>Atividade recente</h3>
            <p>A fila continua persistida mesmo quando o agente ou a impressora estão offline.</p>
          </div>
        </div>
        {jobs.length ? (
          <div className="jobs-list">
            {jobs.map((job) => (
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
          <div className="jobs-empty">Nenhuma impressão foi solicitada ainda.</div>
        )}
      </div>
    </S.Root>
  );
}
