import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Check, LoaderCircle, Mic, RotateCcw, Send, ShieldCheck, X } from 'lucide-react';
import aiGuideService, {
  type AiCreditBalance,
  type AiTourGuide,
  type RestaurantAssistantAction,
  type RestaurantAssistantResponse,
} from '../../../Services/aiGuideService';
import { ChatGptLogo } from '../../../components/ChatGptLogo';

type Props = {
  disabled?: boolean;
  onGuideReady: (guide: AiTourGuide) => void;
  onCreditsChanged: (balance: AiCreditBalance) => void;
  onNavigate?: (target: string) => void;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  response?: RestaurantAssistantResponse;
  error?: boolean;
};

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

function nextMessageId(role: ChatMessage['role']) {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function requestErrorMessage(error: unknown, fallback: string) {
  const errorLike = error as {
    response?: { data?: { error?: string; code?: string } };
    message?: string;
  };
  const code = String(errorLike.response?.data?.code || '').trim();
  const message = String(errorLike.response?.data?.error || errorLike.message || '').trim();

  if (code === 'OPENAI_RATE_LIMITED') {
    return 'Estou recebendo muitas solicitações agora. Tente novamente em alguns instantes.';
  }
  if (code === 'OPENAI_TIMEOUT') {
    return 'Demorei mais que o esperado para responder. Tente novamente.';
  }
  if (code === 'OPENAI_AUTH_ERROR') {
    return 'O serviço de IA está temporariamente indisponível.';
  }
  if (code === 'AI_CREDITS_EXHAUSTED') {
    return 'Os créditos de IA acabaram. Recarregue os créditos para continuar.';
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
  if (affected > 0) return `${affected} registro(s) serão alterados.`;
  return 'A alteração está pronta para sua confirmação.';
}

function speechErrorMessage(code?: string) {
  switch (String(code || '').toLowerCase()) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'O navegador bloqueou o microfone. Libere a permissão e tente novamente.';
    case 'audio-capture':
      return 'Nenhum microfone disponível foi encontrado.';
    case 'no-speech':
      return 'Não detectei fala. Tente novamente.';
    case 'network':
      return 'O reconhecimento de voz ficou indisponível. Você pode continuar digitando.';
    case 'aborted':
      return '';
    default:
      return 'Não foi possível reconhecer a voz. Você pode continuar digitando.';
  }
}

export function AiGuideAssistant({
  disabled = false,
  onCreditsChanged,
  onNavigate,
}: Props) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const quickPrompts = useMemo(
    () => [
      'Como posso atrair mais clientes?',
      'Crie um plano de 30 dias para aumentar minhas vendas.',
      'Que promoção faz sentido para o meu restaurante?',
      'Analise minhas vendas e diga o que eu posso melhorar.',
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, loading]);

  const pushAssistantError = (text: string) => {
    setMessages((current) => [
      ...current,
      { id: nextMessageId('assistant'), role: 'assistant', text, error: true },
    ]);
  };

  const askRestaurant = async (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < 3 || loading || disabled) return;

    setMessages((current) => [
      ...current,
      { id: nextMessageId('user'), role: 'user', text: trimmed },
    ]);
    setQuestion('');
    setNotice('');
    setLoading(true);

    try {
      const result = await aiGuideService.askRestaurant(trimmed);
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId('assistant'),
          role: 'assistant',
          text: result.response.answer,
          response: result.response,
        },
      ]);
      onCreditsChanged(result.credits);
    } catch (requestError) {
      pushAssistantError(
        requestErrorMessage(requestError, 'Não consegui responder agora. Tente novamente.'),
      );
    } finally {
      setLoading(false);
      window.setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  const updateActionInConversation = (updated: RestaurantAssistantAction) => {
    setMessages((current) =>
      current.map((message) => {
        if (message.response?.action?.publicId !== updated.publicId) return message;
        return {
          ...message,
          response: { ...message.response, action: updated },
        };
      }),
    );
  };

  const approveAction = async (publicId: string) => {
    if (loading) return;
    setLoading(true);
    setNotice('');
    try {
      updateActionInConversation(await aiGuideService.approveAction(publicId));
    } catch (actionError) {
      pushAssistantError(requestErrorMessage(actionError, 'Não foi possível executar essa ação.'));
    } finally {
      setLoading(false);
    }
  };

  const cancelAction = async (publicId: string) => {
    if (loading) return;
    setLoading(true);
    setNotice('');
    try {
      updateActionInConversation(await aiGuideService.cancelAction(publicId));
    } catch (actionError) {
      pushAssistantError(requestErrorMessage(actionError, 'Não foi possível cancelar essa ação.'));
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
      setNotice('O ditado por voz não está disponível neste navegador.');
      return;
    }
    if (!window.isSecureContext) {
      setNotice('O microfone só pode ser usado em uma conexão HTTPS.');
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {
      setNotice('O navegador não liberou o microfone. Verifique a permissão do site.');
      return;
    }

    setNotice('');
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
        setNotice('');
      }
    };
    recognition.onerror = (event) => {
      const message = speechErrorMessage(event?.error);
      if (message) setNotice(message);
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
      setNotice('Não foi possível iniciar o microfone agora.');
    }
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    void askRestaurant();
  };

  const newConversation = () => {
    setMessages([]);
    setQuestion('');
    setNotice('');
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  };

  return (
    <ChatCard>
      <header className="chat-header">
        <span className="avatar"><ChatGptLogo /></span>
        <div className="title">
          <b>Assistente IA</b>
          <span><i /> Seu restaurante</span>
        </div>
        {messages.length > 0 && (
          <button className="new-chat" type="button" onClick={newConversation} aria-label="Nova conversa">
            <RotateCcw />
            <span>Nova conversa</span>
          </button>
        )}
      </header>

      <div className="conversation" aria-live="polite">
        {messages.length === 0 && (
          <div className="welcome">
            <span className="welcome-icon"><ChatGptLogo /></span>
            <h2>Como posso ajudar seu restaurante hoje?</h2>
            <p>
              Pergunte como se estivesse conversando com um gerente: vendas, clientes, cardápio,
              promoções, planejamento e ideias para crescer.
            </p>
            <div className="prompt-chips">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setQuestion(prompt);
                    textareaRef.current?.focus();
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`message-row ${message.role}`}>
            {message.role === 'assistant' && <span className="message-avatar"><ChatGptLogo /></span>}
            <div className={`bubble ${message.error ? 'error' : ''}`}>
              {message.response?.title && <b className="response-title">{message.response.title}</b>}
              <div className="message-copy">{message.text}</div>

              {message.response?.missingInformation && message.response.missingInformation.length > 0 && (
                <div className="missing-info">
                  <b>Para responder melhor, preciso de:</b>
                  {message.response.missingInformation.map((item) => <span key={item}>• {item}</span>)}
                </div>
              )}

              {message.response?.action && (
                <div className="action-card">
                  <div>
                    <b>Confirmar alteração?</b>
                    <span>{actionDescription(message.response.action)}</span>
                  </div>
                  {message.response.action.status === 'PROPOSED' && (
                    <div className="action-buttons">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void cancelAction(message.response!.action!.publicId)}
                      >
                        <X /> Cancelar
                      </button>
                      <button
                        className="confirm"
                        type="button"
                        disabled={loading}
                        onClick={() => void approveAction(message.response!.action!.publicId)}
                      >
                        <Check /> Confirmar
                      </button>
                    </div>
                  )}
                  {message.response.action.status === 'EXECUTED' && (
                    <span className="action-status success"><Check /> Alteração realizada.</span>
                  )}
                  {message.response.action.status === 'CANCELED' && (
                    <span className="action-status">Alteração cancelada.</span>
                  )}
                  {message.response.action.status === 'FAILED' && (
                    <span className="action-status failed">Não foi possível concluir a alteração.</span>
                  )}
                </div>
              )}

              {message.response?.evidence && message.response.evidence.length > 0 && (
                <details className="details">
                  <summary>Ver dados usados na resposta</summary>
                  <div className="evidence-list">
                    {message.response.evidence.map((item) => (
                      <span key={`${item.label}-${item.value}`}><b>{item.label}:</b> {item.value}</span>
                    ))}
                  </div>
                </details>
              )}

              {message.response?.links && message.response.links.length > 0 && (
                <div className="links">
                  {message.response.links.map((link) => (
                    <button
                      key={`${link.target}-${link.label}`}
                      type="button"
                      onClick={() => onNavigate?.(link.target)}
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message-row assistant typing-row">
            <span className="message-avatar"><ChatGptLogo /></span>
            <div className="bubble typing"><i /><i /><i /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="composer-area">
        {notice && <div className="notice">{notice}</div>}
        <form className="composer" onSubmit={askRestaurant}>
          <textarea
            ref={textareaRef}
            value={question}
            disabled={disabled || loading}
            maxLength={1200}
            rows={1}
            placeholder={disabled ? 'Créditos de IA indisponíveis.' : 'Pergunte qualquer coisa sobre seu restaurante...'}
            aria-label="Mensagem para o Assistente IA"
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={onComposerKeyDown}
          />
          <button
            className={`voice ${listening ? 'active' : ''}`}
            type="button"
            onClick={() => void startVoice()}
            disabled={loading || disabled}
            aria-label={listening ? 'Parar ditado por voz' : 'Falar com o Assistente IA'}
            aria-pressed={listening}
          >
            <Mic />
          </button>
          <button
            className="send"
            type="submit"
            disabled={disabled || loading || question.trim().length < 3}
            aria-label="Enviar mensagem"
          >
            {loading ? <LoaderCircle className="spin" /> : <Send />}
          </button>
        </form>
        <div className="composer-hint">
          <span>Fale normalmente. Ex.: “Como posso aumentar minhas vendas este mês?”</span>
          <span className="protected"><ShieldCheck /> Só acessa dados permitidos deste restaurante</span>
        </div>
      </div>
    </ChatCard>
  );
}

const ChatCard = styled.section`
  --ai-dark:#17191a;
  --ai-text:#27221f;
  --ai-muted:#7c736d;
  --ai-border:#e8e2de;
  display:flex;
  flex-direction:column;
  min-height:540px;
  max-height:min(720px,calc(100vh - 130px));
  overflow:hidden;
  border:1px solid var(--ai-border);
  border-radius:20px;
  background:#fff;
  color:var(--ai-text);
  box-shadow:0 18px 46px rgba(39,31,27,.08);

  .chat-header{min-height:68px;padding:13px 16px;display:flex;align-items:center;gap:11px;border-bottom:1px solid #eee9e5;background:#fff}
  .avatar,.message-avatar,.welcome-icon{display:grid;place-items:center;color:#fff;background:var(--ai-dark)}
  .avatar{width:38px;height:38px;flex:0 0 auto;border-radius:12px}
  .avatar svg{width:18px}
  .title{display:grid;gap:2px;min-width:0}
  .title b{font-size:13px}
  .title span{display:flex;align-items:center;gap:5px;color:#7f756f;font-size:9px}
  .title i{width:6px;height:6px;border-radius:999px;background:#22a35a}
  .new-chat{margin-left:auto;display:flex;align-items:center;gap:5px;padding:7px 9px;border:0;border-radius:9px;background:#f5f2ef;color:#615852;font-size:8.5px;font-weight:800;cursor:pointer}
  .new-chat svg{width:12px;height:12px}

  .conversation{flex:1;min-height:0;overflow:auto;padding:18px 16px 22px;background:linear-gradient(180deg,#fff 0%,#fcfbfa 100%);scrollbar-width:thin}
  .welcome{max-width:460px;margin:24px auto 12px;text-align:center}
  .welcome-icon{width:44px;height:44px;margin:0 auto 12px;border-radius:14px;box-shadow:0 8px 22px rgba(23,25,26,.12)}
  .welcome-icon svg{width:20px}
  .welcome h2{margin:0;font-size:18px;letter-spacing:-.02em}
  .welcome p{max-width:430px;margin:8px auto 15px;color:var(--ai-muted);font-size:10px;line-height:1.6}
  .prompt-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:7px}
  .prompt-chips button{padding:8px 10px;border:1px solid var(--ai-border);border-radius:999px;background:#fff;color:#5f5650;font-size:8.5px;line-height:1.3;cursor:pointer}
  .prompt-chips button:hover{border-color:#cfc5be;background:#faf8f7}

  .message-row{display:flex;gap:8px;margin:12px 0;align-items:flex-start}
  .message-row.user{justify-content:flex-end}
  .message-avatar{width:28px;height:28px;flex:0 0 auto;border-radius:9px;margin-top:2px}
  .message-avatar svg{width:13px}
  .bubble{max-width:82%;padding:11px 13px;border-radius:15px;background:#f2efed;color:#332d29;font-size:10.5px;line-height:1.58;box-shadow:0 1px 0 rgba(52,43,38,.04)}
  .user .bubble{border-bottom-right-radius:5px;background:var(--ai-dark);color:#fff}
  .assistant .bubble{border-bottom-left-radius:5px}
  .bubble.error{background:#fff1f2;color:#9f1239}
  .response-title{display:block;margin-bottom:4px;font-size:10px}
  .message-copy{white-space:pre-wrap;overflow-wrap:anywhere}

  .missing-info{display:grid;gap:3px;margin-top:10px;padding:9px;border-radius:10px;background:#fff7ed;color:#7c3d12;font-size:8.5px}
  .action-card{display:grid;gap:9px;margin-top:11px;padding:10px;border:1px solid #ddd7d2;border-radius:11px;background:#fff}
  .action-card>div:first-child{display:grid;gap:3px}
  .action-card b{font-size:9.5px}
  .action-card span{color:#776d67;font-size:8.5px;line-height:1.45}
  .action-buttons{display:flex;justify-content:flex-end;gap:7px}
  .action-buttons button{min-height:32px;padding:0 10px;border:1px solid #ddd7d2;border-radius:9px;background:#fff;color:#5f5650;font-size:8.5px;font-weight:800;display:flex;align-items:center;gap:5px;cursor:pointer}
  .action-buttons .confirm{border-color:var(--ai-dark);background:var(--ai-dark);color:#fff}
  .action-buttons svg{width:12px}
  .action-status{display:flex!important;align-items:center;gap:5px;color:#6b7280!important;font-weight:800}
  .action-status.success{color:#166534!important}
  .action-status.failed{color:#9f1239!important}
  .action-status svg{width:12px}

  .details{margin-top:9px;color:#746b65;font-size:8.5px}
  .details summary{cursor:pointer;font-weight:800;user-select:none}
  .evidence-list{display:grid;gap:3px;margin-top:6px;padding:8px 9px;border-radius:9px;background:#fff}
  .links{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
  .links button{padding:6px 8px;border:1px solid #ddd7d2;border-radius:8px;background:#fff;color:#514943;font-size:8px;font-weight:800;cursor:pointer}

  .typing-row{margin-bottom:2px}
  .typing{display:flex;gap:4px;align-items:center;min-width:48px;min-height:36px}
  .typing i{width:5px;height:5px;border-radius:999px;background:#8d847e;animation:pulse 1s ease-in-out infinite}
  .typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}

  .composer-area{padding:11px 13px 12px;border-top:1px solid #eee9e5;background:#fff}
  .notice{margin:0 2px 8px;padding:8px 10px;border-radius:9px;background:#fff7ed;color:#8a4b17;font-size:8.5px}
  .composer{display:grid;grid-template-columns:minmax(0,1fr) 36px 36px;gap:6px;align-items:end;padding:7px;border:1px solid #d9d2cc;border-radius:15px;background:#fff;box-shadow:0 3px 14px rgba(40,34,30,.05)}
  .composer:focus-within{border-color:#a89d95;box-shadow:0 0 0 3px rgba(62,52,46,.06)}
  .composer textarea{width:100%;max-height:120px;min-height:36px;padding:8px 6px;border:0;outline:0;resize:none;background:transparent;color:#302a26;font:inherit;font-size:10.5px;line-height:1.45}
  .voice,.send{width:36px;height:36px;padding:0;border:0;border-radius:10px;display:grid;place-items:center;cursor:pointer}
  .voice{background:#f3efec;color:#655b55}
  .voice.active{background:#e46b48;color:#fff}
  .send{background:var(--ai-dark);color:#fff}
  .voice svg,.send svg{width:15px}
  .voice:disabled,.send:disabled{opacity:.45;cursor:not-allowed}
  .composer-hint{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:7px;padding:0 2px;color:#958b84;font-size:7.5px;line-height:1.35}
  .protected{display:flex;align-items:center;gap:4px;white-space:nowrap;color:#587362}
  .protected svg{width:10px;height:10px;color:#2f7b4a}

  .spin{animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:.35;transform:translateY(0)}50%{opacity:1;transform:translateY(-2px)}}

  @media(max-width:640px){
    min-height:calc(100vh - 150px);
    max-height:calc(100vh - 112px);
    border-radius:16px;
    .chat-header{min-height:60px;padding:10px 12px}
    .new-chat span{display:none}
    .conversation{padding:14px 11px 18px}
    .welcome{margin-top:16px}
    .welcome h2{font-size:16px}
    .bubble{max-width:88%}
    .composer-area{padding:9px}
    .composer-hint>span:first-child{display:none}
    .composer-hint{justify-content:flex-end}
  }
`;
