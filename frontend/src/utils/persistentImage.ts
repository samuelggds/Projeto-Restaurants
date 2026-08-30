const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
// Mantém o JSON completo abaixo do limite padrão de 1 MB do backend.
const MAX_OUTPUT_LENGTH = 700_000;

export function isPersistentImageSource(value: unknown) {
  const source = String(value || '').trim();
  return /^https?:\/\//i.test(source) || /^data:image\/(jpeg|png|webp);base64,/i.test(source);
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(blob);
  });
}

async function encodeCanvasAsWebp(canvas: HTMLCanvasElement, quality: number) {
  if (typeof canvas.toBlob !== 'function') {
    return canvas.toDataURL('image/webp', quality);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (encoded) => {
        if (encoded) resolve(encoded);
        else reject(new Error('Seu navegador não conseguiu compactar a imagem.'));
      },
      'image/webp',
      quality,
    );
  });

  return readBlobAsDataUrl(blob);
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('O arquivo selecionado não é uma imagem válida.'));
    image.src = source;
  });
}

type PersistentImageOptions = {
  minimumWidth?: number;
  minimumHeight?: number;
  upscale?: boolean;
  targetWidth?: number;
  targetHeight?: number;
  /** Permite impor um orçamento menor para coleções com várias imagens. */
  maximumDataUrlLength?: number;
};

export async function createPersistentImageDataUrl(
  file: File,
  maxDimension = 512,
  options: PersistentImageOptions = {},
) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Use uma imagem JPG, PNG ou WebP.');
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('A imagem deve ter no máximo 5 MB.');
  }

  const originalDataUrl = await readBlobAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  if (
    (options.minimumWidth && image.naturalWidth < options.minimumWidth) ||
    (options.minimumHeight && image.naturalHeight < options.minimumHeight)
  ) {
    throw new Error(
      `A imagem possui ${image.naturalWidth} × ${image.naturalHeight} px. Use uma imagem com no mínimo ${options.minimumWidth || 1} × ${options.minimumHeight || 1} px.`,
    );
  }
  const hasTargetSize = Boolean(options.targetWidth && options.targetHeight);
  const requestedScale = maxDimension / Math.max(image.naturalWidth, image.naturalHeight);
  const scale = options.upscale ? requestedScale : Math.min(1, requestedScale);
  const width = hasTargetSize
    ? Number(options.targetWidth)
    : Math.max(1, Math.round(image.naturalWidth * scale));
  const height = hasTargetSize
    ? Number(options.targetHeight)
    : Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Seu navegador não conseguiu processar a imagem.');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.filter = 'contrast(1.04) saturate(1.03)';
  if (hasTargetSize) {
    const coverScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const sourceWidth = width / coverScale;
    const sourceHeight = height / coverScale;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
  } else {
    context.drawImage(image, 0, 0, width, height);
  }

  const maximumDataUrlLength = Math.min(
    MAX_OUTPUT_LENGTH,
    Math.max(100_000, options.maximumDataUrlLength ?? MAX_OUTPUT_LENGTH),
  );
  let quality = 0.88;
  let result = await encodeCanvasAsWebp(canvas, quality);
  while (result.length > maximumDataUrlLength && quality > 0.5) {
    quality -= 0.08;
    result = await encodeCanvasAsWebp(canvas, quality);
  }

  if (!result.startsWith('data:image/') || result.length > maximumDataUrlLength) {
    throw new Error('A imagem ficou muito grande mesmo após a otimização.');
  }

  return result;
}
