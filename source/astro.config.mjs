import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'server',
  site: 'http://localhost:4321',
  server: {
    port: 4321,
  },
  vite: {
    ssr: {
      external: ['mongoose', 'cloudinary', 'sharp', 'meilisearch'],
    },
  },
});
