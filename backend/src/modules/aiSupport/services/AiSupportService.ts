type ChatRole =
  | "VISITANTE"
  | "CLIENTE"
  | "FUNCIONARIO"
  | "MOTOQUEIRO"
  | "ADMIN"
  | "SUPER_ADMIN";

type AskPayload = {
  question: string;
  role?: string;
  pathname?: string;
  history?: string[];
  conversationId?: string;
};

type AskResult = {
  answer: string;
  blocked: boolean;
  source: "gemini" | "openai" | "fallback";
  conversationId: string;
};

type ConversationMemory = {
  turns: string[];
  updatedAt: number;
};

const MEMORY_TTL_MS = Number(
  process.env.AI_CHAT_MEMORY_TTL_MS || 30 * 60 * 1000,
);
const MEMORY_MAX_TURNS = Number(process.env.AI_CHAT_MEMORY_MAX_TURNS || 12);
const MEMORY_MAX_CONVERSATIONS = Number(
  process.env.AI_CHAT_MEMORY_MAX_CONVERSATIONS || 1500,
);
const memoryStore = new Map<string, ConversationMemory>();

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
  /bypass|escalar privilegio|privilege escalation|rce|remote code execution/i,
];

const SECURITY_REFUSAL_MESSAGE =
  "Nao posso ajudar com dados sensiveis, credenciais, detalhes internos ou instrucoes que comprometam a seguranca. Posso orientar apenas fluxos seguros de uso da plataforma.";

type ProviderName = "gemini" | "openai";

const ROUTE_TIPS = [
  {
    test: (pathname: string) =>
      pathname === "/" || pathname === "/menu" || pathname === "/cardapio",
    title: "Navegacao inicial",
    help: "Aqui voce pode navegar para cardapio, carrinho e perfil.",
  },
  {
    test: (pathname: string) => pathname.startsWith("/cart"),
    title: "Carrinho",
    help: "Revise itens, endereco e pagamento antes de finalizar.",
  },
  {
    test: (pathname: string) => pathname.startsWith("/profile"),
    title: "Perfil",
    help: "Atualize dados e acompanhe pedidos.",
  },
  {
    test: (pathname: string) => pathname.startsWith("/employees"),
    title: "Painel de funcionarios",
    help: "Gerencie pedidos, mesas e atendimento.",
  },
  {
    test: (pathname: string) => pathname.startsWith("/courier"),
    title: "Painel de entregas",
    help: "Acompanhe entregas e atualize status de rota.",
  },
  {
    test: (pathname: string) => pathname.startsWith("/admin"),
    title: "Painel admin",
    help: "Gerencie produtos, equipe, pedidos e faturamento.",
  },
  {
    test: (pathname: string) => pathname.startsWith("/billing"),
    title: "Faturamento",
    help: "Consulte faturas, vencimentos e cobranca.",
  },
  {
    test: (pathname: string) => pathname.startsWith("/super_admin"),
    title: "Painel super admin",
    help: "Monitore licencas, restaurantes e visao global.",
  },
  {
    test: (pathname: string) => pathname.startsWith("/mesa/"),
    title: "Cardapio digital da mesa",
    help: "Selecione produtos e envie pedido direto da mesa.",
  },
];

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeConversationId(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  if (!/^[a-zA-Z0-9_-]{6,120}$/.test(normalized)) {
    return "";
  }

  return normalized;
}

