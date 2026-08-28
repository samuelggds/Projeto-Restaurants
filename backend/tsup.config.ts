import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts', 'src/worker.ts', 'src/bootstrapSuperAdmin.ts'],
  format: ['esm'],
  outDir: 'dist',
  target: 'es2022',
  clean: true,
  splitting: false,
  sourcemap: false,
  minify: false,
});
