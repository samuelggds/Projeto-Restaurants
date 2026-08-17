export function createRestaurantMonogram(name: unknown) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);

  if (!words.length) return 'RE';
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join('').toUpperCase();
  return `${Array.from(words[0])[0]}${Array.from(words[1])[0]}`.toUpperCase();
}
