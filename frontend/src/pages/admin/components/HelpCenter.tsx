import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  BookOpenCheck,
  ChevronDown,
  CircleHelp,
  Headphones,
  Send,
  Settings2,
  MessageCircle,
} from 'lucide-react';
import * as S from './HelpCenter.styles';
import { FaithfulGuidePreview } from './HelpCenterPreviews';
import { adminHelpGuides, type GuideSection } from './adminHelpGuides';
import supportChatService from '../../../Services/supportChatService';
import { acquireSocket } from '../../../Services/socketService';
import { getAccessToken } from '../../../modules/auth/session/authSession';
import { useAppDialog } from '../../../components/AppDialog/context';

type HelpCenterProps = {
  onReport: (payload: { subject: string; message: string }) => Promise<void>;
};
type EmployeeIssue = {
  id: string;
  senderLabel: string;
  message: string;
  issueStatus: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  issueResponse?: string | null;
  sentAt: string | null;
};
type PlatformSupportMessage = {
  id: string;
  senderRole: 'ADMIN' | 'SUPER_ADMIN';
  senderLabel: string;
  message: string;
  issueStatus?: string | null;
  sentAt: string | null;
};
const primaryGuideSections = adminHelpGuides.filter((section) => section.area !== 'Configurações');
const settingsGuideSections = adminHelpGuides.filter((section) => section.area === 'Configurações');

type GuideItemProps = {
  section: GuideSection;
  isOpen: boolean;
  isSubtitle?: boolean;
  onToggle: () => void;
};

function GuideItem({ section, isOpen, isSubtitle = false, onToggle }: GuideItemProps) {
  const { title, icon: Icon, steps } = section;
  const detailedSteps = steps;

  return (
    <article className={`${isOpen ? 'open' : ''}${isSubtitle ? ' settings-guide-item' : ''}`}>
      <button type="button" aria-expanded={isOpen} onClick={onToggle}>
        <i>
          <Icon />
        </i>
        <span>
          <b>{title}</b>
          <small>
            {isSubtitle
              ? `${steps.length} passos detalhados`
              : `${section.area} · ${steps.length} passos detalhados`}
          </small>
        </span>
        <ChevronDown />
      </button>
      {isOpen && (
        <div className="guide-details">
          <ol>
            {detailedSteps.map((step, index) => (
              <li key={`${title}-${index}`}>{step}</li>
            ))}
          </ol>
          <FaithfulGuidePreview {...section} />
        </div>
      )}
    </article>
  );
}

