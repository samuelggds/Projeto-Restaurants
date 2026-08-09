const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
// Mantém o JSON completo abaixo do limite padrão de 1 MB do backend.
const MAX_OUTPUT_LENGTH = 700_000;

export function isPersistentImageSource(value: unknown) {
  const source = String(value || "").trim();
  return /^https?:\/\//i.test(source) || /^data:image\/(jpeg|png|webp);base64,/i.test(source);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("O arquivo selecionado não é uma imagem válida."));
    image.src = source;
  });
}

export async function createPersistentImageDataUrl(file: File, maxDimension = 512) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Use uma imagem JPG, PNG ou WebP.");
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Seu navegador não conseguiu processar a imagem.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  let quality = 0.88;
  let result = canvas.toDataURL("image/webp", quality);
  while (result.length > MAX_OUTPUT_LENGTH && quality > 0.5) {
    quality -= 0.08;
    result = canvas.toDataURL("image/webp", quality);
  }

  if (!result.startsWith("data:image/") || result.length > MAX_OUTPUT_LENGTH) {
    throw new Error("A imagem ficou muito grande mesmo após a otimização.");
  }

  return result;
}
