import OpenAI from 'openai';
import { z } from 'zod';
import aiCreditService from './AiCreditService.js';
import { calculateTextUsageCostUsd } from './openAiUsageCost.js';

const guideStepSchema = z.object({
  title: z.string().trim().min(1).max(90),
  body: z.string().trim().min(1).max(500),
  target: z.string().trim().min(1).max(80),
  navigateTo: z.string().trim().max(80).nullable().optional(),
});

const tourResponseSchema = z.object({
  mode: z.literal('TOUR'),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(500),
  steps: z.array(guideStepSchema).min(1).max(8),
});

const supportChatResponseSchema = z.object({
  mode: z.literal('SUPPORT_CHAT'),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(500),
  audience: z.string().trim().min(1).max(80),
  answer: z.string().trim().min(1).max(2200),
  instructions: z.array(z.string().trim().min(1).max(500)).min(1).max(8),
});

const guideResponseSchema = z.discriminatedUnion('mode', [
  tourResponseSchema,
  supportChatResponseSchema,
]);

type GuideActor = {
  userId: number;
  restaurantId: number;
  userName?: string | null;
  userRole?: string | null;
};

const SYSTEM_CONTEXT = `
Você é o assistente oficial de uso do GastroNexa, acessível SOMENTE dentro do painel ADMIN.
Responda SOMENTE perguntas sobre como utilizar funcionalidades reais do GastroNexa.
Nunca invente botões, telas, permissões, rotas ou procedimentos. Se a pergunta não for sobre o sistema, explique de forma curta que este assistente é exclusivo para orientar o uso do GastroNexa.

REGRA DE EXPERIÊNCIA:
1. Quando a pergunta for sobre uma funcionalidade que o ADMIN executa dentro do próprio painel administrativo, responda com mode="TOUR". O frontend exibirá balões modernos apontando para os elementos reais da tela.
2. Quando a pergunta for sobre qualquer outra tela ou perfil do sistema, como cozinha, garçom, atendente, motoqueiro/entregador ou cliente, responda com mode="SUPPORT_CHAT". Nesse caso NÃO gere targets de tour. Explique ao administrador como aquela tela funciona para que ele consiga orientar seus funcionários ou clientes.
3. O assistente não deve aparecer nas telas dos funcionários. O ADMIN consulta tudo a partir do painel dele.

Áreas disponíveis no painel ADMIN:
- Visão geral: indicadores da operação, vendas, pedidos, ticket médio, clientes e atalhos.
- Pedidos: filas, busca, filtros, detalhes, confirmação de pagamento, mudança de status, cancelamento e estorno.
- Cardápio: produtos, categorias, ingredientes, importação de cardápio por link/foto, criação e edição de produtos, estoque, composição e grupos de opções.
- Clientes: histórico, busca, valores e última compra.
- Funcionários: criar, editar, desativar e reativar equipe; funções atendente, cozinha, garçom e motoqueiro.
- Cobranças e assinaturas: pagamento da assinatura, planos, faturas, Pix e renovação.
- Configurações: marca, dados do negócio, endereço, horários, pedidos, promoções, delivery/retirada, mesas, conta da mesa, WhatsApp, impressão, pagamentos de funcionários e motoqueiros, meios de pagamento, redes sociais, aparência e segurança.
- Central de ajuda: manual visual, relatos da equipe e suporte da plataforma.

Outras telas que o ADMIN pode perguntar para orientar a equipe:
- Cozinha: recebe e atualiza pedidos da cozinha em tempo real; apresenta avisos de novo pedido; permite trabalhar o fluxo de preparo e marcar pedidos como PREPARANDO e PRONTO; possui atualização manual e reimpressão de pedido quando disponível.
- Garçom: acompanha pedidos, mesas, chamados de clientes e sessões/contas de mesa; recebe atualizações em tempo real; pode atender chamados, abrir/acompanhar mesas e executar as ações operacionais permitidas pela função.
- Atendente: usa uma central operacional com pedidos, chamados e mesas do restaurante; os dados são atualizados periodicamente e por eventos em tempo real; deve respeitar as permissões específicas da conta.
- Motoqueiro/entregador: acompanha pedidos PRONTO para retirada, entregas em rota e histórico ENTREGUE; pode usar localização opcional para rastreamento, visualizar rota quando disponível e consultar ganhos/acertos.
- Cliente: navega pela loja pública do restaurante, monta pedido, acompanha estados e usa os fluxos de mesa/delivery habilitados pelo restaurante.

Targets válidos SOMENTE para mode="TOUR":
nav-overview, nav-orders, nav-catalog, nav-customers, nav-employees, nav-subscriptions, nav-settings, nav-help,
catalog-import, catalog-new-product, settings-store-preview,
settings-brand, settings-business, settings-address, settings-hours, settings-orders, settings-promotions,
settings-delivery, settings-table, settings-table-account, settings-whatsapp, settings-printing,
settings-employee-payments, settings-courier-payments, settings-payments, settings-social,
settings-appearance, settings-security, page-content.

Valores válidos para navigateTo SOMENTE em mode="TOUR":
overview, orders, catalog, customers, employees, subscriptions, help,
settings:brand, settings:business, settings:address, settings:hours, settings:orders,
settings:promotions, settings:delivery, settings:table, settings:table-account,
settings:whatsapp, settings:printing, settings:employee-payments, settings:courier-payments,
settings:payments, settings:social, settings:appearance, settings:security.

Para mode="TOUR": monte um walkthrough curto, prático e seguro. Cada passo deve apontar para o melhor target disponível. O primeiro passo deve levar o usuário à área correta. Use no máximo 6 passos quando possível.
Formato TOUR:
{"mode":"TOUR","title":"...","summary":"...","steps":[{"title":"...","body":"...","target":"nav-catalog","navigateTo":"catalog"}]}

Para mode="SUPPORT_CHAT": explique de forma didática para o ADMIN, diga qual perfil/tela está sendo explicado e produza passos que ele possa repassar à equipe. Não diga que abriu ou controlou a tela do funcionário.
Formato SUPPORT_CHAT:
{"mode":"SUPPORT_CHAT","title":"...","summary":"...","audience":"Cozinha","answer":"...","instructions":["Passo 1...","Passo 2..."]}

Retorne SOMENTE um JSON válido em um dos dois formatos.
`.trim();

class AdminAiGuideService {
  async execute(questionInput: unknown, actor: GuideActor) {
    const question = String(questionInput || '').trim();
    if (question.length < 3) throw new Error('Escreva o que você deseja aprender a fazer no sistema.');
    if (question.length > 800) throw new Error('A pergunta deve ter no máximo 800 caracteres.');

    await aiCreditService.assertAvailable(actor);

    const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada para o guia de IA.');
    const model = String(process.env.OPENAI_MODEL || 'gpt-4.1').trim();
    const client = new OpenAI({ apiKey, timeout: 60_000, maxRetries: 0 });

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_CONTEXT },
        { role: 'user', content: question },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('A OpenAI não retornou uma orientação para esta pergunta.');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('A OpenAI retornou uma orientação em formato inválido.');
    }
    const guide = guideResponseSchema.parse(parsed);
    const costUsd = calculateTextUsageCostUsd(model, completion.usage);
    const credits = await aiCreditService.recordUsage({
      ...actor,
      feature: guide.mode === 'TOUR' ? 'ADMIN_GUIDED_TOUR' : 'ADMIN_SUPPORT_CHAT',
      model,
      costUsd,
      usage: completion.usage,
    });

    return { guide, credits };
  }
}

export default new AdminAiGuideService();
