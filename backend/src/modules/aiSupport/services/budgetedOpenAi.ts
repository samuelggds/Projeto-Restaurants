import OpenAI from 'openai';
import aiCreditService, { type CreditActor } from './AiCreditService.js';
import { calculateImageUsageCostUsd, calculateTextUsageCostUsd } from './openAiUsageCost.js';

type UsageResult = { usage?: unknown; _request_id?: string };
type BudgetedRequest<T> = {
  actor: CreditActor;
  feature: string;
  model: string;
  budgetUsd: number;
  request: () => Promise<T>;
  cost: (usage: unknown) => number;
};

export async function runBudgetedAi<T extends UsageResult>(input: BudgetedRequest<T>) {
  const reservationId = await aiCreditService.reserve({
    ...input.actor,
    feature: input.feature,
    model: input.model,
    budgetUsd: input.budgetUsd,
  });
  let result: T;
  try {
    result = await input.request();
  } catch (error) {
    // A timeout or server error does not prove that the provider did not bill.
    const rejectedBeforeProcessing =
      error instanceof OpenAI.APIError &&
      [400, 401, 403, 404, 422, 429].includes(error.status ?? 0);
    await aiCreditService.markReservation(
      input.actor,
      reservationId,
      rejectedBeforeProcessing ? 'RELEASED' : 'UNCERTAIN',
      error instanceof OpenAI.APIError ? (error.request_id ?? undefined) : undefined,
    );
    throw error;
  }
  try {
    const costUsd = input.cost(result.usage);
    if (!Number.isFinite(costUsd) || costUsd <= 0)
      throw new Error('Uso do provedor ausente ou inválido.');
    // Settle before JSON/schema/image validation, saving products or returning data.
    await aiCreditService.settleReservation({
      ...input.actor,
      reservationId,
      feature: input.feature,
      model: input.model,
      costUsd,
      usage: result.usage,
      providerRequestId: result._request_id,
    });
  } catch (error) {
    await aiCreditService.markReservation(
      input.actor,
      reservationId,
      'UNCERTAIN',
      result._request_id,
    );
    throw error;
  }
  return result;
}

export function textRequestBudget(
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
) {
  let inputTokens = 1024;
  let imageCount = 0;
  for (const message of params.messages) {
    if (typeof message.content === 'string')
      inputTokens += Buffer.byteLength(message.content, 'utf8') + 128;
    else if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === 'text') inputTokens += Buffer.byteLength(part.text, 'utf8') + 128;
        else if (part.type === 'image_url') {
          imageCount += 1;
          inputTokens += 16_384;
        } else throw new Error('Tipo de entrada sem orçamento de IA definido.');
      }
    }
  }
  if (
    imageCount > 1 ||
    inputTokens > 120_000 ||
    params.tools?.length ||
    (params.n && params.n !== 1)
  ) {
    throw new Error('Entrada excede o orçamento permitido para esta operação de IA.');
  }
  const maxOutput = params.max_completion_tokens ?? 4096;
  if (!Number.isInteger(maxOutput) || maxOutput < 1 || maxOutput > 8192)
    throw new Error('Limite de saída de IA inválido.');
  return calculateTextUsageCostUsd(params.model, {
    prompt_tokens: inputTokens,
    completion_tokens: maxOutput,
  });
}

export function paidChatCompletion(
  client: OpenAI,
  actor: CreditActor,
  feature: string,
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
) {
  const budgetUsd = textRequestBudget(params);
  const bounded = {
    ...params,
    max_completion_tokens: params.max_completion_tokens ?? 4096,
    stream: false as const,
    n: 1,
  };
  return runBudgetedAi({
    actor,
    feature,
    model: params.model,
    budgetUsd,
    request: () => client.chat.completions.create(bounded),
    cost: (usage) => calculateTextUsageCostUsd(params.model, usage),
  });
}

function imageBudget(
  params: {
    model?: string;
    prompt: string;
    n?: number | null;
    quality?: string | null;
    size?: string | null;
  },
  edit: boolean,
) {
  if (
    params.model !== 'gpt-image-2' ||
    (params.n && params.n !== 1) ||
    !['low', 'high'].includes(params.quality || '') ||
    !['1024x1024', '1536x1024'].includes(params.size || '') ||
    Buffer.byteLength(params.prompt, 'utf8') > 32_000
  )
    throw new Error('Configuração de imagem sem orçamento de IA definido.');
  // Conservative holds for the explicitly bounded profiles; charged usage is
  // measured from the response, never these estimates. Surplus is released.
  return (
    (params.quality === 'high' ? 0.5 : 0.1) +
    (edit ? 0.5 : 0) +
    (Buffer.byteLength(params.prompt, 'utf8') * 5) / 1_000_000
  );
}

export function paidImageGeneration(
  client: OpenAI,
  actor: CreditActor,
  feature: string,
  params: OpenAI.Images.ImageGenerateParams,
) {
  const budgetUsd = imageBudget(params, false);
  return runBudgetedAi({
    actor,
    feature,
    model: 'gpt-image-2',
    budgetUsd,
    request: () =>
      client.images.generate(params) as Promise<OpenAI.Images.ImagesResponse & UsageResult>,
    cost: (usage) => calculateImageUsageCostUsd(usage, 0),
  });
}

export function paidImageEdit(
  client: OpenAI,
  actor: CreditActor,
  feature: string,
  params: OpenAI.Images.ImageEditParams,
) {
  const budgetUsd = imageBudget(params, true);
  return runBudgetedAi({
    actor,
    feature,
    model: 'gpt-image-2',
    budgetUsd,
    request: () =>
      client.images.edit(params) as Promise<OpenAI.Images.ImagesResponse & UsageResult>,
    cost: (usage) => calculateImageUsageCostUsd(usage, 0),
  });
}
