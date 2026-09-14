type CreationField = 'creationRequestKey' | 'creationActor' | 'creationFingerprint';

/** Internal retry metadata must never enter HTTP responses or realtime events. */
export function withoutOrderCreationMetadata<T extends object>(order: T): Omit<T, CreationField> {
  const result = { ...order } as T & Partial<Record<CreationField, unknown>>;
  delete result.creationRequestKey;
  delete result.creationActor;
  delete result.creationFingerprint;
  return result;
}
