import { useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  MessageCircle,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import aiSupportService from "../../Services/aiSupportService";

type ChatRole =
  | "VISITANTE"
  | "CLIENTE"
  | "FUNCIONARIO"
  | "MOTOQUEIRO"
  | "ADMIN"
  | "SUPER_ADMIN";

type ChatMessage = {
  id: string;
  sender: "bot" | "user";
  text: string;
};

const ROLE_LABEL: Record<ChatRole, string> = {
  VISITANTE: "Visitante",
  CLIENTE: "Cliente",
  FUNCIONARIO: "Funcionario",
  MOTOQUEIRO: "Motoqueiro",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

const PROHIBITED_PATTERNS = [
  /senha|password|token|jwt|api key|secret|segredo|credencial/i,
  /hack|hacker|invadir|burlar|explorar vulnerabilidade|sql injection|xss|csrf/i,
  /\.env|variavel de ambiente|chave privada|webhook secret|assinatura secreta/i,
  /numero completo do cartao|cvv|dados bancarios sensiveis|acesso ao banco/i,
  /endpoint interno|porta interna|arquitetura interna|codigo fonte/i,
];

const ROUTE_TIPS = [
  {
    test: (pathname: string) =>
      pathname === "/" || pathname === "/menu" || pathname === "/cardapio",
    title: "Navegacao inicial",
    help: "Aqui voce pode navegar para cardapio, carrinho e seu perfil.",
  },
  {
    test: (pathname: string) => pathname.startsWith("/cart"),
    title: "Carrinho",
    help: "Revise itens, endereco e forma de pagamento antes de finalizar o pedido.",
  },
  {
    test: (pathname: string) => pathname.startsWith("/profile"),
    title: "Perfil",
    help: "Atualize dados pessoais e acompanhe seus pedidos do perfil.",
  },
  {
    test: (pathname: string) => pathname.startsWith("/employees"),
    title: "Painel de funcionarios",
    help: "Use para gerenciar pedidos, mesas e operacao de atendimento.",
  },
  {
    test: (pathname: string) => pathname.startsWith("/courier"),
    title: "Painel de entregas",
    help: "Acompanhe pedidos de entrega, status e confirmacoes de rota.",
  },
  {
    test: (pathname: string) => pathname.startsWith("/admin"),
    title: "Painel admin",
    help: "Gerencie pedidos, produtos, equipe, faturamento e configuracoes.",
  },
  {
    test: (pathname: string) => pathname.startsWith("/billing"),
    title: "Faturamento",
    help: "Monitore faturas, vencimentos e status de cobranca.",
  },
  {
    test: (pathname: string) => pathname.startsWith("/super_admin"),
    title: "Painel super admin",
    help: "Monitore licencas, restaurantes e visao global da plataforma.",
  },
  {
    test: (pathname: string) => pathname.startsWith("/mesa/"),
    title: "Cardapio digital da mesa",
    help: "Cliente pode selecionar produtos e enviar pedido direto da mesa.",
  },
];

type Topic = {
  id: string;
  keywords: string[];
  answer: (role: ChatRole, routeTitle: string, routeHelp: string) => string;
};

const TOPICS: Topic[] = [
  {
    id: "orders",
    keywords: ["pedido", "status", "acompanhar", "entrega", "atualizar"],
    answer: (role, routeTitle, routeHelp) =>
      `${buildRoleGuidance(role)}\n\nFluxo recomendado: 1) conferir status do pedido, 2) validar pagamento, 3) confirmar proxima acao operacional.\n\nContexto atual: ${routeTitle}. ${routeHelp}`,
  },
  {
    id: "profile",
    keywords: ["perfil", "conta", "endereco", "dados", "cadastro"],
    answer: () =>
      "Para dados de conta, use o perfil para atualizar telefone, endereco e informacoes pessoais. Se houver divergencia de dados, atualize primeiro o perfil e depois tente a operacao novamente.",
  },
  {
    id: "payment",
    keywords: ["pagamento", "pix", "cartao", "fatura", "cobranca", "boleto"],
    answer: (role) =>
      role === "ADMIN"
        ? "No admin, acompanhe faturamento para ver vencimentos e status. No checkout, confirme valor final, metodo de pagamento e comprovante antes de concluir."
        : "No checkout, confirme itens, taxa, endereco e metodo de pagamento. Em caso de erro, tente atualizar a pagina e repetir com internet estavel.",
  },
  {
    id: "team",
    keywords: ["funcionario", "equipe", "motoqueiro", "colaborador", "cargo"],
    answer: () =>
      "Gestao de equipe fica no painel admin. Funcionarios e motoqueiros operam pelos paineis dedicados para atualizar status, acompanhar tarefas e manter fluxo de atendimento.",
  },
  {
    id: "navigation",
    keywords: ["rota", "tela", "onde", "ir", "acessar", "navegar", "menu"],
    answer: (_role, routeTitle, routeHelp) =>
      `Voce esta em ${routeTitle}. ${routeHelp} Se quiser, descrevo o caminho exato de cliques para chegar na tela que voce precisa.`,
  },
  {
    id: "greeting",
    keywords: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "tudo bem"],
    answer: (role, routeTitle) =>
      `Ola! Sou seu assistente de suporte para ${ROLE_LABEL[role]}. Posso te ajudar com duvidas do sistema, operacao e boas praticas na tela ${routeTitle}.`,
  },
  {
    id: "thanks",
    keywords: ["obrigado", "valeu", "agradeco", "tmj"],
    answer: () => "Perfeito. Se quiser, continuo te guiando no proximo passo.",
  },
  {
    id: "troubleshooting",
    keywords: ["erro", "nao funciona", "travou", "falhou", "bug", "problema"],
    answer: () =>
      "Para diagnosticar rapido: 1) atualize a pagina, 2) confira internet, 3) refaca o fluxo em ordem, 4) confirme se o perfil tem permissao para a acao. Se quiser, te ajudo a isolar o erro passo a passo.",
  },
  {
    id: "general",
    keywords: ["explica", "resuma", "como", "por que", "qual", "quais"],
    answer: (_role, routeTitle, routeHelp) =>
      `Posso explicar de forma simples e direta.\n\nContexto atual: ${routeTitle}. ${routeHelp}`,
  },
];

function normalizeRole(rawRole: unknown): ChatRole {
  if (typeof rawRole !== "string") {
    return "VISITANTE";
  }

  const normalized = rawRole.trim().toUpperCase();

  if (
    normalized === "CLIENTE" ||
    normalized === "FUNCIONARIO" ||
    normalized === "MOTOQUEIRO" ||
    normalized === "ADMIN" ||
    normalized === "SUPER_ADMIN"
  ) {
    return normalized;
  }

  return "VISITANTE";
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getRouteContext(pathname: string) {
  const found = ROUTE_TIPS.find((tip) => tip.test(pathname));
  return (
    found || {
      title: "Navegacao",
      help: "Posso ajudar voce a encontrar o fluxo certo dentro da plataforma.",
    }
  );
}

function getPreviousUserQuestion(history: ChatMessage[]) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const message = history[index];
    if (message.sender === "user") {
      return message.text;
    }
  }

  return "";
}

