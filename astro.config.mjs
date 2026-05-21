import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  site: 'http://localhost:4321',
  server: {
    port: 4321,
    host: true,
  },
  vite: {
    ssr: {
      external: ['mongoose', 'cloudinary', 'sharp', 'meilisearch'],
    },
  },
});
