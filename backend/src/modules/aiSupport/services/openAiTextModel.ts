export const DEFAULT_OPENAI_TEXT_MODEL = 'gpt-5.6-sol';

export function resolveOpenAiTextModel(value = process.env.OPENAI_MODEL) {
  return String(value || DEFAULT_OPENAI_TEXT_MODEL).trim() || DEFAULT_OPENAI_TEXT_MODEL;
}

export function buildOpenAiJsonChatRequest<TMessage>(input: {
  model?: string;
  messages: TMessage[];
}) {
  return {
    model: resolveOpenAiTextModel(input.model),
    response_format: { type: 'json_object' as const },
    messages: input.messages,
  };
}
