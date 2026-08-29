export class ImageEnhancementInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageEnhancementInputError';
  }
}

export class ImageEnhancementConfigurationError extends Error {
  constructor() {
    super('Image enhancement provider is not configured.');
    this.name = 'ImageEnhancementConfigurationError';
  }
}

export class ImageEnhancementResultError extends Error {
  constructor() {
    super('Image enhancement provider returned an empty result.');
    this.name = 'ImageEnhancementResultError';
  }
}
