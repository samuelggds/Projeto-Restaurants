import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  Check,
  Clock3,
  History,
  Lightbulb,
  LoaderCircle,
  Mic,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import aiGuideService, {
  type AiCreditBalance,
  type AiGuide,
  type AiSupportGuide,
  type AiTourGuide,
  type RestaurantAssistantAction,
  type RestaurantAssistantResponse,
  type RestaurantAssistantSettings,
  type RestaurantManagementSummary,
} from '../../../Services/aiGuideService';
import { ChatGptLogo } from '../../../components/ChatGptLogo';

type Props = {
  disabled?: boolean;
  onGuideReady: (guide: AiTourGuide) => void;
  onCreditsChanged: (balance: AiCreditBalance) => void;
  onNavigate?: (target: string) => void;
};

type Tab = 'ask' | 'suggestions' | 'history' | 'help' | 'settings';

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event?: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function requestErrorMessage(error: unknown, fallback: string) {
  const errorLike = error as {
    response?: { data?: { error?: string; code?: string } };
    message?: string;
  };
  const code = String(errorLike.response?.data?.code || '').trim();
  const message = String(errorLike.response?.data?.error || errorLike.message || '').trim();

  if (code === 'OPENAI_RATE_LIMITED') {
    return 'A IA está recebendo muitas solicitações agora. Aguarde alguns segundos e tente novamente.';
  }
  if (code === 'OPENAI_TIMEOUT') {
    return 'A IA demorou mais que o esperado para responder. Tente novamente; o restaurante continua funcionando normalmente.';
  }
  if (code === 'OPENAI_AUTH_ERROR') {
    return 'O serviço de IA está temporariamente indisponível. As demais funções do restaurante continuam funcionando.';
  }
  if (code === 'AI_CREDITS_EXHAUSTED') {
    return 'Os créditos de IA acabaram. Recarregue os créditos para continuar usando o assistente.';
  }
  if (code === 'ADMIN_AI_RESTRICTED_REQUEST') {
    return message || 'Essa informação não está disponível para o perfil ADMIN.';
  }
  return message || fallback;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function actionDescription(action: RestaurantAssistantAction) {
  const preview = action.approvalSnapshot || {};
  if (action.actionType === 'CREATE_PRODUCT') {
    const exact = (preview.exactAction || {}) as Record<string, unknown>;
    return `${String(exact.name || 'Produto')} · ${formatMoney(Number(exact.price || 0))} · ${String(exact.categoryName || 'categoria')}`;
  }
  const affected = Number(preview.affectedRecords || 0);
  return `${affected} registro(s) com a alteração pronta para sua revisão.`;
}

function speechErrorMessage(code?: string) {
  switch (String(code || '').toLowerCase()) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'O navegador bloqueou o microfone. Libere a permissão de microfone para este site e tente novamente.';
    case 'audio-capture':
      return 'Nenhum microfone disponível foi encontrado. Verifique o dispositivo de entrada do computador.';
    case 'no-speech':
      return 'Não detectei fala. Tente novamente e fale depois que o microfone indicar que está ouvindo.';
    case 'network':
      return 'O reconhecimento de voz ficou indisponível pela rede. Você pode continuar digitando normalmente.';
    case 'aborted':
      return '';
    default:
      return 'Não foi possível reconhecer a voz. Verifique a permissão do microfone ou continue digitando.';
  }
}

