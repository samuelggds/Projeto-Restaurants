import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { ArrowLeft, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { GastroNexaTourBrand } from '../GastroNexaTourBrand';

type Props = {
  role?: string | null;
  subRole?: string | null;
  onFinish: () => void;
};

type Step = {
  title: string;
  body: string;
  hint: string;
};

const WALKTHROUGHS: Record<string, Step[]> = {
  COZINHA: [
    { title: 'Fila de preparo', body: 'Aqui chegam os pedidos que precisam ser preparados. Priorize os mais antigos e confira os itens e observações antes de iniciar.', hint: 'Use a fila para organizar o trabalho da cozinha.' },
    { title: 'Atualize o status', body: 'Quando começar um pedido, marque como PREPARANDO. Ao finalizar tudo, marque como PRONTO para avisar a próxima etapa da operação.', hint: 'O status mantém salão, retirada e entrega sincronizados.' },
    { title: 'Atualização em tempo real', body: 'Novos pedidos e mudanças aparecem automaticamente. Use a atualização manual apenas quando precisar conferir a fila novamente.', hint: 'Fique atento aos avisos de novos pedidos.' },
    { title: 'Reimpressão e conferência', body: 'Quando a impressão estiver disponível, você pode reimprimir a comanda e conferir novamente os itens antes de liberar o pedido.', hint: 'Pedido conferido é pedido pronto para seguir.' },
  ],
  GARCOM: [
    { title: 'Mesas e pedidos', body: 'Acompanhe as mesas atendidas, pedidos em andamento e contas abertas. Use a tela para saber rapidamente o que precisa de atenção.', hint: 'Sua área reúne as informações do salão.' },
    { title: 'Chamados dos clientes', body: 'Quando um cliente chamar pelo cardápio da mesa, o chamado aparece aqui. Atenda o chamado e confirme quando ele estiver resolvido.', hint: 'Os chamados ajudam a reduzir o tempo de espera no salão.' },
    { title: 'Sessões de mesa', body: 'Confira quem está usando a mesa e acompanhe a conta enquanto novos pedidos são adicionados.', hint: 'A sessão mantém os pedidos vinculados à mesa correta.' },
    { title: 'Atualizações da operação', body: 'Pedidos, chamados e mesas recebem atualizações em tempo real. Execute apenas as ações liberadas para a sua função.', hint: 'O sistema respeita as permissões configuradas pelo administrador.' },
  ],
  ATENDENTE: [
    { title: 'Central operacional', body: 'Esta tela reúne pedidos, chamados e mesas para você acompanhar a operação do restaurante em um só lugar.', hint: 'Comece verificando os itens que precisam de atendimento imediato.' },
    { title: 'Acompanhe pedidos', body: 'Consulte o andamento dos pedidos e use somente as ações permitidas para a sua conta.', hint: 'Os status ajudam toda a equipe a trabalhar na mesma informação.' },
    { title: 'Chamados e mesas', body: 'Atenda solicitações dos clientes e acompanhe as mesas abertas para manter o salão organizado.', hint: 'Priorize chamados pendentes e situações que bloqueiem o atendimento.' },
    { title: 'Dados atualizados', body: 'A central recebe atualizações periódicas e em tempo real. Se algo parecer desatualizado, use a atualização da própria tela.', hint: 'Você não precisa sair e entrar novamente para atualizar a operação.' },
  ],
  MOTOQUEIRO: [
    { title: 'Entregas disponíveis', body: 'Os pedidos PRONTO que aguardam retirada aparecem na sua área. Confira o endereço e os dados antes de assumir uma entrega.', hint: 'Retire somente pedidos liberados pela operação.' },
    { title: 'Entrega em rota', body: 'Depois de sair com o pedido, acompanhe a entrega em andamento e use a rota disponível quando ela estiver habilitada.', hint: 'A localização é usada somente quando a função de rastreamento está ativa.' },
    { title: 'Finalize corretamente', body: 'Ao concluir a entrega, marque o pedido como ENTREGUE para encerrar o fluxo e atualizar o cliente e o restaurante.', hint: 'Finalize somente após a entrega realmente acontecer.' },
    { title: 'Ganhos e acertos', body: 'Consulte seu histórico, ganhos e acertos quando essas informações estiverem habilitadas pela administração.', hint: 'Use o histórico para conferir entregas concluídas e valores.' },
  ],
};

function resolveRole(role?: string | null, subRole?: string | null) {
  const normalizedRole = String(role || '').trim().toUpperCase();
  if (normalizedRole === 'MOTOQUEIRO') return 'MOTOQUEIRO';
  return String(subRole || '').trim().toUpperCase();
}

export default function EmployeeOnboardingOverlay({ role, subRole, onFinish }: Props) {
  const steps = useMemo(() => WALKTHROUGHS[resolveRole(role, subRole)] || [], [role, subRole]);
  const [index, setIndex] = useState(0);
  if (!steps.length) return null;

  const step = steps[index];
  const finalStep = index === steps.length - 1;
  const advance = () => (finalStep ? onFinish() : setIndex((current) => current + 1));

  return (
    <Layer role="presentation">
      <Dimmer />
      <Bubble role="dialog" aria-modal="true" aria-labelledby="employee-onboarding-title">
        <header>
          <GastroNexaTourBrand compact />
          <button type="button" aria-label="Fechar apresentação" onClick={onFinish}><X /></button>
        </header>
        <Progress aria-hidden="true"><i style={{ width: `${((index + 1) / steps.length) * 100}%` }} /></Progress>
        <small className="step-count">Primeiro acesso · passo {index + 1} de {steps.length}</small>
        <h2 id="employee-onboarding-title">{step.title}</h2>
        <p>{step.body}</p>
        <Hint>{step.hint}</Hint>
        <footer>
          <button type="button" className="ghost" disabled={index === 0} onClick={() => setIndex((current) => Math.max(0, current - 1))}><ArrowLeft /> Voltar</button>
          <button type="button" className="next" onClick={advance}>
            {finalStep ? <CheckCircle2 /> : null}
            {finalStep ? 'Concluir' : 'Próximo'}
            {!finalStep ? <ArrowRight /> : null}
          </button>
        </footer>
      </Bubble>
    </Layer>
  );
}

const Layer = styled.div`position:fixed;inset:0;z-index:12000;pointer-events:none;`;
const Dimmer = styled.div`position:absolute;inset:0;background:rgba(8,10,12,.62);pointer-events:auto;`;
const Bubble = styled.section`
  position:fixed;left:clamp(14px,4vw,220px);bottom:clamp(16px,5vh,120px);z-index:2;width:min(390px,calc(100vw - 28px));padding:18px;border:1px solid rgba(255,255,255,.12);border-radius:18px;color:#fff;background:linear-gradient(155deg,#16191d 0%,#0d0f12 100%);box-shadow:0 20px 54px rgba(0,0,0,.36);pointer-events:auto;animation:employee-tour-in 160ms ease-out;
  @keyframes employee-tour-in{from{opacity:0;transform:translateY(7px) scale(.99)}to{opacity:1;transform:none}}
  header{display:flex;align-items:center;justify-content:space-between;gap:12px}header>button{width:34px;height:34px;border:1px solid rgba(255,255,255,.11);border-radius:10px;display:grid;place-items:center;color:#d9dde2;background:rgba(255,255,255,.06);cursor:pointer}header>button:hover{color:#fff;background:rgba(255,255,255,.11)}header svg{width:16px;height:16px}
  .step-count{display:block;color:#929aa4;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}h2{margin:7px 0 8px;color:#fff;font-size:19px;line-height:1.25}p{margin:0;color:#c9ced4;font-size:13px;line-height:1.6}
  footer{margin-top:18px;display:flex;align-items:center;justify-content:space-between;gap:10px}footer button{min-height:40px;padding:0 13px;border-radius:11px;display:inline-flex;align-items:center;justify-content:center;gap:7px;font-size:12px;font-weight:800;cursor:pointer}footer button svg{width:15px}.ghost{border:1px solid rgba(255,255,255,.1);color:#cbd0d5;background:transparent}.ghost:disabled{opacity:.35;cursor:default}.next{border:0;color:#111317;background:#fff;box-shadow:0 8px 20px rgba(255,255,255,.08)}
  @media(max-width:700px){left:12px;right:12px;bottom:12px;width:auto;border-radius:20px}@media(prefers-reduced-motion:reduce){animation:none}
`;
const Progress = styled.div`height:4px;margin:15px 0 12px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.1);i{display:block;height:100%;border-radius:inherit;background:#f26a21;transition:width 180ms ease}`;
const Hint = styled.div`margin-top:14px;padding:10px 11px;border:1px solid rgba(242,106,33,.22);border-radius:11px;background:rgba(242,106,33,.09);color:#ffd5bd;font-size:11px;font-weight:700;line-height:1.45;`;
