type TokenUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: {
    text_tokens?: number;
    image_tokens?: number;
    cached_tokens?: number;
  };
};

const TEXT_PRICING_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gpt-4.1': { input: 2, output: 8 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-5.6-luna': { input: 0.2, output: 1.2 },
};

const DEFAULT_TEXT_PRICING = { input: 2, output: 8 };
const IMAGE_PRICING = {
  textInput: 5,
  imageInput: 8,
  cachedInput: 2,
  imageOutput: 30,
};

function finite(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function calculateTextUsageCostUsd(model: string, usage: unknown) {
  const parsed = (usage || {}) as TokenUsage;
  const pricing = TEXT_PRICING_PER_MILLION[model] || DEFAULT_TEXT_PRICING;
  const inputTokens = finite(parsed.prompt_tokens ?? parsed.input_tokens);
  const outputTokens = finite(parsed.completion_tokens ?? parsed.output_tokens);
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

export function calculateImageUsageCostUsd(usage: unknown, fallbackUsd: number) {
  const parsed = (usage || {}) as TokenUsage;
  const details = parsed.input_tokens_details || {};
  const textTokens = finite(details.text_tokens);
  const imageTokens = finite(details.image_tokens);
  const cachedTokens = Math.min(finite(details.cached_tokens), textTokens + imageTokens);
  const totalInput = finite(parsed.input_tokens);
  const uncategorizedInput = Math.max(0, totalInput - textTokens - imageTokens);
  const outputTokens = finite(parsed.output_tokens);

  if (!totalInput && !outputTokens && !textTokens && !imageTokens) {
    return fallbackUsd;
  }

  const categorizedCost =
    (textTokens * IMAGE_PRICING.textInput + imageTokens * IMAGE_PRICING.imageInput) / 1_000_000;
  const uncategorizedCost = (uncategorizedInput * IMAGE_PRICING.textInput) / 1_000_000;
  const cachedDiscount =
    (cachedTokens * Math.max(0, IMAGE_PRICING.imageInput - IMAGE_PRICING.cachedInput)) /
    1_000_000;
  const outputCost = (outputTokens * IMAGE_PRICING.imageOutput) / 1_000_000;

  return Math.max(0, categorizedCost + uncategorizedCost + outputCost - cachedDiscount);
}