export function HelpCenter({ onReport }: HelpCenterProps) {
  const { confirmDialog } = useAppDialog();
  const [openSection, setOpenSection] = useState<string | null>('Visão geral');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [subject, setSubject] = useState('Dúvida sobre o sistema');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [employeeIssues, setEmployeeIssues] = useState<EmployeeIssue[]>([]);
  const [issuesState, setIssuesState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [platformMessages, setPlatformMessages] = useState<PlatformSupportMessage[]>([]);
  const [platformState, setPlatformState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [showIssueHistory, setShowIssueHistory] = useState(false);
  const loadEmployeeIssues = async () => {
    setIssuesState('loading');
    try {
      const result = await supportChatService.getMessages({ limit: 100, channel: 'internal' });
      setEmployeeIssues(
        (result?.messages || []).filter(
          (item: { issueStatus?: string | null }) => item.issueStatus,
        ),
      );
      setIssuesState('ready');
    } catch {
      setIssuesState('error');
    }
  };
  const loadPlatformConversation = async () => {
    setPlatformState('loading');
    try {
      const result = await supportChatService.getMessages({ limit: 100, channel: 'platform' });
      setPlatformMessages(
        (result?.messages || []).filter((item: { senderRole?: string }) =>
          ['ADMIN', 'SUPER_ADMIN'].includes(String(item.senderRole || '')),
        ),
      );
      setPlatformState('ready');
    } catch {
      setPlatformState('error');
    }
  };
  useEffect(() => {
    const loadOnMount = window.setTimeout(() => {
      void loadEmployeeIssues();
      void loadPlatformConversation();
    }, 0);
    return () => window.clearTimeout(loadOnMount);
  }, []);
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return undefined;

    const { socket, release } = acquireSocket(token, 'admin-help-issues');
    const refresh = () => void loadEmployeeIssues();
    const onNewIssue = (issue: {
      issueStatus?: string | null;
      senderRole?: string;
      senderLabel?: string;
    }) => {
      if (issue.issueStatus === 'OPEN') {
        toast.info(`Novo relato da equipe: ${issue.senderLabel || 'funcionário'}.`);
        refresh();
        return;
      }
      if (issue.senderRole === 'ADMIN' || issue.senderRole === 'SUPER_ADMIN') {
        if (issue.senderRole === 'SUPER_ADMIN') {
          toast.info('Nova resposta do suporte da plataforma.');
        }
        void loadPlatformConversation();
      }
    };
    const onUpdatedIssue = () => {
      toast.info('Um relato da equipe foi atualizado.');
      refresh();
    };
    const onDeletedIssue = () => refresh();

    socket.on('support:chat-message', onNewIssue);
    socket.on('support:issue-updated', onUpdatedIssue);
    socket.on('support:issue-deleted', onDeletedIssue);
    return () => {
      socket.off('support:chat-message', onNewIssue);
      socket.off('support:issue-updated', onUpdatedIssue);
      socket.off('support:issue-deleted', onDeletedIssue);
      release();
    };
  }, []);
  const updateEmployeeIssue = async (
    id: string,
    issueStatus: EmployeeIssue['issueStatus'],
    response?: string,
  ) => {
    try {
      await supportChatService.updateIssue(id, issueStatus, response?.trim());
      if (response?.trim()) setReplyDrafts((drafts) => ({ ...drafts, [id]: '' }));
      await loadEmployeeIssues();
    } catch {
      setIssuesState('error');
    }
  };
  const deleteEmployeeIssue = async (id: string) => {
    const confirmed = await confirmDialog({
      title: 'Excluir relato encerrado?',
      description: 'O relato será removido permanentemente do histórico.',
      confirmLabel: 'Excluir relato',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await supportChatService.deleteIssue(id);
      await loadEmployeeIssues();
      toast.success('Relato excluído.');
    } catch {
      setIssuesState('error');
    }
  };
  const visibleEmployeeIssues = employeeIssues.filter((issue) =>
    showIssueHistory ? issue.issueStatus === 'CLOSED' : issue.issueStatus !== 'CLOSED',
  );
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (message.trim().length < 10 || status === 'sending') return;
    setStatus('sending');
    setErrorMessage('');
    try {
      await onReport({ subject, message: message.trim() });
      setMessage('');
      setStatus('success');
      await loadPlatformConversation();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Não foi possível enviar agora. Tente novamente.',
      );
      setStatus('error');
    }
  };
  return (
    <S.Root>
      <S.Hero>
        <span>
          <CircleHelp /> Central de ajuda
        </span>
        <h2>Manual visual do seu restaurante</h2>
        <p>
          Consulte os passos e a prévia atual de cada área. Alterne entre computador e celular para
          reconhecer a tela antes de usar as ações do seu painel.
        </p>
      </S.Hero>
      <S.Guide aria-label="Manual completo do painel administrativo">
        {primaryGuideSections.map((section) => (
          <GuideItem
            key={section.title}
            section={section}
            isOpen={openSection === section.title}
            onToggle={() => setOpenSection(openSection === section.title ? null : section.title)}
          />
        ))}
        <S.SettingsGroup className={isSettingsOpen ? 'open' : ''}>
          <button
            type="button"
            aria-expanded={isSettingsOpen}
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          >
            <i>
              <Settings2 />
            </i>
            <span>
              <b>Configurações</b>
              <small>{settingsGuideSections.length} subtítulos para personalizar a operação</small>
            </span>
            <ChevronDown />
          </button>
          {isSettingsOpen && (
            <div className="settings-guides">
              <p className="settings-guides-intro">
                Abra o subtítulo correspondente à configuração que deseja alterar. Cada guia mostra
                a tela e o passo a passo específico.
              </p>
              {settingsGuideSections.map((section) => (
                <GuideItem
                  key={section.title}
                  section={section}
                  isSubtitle
                  isOpen={openSection === section.title}
                  onToggle={() =>
                    setOpenSection(openSection === section.title ? null : section.title)
                  }
                />
              ))}
            </div>
          )}
        </S.SettingsGroup>
      </S.Guide>
      <S.ReportCard>
        <div className="heading">
          <i>
            <Headphones />
          </i>
          <div>
            <h2>Relatos da equipe</h2>
            <p>Mensagens de cozinha, salão e entregas enviadas pela Central de Ajuda.</p>
          </div>
          <button
            type="button"
            className="refresh-issues"
            onClick={() => void loadEmployeeIssues()}
          >
            Atualizar relatos
          </button>
          <button
            type="button"
            className="refresh-issues"
            onClick={() => setShowIssueHistory((visible) => !visible)}
          >
            {showIssueHistory
              ? 'Ver ativos'
              : `Histórico (${employeeIssues.filter((issue) => issue.issueStatus === 'CLOSED').length})`}
          </button>
        </div>
        {issuesState === 'loading' && <p>Carregando relatos...</p>}
        {issuesState === 'error' && (
          <p className="error">
            Não foi possível carregar ou atualizar os relatos. Tente novamente.
          </p>
        )}
        {issuesState === 'ready' && !visibleEmployeeIssues.length && (
          <p>
            {showIssueHistory
              ? 'Nenhum relato encerrado no histórico.'
              : 'Nenhum relato ativo no momento.'}
          </p>
        )}
        {visibleEmployeeIssues.map((issue) => (
          <div className="employee-issue" key={issue.id}>
            <b>
              {issue.senderLabel} ·{' '}
              {issue.issueStatus === 'OPEN'
                ? 'Aberto'
                : issue.issueStatus === 'IN_PROGRESS'
                  ? 'Em atendimento'
                  : 'Encerrado'}
            </b>
            <pre>{issue.message}</pre>
            {issue.issueResponse && (
              <p className="issue-response">
                <strong>Resposta registrada:</strong> {issue.issueResponse}
              </p>
            )}
            {issue.issueStatus !== 'CLOSED' && (
              <label className="issue-reply">
                Responder ao funcionário
                <textarea
                  value={replyDrafts[issue.id] || ''}
                  onChange={(event) =>
                    setReplyDrafts((drafts) => ({ ...drafts, [issue.id]: event.target.value }))
                  }
                  placeholder="Informe a orientação ou a solução adotada."
                  maxLength={1200}
                />
              </label>
            )}
            <footer>
              {issue.issueStatus === 'OPEN' && (
                <button
                  type="button"
                  onClick={() => void updateEmployeeIssue(issue.id, 'IN_PROGRESS')}
                >
                  Assumir
                </button>
              )}
              {issue.issueStatus !== 'CLOSED' && (
                <button
                  type="button"
                  disabled={
                    (replyDrafts[issue.id] || '').trim().length > 0 &&
                    (replyDrafts[issue.id] || '').trim().length < 3
                  }
                  onClick={() =>
                    void updateEmployeeIssue(issue.id, issue.issueStatus, replyDrafts[issue.id])
                  }
                >
                  Registrar resposta
                </button>
              )}
              {issue.issueStatus !== 'CLOSED' && (
                <button type="button" onClick={() => void updateEmployeeIssue(issue.id, 'CLOSED')}>
                  Encerrar
                </button>
              )}
              <button
                type="button"
                className="delete-issue"
                disabled={issue.issueStatus !== 'CLOSED'}
                title={
                  issue.issueStatus === 'CLOSED'
                    ? 'Excluir relato permanentemente'
                    : 'Encerre o relato antes de excluir'
                }
                onClick={() => void deleteEmployeeIssue(issue.id)}
              >
                Excluir
              </button>
            </footer>
          </div>
        ))}
      </S.ReportCard>
      <S.ReportCard>
        <div className="heading">
          <i>
            <Headphones />
          </i>
          <div>
            <h2>Suporte da plataforma</h2>
            <p>Canal exclusivo entre o administrador responsável e o Super Admin da plataforma.</p>
          </div>
          <button
            type="button"
            className="refresh-issues"
            onClick={() => void loadPlatformConversation()}
          >
            Atualizar conversa
          </button>
        </div>
        <div className="platform-conversation" aria-live="polite">
          {platformState === 'loading' && <p>Carregando conversa com a plataforma...</p>}
          {platformState === 'error' && (
            <p className="error">Não foi possível carregar a conversa. Tente novamente.</p>
          )}
          {platformState === 'ready' && !platformMessages.length && (
            <div className="platform-empty">
              <MessageCircle />
              <span>
                <b>Nenhuma mensagem enviada ainda</b>
                <small>Descreva abaixo o que precisa e aguarde o retorno do Super Admin.</small>
              </span>
            </div>
          )}
          {platformMessages.map((item) => (
            <article
              key={item.id}
              className={item.senderRole === 'ADMIN' ? 'from-admin' : 'from-platform'}
            >
              <header>
                <b>{item.senderRole === 'SUPER_ADMIN' ? 'Suporte da plataforma' : 'Você'}</b>
                <time>
                  {item.sentAt
                    ? new Intl.DateTimeFormat('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(item.sentAt))
                    : 'Agora'}
                </time>
              </header>
              <p>{item.message}</p>
              {item.issueStatus === 'CLOSED' ? (
                <small className="conversation-status">Atendimento encerrado</small>
              ) : null}
            </article>
          ))}
        </div>
        <form onSubmit={submit}>
          <label>
            Assunto
            <select value={subject} onChange={(event) => setSubject(event.target.value)}>
              <option>Dúvida sobre o sistema</option>
              <option>Problema em pedido</option>
              <option>Problema em pagamento</option>
              <option>Problema técnico</option>
              <option>Outro assunto</option>
            </select>
          </label>
          <label>
            Descreva o que aconteceu
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              minLength={10}
              maxLength={1100}
              placeholder="Inclua o número do pedido, se houver, e os passos que levaram ao problema."
              required
            />
          </label>
          <footer>
            {status === 'success' && (
              <span className="success">Relato enviado ao Super Admin.</span>
            )}
            {status === 'error' && <span className="error">{errorMessage}</span>}
            <button type="submit" disabled={status === 'sending' || message.trim().length < 10}>
              <Send /> {status === 'sending' ? 'Enviando...' : 'Reportar ao Super Admin'}
            </button>
          </footer>
        </form>
      </S.ReportCard>
      <S.Tip>
        <BookOpenCheck /> Dica: use o botão Ver loja depois de salvar para conferir cada mudança
        como o cliente verá.
      </S.Tip>
    </S.Root>
  );
}
