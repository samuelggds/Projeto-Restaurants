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

// Standard API prices in USD per 1M tokens for models the application can use.
// Keep this list intentionally small: unknown model names fall back to gpt-4.1 pricing
// instead of inventing prices for ChatGPT-only model labels.
const TEXT_PRICING_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gpt-4.1': { input: 2, output: 8 },
  'gpt-4o': { input: 2.5, output: 10 },
};

const DEFAULT_TEXT_PRICING = TEXT_PRICING_PER_MILLION['gpt-4.1'];

// GPT Image 2 token pricing. Cached tokens are allocated proportionally between
// text and image input when the provider only returns one cached-token total.
const IMAGE_PRICING_PER_MILLION = {
  textInput: 5,
  textCachedInput: 1.25,
  imageInput: 8,
  imageCachedInput: 2,
  imageOutput: 30,
};

function finite(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function calculateTextUsageCostUsd(model: string, usage: unknown) {
  const parsed = (usage || {}) as TokenUsage;
  const normalizedModel = String(model || '').trim().toLowerCase();
  const pricing = TEXT_PRICING_PER_MILLION[normalizedModel] || DEFAULT_TEXT_PRICING;
  const inputTokens = finite(parsed.prompt_tokens ?? parsed.input_tokens);
  const outputTokens = finite(parsed.completion_tokens ?? parsed.output_tokens);
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

export function calculateImageUsageCostUsd(usage: unknown, fallbackUsd: number) {
  const parsed = (usage || {}) as TokenUsage;
  const details = parsed.input_tokens_details || {};
  const textTokens = finite(details.text_tokens);
  const imageTokens = finite(details.image_tokens);
  const categorizedInput = textTokens + imageTokens;
  const totalInput = Math.max(finite(parsed.input_tokens), categorizedInput);
  const cachedTokens = Math.min(finite(details.cached_tokens), totalInput);
  const outputTokens = finite(parsed.output_tokens);

  if (!totalInput && !outputTokens && !categorizedInput) {
    return fallbackUsd;
  }

  const categorizedRatio = categorizedInput > 0 ? Math.min(1, categorizedInput / totalInput) : 0;
  const cachedCategorized = cachedTokens * categorizedRatio;
  const cachedText =
    categorizedInput > 0 ? cachedCategorized * (textTokens / categorizedInput) : cachedTokens;
  const cachedImage =
    categorizedInput > 0 ? cachedCategorized * (imageTokens / categorizedInput) : 0;

  const uncategorizedInput = Math.max(0, totalInput - categorizedInput);
  const cachedUncategorized = Math.max(0, cachedTokens - cachedCategorized);
  const nonCachedText = Math.max(0, textTokens - cachedText);
  const nonCachedImage = Math.max(0, imageTokens - cachedImage);
  const nonCachedUncategorized = Math.max(0, uncategorizedInput - cachedUncategorized);

  const inputCost =
    (nonCachedText * IMAGE_PRICING_PER_MILLION.textInput +
      cachedText * IMAGE_PRICING_PER_MILLION.textCachedInput +
      nonCachedImage * IMAGE_PRICING_PER_MILLION.imageInput +
      cachedImage * IMAGE_PRICING_PER_MILLION.imageCachedInput +
      nonCachedUncategorized * IMAGE_PRICING_PER_MILLION.textInput +
      cachedUncategorized * IMAGE_PRICING_PER_MILLION.textCachedInput) /
    1_000_000;
  const outputCost =
    (outputTokens * IMAGE_PRICING_PER_MILLION.imageOutput) / 1_000_000;

  return Math.max(0, inputCost + outputCost);
}