function scoreTopic(text: string, keywords: string[]) {
  let score = 0;

  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      score += keyword.length > 5 ? 2 : 1;
    }
  }

  return score;
}

function isFollowUpQuestion(normalizedQuestion: string) {
  return (
    normalizedQuestion.length <= 25 &&
    (normalizedQuestion.startsWith("e ") ||
      normalizedQuestion.startsWith("e se") ||
      normalizedQuestion.startsWith("entao") ||
      normalizedQuestion.startsWith("mas ") ||
      normalizedQuestion.startsWith("isso"))
  );
}

function getQuickPrompts(role: ChatRole) {
  if (role === "ADMIN") {
    return [
      "Como gerencio pedidos no admin?",
      "Como cadastrar funcionarios?",
      "Onde vejo o faturamento?",
    ];
  }

  if (role === "FUNCIONARIO") {
    return [
      "Como atualizar status do pedido?",
      "Como usar a aba de mesas?",
      "Como acessar meu perfil?",
    ];
  }

  if (role === "MOTOQUEIRO") {
    return [
      "Como acompanhar entregas?",
      "Como confirmar pedido entregue?",
      "Como atualizar meu perfil?",
    ];
  }

  if (role === "SUPER_ADMIN") {
    return [
      "Quais areas do super admin existem?",
      "Como monitorar restaurantes?",
      "Como acompanhar licencas?",
    ];
  }

  return [
    "Como faco meu pedido?",
    "Como acompanho meus pedidos?",
    "Como atualizo meu endereco?",
  ];
}

