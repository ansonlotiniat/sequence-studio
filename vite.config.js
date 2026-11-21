import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: './',
  // Serve even small font subsets from this origin; the CSP intentionally rejects data: fonts.
  build: { assetsInlineLimit: 0 },
  server: { proxy: { '/api': 'http://127.0.0.1:3000' } },
});
