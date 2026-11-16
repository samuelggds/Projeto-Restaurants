import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

test('o navegador decodifica os oito quadros do motoboy no rastreamento', async ({ page }) => {
  const bytes = await readFile(
    new URL('../src/assets/tracking/courier-delivery-8dir.png', import.meta.url),
  );
  const result = await page.evaluate(
    async (dataUrl) => {
      const sprite = new Image();
      sprite.src = dataUrl;
      await sprite.decode();
      const canvas = document.createElement('canvas');
      canvas.width = sprite.naturalWidth;
      canvas.height = sprite.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(sprite, 0, 0);
      return {
        width: sprite.naturalWidth,
        height: sprite.naturalHeight,
        cornerAlpha: ctx.getImageData(0, 0, 1, 1).data[3],
        frames: Array.from(
          { length: 8 },
          (_, index) =>
            ctx.getImageData(
              Math.floor((((index % 4) + 0.5) * canvas.width) / 4),
              Math.floor(((Math.floor(index / 4) + 0.5) * canvas.height) / 2),
              1,
              1,
            ).data[3],
        ),
      };
    },
    `data:image/png;base64,${bytes.toString('base64')}`,
  );
  expect(result.width / result.height).toBe(2);
  expect(result.cornerAlpha).toBe(0);
  expect(result.frames.every((alpha) => alpha > 200)).toBe(true);
});
