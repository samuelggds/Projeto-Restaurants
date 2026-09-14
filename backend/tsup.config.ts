import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    server: 'src/server.ts',
    worker: 'src/worker.ts',
    bootstrapSuperAdmin: 'src/bootstrapSuperAdmin.ts',
    'config/prisma': 'src/config/prisma.ts',
  },
  format: ['esm'],
  outDir: 'dist',
  target: 'es2022',
  clean: true,
  splitting: false,
  sourcemap: false,
  minify: false,
});
