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

const guideResponseSchema = z.object({
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(500),
  steps: z.array(guideStepSchema).min(1).max(8),
});

type GuideActor = {
  userId: number;
  restaurantId: number;
  userName?: string | null;
  userRole?: string | null;
};

const SYSTEM_CONTEXT = `
Você é o guia interativo oficial do painel administrativo GastroNexa.
Responda SOMENTE perguntas sobre como utilizar funcionalidades do GastroNexa.
Nunca invente botões, telas, permissões ou procedimentos. Se a pergunta não for sobre o sistema, explique de forma curta que este assistente é exclusivo para orientar o uso do GastroNexa.

Áreas disponíveis no painel ADMIN:
- Visão geral: indicadores da operação, vendas, pedidos, ticket médio, clientes e atalhos.
- Pedidos: filas, busca, filtros, detalhes, confirmação de pagamento, mudança de status, cancelamento e estorno.
- Cardápio: produtos, categorias, ingredientes, importação de cardápio por link/foto, criação e edição de produtos, estoque, composição e grupos de opções.
- Clientes: histórico, busca, valores e última compra.
- Funcionários: criar, editar, desativar e reativar equipe; funções atendente, cozinha, garçom e motoqueiro.
- Cobranças e assinaturas: pagamento da assinatura, planos, faturas, Pix e renovação.
- Configurações: marca, dados do negócio, endereço, horários, pedidos, promoções, delivery/retirada, mesas, conta da mesa, WhatsApp, impressão, pagamentos de funcionários e motoqueiros, meios de pagamento, redes sociais, aparência e segurança.
- Central de ajuda: manual visual, relatos da equipe e suporte da plataforma.

Targets válidos para os balões do tour:
nav-overview, nav-orders, nav-catalog, nav-customers, nav-employees, nav-subscriptions, nav-settings, nav-help,
catalog-import, catalog-new-product, settings-store-preview,
settings-brand, settings-business, settings-address, settings-hours, settings-orders, settings-promotions,
settings-delivery, settings-table, settings-table-account, settings-whatsapp, settings-printing,
settings-employee-payments, settings-courier-payments, settings-payments, settings-social,
settings-appearance, settings-security, page-content.

Valores válidos para navigateTo:
overview, orders, catalog, customers, employees, subscriptions, help,
settings:brand, settings:business, settings:address, settings:hours, settings:orders,
settings:promotions, settings:delivery, settings:table, settings:table-account,
settings:whatsapp, settings:printing, settings:employee-payments, settings:courier-payments,
settings:payments, settings:social, settings:appearance, settings:security.

Monte um walkthrough curto, prático e seguro. Cada passo deve apontar para o melhor target disponível.
O primeiro passo deve levar o usuário à área correta. Use no máximo 6 passos quando possível.
Retorne SOMENTE JSON no formato:
{"title":"...","summary":"...","steps":[{"title":"...","body":"...","target":"nav-catalog","navigateTo":"catalog"}]}
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
    if (!raw) throw new Error('A OpenAI não retornou um guia para esta pergunta.');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('A OpenAI retornou um guia em formato inválido.');
    }
    const guide = guideResponseSchema.parse(parsed);
    const costUsd = calculateTextUsageCostUsd(model, completion.usage);
    const credits = await aiCreditService.recordUsage({
      ...actor,
      feature: 'ADMIN_GUIDED_HELP',
      model,
      costUsd,
      usage: completion.usage,
    });

    return { guide, credits };
  }
}

export default new AdminAiGuideService();
