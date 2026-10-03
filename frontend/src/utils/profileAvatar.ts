export const PROFILE_AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PROFILE_AVATAR_MAX_SOURCE_BYTES = 5 * 1024 * 1024;

const ACCEPTED_PROFILE_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateProfileAvatarFile(file: File) {
  if (!ACCEPTED_PROFILE_AVATAR_TYPES.has(file.type)) {
    throw new Error('Escolha uma imagem JPG, PNG ou WEBP.');
  }

  if (file.size <= 0) {
    throw new Error('A imagem selecionada está vazia.');
  }

  if (file.size > PROFILE_AVATAR_MAX_SOURCE_BYTES) {
    throw new Error('A imagem original deve ter no máximo 5 MB.');
  }
}

export function resizeProfileAvatar(
  file: File,
  size = 160,
  quality = 0.8,
): Promise<string> {
  validateProfileAvatarFile(file);

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Não foi possível preparar a imagem neste dispositivo.');
        }

        const scale = Math.max(size / image.width, size / image.height);
        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;

        context.drawImage(
          image,
          (size - scaledWidth) / 2,
          (size - scaledHeight) / 2,
          scaledWidth,
          scaledHeight,
        );

        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Não foi possível preparar a imagem.'));
      } finally {
        cleanup();
      }
    };

    image.onerror = () => {
      cleanup();
      reject(new Error('Não foi possível carregar essa imagem.'));
    };

    image.src = objectUrl;
  });
}
