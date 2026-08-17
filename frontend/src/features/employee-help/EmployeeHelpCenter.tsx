import { useState, type FormEvent } from 'react';
import { BookOpenCheck, ChevronDown, CircleHelp, Send } from 'lucide-react';
import {
  getEmployeeHelpGuides,
  getEmployeeHelpTitle,
  type EmployeeHelpRole,
} from './employeeHelpGuides';
import { EmployeeHelpPreview } from './EmployeeHelpPreview';
import { employeeHelpCallouts } from './employeeHelpCallouts';
import * as S from './EmployeeHelpCenter.styles';

type Props = {
  role: EmployeeHelpRole;
  onReport: (payload: { subject: string; message: string }) => Promise<void>;
};

export function EmployeeHelpCenter({ role, onReport }: Props) {
  const guides = getEmployeeHelpGuides(role);
  const [openGuide, setOpenGuide] = useState(guides[0]?.id);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus('sending');
    setError('');
    try {
      await onReport({ subject: subject.trim(), message: message.trim() });
      setSubject('');
      setMessage('');
      setStatus('success');
    } catch (reason) {
      setStatus('error');
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar o relato.');
    }
  }
  return (
    <S.Root>
      <S.Hero>
        <small>
          <CircleHelp size={16} /> Central de ajuda
        </small>
        <h2>{getEmployeeHelpTitle(role)}</h2>
        <p>
          Veja cada tela como ela funciona no painel, siga os passos numerados e peça ajuda ao
          administrador do restaurante quando necessário.
        </p>
      </S.Hero>
      {guides.map((guide) => {
        const open = openGuide === guide.id;
        const Icon = guide.icon;
        return (
          <S.Guide key={guide.id}>
            <S.GuideButton onClick={() => setOpenGuide(open ? '' : guide.id)} aria-expanded={open}>
              <span className="icon">
                <Icon size={20} />
              </span>
              <span>
                <strong>{guide.title}</strong>
                <small>
                  {guide.area} · {employeeHelpCallouts[guide.preview].length} itens explicados
                </small>
              </span>
              <ChevronDown
                className="chevron"
                size={20}
                style={{ transform: open ? 'rotate(180deg)' : undefined }}
              />
            </S.GuideButton>
            {open && (
              <S.GuideContent>
                <S.Steps aria-label="Legenda numerada da prévia">
                  {employeeHelpCallouts[guide.preview].map((callout, index) => (
                    <li key={callout.label}>
                      <b>{index + 1}</b>
                      <span>{callout.description}</span>
                    </li>
                  ))}
                </S.Steps>
                <S.Preview>
                  <aside className="side">
                    <div className="brand">PAINEL OPERACIONAL</div>
                    {guide.sidebarItems.map((item) => {
                      const active = item === (guide.sidebarActiveItem ?? guide.title);

                      return (
                        <span
                          className={active ? 'active' : ''}
                          key={item}
                          data-marker={active ? 1 : undefined}
                        >
                          {item}
                        </span>
                      );
                    })}
                  </aside>
                  <EmployeeHelpPreview guide={guide} />
                </S.Preview>
              </S.GuideContent>
            )}
          </S.Guide>
        );
      })}
      <S.Report onSubmit={submit}>
        <h3>
          <BookOpenCheck size={20} /> Relatar um problema
        </h3>
        <p className="sub">
          Seu relato será enviado diretamente ao administrador do seu restaurante.
        </p>
        <input
          required
          minLength={3}
          maxLength={100}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Assunto do problema"
        />
        <textarea
          required
          minLength={5}
          maxLength={1200}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Explique o que aconteceu e em qual tela."
        />
        {status === 'success' && <span className="success">Relato enviado ao administrador.</span>}
        {status === 'error' && <span className="error">{error}</span>}
        <button disabled={status === 'sending'}>
          <Send size={17} />
          {status === 'sending' ? 'Enviando...' : 'Enviar relato'}
        </button>
      </S.Report>
    </S.Root>
  );
}
