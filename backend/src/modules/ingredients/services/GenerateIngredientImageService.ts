import OpenAI from 'openai';
import { calculateImageUsageCostUsd } from '../../aiSupport/services/openAiUsageCost.js';

type GenerateIngredientImageInput = {
  name?: unknown;
  category?: unknown;
};

function normalizeText(value: unknown, max: number) {
  return String(value || '').trim().slice(0, max);
}

function ingredientPrompt(name: string, category: string) {
  return [
    'Crie uma fotografia comercial quadrada, realista e limpa de um ingrediente para um sistema de restaurante.',
    `Ingrediente: ${name}.`,
    category ? `Categoria: ${category}.` : '',
    'Mostre somente o ingrediente genérico descrito, em apresentação natural e profissional, com iluminação de estúdio suave, fundo neutro e enquadramento central.',
    'Não adicione texto, preço, selo, logotipo, embalagem com marca, marca d’água, pessoas, utensílios ou ingredientes diferentes.',
    'A imagem deve parecer uma fotografia real e ser adequada para miniatura de catálogo.',
  ]
    .filter(Boolean)
    .join(' ');
}

class GenerateIngredientImageService {
  async execute(input: GenerateIngredientImageInput) {
    const name = normalizeText(input.name, 80);
    const category = normalizeText(input.category, 60);
    if (name.length < 2) throw new Error('Informe o nome do ingrediente para gerar a imagem.');

    const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada para geração de imagens.');

    const client = new OpenAI({ apiKey, timeout: 165_000, maxRetries: 0 });
    const result = await client.images.generate({
      model: 'gpt-image-2',
      prompt: ingredientPrompt(name, category),
      size: '1024x1024',
      quality: 'low',
      n: 1,
    });
    const base64 = result.data?.[0]?.b64_json;
    if (!base64) throw new Error('A IA não retornou uma imagem para o ingrediente.');

    const usage = (result as unknown as { usage?: unknown }).usage;
    return {
      image: `data:image/png;base64,${base64}`,
      aiUsage: {
        model: 'gpt-image-2',
        usage: usage ?? null,
        costUsd: calculateImageUsageCostUsd(usage, 0.009),
      },
    };
  }
}

export default new GenerateIngredientImageService();
