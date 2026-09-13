import { FormEvent, useState } from 'react';
import styled from 'styled-components';
import { LoaderCircle, MessageCircleQuestion, Send, Sparkles, X } from 'lucide-react';
import aiGuideService, {
  type AiCreditBalance,
  type AiGuide,
  type AiSupportGuide,
  type AiTourGuide,
} from '../../../Services/aiGuideService';

type Props = {
  disabled?: boolean;
  onGuideReady: (guide: AiTourGuide) => void;
  onCreditsChanged: (balance: AiCreditBalance) => void;
};

export function AiGuideAssistant({ disabled = false, onGuideReady, onCreditsChanged }: Props) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [supportAnswer, setSupportAnswer] = useState<AiSupportGuide | null>(null);

  const handleGuideResult = (guide: AiGuide) => {
    if (guide.mode === 'TOUR') {
      setSupportAnswer(null);
      onGuideReady(guide);
      return;
    }

    setSupportAnswer(guide);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < 3 || loading || disabled) return;
    setLoading(true);
    setError('');
    try {
      const result = await aiGuideService.createGuide(trimmed);
      onCreditsChanged(result.credits);
      handleGuideResult(result.guide);
      setQuestion('');
    } catch (requestError: unknown) {
      const errorLike = requestError as { response?: { data?: { error?: string } }; message?: string };
      setError(
        String(errorLike.response?.data?.error || errorLike.message || 'Não foi possível criar a orientação agora.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="heading">
        <span className="icon"><Sparkles /></span>
        <div>
          <span className="eyebrow">Guia inteligente</span>
          <h2>Pergunte como usar o GastroNexa</h2>
          <p>
            Para funções do painel ADMIN, a OpenAI cria um tour visual com balões. Para cozinha,
            garçom, atendente, motoqueiro ou cliente, ela responde em um chat de suporte para você
            orientar sua equipe.
          </p>
        </div>
      </div>
      <form onSubmit={submit}>
        <textarea
          value={question}
          disabled={disabled || loading}
          maxLength={800}
          placeholder="Ex.: Como cadastro um produto? Como o garçom atende uma mesa? Como a cozinha marca um pedido como pronto?"
          onChange={(event) => setQuestion(event.target.value)}
          aria-label="Pergunta para o guia com IA"
        />
        <div className="actions">
          <span>{disabled ? 'Seus créditos de IA acabaram neste mês.' : 'O uso é descontado dos seus créditos OpenAI mensais.'}</span>
          <button type="submit" disabled={disabled || loading || question.trim().length < 3}>
            {loading ? <LoaderCircle className="spin" /> : <Send />}
            {loading ? 'Consultando...' : 'Perguntar à IA'}
          </button>
        </div>
      </form>
      {error && <div className="error" role="alert">{error}</div>}

      {supportAnswer && (
        <SupportPanel aria-live="polite">
          <div className="support-header">
            <span className="support-icon"><MessageCircleQuestion /></span>
            <div>
              <small>Suporte para orientar sua equipe</small>
              <h3>{supportAnswer.title}</h3>
              <span className="audience">Tela/perfil: {supportAnswer.audience}</span>
            </div>
            <button
              type="button"
              className="close-support"
              aria-label="Fechar resposta do suporte"
              onClick={() => setSupportAnswer(null)}
            >
              <X />
            </button>
          </div>
          <p className="summary">{supportAnswer.summary}</p>
          <div className="answer">{supportAnswer.answer}</div>
          <ol>
            {supportAnswer.instructions.map((instruction, index) => (
              <li key={`${index}-${instruction}`}>
                <span>{index + 1}</span>
                <p>{instruction}</p>
              </li>
            ))}
          </ol>
          <small className="support-note">
            Essa orientação é para o administrador repassar à equipe. Nenhum funcionário precisa
            acessar este assistente.
          </small>
        </SupportPanel>
      )}
    </Card>
  );
}

const Card = styled.section`
  position: relative;
  overflow: hidden;
  padding: 22px;
  border: 1px solid #e8e5e2;
  border-radius: 18px;
  background:
    radial-gradient(circle at 90% -20%, rgba(17, 24, 39, 0.07), transparent 38%),
    #fff;
  box-shadow: 0 12px 32px rgba(39, 31, 27, 0.06);

  .heading {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }
  .icon {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    border-radius: 13px;
    display: grid;
    place-items: center;
    color: #fff;
    background: linear-gradient(145deg, #17191a, #34383d);
    box-shadow: 0 10px 24px rgba(17, 24, 39, 0.18);
  }
  .icon svg { width: 19px; }
  .eyebrow {
    display: block;
    margin-bottom: 3px;
    color: #77706b;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h2 {
    margin: 0;
    color: #1b1918;
    font-size: 20px;
    line-height: 1.25;
  }
  p {
    margin: 6px 0 0;
    color: #766f6a;
    font-size: 12px;
    line-height: 1.55;
  }
  form { margin-top: 17px; }
  textarea {
    width: 100%;
    min-height: 96px;
    resize: vertical;
    padding: 13px 14px;
    border: 1px solid #ddd8d4;
    border-radius: 13px;
    outline: 0;
    color: #262321;
    background: #fbfaf9;
    font: inherit;
    font-size: 12px;
    line-height: 1.55;
    transition: border 160ms ease, box-shadow 160ms ease, background 160ms ease;
  }
  textarea:focus {
    border-color: #2b2d30;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
  }
  .actions {
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .actions > span {
    color: #918a84;
    font-size: 9px;
    line-height: 1.4;
  }
  button {
    min-height: 42px;
    padding: 0 15px;
    border: 0;
    border-radius: 11px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #fff;
    background: #17191a;
    font-size: 11px;
    font-weight: 800;
    box-shadow: 0 10px 22px rgba(17, 24, 39, 0.16);
  }
  button:hover:not(:disabled) { background: #292c30; }
  button:disabled { opacity: 0.48; cursor: not-allowed; }
  button svg { width: 15px; }
  .spin { animation: spin 800ms linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .error {
    margin-top: 11px;
    padding: 10px 12px;
    border: 1px solid #fecaca;
    border-radius: 10px;
    color: #991b1b;
    background: #fff7f7;
    font-size: 11px;
    line-height: 1.45;
  }
  @media (max-width: 700px) {
    padding: 17px;
    .actions { align-items: stretch; flex-direction: column; }
    button { width: 100%; }
  }
`;

const SupportPanel = styled.section`
  margin-top: 18px;
  padding: 16px;
  border: 1px solid #dedbd7;
  border-radius: 16px;
  background: linear-gradient(180deg, #fcfbfa, #f7f5f2);
  box-shadow: inset 0 1px 0 #fff;

  .support-header {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 11px;
    align-items: start;
  }
  .support-icon {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    color: #fff;
    background: #17191a;
  }
  .support-icon svg { width: 17px; }
  .support-header small {
    display: block;
    color: #77706b;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }
  h3 {
    margin: 2px 0 3px;
    color: #1b1918;
    font-size: 16px;
    line-height: 1.3;
  }
  .audience {
    color: #645f5b;
    font-size: 10px;
    font-weight: 700;
  }
  .close-support {
    width: 32px;
    min-height: 32px;
    padding: 0;
    border: 1px solid #dedbd7;
    border-radius: 9px;
    color: #4d4946;
    background: #fff;
    box-shadow: none;
  }
  .close-support:hover { background: #f2efec; }
  .summary {
    margin-top: 13px;
    color: #625c57;
    font-weight: 650;
  }
  .answer {
    margin-top: 11px;
    padding: 12px 13px;
    border-radius: 12px;
    color: #292522;
    background: #fff;
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  ol {
    display: grid;
    gap: 8px;
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: grid;
    grid-template-columns: 28px 1fr;
    gap: 9px;
    align-items: start;
  }
  li > span {
    width: 27px;
    height: 27px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #fff;
    background: #252729;
    font-size: 10px;
    font-weight: 850;
  }
  li p {
    margin: 3px 0 0;
    color: #4f4a46;
  }
  .support-note {
    display: block;
    margin-top: 13px;
    color: #8a837d;
    font-size: 9px;
    line-height: 1.5;
  }
`;