export function AiGuideAssistant({
  disabled = false,
  onGuideReady,
  onCreditsChanged,
  onNavigate,
}: Props) {
  const [tab, setTab] = useState<Tab>('ask');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState<RestaurantAssistantResponse | null>(null);
  const [summary, setSummary] = useState<RestaurantManagementSummary | null>(null);
  const [history, setHistory] = useState<RestaurantAssistantAction[]>([]);
  const [settings, setSettings] = useState<RestaurantAssistantSettings | null>(null);
  const [supportAnswer, setSupportAnswer] = useState<AiSupportGuide | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [dataMeta, setDataMeta] = useState<{
    generatedAt?: string | null;
    dataUpdatedAt?: string | null;
    timeZone?: string | null;
  }>({});

  const quickPrompts = useMemo(
    () => [
      'Como foram minhas vendas nesta semana?',
      'Quais produtos venderam mais?',
      'Quais pedidos precisam de atenção?',
      'Quais clientes identificados reduziram a frequência?',
      'Quais produtos estão sem descrição ou imagem?',
      'Confira os acertos pendentes.',
    ],
    [],
  );

  useEffect(
    () => () => {
      recognitionRef.current?.abort?.();
      recognitionRef.current = null;
    },
    [],
  );

  const refreshHistory = async () => setHistory(await aiGuideService.listActions());
  const refreshSuggestions = async () => setSummary(await aiGuideService.getManagementSummary());

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      if (tab === 'suggestions' && !summary) {
        void refreshSuggestions().catch((loadError) =>
          setError(requestErrorMessage(loadError, 'Não foi possível carregar as prioridades.')),
        );
      }
      if (tab === 'history') {
        void refreshHistory().catch((loadError) =>
          setError(requestErrorMessage(loadError, 'Não foi possível carregar as atividades.')),
        );
      }
      if (tab === 'settings' && !settings) {
        void aiGuideService
          .getAssistantSettings()
          .then(setSettings)
          .catch((loadError) =>
            setError(requestErrorMessage(loadError, 'Não foi possível carregar as preferências.')),
          );
      }
    }, 0);
    return () => window.clearTimeout(refreshTimer);
  }, [tab, summary, settings]);

  const askRestaurant = async (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < 3 || loading || disabled) return;

    setLoading(true);
    setError('');
    setAnswer(null);
    try {
      const result = await aiGuideService.askRestaurant(trimmed);
      setAnswer(result.response);
      setDataMeta(result.context);
      onCreditsChanged(result.credits);
      setQuestion('');
      if (result.response.action) await refreshHistory();
    } catch (requestError) {
      setError(
        requestErrorMessage(requestError, 'Não foi possível consultar o Assistente do Restaurante.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const askGuide = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < 3 || loading || disabled) return;

    setLoading(true);
    setError('');
    try {
      const result = await aiGuideService.createGuide(trimmed);
      onCreditsChanged(result.credits);
      const guide: AiGuide = result.guide;
      if (guide.mode === 'TOUR') {
        setSupportAnswer(null);
        onGuideReady(guide);
      } else {
        setSupportAnswer(guide);
      }
      setQuestion('');
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'Não foi possível criar a orientação agora.'));
    } finally {
      setLoading(false);
    }
  };

  const approveAction = async (publicId: string) => {
    setLoading(true);
    setError('');
    try {
      const updated = await aiGuideService.approveAction(publicId);
      setAnswer((current) =>
        current?.action?.publicId === publicId ? { ...current, action: updated } : current,
      );
      await refreshHistory();
      await refreshSuggestions().catch(() => undefined);
    } catch (actionError) {
      setError(requestErrorMessage(actionError, 'Não foi possível executar a ação.'));
    } finally {
      setLoading(false);
    }
  };

  const cancelAction = async (publicId: string) => {
    setLoading(true);
    setError('');
    try {
      const updated = await aiGuideService.cancelAction(publicId);
      setAnswer((current) =>
        current?.action?.publicId === publicId ? { ...current, action: updated } : current,
      );
      await refreshHistory();
    } catch (actionError) {
      setError(requestErrorMessage(actionError, 'Não foi possível cancelar a ação.'));
    } finally {
      setLoading(false);
    }
  };

  const startVoice = async () => {
    if (loading || disabled) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError(
        'Ditado por voz não está disponível neste navegador. Use Chrome ou Edge atualizado, ou continue digitando.',
      );
      return;
    }
    if (!window.isSecureContext) {
      setError('O microfone só pode ser usado em uma conexão segura HTTPS.');
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {
      setError(
        'O navegador não liberou o microfone. Clique no cadeado da barra de endereço, permita o microfone e tente novamente.',
      );
      return;
    }

    setError('');
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length })
        .map((_, index) => event.results[index]?.[0]?.transcript || '')
        .join(' ')
        .trim();
      if (transcript) {
        setQuestion((current) => `${current}${current ? ' ' : ''}${transcript}`.trim());
        setError('');
      }
    };
    recognition.onerror = (event) => {
      const message = speechErrorMessage(event?.error);
      if (message) setError(message);
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      setListening(true);
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
      setError('Não foi possível iniciar o microfone agora. Aguarde um instante e tente novamente.');
    }
  };

  const saveSettings = async (patch: Partial<RestaurantAssistantSettings>) => {
    if (!settings) return;
    setLoading(true);
    setError('');
    try {
      setSettings(
        await aiGuideService.updateAssistantSettings({ ...patch, expectedVersion: settings.version }),
      );
      setSummary(null);
    } catch (settingsError) {
      setError(requestErrorMessage(settingsError, 'Não foi possível salvar as preferências da IA.'));
    } finally {
      setLoading(false);
    }
  };

  const renderComposer = (helpMode = false) => (
    <form className="command-form" onSubmit={helpMode ? askGuide : askRestaurant}>
      {!helpMode && (
        <div className="composer-label">
          <div>
            <b>Diga o resultado que você quer</b>
            <span>Escreva como se estivesse falando com um gerente do restaurante.</span>
          </div>
          <span className="session-badge"><ShieldCheck /> restaurante atual</span>
        </div>
      )}
      <div className="composer">
        <textarea
          value={question}
          disabled={disabled || loading}
          maxLength={helpMode ? 800 : 1200}
          placeholder={
            helpMode
              ? 'Ex.: Como cadastro um produto?'
              : 'Ex.: Analise minhas vendas de hoje e me diga o que precisa de atenção.'
          }
          onChange={(event) => setQuestion(event.target.value)}
          aria-label={
            helpMode ? 'Pergunta para ajuda do sistema' : 'Comando para o Assistente do Restaurante'
          }
        />
        {!helpMode && (
          <button
            className={`voice ${listening ? 'active' : ''}`}
            type="button"
            onClick={() => void startVoice()}
            disabled={loading || disabled}
            aria-label={listening ? 'Parar ditado por voz' : 'Iniciar ditado por voz'}
            aria-pressed={listening}
          >
            <Mic />
          </button>
        )}
      </div>
      <div className="actions">
        <span>
          {disabled
            ? 'Créditos de IA indisponíveis.'
            : listening
              ? 'Ouvindo... fale normalmente.'
              : helpMode
                ? 'A ajuda explica o sistema sem executar alterações.'
                : 'A IA pode analisar e preparar tarefas. Alterações continuam sujeitas às regras e aprovações da conta.'}
        </span>
        <button
          className="primary"
          type="submit"
          disabled={disabled || loading || question.trim().length < 3}
        >
          {loading ? <LoaderCircle className="spin" /> : <ChatGptLogo />}
          {loading ? 'Processando...' : helpMode ? 'Abrir ajuda' : 'Executar pedido'}
        </button>
      </div>
    </form>
  );

  return (
    <Card>
      <header className="heading">
        <span className="icon"><ChatGptLogo /></span>
        <div className="heading-copy">
          <span className="eyebrow">IA operacional · restaurante autenticado</span>
          <h2>Peça. Revise. Aprove.</h2>
          <p>
            O assistente usa dados reais deste restaurante para analisar a operação, preparar tarefas e
            automatizar somente ações permitidas pela sua conta.
          </p>
        </div>
      </header>

      <div className="trust-strip" aria-label="Proteções do Assistente do Restaurante">
        <span><ShieldCheck /> Somente este restaurante</span>
        <span><Check /> Escritas passam por validação</span>
        <span><ShieldCheck /> Segredos e plataforma bloqueados</span>
      </div>

      <nav className="tabs" aria-label="Áreas do assistente">
        <button className={tab === 'ask' ? 'active' : ''} type="button" onClick={() => setTab('ask')}>
          <Sparkles /> Comandar
        </button>
        <button
          className={tab === 'suggestions' ? 'active' : ''}
          type="button"
          onClick={() => setTab('suggestions')}
        >
          <Lightbulb /> Prioridades
        </button>
        <button
          className={tab === 'history' ? 'active' : ''}
          type="button"
          onClick={() => setTab('history')}
        >
          <History /> Atividades
        </button>
        <button className={tab === 'help' ? 'active' : ''} type="button" onClick={() => setTab('help')}>
          <ShieldCheck /> Ajuda
        </button>
        <button
          className={tab === 'settings' ? 'active' : ''}
          type="button"
          onClick={() => setTab('settings')}
        >
          <Settings2 /> Preferências
        </button>
      </nav>

      {error && <div className="error" role="alert">{error}</div>}

      {tab === 'ask' && (
        <section className="ask-panel">
          <div className="capability-grid">
            <article>
              <span className="capability-icon"><Sparkles /></span>
              <div><b>Entender o negócio</b><small>Vendas, produtos, pedidos, clientes identificados e prioridades da operação.</small></div>
            </article>
            <article>
              <span className="capability-icon"><Clock3 /></span>
              <div><b>Preparar tarefas</b><small>Cadastros e alterações permitidas ficam prontas para você revisar antes de executar.</small></div>
            </article>
            <article>
              <span className="capability-icon"><ShieldCheck /></span>
              <div><b>Automatizar com limites</b><small>Somente rotinas autorizadas, dentro do restaurante da sessão e do nível escolhido.</small></div>
            </article>
          </div>

          <div className="quick-header">
            <div><b>Comece por um exemplo</b><span>ou escreva qualquer pedido operacional abaixo</span></div>
          </div>
          <div className="quick-grid">
            {quickPrompts.slice(0, 4).map((prompt) => (
              <button key={prompt} type="button" onClick={() => setQuestion(prompt)}>{prompt}</button>
            ))}
          </div>

          {renderComposer()}

          <div className="security-note">
            <ShieldCheck />
            <span>
              A IA não pode trocar de restaurante, acessar SUPER_ADMIN, credenciais, segredos,
              infraestrutura, SQL/shell ou dados de outros clientes da plataforma.
            </span>
          </div>

          {answer && (
            <ResultPanel aria-live="polite">
              <div className="result-title">
                <ChatGptLogo />
                <div>
                  <small>{answer.mode === 'ACTION_PROPOSAL' ? 'Tarefa pronta para revisão' : 'Resposta baseada nos dados do restaurante'}</small>
                  <h3>{answer.title}</h3>
                </div>
              </div>
              <p className="answer-copy">{answer.answer}</p>
              {answer.evidence.length > 0 && (
                <div className="evidence">
                  {answer.evidence.map((item) => (
                    <article key={`${item.label}-${item.value}`}><small>{item.label}</small><b>{item.value}</b></article>
                  ))}
                </div>
              )}
              {answer.missingInformation.length > 0 && (
                <div className="missing">
                  <b>Informações que ainda faltam</b>
                  {answer.missingInformation.map((item) => <span key={item}>• {item}</span>)}
                </div>
              )}
              {answer.action && (
                <ActionPreview>
                  <header>
                    <Clock3 />
                    <div>
                      <b>{answer.action.actionType === 'CREATE_PRODUCT' ? 'Cadastro aguardando sua aprovação' : 'Alteração aguardando sua aprovação'}</b>
                      <small>{actionDescription(answer.action)}</small>
                    </div>
                  </header>
                  <pre>{JSON.stringify(answer.action.approvalSnapshot, null, 2)}</pre>
                  {answer.action.status === 'PROPOSED' && (
                    <div className="action-buttons">
                      <button type="button" onClick={() => void cancelAction(answer.action!.publicId)}>Cancelar</button>
                      <button className="approve" type="button" onClick={() => void approveAction(answer.action!.publicId)}><Check /> Aprovar e executar</button>
                    </div>
                  )}
                  {answer.action.status === 'EXECUTED' && <div className="executed"><Check /> Ação executada e registrada.</div>}
                </ActionPreview>
              )}
              {answer.links.length > 0 && (
                <div className="links">
                  {answer.links.map((link) => (
                    <button key={`${link.target}-${link.label}`} type="button" onClick={() => onNavigate?.(link.target)}>{link.label}</button>
                  ))}
                </div>
              )}
              <small className="data-meta">
                Dados atualizados em {dataMeta.dataUpdatedAt ? new Date(dataMeta.dataUpdatedAt).toLocaleString('pt-BR') : 'horário indisponível'} · Fuso {dataMeta.timeZone || 'do restaurante'}
              </small>
            </ResultPanel>
          )}
        </section>
      )}

      {tab === 'suggestions' && (
        <section className="suggestions">
          {!summary ? (
            <div className="loading-line"><LoaderCircle className="spin" /> Calculando prioridades...</div>
          ) : (
            <>
              <div className="section-copy"><b>O que merece sua atenção agora</b><span>Calculado com dados do próprio restaurante, sem usar dados de outros tenants.</span></div>
              <div className="sales-strip">
                <article><small>Vendas registradas</small><b>{formatMoney(summary.sales.registered.total)}</b><span>{summary.sales.registered.count} pedido(s)</span></article>
                <article><small>Pagamentos confirmados</small><b>{formatMoney(summary.sales.confirmedPayments.total)}</b><span>{summary.sales.confirmedPayments.count} confirmação(ões)</span></article>
                <article><small>Cancelamentos / estornos</small><b>{summary.sales.cancellations.count} / {summary.sales.refunds.count}</b><span>Não representam lucro.</span></article>
              </div>
              <div className="priority-list">
                {summary.priorities.length ? (
                  summary.priorities.map((priority) => (
                    <article key={priority.key}>
                      <small>Prioridade</small>
                      <h3>{priority.situation}</h3>
                      <p><b>Evidência:</b> {priority.evidence}</p>
                      <p>{priority.reason}</p>
                      <button type="button" onClick={() => onNavigate?.(priority.target)}>{priority.label}</button>
                    </article>
                  ))
                ) : (
                  <div className="empty">Nenhuma prioridade relevante foi detectada agora.</div>
                )}
              </div>
              <small className="data-meta">
                Período: {new Date(summary.period.start).toLocaleDateString('pt-BR')} a {new Date(summary.period.end).toLocaleDateString('pt-BR')} · atualizado {new Date(summary.dataUpdatedAt).toLocaleString('pt-BR')}
              </small>
            </>
          )}
        </section>
      )}

      {tab === 'history' && (
        <section>
          <div className="section-copy"><b>Atividades preparadas pela IA</b><span>Você consegue ver o que foi proposto, aprovado, executado ou cancelado.</span></div>
          <div className="history-list">
            {history.length === 0 ? (
              <div className="empty">Nenhuma ação preparada ainda.</div>
            ) : (
              history.map((action) => (
                <article key={action.publicId}>
                  <div><small>{new Date(action.createdAt).toLocaleString('pt-BR')}</small><b>{action.actionType}</b><span>{actionDescription(action)}</span></div>
                  <strong className={`status ${action.status.toLowerCase()}`}>{action.status}</strong>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {tab === 'help' && (
        <section>
          <div className="section-copy"><b>Ajuda para usar o GastroNexa</b><span>Pergunte como realizar uma tarefa sem executar mudanças no restaurante.</span></div>
          {renderComposer(true)}
          {supportAnswer && (
            <SupportPanel>
              <button className="close-support" type="button" aria-label="Fechar resposta" onClick={() => setSupportAnswer(null)}><X /></button>
              <small>Tela/perfil: {supportAnswer.audience}</small>
              <h3>{supportAnswer.title}</h3>
              <p>{supportAnswer.summary}</p>
              <div className="support-answer">{supportAnswer.answer}</div>
              <ol>{supportAnswer.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol>
            </SupportPanel>
          )}
        </section>
      )}

      {tab === 'settings' && (
        <section className="settings-panel">
          {!settings ? (
            <div className="loading-line"><LoaderCircle className="spin" /> Carregando preferências...</div>
          ) : (
            <>
              <div className="settings-intro">
                <div><b>Escolha como a IA trabalha com você</b><small>O nível muda a autonomia operacional, não as permissões de segurança.</small></div>
                <span><ShieldCheck /> proteção permanente</span>
              </div>

              <div className="preference-card">
                <div className="preference-copy"><b>Nível de autonomia</b><small>Você pode deixar a IA apenas analisar ou permitir que ela prepare/automatize tarefas previamente autorizadas.</small></div>
                <select
                  aria-label="Como a IA pode agir"
                  value={settings.autonomyMode}
                  disabled={loading}
                  onChange={(event) => void saveSettings({ autonomyMode: event.target.value as RestaurantAssistantSettings['autonomyMode'] })}
                >
                  <option value="SUGGEST_ONLY">Só analisar e responder</option>
                  <option value="APPROVAL_REQUIRED">Preparar ações e pedir minha aprovação</option>
                  <option value="BOUNDED_AUTOMATION">Automatizar somente tarefas liberadas</option>
                </select>
                <p className="preference-hint">Para começar, use <b>Preparar ações e pedir minha aprovação</b>. A IA monta a tarefa e você confirma antes da execução.</p>
              </div>

              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.automationsEnabled}
                  disabled={loading}
                  onChange={(event) => void saveSettings({ automationsEnabled: event.target.checked })}
                />
                <span><b>Permitir automações liberadas</b><small>Quando desligado, a IA continua analisando e preparando sugestões, mas não executa rotinas automáticas.</small></span>
              </label>

              <div className="locked-rules">
                <ShieldCheck />
                <span><b>Essas regras não podem ser desligadas pelo ADMIN.</b> Outro restaurante, SUPER_ADMIN, credenciais, segredos, infraestrutura, SQL/shell, permissões da plataforma e operações financeiras sensíveis continuam fora do alcance da IA.</span>
              </div>

              <div className="preference-card">
                <div className="preference-copy"><b>Quando chamar sua atenção</b><small>Depois desses tempos, pedidos parados passam a aparecer como prioridade nas análises.</small></div>
                <div className="thresholds">
                  <label>Pendente<input type="number" min={1} max={240} value={settings.pendingOrderMinutes} onChange={(event) => setSettings({ ...settings, pendingOrderMinutes: Number(event.target.value) })} onBlur={() => void saveSettings({ pendingOrderMinutes: settings.pendingOrderMinutes })} /><small>minutos</small></label>
                  <label>Em preparo<input type="number" min={1} max={480} value={settings.preparingOrderMinutes} onChange={(event) => setSettings({ ...settings, preparingOrderMinutes: Number(event.target.value) })} onBlur={() => void saveSettings({ preparingOrderMinutes: settings.preparingOrderMinutes })} /><small>minutos</small></label>
                  <label>Pronto<input type="number" min={1} max={240} value={settings.readyOrderMinutes} onChange={(event) => setSettings({ ...settings, readyOrderMinutes: Number(event.target.value) })} onBlur={() => void saveSettings({ readyOrderMinutes: settings.readyOrderMinutes })} /><small>minutos</small></label>
                  <label>Em entrega<input type="number" min={1} max={720} value={settings.deliveryOrderMinutes} onChange={(event) => setSettings({ ...settings, deliveryOrderMinutes: Number(event.target.value) })} onBlur={() => void saveSettings({ deliveryOrderMinutes: settings.deliveryOrderMinutes })} /><small>minutos</small></label>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </Card>
  );
}

const Card = styled.section`
  --ai-accent:#d45d3b;
  --ai-dark:#17191a;
  --ai-text:#26211e;
  --ai-muted:#776e68;
  padding:22px;
  border:1px solid #e7e2de;
  border-radius:22px;
  background:linear-gradient(180deg,#fff 0%,#fff 70%,#fcfaf8 100%);
  box-shadow:0 22px 60px rgba(39,31,27,.1);
  color:var(--ai-text);

  .heading{display:flex;gap:14px;align-items:flex-start}
  .icon{width:48px;height:48px;display:grid;place-items:center;flex:0 0 auto;border-radius:15px;color:#fff;background:var(--ai-dark);box-shadow:0 8px 24px rgba(23,25,26,.18)}
  .icon svg{width:23px}
  .heading-copy{min-width:0}
  .eyebrow{display:block;color:var(--ai-accent);font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
  .heading h2{margin:3px 0 0;font-size:24px;line-height:1.12;letter-spacing:-.025em}
  .heading p,.help-copy{max-width:640px;margin:7px 0 0;color:var(--ai-muted);font-size:11px;line-height:1.55}

  .trust-strip{display:flex;flex-wrap:wrap;gap:7px;margin:16px 0 0}
  .trust-strip span,.session-badge{display:inline-flex;align-items:center;gap:5px;border:1px solid #e7e2de;border-radius:999px;background:#fbfaf9;color:#665d57;font-size:8px;font-weight:800}
  .trust-strip span{padding:6px 8px}
  .trust-strip svg,.session-badge svg{width:11px;height:11px;color:#2f7b4a}

  .tabs{display:flex;gap:6px;overflow:auto;margin:16px -2px 14px;padding:2px}
  .tabs button{white-space:nowrap;min-height:37px;padding:0 11px;border:1px solid #e8e2de;border-radius:10px;background:#faf8f6;color:#6e655f;font-size:9px;font-weight:850;display:flex;gap:6px;align-items:center;cursor:pointer}
  .tabs button.active{color:#fff;background:#282321;border-color:#282321;box-shadow:0 5px 14px rgba(40,35,33,.14)}
  .tabs svg{width:13px}

  .ask-panel{display:grid;gap:12px}
  .capability-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .capability-grid article{display:grid;grid-template-columns:34px minmax(0,1fr);gap:9px;align-items:start;padding:11px;border:1px solid #ebe5e1;border-radius:13px;background:#fff}
  .capability-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;color:var(--ai-accent);background:#fff2ec}
  .capability-icon svg{width:15px}
  .capability-grid article div{display:grid;gap:3px}
  .capability-grid b{font-size:10px}
  .capability-grid small{color:#827871;font-size:8.5px;line-height:1.45}

  .quick-header,.section-copy{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-top:2px}
  .quick-header>div,.section-copy{display:grid;gap:2px}
  .quick-header b,.section-copy b{font-size:10px}
  .quick-header span,.section-copy span{color:#918780;font-size:8.5px;line-height:1.4}
  .quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
  .quick-grid button{padding:10px;text-align:left;border:1px solid #e9e4df;border-radius:11px;background:#fbfaf9;color:#504943;font-size:9px;font-weight:750;cursor:pointer;transition:border-color 140ms ease,transform 140ms ease,background 140ms ease}
  .quick-grid button:hover{border-color:#cfc4bd;background:#fff;transform:translateY(-1px)}

  .command-form{display:grid;gap:8px}
  .composer-label{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:2px}
  .composer-label>div{display:grid;gap:2px}
  .composer-label b{font-size:10px}
  .composer-label>div span{color:#918780;font-size:8.5px}
  .session-badge{padding:5px 7px;white-space:nowrap}
  .composer{position:relative}
  .composer textarea{width:100%;min-height:108px;padding:14px 50px 14px 14px;border:1px solid #d9d2cc;border-radius:14px;background:#fff;resize:vertical;font:inherit;font-size:11px;line-height:1.55;outline:0;box-shadow:inset 0 1px 0 rgba(255,255,255,.8)}
  .composer textarea:focus{border-color:#8b7b71;box-shadow:0 0 0 3px rgba(72,57,48,.08)}
  .voice{position:absolute;right:10px;bottom:10px;width:35px;height:35px;padding:0;border:0;border-radius:10px;display:grid;place-items:center;background:#eee9e5;color:#514741;cursor:pointer}
  .voice.active{background:var(--ai-accent);color:#fff;box-shadow:0 0 0 4px rgba(212,93,59,.14)}
  .voice svg{width:15px}
  .actions{display:flex;align-items:center;justify-content:space-between;gap:12px}
  .actions>span{max-width:72%;color:#958b84;font-size:8.5px;line-height:1.45}
  .primary,.links button,.priority-list button{min-height:39px;padding:0 13px;border:0;border-radius:10px;background:var(--ai-dark);color:#fff;font-size:9px;font-weight:850;display:flex;align-items:center;gap:7px;cursor:pointer}
  .primary svg{width:14px}
  .primary:disabled{opacity:.55;cursor:not-allowed}
  .spin{animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}

  .security-note,.locked-rules{display:grid;grid-template-columns:18px minmax(0,1fr);gap:8px;align-items:start;padding:9px 10px;border-radius:11px;background:#f2f8f4;color:#54705d;font-size:8.5px;line-height:1.5}
  .security-note svg,.locked-rules svg{width:15px;color:#2f7b4a}
  .locked-rules{border:1px solid #dcebe1;background:#f7fbf8;color:#516258;font-size:9px}
  .locked-rules b{color:#30533b}

  .error{margin:9px 0 11px;padding:10px 12px;border:1px solid #fecaca;border-radius:10px;background:#fff7f7;color:#991b1b;font-size:10px;line-height:1.45}
  .evidence{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}
  .evidence article{padding:10px;border-radius:11px;background:#f7f4f1}
  .evidence small{display:block;color:#8b817a;font-size:8px}
  .evidence b{display:block;margin-top:3px;font-size:10px}
  .missing{display:grid;gap:3px;margin-top:10px;padding:10px;border-radius:10px;background:#fff7ed;color:#7c3d12;font-size:9px}
  .links{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}
  .data-meta{display:block;margin-top:12px;color:#9a9089;font-size:8px;line-height:1.4}
  .loading-line,.empty{padding:18px;text-align:center;color:#847a73;font-size:10px}
  .loading-line{display:flex;gap:8px;justify-content:center}

  .suggestions,.settings-panel{display:grid;gap:12px}
  .sales-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .sales-strip article{padding:11px;border:1px solid #ebe5e1;border-radius:12px;background:#fbfaf9}
  .sales-strip small,.sales-strip span{display:block;color:#8b817a;font-size:8px}
  .sales-strip b{display:block;margin:4px 0;font-size:14px}
  .priority-list{display:grid;gap:8px}
  .priority-list article{padding:13px;border:1px solid #e8e2de;border-radius:13px;background:#fff}
  .priority-list small{color:var(--ai-accent);font-size:8px;font-weight:900;text-transform:uppercase}
  .priority-list h3{margin:3px 0 6px;font-size:12px}
  .priority-list p{margin:3px 0;color:#6f6660;font-size:9px;line-height:1.45}
  .priority-list button{margin-top:8px}

  .history-list{display:grid;gap:7px;margin-top:10px}
  .history-list article{display:flex;justify-content:space-between;gap:10px;padding:11px;border:1px solid #ebe5e1;border-radius:12px;background:#fff}
  .history-list article>div{display:grid;gap:3px}
  .history-list small{color:#918780;font-size:8px}
  .history-list b{font-size:10px}
  .history-list span{color:#746b65;font-size:9px}
  .status{align-self:start;padding:5px 7px;border-radius:999px;background:#eee9e5;font-size:7.5px}
  .status.executed{background:#ecfdf3;color:#166534}
  .status.failed{background:#fff1f2;color:#9f1239}
  .status.canceled{color:#6b7280}

  .settings-intro{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px;border-radius:14px;background:linear-gradient(135deg,#fff7f3,#fbfaf9);border:1px solid #f0ddd5}
  .settings-intro>div{display:grid;gap:3px}
  .settings-intro b{font-size:12px}
  .settings-intro small{color:#766e68;font-size:9px;line-height:1.45}
  .settings-intro>span{white-space:nowrap;padding:6px 8px;border-radius:999px;background:#ecfdf3;color:#166534;font-size:7.5px;font-weight:900;display:flex;align-items:center;gap:4px}
  .settings-intro svg{width:11px}
  .preference-card{display:grid;gap:9px;padding:13px;border:1px solid #ebe5e1;border-radius:13px;background:#fff}
  .preference-copy{display:grid;gap:3px}
  .preference-copy b{font-size:10px}
  .preference-copy small,.preference-hint{color:#80766f;font-size:8.5px;line-height:1.5}
  .settings-panel select,.settings-panel input[type=number]{height:40px;border:1px solid #ddd6d0;border-radius:10px;padding:0 10px;background:#fff;color:#302a26;font-size:9px}
  .toggle{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;padding:13px;border:1px solid #ebe5e1;border-radius:13px;background:#fbfaf9}
  .toggle span{display:grid;gap:3px}
  .toggle b{font-size:10px}
  .toggle small{color:#80766f;font-size:8.5px;line-height:1.45}
  .thresholds{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  .thresholds label{display:grid;grid-template-columns:1fr auto;gap:4px 6px;align-items:center;color:#504943;font-size:8px;font-weight:800}
  .thresholds input{grid-column:1/-1}
  .thresholds small{color:#918780;font-size:7.5px;font-weight:500}

  .support-answer{margin-top:9px;padding:10px;border-radius:10px;background:#fff;font-size:10px;white-space:pre-wrap}
  .close-support{float:right;border:0;background:transparent;cursor:pointer}
  .close-support svg{width:15px}

  @media(max-width:760px){
    padding:16px;
    .capability-grid,.quick-grid,.sales-strip,.evidence,.thresholds{grid-template-columns:1fr}
    .actions{align-items:stretch;flex-direction:column}
    .actions>span{max-width:none}
    .primary{width:100%;justify-content:center}
    .tabs{margin-right:-10px}
    .heading h2{font-size:20px}
    .settings-intro,.composer-label{align-items:flex-start;flex-direction:column}
    .trust-strip{display:grid;grid-template-columns:1fr}
  }
`;

const ResultPanel = styled.section`
  margin-top:2px;
  padding:14px;
  border:1px solid #e4ddd8;
  border-radius:15px;
  background:linear-gradient(180deg,#fcfbfa,#f7f4f1);
  .result-title{display:flex;gap:9px;align-items:center}
  .result-title>svg{width:22px}
  .result-title small{display:block;color:#8a817a;font-size:7.5px;font-weight:900;text-transform:uppercase}
  .result-title h3{margin:2px 0;font-size:14px}
  .answer-copy{margin:10px 0 0;color:#504943;font-size:10px;line-height:1.6;white-space:pre-wrap}
`;

const ActionPreview = styled.section`
  margin-top:12px;
  padding:12px;
  border:1px solid #e6d7cf;
  border-radius:13px;
  background:#fff7f3;
  header{display:flex;gap:8px;align-items:flex-start}
  header svg{width:17px;color:#c25232}
  header div{display:grid;gap:2px}
  header b{font-size:10px}
  header small{font-size:8px;color:#796b63}
  pre{max-height:180px;overflow:auto;margin:9px 0 0;padding:9px;border-radius:9px;background:#2a2421;color:#f8f4f2;font-size:8px;white-space:pre-wrap}
  .action-buttons{display:flex;justify-content:flex-end;gap:7px;margin-top:9px}
  .action-buttons button{min-height:36px;padding:0 11px;border:1px solid #ddd1ca;border-radius:9px;background:#fff;color:#5d514a;font-size:8px;font-weight:850;cursor:pointer}
  .action-buttons .approve{border-color:#17191a;background:#17191a;color:#fff}
  .action-buttons svg{width:13px}
  .executed{margin-top:9px;color:#166534;font-size:9px;font-weight:800;display:flex;gap:5px;align-items:center}
  .executed svg{width:14px}
`;

const SupportPanel = styled.section`
  position:relative;
  margin-top:13px;
  padding:13px;
  border:1px solid #e4ddd8;
  border-radius:14px;
  background:#f8f6f4;
  small{color:#81766f;font-size:8px}
  h3{margin:3px 0;font-size:13px}
  p,li{color:#5f5650;font-size:9px;line-height:1.5}
  ol{padding-left:20px}
`;
