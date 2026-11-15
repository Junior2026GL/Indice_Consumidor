import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    sourcemap: false, // no exponer el código fuente en producción
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Las librerías cambian poco: en un chunk aparte el navegador las mantiene en caché.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          http: ['axios'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
