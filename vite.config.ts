
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // Simplificado: Dejamos que Vite decida la mejor estrategia de chunks por defecto
      // para evitar errores de carga de módulos.
    }
  }
});