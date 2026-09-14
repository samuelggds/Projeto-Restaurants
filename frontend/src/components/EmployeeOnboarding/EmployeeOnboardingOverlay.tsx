import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';

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
    {
      title: 'Fila de preparo',
      body: 'Aqui chegam os pedidos que precisam ser preparados. Priorize os mais antigos e confira os itens e observações antes de iniciar.',
      hint: 'Use a fila para organizar o trabalho da cozinha.',
    },
    {
      title: 'Atualize o status',
      body: 'Quando começar um pedido, marque como PREPARANDO. Ao finalizar tudo, marque como PRONTO para avisar a próxima etapa da operação.',
      hint: 'O status mantém salão, retirada e entrega sincronizados.',
    },
    {
      title: 'Atualização em tempo real',
      body: 'Novos pedidos e mudanças aparecem automaticamente. Use a atualização manual apenas quando precisar conferir a fila novamente.',
      hint: 'Fique atento aos avisos de novos pedidos.',
    },
    {
      title: 'Reimpressão e conferência',
      body: 'Quando a impressão estiver disponível, você pode reimprimir a comanda e conferir novamente os itens antes de liberar o pedido.',
      hint: 'Pedido conferido é pedido pronto para seguir.',
    },
  ],
  GARCOM: [
    {
      title: 'Mesas e pedidos',
      body: 'Acompanhe as mesas atendidas, pedidos em andamento e contas abertas. Use a tela para saber rapidamente o que precisa de atenção.',
      hint: 'Sua área reúne as informações do salão.',
    },
    {
      title: 'Chamados dos clientes',
      body: 'Quando um cliente chamar pelo cardápio da mesa, o chamado aparece aqui. Atenda o chamado e confirme quando ele estiver resolvido.',
      hint: 'Os chamados ajudam a reduzir o tempo de espera no salão.',
    },
    {
      title: 'Sessões de mesa',
      body: 'Confira quem está usando a mesa e acompanhe a conta enquanto novos pedidos são adicionados.',
      hint: 'A sessão mantém os pedidos vinculados à mesa correta.',
    },
    {
      title: 'Atualizações da operação',
      body: 'Pedidos, chamados e mesas recebem atualizações em tempo real. Execute apenas as ações liberadas para a sua função.',
      hint: 'O sistema respeita as permissões configuradas pelo administrador.',
    },
  ],
  ATENDENTE: [
    {
      title: 'Central operacional',
      body: 'Esta tela reúne pedidos, chamados e mesas para você acompanhar a operação do restaurante em um só lugar.',
      hint: 'Comece verificando os itens que precisam de atendimento imediato.',
    },
    {
      title: 'Acompanhe pedidos',
      body: 'Consulte o andamento dos pedidos e use somente as ações permitidas para a sua conta.',
      hint: 'Os status ajudam toda a equipe a trabalhar na mesma informação.',
    },
    {
      title: 'Chamados e mesas',
      body: 'Atenda solicitações dos clientes e acompanhe as mesas abertas para manter o salão organizado.',
      hint: 'Priorize chamados pendentes e situações que bloqueiem o atendimento.',
    },
    {
      title: 'Dados atualizados',
      body: 'A central recebe atualizações periódicas e em tempo real. Se algo parecer desatualizado, use a atualização da própria tela.',
      hint: 'Você não precisa sair e entrar novamente para atualizar a operação.',
    },
  ],
  MOTOQUEIRO: [
    {
      title: 'Entregas disponíveis',
      body: 'Os pedidos PRONTO que aguardam retirada aparecem na sua área. Confira o endereço e os dados antes de assumir uma entrega.',
      hint: 'Retire somente pedidos liberados pela operação.',
    },
    {
      title: 'Entrega em rota',
      body: 'Depois de sair com o pedido, acompanhe a entrega em andamento e use a rota disponível quando ela estiver habilitada.',
      hint: 'A localização é usada somente quando a função de rastreamento está ativa.',
    },
    {
      title: 'Finalize corretamente',
      body: 'Ao concluir a entrega, marque o pedido como ENTREGUE para encerrar o fluxo e atualizar o cliente e o restaurante.',
      hint: 'Finalize somente após a entrega realmente acontecer.',
    },
    {
      title: 'Ganhos e acertos',
      body: 'Consulte seu histórico, ganhos e acertos quando essas informações estiverem habilitadas pela administração.',
      hint: 'Use o histórico para conferir entregas concluídas e valores.',
    },
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
  const advance = () => {
    if (finalStep) onFinish();
    else setIndex((current) => current + 1);
  };

  return (
    <Backdrop role="presentation">
      <Card role="dialog" aria-modal="true" aria-labelledby="employee-onboarding-title">
        <Progress aria-label={`Etapa ${index + 1} de ${steps.length}`}>
          {steps.map((_, stepIndex) => (
            <i key={stepIndex} className={stepIndex <= index ? 'active' : ''} />
          ))}
        </Progress>
        <Close type="button" aria-label={finalStep ? 'Concluir apresentação' : 'Próxima etapa'} onClick={advance}>
          <X />
        </Close>
        <Eyebrow>Primeiro acesso · etapa {index + 1} de {steps.length}</Eyebrow>
        <h2 id="employee-onboarding-title">{step.title}</h2>
        <p>{step.body}</p>
        <Hint>{step.hint}</Hint>
        <Footer>
          <small>Este guia aparece somente neste primeiro acesso da sua conta.</small>
          <button type="button" onClick={advance}>
            {finalStep ? <CheckCircle2 /> : <ArrowRight />}
            {finalStep ? 'Concluir' : 'Próximo'}
          </button>
        </Footer>
      </Card>
    </Backdrop>
  );
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: grid;
  place-items: end center;
  padding: 24px;
  background: rgba(14, 12, 10, 0.38);
  backdrop-filter: blur(3px);
  pointer-events: auto;

  @media (min-width: 760px) {
    place-items: center;
  }
`;

const Card = styled.section`
  position: relative;
  width: min(100%, 520px);
  padding: 26px;
  border-radius: 22px;
  background: #fff;
  color: #211d1a;
  box-shadow: 0 30px 90px rgba(23, 16, 11, 0.28);
  border: 1px solid rgba(85, 62, 47, 0.12);

  h2 {
    margin: 8px 42px 8px 0;
    font-size: 1.4rem;
    letter-spacing: -0.025em;
  }

  p {
    margin: 0;
    color: #6e625b;
    line-height: 1.6;
    font-size: 0.94rem;
  }
`;

const Progress = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 18px;

  i {
    height: 4px;
    flex: 1;
    border-radius: 999px;
    background: #eee8e4;
  }

  i.active {
    background: #e9530b;
  }
`;

const Close = styled.button`
  position: absolute;
  top: 34px;
  right: 24px;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: #f7f3f0;
  color: #655b55;
  cursor: pointer;

  svg {
    width: 18px;
  }
`;

const Eyebrow = styled.span`
  color: #e9530b;
  font-size: 0.72rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Hint = styled.div`
  margin-top: 16px;
  padding: 11px 12px;
  border-radius: 12px;
  background: #fff5ee;
  color: #8d3e10;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.45;
`;

const Footer = styled.footer`
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  small {
    color: #91847c;
    font-size: 0.72rem;
    line-height: 1.4;
  }

  button {
    flex: 0 0 auto;
    min-height: 42px;
    border: 0;
    border-radius: 12px;
    padding: 0 15px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: #e9530b;
    color: #fff;
    font-weight: 800;
    cursor: pointer;
  }

  button svg {
    width: 17px;
  }

  @media (max-width: 480px) {
    align-items: stretch;
    flex-direction: column;

    button {
      justify-content: center;
    }
  }
`;
