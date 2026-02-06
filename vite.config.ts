import { defineConfig } from 'vite';

export default defineConfig({
  base: '/void-drifter/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    host: true,
  },
});
