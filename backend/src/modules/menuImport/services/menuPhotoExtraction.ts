import sharp from 'sharp';
import { z } from 'zod';

export const photoModeSchema = z.enum(['menu', 'product']).default('menu');
export type PhotoMode = z.infer<typeof photoModeSchema>;

const fields = z.enum(['category', 'name', 'description', 'price', 'image']);
const bounds = z.object({
  x: z.number().nonnegative().max(1),
  y: z.number().nonnegative().max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
});

const extraction = z.object({
  items: z.array(z.object({
    category: z.string().trim().max(120).nullish(),
    name: z.string().trim().max(160).nullish(),
    description: z.string().trim().max(1000).nullish(),
    price: z.number().positive().max(100000).nullish(),
    confidence: z.number().min(0).max(1),
    uncertainFields: z.array(fields).max(5),
    // A questionable box only omits its photo. The text can still be reviewed.
    photoBounds: bounds.nullish().catch(null),
  })).max(500),
});

export async function readMenuPhoto(input: unknown) {
  const error = 'Envie uma foto JPEG, PNG ou WebP válida de até 1,8 MB.';
  if (typeof input !== 'string' || input.length > 2_500_000) throw new Error(error);
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/u.exec(input);
  if (!match) throw new Error(error);
  const bytes = Buffer.from(match[2], 'base64');
  try {
    const source = sharp(bytes, { limitInputPixels: 24_000_000, failOn: 'warning' });
    const metadata = await source.metadata();
    if (metadata.format !== match[1] || (metadata.pages ?? 1) > 1) throw new Error(error);
    // Give the model and the cropper the same pixel coordinates, including phone orientation.
    const { data, info } = await source.autoOrient()
      .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#fff' }).webp({ quality: 90 }).toBuffer({ resolveWithObject: true });
    return {
      data,
      width: info.width,
      height: info.height,
      url: 'data:image/webp;base64,' + data.toString('base64'),
    };
  } catch {
    throw new Error(error);
  }
}

type Photo = Awaited<ReturnType<typeof readMenuPhoto>>;

async function extractProductPhoto(photo: Photo, box: z.infer<typeof bounds>) {
  if (box.x + box.width > 1.001 || box.y + box.height > 1.001) return null;
  const left = Math.round(box.x * photo.width);
  const top = Math.round(box.y * photo.height);
  const width = Math.min(photo.width - left, Math.round(box.width * photo.width));
  const height = Math.min(photo.height - top, Math.round(box.height * photo.height));
  if (width < 24 || height < 24) return null;
  const data = await sharp(photo.data).extract({ left, top, width, height })
    .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 }).toBuffer();
  return 'data:image/webp;base64,' + data.toString('base64');
}

export async function prepareExtractedItems(input: unknown, mode: PhotoMode, photo: Photo) {
  const result = extraction.safeParse(input);
  if (!result.success) throw new Error('A leitura não retornou itens válidos. Tente com outra foto.');
  if (!result.data.items.length) throw new Error('Nenhum produto foi identificado na foto.');
  if (mode === 'product' && result.data.items.length !== 1) {
    throw new Error('Envie a foto de apenas um produto ou escolha a opção de cardápio.');
  }

  let crops = 0;
  const items = [];
  for (const item of result.data.items) {
    let image = mode === 'product' ? photo.url : null;
    if (mode === 'menu' && item.photoBounds && !item.uncertainFields.includes('image') && crops < 24) {
      image = await extractProductPhoto(photo, item.photoBounds);
      if (image) crops++;
    }
    const uncertain = new Set(item.uncertainFields);
    if (!item.category) uncertain.add('category');
    if (!item.name) uncertain.add('name');
    if (!item.description) uncertain.add('description');
    if (!item.price) uncertain.add('price');
    if (!image) uncertain.add('image');
    items.push({
      category: item.category || 'Geral',
      name: item.name || '',
      description: item.description || null,
      price: item.price ?? null,
      image,
      confidence: item.confidence,
      uncertainFields: [...uncertain],
    });
  }
  return items;
}
