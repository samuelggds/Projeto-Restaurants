import { FormEvent, useEffect, useMemo, useState } from 'react';
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
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function requestErrorMessage(error: unknown, fallback: string) {
  const errorLike = error as { response?: { data?: { error?: string } }; message?: string };
  return String(errorLike.response?.data?.error || errorLike.message || fallback);
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
  return `${affected} produto(s) com comparação de preço pronta para revisão.`;
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
  const [dataMeta, setDataMeta] = useState<{ generatedAt?: string | null; dataUpdatedAt?: string | null; timeZone?: string | null }>({});

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

  const refreshHistory = async () => {
    const rows = await aiGuideService.listActions();
    setHistory(rows);
  };

  const refreshSuggestions = async () => {
    const next = await aiGuideService.getManagementSummary();
    setSummary(next);
  };

  useEffect(() => {
    if (tab === 'suggestions' && !summary) {
      void refreshSuggestions().catch((loadError) => setError(requestErrorMessage(loadError, 'Não foi possível carregar as sugestões.')));
    }
    if (tab === 'history') {
      void refreshHistory().catch((loadError) => setError(requestErrorMessage(loadError, 'Não foi possível carregar o histórico.')));
    }
    if (tab === 'settings' && !settings) {
      void aiGuideService.getAssistantSettings().then(setSettings).catch((loadError) =>
        setError(requestErrorMessage(loadError, 'Não foi possível carregar as configurações.')),
      );
    }
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
      setError(requestErrorMessage(requestError, 'Não foi possível consultar o Assistente do Restaurante.'));
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
      setAnswer((current) => current?.action?.publicId === publicId ? { ...current, action: updated } : current);
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
      setAnswer((current) => current?.action?.publicId === publicId ? { ...current, action: updated } : current);
      await refreshHistory();
    } catch (actionError) {
      setError(requestErrorMessage(actionError, 'Não foi possível cancelar a ação.'));
    } finally {
      setLoading(false);
    }
  };

  const startVoice = () => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError('Ditado por voz não está disponível neste navegador. Você pode continuar digitando normalmente.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      if (transcript) setQuestion((current) => `${current}${current ? ' ' : ''}${transcript}`.trim());
    };
    recognition.onerror = () => setError('Não foi possível reconhecer a voz. Tente novamente ou digite o pedido.');
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  const saveSettings = async (patch: Partial<RestaurantAssistantSettings>) => {
    if (!settings) return;
    setLoading(true);
    setError('');
    try {
      setSettings(await aiGuideService.updateAssistantSettings({ ...patch, expectedVersion: settings.version }));
      setSummary(null);
    } catch (settingsError) {
      setError(requestErrorMessage(settingsError, 'Não foi possível salvar as configurações.'));
    } finally {
      setLoading(false);
    }
  };

  const renderComposer = (helpMode = false) => (
    <form onSubmit={helpMode ? askGuide : askRestaurant}>
      <div className="composer">
        <textarea
          value={question}
          disabled={disabled || loading}
          maxLength={helpMode ? 800 : 1200}
          placeholder={helpMode ? 'Ex.: Como cadastro um produto?' : 'O que você quer resolver no restaurante?'}
          onChange={(event) => setQuestion(event.target.value)}
          aria-label={helpMode ? 'Pergunta para ajuda do sistema' : 'Comando para o Assistente do Restaurante'}
        />
        {!helpMode && (
          <button className={`voice ${listening ? 'active' : ''}`} type="button" onClick={startVoice} disabled={loading} aria-label="Ditado por voz">
            <Mic />
          </button>
        )}
      </div>
      <div className="actions">
        <span>{disabled ? 'Créditos de IA indisponíveis.' : 'Consultas usam os créditos de IA. Métricas e alertas básicos continuam sem IA.'}</span>
        <button className="primary" type="submit" disabled={disabled || loading || question.trim().length < 3}>
          {loading ? <LoaderCircle className="spin" /> : <ChatGptLogo />}
          {loading ? 'Processando...' : helpMode ? 'Abrir ajuda' : 'Enviar'}
        </button>
      </div>
    </form>
  );

  return (
    <Card>
      <header className="heading">
        <span className="icon"><ChatGptLogo /></span>
        <div>
          <span className="eyebrow">Assistente do Restaurante</span>
          <h2>O que você quer resolver no restaurante?</h2>
          <p>Consulte dados reais, prepare tarefas e revise qualquer alteração antes de executar.</p>
        </div>
      </header>

      <nav className="tabs" aria-label="Áreas do assistente">
        <button className={tab === 'ask' ? 'active' : ''} type="button" onClick={() => setTab('ask')}><Sparkles /> Perguntar</button>
        <button className={tab === 'suggestions' ? 'active' : ''} type="button" onClick={() => setTab('suggestions')}><Lightbulb /> Sugestões</button>
        <button className={tab === 'history' ? 'active' : ''} type="button" onClick={() => setTab('history')}><History /> Histórico</button>
        <button className={tab === 'help' ? 'active' : ''} type="button" onClick={() => setTab('help')}><ShieldCheck /> Ajuda</button>
        <button className={tab === 'settings' ? 'active' : ''} type="button" onClick={() => setTab('settings')}><Settings2 /> Limites</button>
      </nav>

      {error && <div className="error" role="alert">{error}</div>}

      {tab === 'ask' && (
        <section>
          <div className="quick-grid">
            {quickPrompts.slice(0, 4).map((prompt) => (
              <button key={prompt} type="button" onClick={() => setQuestion(prompt)}>{prompt}</button>
            ))}
          </div>
          {renderComposer()}
          {answer && (
            <ResultPanel aria-live="polite">
              <div className="result-title"><ChatGptLogo /><div><small>{answer.mode === 'ACTION_PROPOSAL' ? 'Prévia de ação' : 'Resposta fundamentada'}</small><h3>{answer.title}</h3></div></div>
              <p className="answer-copy">{answer.answer}</p>
              {answer.evidence.length > 0 && <div className="evidence">{answer.evidence.map((item) => <article key={`${item.label}-${item.value}`}><small>{item.label}</small><b>{item.value}</b></article>)}</div>}
              {answer.missingInformation.length > 0 && <div className="missing"><b>Informações que ainda faltam</b>{answer.missingInformation.map((item) => <span key={item}>• {item}</span>)}</div>}
              {answer.action && (
                <ActionPreview>
                  <header><Clock3 /><div><b>{answer.action.actionType === 'CREATE_PRODUCT' ? 'Cadastro aguardando aprovação' : 'Alteração de preços aguardando aprovação'}</b><small>{actionDescription(answer.action)}</small></div></header>
                  <pre>{JSON.stringify(answer.action.approvalSnapshot, null, 2)}</pre>
                  {answer.action.status === 'PROPOSED' && <div className="action-buttons"><button type="button" onClick={() => void cancelAction(answer.action!.publicId)}>Cancelar</button><button className="approve" type="button" onClick={() => void approveAction(answer.action!.publicId)}><Check /> Aprovar exatamente esta ação</button></div>}
                  {answer.action.status === 'EXECUTED' && <div className="executed"><Check /> Ação executada e registrada no histórico.</div>}
                </ActionPreview>
              )}
              {answer.links.length > 0 && <div className="links">{answer.links.map((link) => <button key={`${link.target}-${link.label}`} type="button" onClick={() => onNavigate?.(link.target)}>{link.label}</button>)}</div>}
              <small className="data-meta">Dados atualizados em {dataMeta.dataUpdatedAt ? new Date(dataMeta.dataUpdatedAt).toLocaleString('pt-BR') : 'horário indisponível'} · Fuso {dataMeta.timeZone || 'do restaurante'}</small>
            </ResultPanel>
          )}
        </section>
      )}

      {tab === 'suggestions' && (
        <section className="suggestions">
          {!summary ? <div className="loading-line"><LoaderCircle className="spin" /> Calculando prioridades com os dados do restaurante...</div> : (
            <>
              <div className="sales-strip">
                <article><small>Vendas registradas</small><b>{formatMoney(summary.sales.registered.total)}</b><span>{summary.sales.registered.count} pedido(s)</span></article>
                <article><small>Pagamentos confirmados</small><b>{formatMoney(summary.sales.confirmedPayments.total)}</b><span>{summary.sales.confirmedPayments.count} confirmação(ões)</span></article>
                <article><small>Cancelamentos / estornos</small><b>{summary.sales.cancellations.count} / {summary.sales.refunds.count}</b><span>Não representam lucro.</span></article>
              </div>
              <div className="priority-list">
                {summary.priorities.length ? summary.priorities.map((priority) => (
                  <article key={priority.key}>
                    <small>Prioridade</small><h3>{priority.situation}</h3><p><b>Evidência:</b> {priority.evidence}</p><p>{priority.reason}</p><button type="button" onClick={() => onNavigate?.(priority.target)}>{priority.label}</button>
                  </article>
                )) : <div className="empty">Nenhuma prioridade relevante foi detectada agora.</div>}
              </div>
              <small className="data-meta">Período: {new Date(summary.period.start).toLocaleDateString('pt-BR')} a {new Date(summary.period.end).toLocaleDateString('pt-BR')} · atualizado {new Date(summary.dataUpdatedAt).toLocaleString('pt-BR')}</small>
            </>
          )}
        </section>
      )}

      {tab === 'history' && (
        <section className="history-list">
          {history.length === 0 ? <div className="empty">Nenhuma ação preparada ainda.</div> : history.map((action) => (
            <article key={action.publicId}><div><small>{new Date(action.createdAt).toLocaleString('pt-BR')}</small><b>{action.actionType}</b><span>{actionDescription(action)}</span></div><strong className={`status ${action.status.toLowerCase()}`}>{action.status}</strong></article>
          ))}
        </section>
      )}

      {tab === 'help' && (
        <section>
          <p className="help-copy">A ajuda visual original continua disponível. Pergunte como usar uma tela ou como orientar cozinha, garçom, atendente, entregador ou cliente.</p>
          {renderComposer(true)}
          {supportAnswer && (
            <SupportPanel>
              <button className="close-support" type="button" aria-label="Fechar resposta" onClick={() => setSupportAnswer(null)}><X /></button>
              <small>Tela/perfil: {supportAnswer.audience}</small><h3>{supportAnswer.title}</h3><p>{supportAnswer.summary}</p><div className="support-answer">{supportAnswer.answer}</div><ol>{supportAnswer.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol>
            </SupportPanel>
          )}
        </section>
      )}

      {tab === 'settings' && (
        <section className="settings-panel">
          {!settings ? <div className="loading-line"><LoaderCircle className="spin" /> Carregando limites...</div> : (
            <>
              <label>Nível de autonomia<select value={settings.autonomyMode} disabled={loading} onChange={(event) => void saveSettings({ autonomyMode: event.target.value as RestaurantAssistantSettings['autonomyMode'] })}><option value="SUGGEST_ONLY">Apenas sugerir</option><option value="APPROVAL_REQUIRED">Executar após aprovação</option><option value="BOUNDED_AUTOMATION">Automatizar tarefas específicas dentro dos limites</option></select></label>
              <label className="toggle"><input type="checkbox" checked={settings.automationsEnabled} disabled={loading} onChange={(event) => void saveSettings({ automationsEnabled: event.target.checked })} /><span><b>Automações habilitadas</b><small>Desative para impedir qualquer rotina automatizada allowlisted. Pagamentos, credenciais e transferências nunca são automatizados.</small></span></label>
              <div className="thresholds"><label>Pedido pendente (min)<input type="number" min={1} max={240} value={settings.pendingOrderMinutes} onChange={(event) => setSettings({ ...settings, pendingOrderMinutes: Number(event.target.value) })} onBlur={() => void saveSettings({ pendingOrderMinutes: settings.pendingOrderMinutes })} /></label><label>Preparando (min)<input type="number" min={1} max={480} value={settings.preparingOrderMinutes} onChange={(event) => setSettings({ ...settings, preparingOrderMinutes: Number(event.target.value) })} onBlur={() => void saveSettings({ preparingOrderMinutes: settings.preparingOrderMinutes })} /></label><label>Pronto (min)<input type="number" min={1} max={240} value={settings.readyOrderMinutes} onChange={(event) => setSettings({ ...settings, readyOrderMinutes: Number(event.target.value) })} onBlur={() => void saveSettings({ readyOrderMinutes: settings.readyOrderMinutes })} /></label><label>Em entrega (min)<input type="number" min={1} max={720} value={settings.deliveryOrderMinutes} onChange={(event) => setSettings({ ...settings, deliveryOrderMinutes: Number(event.target.value) })} onBlur={() => void saveSettings({ deliveryOrderMinutes: settings.deliveryOrderMinutes })} /></label></div>
              <div className="security-note"><ShieldCheck /><span><b>Limite de acesso</b><small>O assistente só recebe dados do restaurante autenticado e não tem ferramentas para ler SUPER_ADMIN, segredos, credenciais ou outros restaurantes.</small></span></div>
            </>
          )}
        </section>
      )}
    </Card>
  );
}

const Card = styled.section`
  padding:20px;border:1px solid #e7e2de;border-radius:20px;background:#fff;box-shadow:0 18px 46px rgba(39,31,27,.08);color:#26211e;
  .heading{display:flex;gap:13px;align-items:flex-start}.icon{width:44px;height:44px;display:grid;place-items:center;flex:0 0 auto;border-radius:14px;color:#fff;background:#17191a}.icon svg{width:21px}.eyebrow{display:block;color:#d45d3b;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.heading h2{margin:3px 0 0;font-size:21px}.heading p,.help-copy{margin:6px 0 0;color:#766e68;font-size:12px;line-height:1.55}.tabs{display:flex;gap:6px;overflow:auto;margin:18px -2px 14px;padding:2px}.tabs button{white-space:nowrap;min-height:36px;padding:0 10px;border:1px solid #e8e2de;border-radius:10px;background:#faf8f6;color:#6e655f;font-size:10px;font-weight:800;display:flex;gap:6px;align-items:center}.tabs button.active{color:#fff;background:#282321;border-color:#282321}.tabs svg{width:13px}.quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px}.quick-grid button{padding:10px;text-align:left;border:1px solid #e9e4df;border-radius:11px;background:#fbfaf9;color:#504943;font-size:10px;font-weight:750}.composer{position:relative}.composer textarea{width:100%;min-height:94px;padding:13px 48px 13px 13px;border:1px solid #ddd6d0;border-radius:13px;background:#fbfaf9;resize:vertical;font:inherit;font-size:12px;line-height:1.5;outline:0}.composer textarea:focus{border-color:#74665d;box-shadow:0 0 0 3px rgba(72,57,48,.08)}.voice{position:absolute;right:9px;bottom:9px;width:34px;height:34px;padding:0;border:0;border-radius:10px;display:grid;place-items:center;background:#eee9e5;color:#514741}.voice.active{background:#d45d3b;color:#fff}.voice svg{width:15px}.actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:9px}.actions>span{color:#958b84;font-size:9px;line-height:1.4}.primary,.links button,.priority-list button{min-height:39px;padding:0 13px;border:0;border-radius:10px;background:#17191a;color:#fff;font-size:10px;font-weight:850;display:flex;align-items:center;gap:7px}.primary svg{width:14px}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.error{margin:10px 0;padding:10px 12px;border:1px solid #fecaca;border-radius:10px;background:#fff7f7;color:#991b1b;font-size:11px}.evidence{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.evidence article{padding:10px;border-radius:11px;background:#f7f4f1}.evidence small{display:block;color:#8b817a;font-size:9px}.evidence b{display:block;margin-top:3px;font-size:11px}.missing{display:grid;gap:3px;margin-top:10px;padding:10px;border-radius:10px;background:#fff7ed;color:#7c3d12;font-size:10px}.links{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}.data-meta{display:block;margin-top:12px;color:#9a9089;font-size:9px;line-height:1.4}.loading-line,.empty{padding:18px;text-align:center;color:#847a73;font-size:11px}.loading-line{display:flex;gap:8px;justify-content:center}.sales-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.sales-strip article{padding:11px;border:1px solid #ebe5e1;border-radius:12px;background:#fbfaf9}.sales-strip small,.sales-strip span{display:block;color:#8b817a;font-size:9px}.sales-strip b{display:block;margin:4px 0;font-size:15px}.priority-list{display:grid;gap:8px;margin-top:10px}.priority-list article{padding:13px;border:1px solid #e8e2de;border-radius:13px}.priority-list small{color:#d45d3b;font-size:9px;font-weight:900;text-transform:uppercase}.priority-list h3{margin:3px 0 6px;font-size:13px}.priority-list p{margin:3px 0;color:#6f6660;font-size:10px;line-height:1.45}.priority-list button{margin-top:8px}.history-list{display:grid;gap:7px}.history-list article{display:flex;justify-content:space-between;gap:10px;padding:11px;border:1px solid #ebe5e1;border-radius:12px}.history-list article>div{display:grid;gap:3px}.history-list small{color:#918780;font-size:9px}.history-list b{font-size:11px}.history-list span{color:#746b65;font-size:10px}.status{align-self:start;padding:5px 7px;border-radius:999px;background:#eee9e5;font-size:8px}.status.executed{background:#ecfdf3;color:#166534}.status.failed{background:#fff1f2;color:#9f1239}.status.canceled{color:#6b7280}.settings-panel{display:grid;gap:12px}.settings-panel label{display:grid;gap:5px;color:#4f4843;font-size:10px;font-weight:800}.settings-panel select,.settings-panel input[type=number]{height:38px;border:1px solid #ddd6d0;border-radius:9px;padding:0 9px;background:#fff}.toggle{grid-template-columns:auto 1fr!important;align-items:start!important;padding:11px;border:1px solid #ebe5e1;border-radius:12px}.toggle span{display:grid;gap:3px}.toggle small{color:#80766f;font-weight:500;line-height:1.4}.thresholds{display:grid;grid-template-columns:1fr 1fr;gap:8px}.security-note{display:flex;gap:9px;padding:11px;border-radius:12px;background:#f0fdf4;color:#185c33}.security-note svg{width:18px;flex:0 0 auto}.security-note span{display:grid;gap:2px}.security-note small{font-size:9px;line-height:1.45}.support-answer{margin-top:9px;padding:10px;border-radius:10px;background:#fff;font-size:11px;white-space:pre-wrap}.support-note{color:#8a817a}.close-support{float:right;border:0;background:transparent}.close-support svg{width:15px}
  @media(max-width:700px){padding:16px;.quick-grid,.sales-strip,.evidence,.thresholds{grid-template-columns:1fr}.actions{align-items:stretch;flex-direction:column}.primary{width:100%;justify-content:center}.tabs{margin-right:-10px}.heading h2{font-size:18px}}
`;

const ResultPanel = styled.section`
  margin-top:14px;padding:14px;border:1px solid #e4ddd8;border-radius:15px;background:linear-gradient(180deg,#fcfbfa,#f7f4f1);.result-title{display:flex;gap:9px;align-items:center}.result-title>svg{width:22px}.result-title small{display:block;color:#8a817a;font-size:8px;font-weight:900;text-transform:uppercase}.result-title h3{margin:2px 0;font-size:15px}.answer-copy{margin:10px 0 0;color:#504943;font-size:11px;line-height:1.6;white-space:pre-wrap}
`;

const ActionPreview = styled.section`
  margin-top:12px;padding:12px;border:1px solid #e6d7cf;border-radius:13px;background:#fff7f3;header{display:flex;gap:8px;align-items:flex-start}header svg{width:17px;color:#c25232}header div{display:grid;gap:2px}header b{font-size:11px}header small{font-size:9px;color:#796b63}pre{max-height:180px;overflow:auto;margin:9px 0 0;padding:9px;border-radius:9px;background:#2a2421;color:#f8f4f2;font-size:9px;white-space:pre-wrap}.action-buttons{display:flex;justify-content:flex-end;gap:7px;margin-top:9px}.action-buttons button{min-height:36px;padding:0 11px;border:1px solid #ddd1ca;border-radius:9px;background:#fff;color:#5d514a;font-size:9px;font-weight:850}.action-buttons .approve{border-color:#17191a;background:#17191a;color:#fff}.action-buttons svg{width:13px}.executed{margin-top:9px;color:#166534;font-size:10px;font-weight:800;display:flex;gap:5px;align-items:center}.executed svg{width:14px}
`;

const SupportPanel = styled.section`
  position:relative;margin-top:13px;padding:13px;border:1px solid #e4ddd8;border-radius:14px;background:#f8f6f4;small{color:#81766f;font-size:9px}h3{margin:3px 0;font-size:14px}p,li{color:#5f5650;font-size:10px;line-height:1.5}ol{padding-left:20px}
`;