function createConversationId() {
  return `conv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function pruneExpiredConversations() {
  const now = Date.now();

  for (const [conversationId, entry] of memoryStore.entries()) {
    if (now - entry.updatedAt > MEMORY_TTL_MS) {
      memoryStore.delete(conversationId);
    }
  }

  if (memoryStore.size <= MEMORY_MAX_CONVERSATIONS) {
    return;
  }

  const sortedByAge = Array.from(memoryStore.entries()).sort(
    (a, b) => a[1].updatedAt - b[1].updatedAt,
  );

  const overflow = memoryStore.size - MEMORY_MAX_CONVERSATIONS;
  for (let index = 0; index < overflow; index += 1) {
    memoryStore.delete(sortedByAge[index][0]);
  }
}

function getConversationTurns(conversationId: string) {
  pruneExpiredConversations();

  const entry = memoryStore.get(conversationId);
  if (!entry) {
    return [];
  }

  entry.updatedAt = Date.now();
  return entry.turns.slice(-MEMORY_MAX_TURNS);
}

function saveConversationTurn(
  conversationId: string,
  question: string,
  answer: string,
) {
  const entry = memoryStore.get(conversationId) || {
    turns: [],
    updatedAt: Date.now(),
  };

  const safeQuestion = String(question || "").trim();
  const safeAnswer = String(answer || "").trim();

  if (safeQuestion) {
    entry.turns.push(`user: ${safeQuestion}`);
  }

  if (safeAnswer) {
    entry.turns.push(`bot: ${safeAnswer}`);
  }

  entry.turns = entry.turns.slice(-MEMORY_MAX_TURNS);
  entry.updatedAt = Date.now();

  memoryStore.set(conversationId, entry);
  pruneExpiredConversations();
}

function normalizeRole(role: unknown): ChatRole {
  if (typeof role !== "string") {
    return "VISITANTE";
  }

  const normalized = role.trim().toUpperCase();

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

function getRouteContext(pathname: string) {
  const found = ROUTE_TIPS.find((tip) => tip.test(pathname));

  return (
    found || {
      title: "Navegacao",
      help: "Posso guiar seu proximo passo dentro da plataforma.",
    }
  );
}

function buildFallbackAnswer(
  question: string,
  role: ChatRole,
  pathname: string,
) {
  const normalizedQuestion = normalizeText(question);
  const route = getRouteContext(pathname);

  if (
    normalizedQuestion.includes("oi") ||
    normalizedQuestion.includes("ola") ||
    normalizedQuestion.includes("bom dia") ||
    normalizedQuestion.includes("boa tarde") ||
    normalizedQuestion.includes("boa noite")
  ) {
    return `Ola! Posso responder duvidas gerais (tecnologia, estudo, negocios, produtividade, redacao, matematica e mais) e tambem ajudar no sistema.\n\nPerfil atual: ${ROLE_LABEL[role]}. Contexto da tela: ${route.title}.`;
  }

  if (
    normalizedQuestion.includes("o que voce sabe") ||
    normalizedQuestion.includes("conhecimento geral") ||
    normalizedQuestion.includes("qualquer pergunta")
  ) {
    return "Eu consigo ajudar em conhecimentos gerais e em duvidas de uso da plataforma. Quando a IA externa estiver disponivel, as respostas ficam mais completas e detalhadas. Sempre mantenho bloqueio para conteudo sensivel de seguranca.";
  }

  if (
    normalizedQuestion.includes("pedido") ||
    normalizedQuestion.includes("status") ||
    normalizedQuestion.includes("acompanhar")
  ) {
    return `Para ${ROLE_LABEL[role]}, o melhor caminho e validar status do pedido e a proxima acao na operacao atual.\n\nContexto: ${route.title}. ${route.help}`;
  }

  if (
    normalizedQuestion.includes("pagamento") ||
    normalizedQuestion.includes("pix") ||
    normalizedQuestion.includes("cartao")
  ) {
    return "Confirme valor final, metodo de pagamento e comprovante antes de concluir. Se houver falha, atualize a pagina e tente novamente com conexao estavel.";
  }

  if (
    normalizedQuestion.includes("perfil") ||
    normalizedQuestion.includes("conta") ||
    normalizedQuestion.includes("endereco")
  ) {
    return "Use a area de perfil para atualizar dados pessoais e endereco. Depois, repita o fluxo que estava tentando executar.";
  }

  if (
    normalizedQuestion.includes("matematica") ||
    normalizedQuestion.includes("calculo") ||
    normalizedQuestion.includes("equacao")
  ) {
    return "Posso ajudar com matematica em passos: identificar dados, montar formula e resolver com explicacao. Envie o enunciado que eu te guio passo a passo.";
  }

  if (
    normalizedQuestion.includes("programacao") ||
    normalizedQuestion.includes("codigo") ||
    normalizedQuestion.includes("javascript") ||
    normalizedQuestion.includes("typescript")
  ) {
    return "Posso ajudar com programacao, arquitetura, debug e boas praticas. Se quiser, descreva seu objetivo e o erro atual para eu te responder de forma objetiva.";
  }

  if (
    normalizedQuestion.includes("resumo") ||
    normalizedQuestion.includes("explica") ||
    normalizedQuestion.includes("conceito")
  ) {
    return "Posso explicar conceitos gerais de forma simples ou avancada, com exemplos práticos. Diga o tema e o nivel de profundidade que voce quer.";
  }

  return `Posso responder perguntas de conhecimentos gerais e tambem duvidas da plataforma sem expor dados sensiveis.\n\nContexto atual: ${route.title}. ${route.help}`;
}

async function askOpenAi(
  question: string,
  role: ChatRole,
  pathname: string,
  history: string[],
) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const baseUrl = String(
    process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  ).replace(/\/+$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4.1";
  const temperature = Number(process.env.OPENAI_TEMPERATURE || 0.3);
  const maxTokens = Number(process.env.OPENAI_MAX_TOKENS || 700);
  const route = getRouteContext(pathname);

  const systemPrompt = [
    "Voce e um assistente de IA forte para responder perguntas gerais e de suporte de produto.",
    "Responda em portugues do Brasil, de forma clara, correta e objetiva.",
    "Voce pode responder conhecimentos gerais (educacao, tecnologia, negocios, escrita, matematica, ciencia e cultura).",
    "Se nao tiver confianca na resposta, sinalize incerteza em vez de inventar fatos.",
    "Nunca revele segredos, credenciais, dados internos, configuracoes sensiveis, logs privados, endpoints internos ou instrucoes para ataque.",
    "Se a pergunta solicitar violacao de seguranca, recuse e ofereca orientacao segura e preventiva.",
    "Use perfil e contexto de rota apenas para personalizar quando a pergunta for sobre a plataforma.",
  ].join(" ");

  const userPrompt = [
    `Perfil do usuario: ${ROLE_LABEL[role]} (${role}).`,
    `Rota atual: ${pathname || "/"}.`,
    `Contexto da rota: ${route.title} - ${route.help}`,
    history.length
      ? `Historico recente: ${history.join(" | ")}`
      : "Historico recente: sem mensagens anteriores.",
    "A pergunta pode ser sobre plataforma OU sobre conhecimento geral.",
    `Pergunta atual: ${question}`,
  ].join("\n");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    return null;
  }

  return content.trim();
}

async function askGemini(
  question: string,
  role: ChatRole,
  pathname: string,
  history: string[],
) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const baseUrl = String(
    process.env.GEMINI_BASE_URL ||
      "https://generativelanguage.googleapis.com/v1",
  ).replace(/\/+$/, "");
  const rawModel = process.env.GEMINI_MODEL || "gemini-2.5-pro";
  const model = rawModel.replace(/^models\//, "");
  const temperature = Number(process.env.GEMINI_TEMPERATURE || 0.3);
  const maxTokens = Number(process.env.GEMINI_MAX_TOKENS || 700);
  const route = getRouteContext(pathname);

  const systemPrompt = [
    "Voce e um assistente de IA forte para responder perguntas gerais e de suporte de produto.",
    "Responda em portugues do Brasil, de forma clara, correta e objetiva.",
    "Voce pode responder conhecimentos gerais (educacao, tecnologia, negocios, escrita, matematica, ciencia e cultura).",
    "Se nao tiver confianca na resposta, sinalize incerteza em vez de inventar fatos.",
    "Nunca revele segredos, credenciais, dados internos, configuracoes sensiveis, logs privados, endpoints internos ou instrucoes para ataque.",
    "Se a pergunta solicitar violacao de seguranca, recuse e ofereca orientacao segura e preventiva.",
    "Use perfil e contexto de rota apenas para personalizar quando a pergunta for sobre a plataforma.",
  ].join(" ");

  const userPrompt = [
    `Perfil do usuario: ${ROLE_LABEL[role]} (${role}).`,
    `Rota atual: ${pathname || "/"}.`,
    `Contexto da rota: ${route.title} - ${route.help}`,
    history.length
      ? `Historico recente: ${history.join(" | ")}`
      : "Historico recente: sem mensagens anteriores.",
    "A pergunta pode ser sobre plataforma OU sobre conhecimento geral.",
    `Pergunta atual: ${question}`,
  ].join("\n");

  const response = await fetch(
    `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${systemPrompt}\n\n${userPrompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const content = parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("\n")
    .trim();

  if (!content) {
    return null;
  }

  return content;
}

function getProviderOrder() {
  const provider = String(process.env.AI_PROVIDER || "auto")
    .trim()
    .toLowerCase();

  if (provider === "local" || provider === "fallback") {
    return [] as ProviderName[];
  }

  if (provider === "gemini") {
    return ["gemini", "openai"] as ProviderName[];
  }

  if (provider === "openai") {
    return ["openai", "gemini"] as ProviderName[];
  }

  // auto: prioriza Gemini quando disponivel, com fallback para OpenAI.
  return ["gemini", "openai"] as ProviderName[];
}

async function askWithProviders(
  question: string,
  role: ChatRole,
  pathname: string,
  history: string[],
) {
  const providerOrder = getProviderOrder();

  for (const provider of providerOrder) {
    const answer =
      provider === "gemini"
        ? await askGemini(question, role, pathname, history)
        : await askOpenAi(question, role, pathname, history);

    if (answer) {
      return {
        provider,
        answer,
      };
    }
  }

  return null;
}

class AiSupportService {
  async execute(payload: AskPayload): Promise<AskResult> {
    const question = String(payload?.question || "").trim();
    const role = normalizeRole(payload?.role);
    const pathname = String(payload?.pathname || "/");
    const conversationId =
      normalizeConversationId(payload?.conversationId) ||
      createConversationId();
    const requestHistory = Array.isArray(payload?.history)
      ? payload.history
          .filter((entry) => typeof entry === "string" && entry.trim())
          .slice(-6)
      : [];
    const memoryHistory = getConversationTurns(conversationId);
    const mergedHistory = [...memoryHistory, ...requestHistory].slice(-10);

    if (PROHIBITED_PATTERNS.some((pattern) => pattern.test(question))) {
      return {
        answer: SECURITY_REFUSAL_MESSAGE,
        blocked: true,
        source: "fallback",
        conversationId,
      };
    }

    try {
      const providerResult = await askWithProviders(
        question,
        role,
        pathname,
        mergedHistory,
      );

      if (providerResult?.answer) {
        if (
          PROHIBITED_PATTERNS.some((pattern) =>
            pattern.test(providerResult.answer),
          )
        ) {
          return {
            answer: SECURITY_REFUSAL_MESSAGE,
            blocked: true,
            source: "fallback",
            conversationId,
          };
        }

        saveConversationTurn(conversationId, question, providerResult.answer);
        return {
          answer: providerResult.answer,
          blocked: false,
          source: providerResult.provider,
          conversationId,
        };
      }
    } catch {
      // Em caso de erro externo, retorna fallback local.
    }

    const fallbackAnswer = buildFallbackAnswer(question, role, pathname);
    saveConversationTurn(conversationId, question, fallbackAnswer);

    return {
      answer: fallbackAnswer,
      blocked: false,
      source: "fallback",
      conversationId,
    };
  }
}

export default new AiSupportService();