function buildRoleGuidance(role: ChatRole) {
  if (role === "ADMIN") {
    return "Para admin: foque em pedidos, equipe, configuracoes do cardapio e faturamento.";
  }

  if (role === "FUNCIONARIO") {
    return "Para funcionario: foque no fluxo operacional de pedidos, mesas e atendimento.";
  }

  if (role === "MOTOQUEIRO") {
    return "Para motoqueiro: foque em entregas, status de corrida e confirmacao de entrega.";
  }

  if (role === "SUPER_ADMIN") {
    return "Para super admin: foque em monitoramento global, licencas e governanca da plataforma.";
  }

  return "Para cliente: foque em cardapio, carrinho, pagamento, perfil e historico de pedidos.";
}

function buildSafeAnswer(
  question: string,
  role: ChatRole,
  pathname: string,
  history: ChatMessage[],
) {
  if (PROHIBITED_PATTERNS.some((pattern) => pattern.test(question))) {
    return "Nao posso ajudar com dados sensiveis, credenciais, detalhes internos ou instrucoes que comprometam a seguranca. Posso orientar apenas fluxos seguros de uso da plataforma.";
  }

  const normalizedQuestion = normalizeText(question);
  const previousUserQuestion = normalizeText(getPreviousUserQuestion(history));
  const effectiveQuestion = isFollowUpQuestion(normalizedQuestion)
    ? `${previousUserQuestion} ${normalizedQuestion}`.trim()
    : normalizedQuestion;
  const routeContext = getRouteContext(pathname);

  if (!effectiveQuestion || effectiveQuestion.length < 2) {
    return "Me diga sua duvida com um pouco mais de contexto e eu te respondo em passos curtos e objetivos.";
  }

  const rankedTopics = TOPICS.map((topic) => ({
    topic,
    score: scoreTopic(effectiveQuestion, topic.keywords),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const topTopic = rankedTopics[0]?.topic;

  if (topTopic) {
    const baseAnswer = topTopic.answer(
      role,
      routeContext.title,
      routeContext.help,
    );

    if (
      effectiveQuestion.includes("passo a passo") ||
      effectiveQuestion.includes("etapa") ||
      effectiveQuestion.includes("checklist")
    ) {
      return `${baseAnswer}\n\nSe quiser, eu te entrego agora um passo a passo personalizado para sua funcao (${ROLE_LABEL[role]}).`;
    }

    return baseAnswer;
  }

  return `Entendi sua pergunta e posso ajudar com orientacoes gerais de uso, operacao e boas praticas no sistema.\n\nContexto atual: ${routeContext.title}. ${routeContext.help}\n\nSe quiser uma resposta mais precisa, me diga o objetivo final (ex: finalizar pedido, atualizar perfil, resolver erro ou localizar uma tela).`;
}

function buildWelcomeMessage(role: ChatRole, pathname: string) {
  const routeContext = getRouteContext(pathname);
  return `Assistente de suporte ativo para ${ROLE_LABEL[role]}. Eu respondo duvidas sobre uso do sistema e fluxos do site com foco em seguranca.\n\nTela atual: ${routeContext.title}. ${routeContext.help}`;
}

function createMessage(sender: "bot" | "user", text: string): ChatMessage {
  return {
    id: `${sender}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender,
    text,
  };
}

export default function GlobalAiAssistant() {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const pendingReplyTimeoutRef = useRef<number | null>(null);
  const replySequenceRef = useRef(0);

  const role = useMemo(() => normalizeRole(user?.role), [user?.role]);
  const quickPrompts = useMemo(() => getQuickPrompts(role), [role]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createMessage("bot", buildWelcomeMessage(role, location.pathname)),
  ]);

  useEffect(() => {
    return () => {
      if (pendingReplyTimeoutRef.current) {
        window.clearTimeout(pendingReplyTimeoutRef.current);
      }
    };
  }, []);

  function sendMessage(rawText: string) {
    const text = rawText.trim();

    if (!text) {
      return;
    }

    const userMessage = createMessage("user", text);
    const historyForRequest = [...messages, userMessage]
      .slice(-8)
      .map((message) => `${message.sender}: ${message.text}`);

    setMessages((current) => [...current, userMessage].slice(-30));
    setIsBotTyping(true);
    setInput("");
    replySequenceRef.current += 1;
    const currentSequence = replySequenceRef.current;

    if (pendingReplyTimeoutRef.current) {
      window.clearTimeout(pendingReplyTimeoutRef.current);
    }

    const delay = 950;

    pendingReplyTimeoutRef.current = window.setTimeout(async () => {
      let answer = buildSafeAnswer(text, role, location.pathname, messages);

      try {
        const response = await aiSupportService.ask({
          question: text,
          role,
          pathname: location.pathname,
          history: historyForRequest,
        });

        const remoteAnswer =
          typeof response?.answer === "string" ? response.answer.trim() : "";

        if (remoteAnswer) {
          answer = remoteAnswer;
        }
      } catch {
        // Fallback local ja calculado.
      }

      if (currentSequence !== replySequenceRef.current) {
        return;
      }

      const botMessage = createMessage("bot", answer);
      setMessages((current) => [...current, botMessage].slice(-30));
      setIsBotTyping(false);
      pendingReplyTimeoutRef.current = null;
    }, delay);
  }

  function handleToggle() {
    setIsOpen((current) => !current);
  }

  return (
    <AssistantRoot>
      {isOpen ? (
        <AssistantCard>
          <AssistantHeader>
            <HeaderTitle>
              <Sparkles size={16} />
              <div>
                <strong>Assistente IA de Suporte</strong>
                <span>{ROLE_LABEL[role]}</span>
              </div>
            </HeaderTitle>

            <HeaderActions>
              <SecurityBadge>
                <ShieldCheck size={14} /> Seguro
              </SecurityBadge>
              <CloseButton
                type="button"
                onClick={handleToggle}
                aria-label="Fechar assistente"
              >
                <X size={16} />
              </CloseButton>
            </HeaderActions>
          </AssistantHeader>

          <MessagesArea>
            {messages.map((message) => (
              <MessageBubble key={message.id} $sender={message.sender}>
                {message.text}
              </MessageBubble>
            ))}
            {isBotTyping ? (
              <TypingBubble>
                <TypingDot />
                <TypingDot />
                <TypingDot />
              </TypingBubble>
            ) : null}
          </MessagesArea>

          <PromptRow>
            {quickPrompts.map((prompt) => (
              <PromptChip
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
              >
                {prompt}
              </PromptChip>
            ))}
          </PromptRow>

          <Composer>
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Pergunte sobre pedidos, perfil, operacao ou faturamento"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  sendMessage(input);
                }
              }}
            />
            <SendButton
              type="button"
              onClick={() => sendMessage(input)}
              aria-label="Enviar pergunta"
            >
              <SendHorizontal size={17} />
            </SendButton>
          </Composer>
        </AssistantCard>
      ) : null}

      <FloatingButton
        type="button"
        onClick={handleToggle}
        aria-label="Abrir assistente IA"
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </FloatingButton>
    </AssistantRoot>
  );
}

const rise = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const AssistantRoot = styled.div`
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;

  @media (max-width: 768px) {
    right: 12px;
    bottom: 12px;
  }
`;

const FloatingButton = styled.button`
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 999px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #1f2937;
  background: linear-gradient(150deg, #fef3c7, #fde68a);
  border: 1px solid #fcd34d;
  box-shadow: 0 14px 30px rgba(17, 24, 39, 0.18);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 35px rgba(17, 24, 39, 0.24);
  }
`;

const AssistantCard = styled.section`
  width: min(400px, calc(100vw - 24px));
  height: min(560px, calc(100vh - 120px));
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #111827;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  animation: ${rise} 0.2s ease;
  box-shadow: 0 20px 45px rgba(17, 24, 39, 0.16);
`;

const AssistantHeader = styled.header`
  padding: 12px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: linear-gradient(140deg, #ffffff, #f8fafc 65%, #fef9c3);
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  strong {
    display: block;
    font-size: 0.9rem;
    line-height: 1.15;
  }

  span {
    display: block;
    font-size: 0.76rem;
    color: #64748b;
    margin-top: 2px;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SecurityBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 0.72rem;
  border: 1px solid #e2e8f0;
  color: #166534;
  background: #f0fdf4;
`;

const CloseButton = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #334155;
  display: grid;
  place-items: center;
  cursor: pointer;
`;

const MessagesArea = styled.div`
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background:
    radial-gradient(
      circle at top left,
      rgba(250, 204, 21, 0.14),
      transparent 42%
    ),
    linear-gradient(180deg, #ffffff, #f8fafc);
`;

const MessageBubble = styled.div<{ $sender: "bot" | "user" }>`
  align-self: ${({ $sender }) =>
    $sender === "user" ? "flex-end" : "flex-start"};
  max-width: 92%;
  white-space: pre-wrap;
  line-height: 1.4;
  font-size: 0.88rem;
  border-radius: 12px;
  padding: 9px 11px;
  background: ${({ $sender }) =>
    $sender === "user"
      ? "linear-gradient(140deg, #1f2937, #111827)"
      : "#ffffff"};
  color: ${({ $sender }) => ($sender === "user" ? "#f9fafb" : "#111827")};
  border: 1px solid
    ${({ $sender }) =>
      $sender === "user" ? "rgba(31, 41, 55, 0.5)" : "#e2e8f0"};
`;

const typingPulse = keyframes`
  0%,
  80%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-2px);
  }
`;

const TypingBubble = styled.div`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 12px;
  padding: 10px 11px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
`;

const TypingDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #94a3b8;
  animation: ${typingPulse} 1s ease-in-out infinite;

  &:nth-child(2) {
    animation-delay: 0.14s;
  }

  &:nth-child(3) {
    animation-delay: 0.28s;
  }
`;

const PromptRow = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 12px 10px;
`;

const PromptChip = styled.button`
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #334155;
  font-size: 0.74rem;
  padding: 6px 10px;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: #f8fafc;
  }
`;

const Composer = styled.div`
  padding: 10px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
`;

const Input = styled.input`
  flex: 1;
  min-width: 0;
  height: 38px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  padding: 0 10px;
  font-size: 0.86rem;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    outline: none;
    border-color: #94a3b8;
    box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.2);
  }
`;

const SendButton = styled.button`
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 10px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #111827;
  background: linear-gradient(145deg, #fde68a, #fcd34d);
  border: 1px solid #facc15;
`;
