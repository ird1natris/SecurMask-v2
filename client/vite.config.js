import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    proxy: { '/api': {
      target: 'http://127.0.0.1:8081',
      changeOrigin: false,
      rewrite: path => path.replace(/^\/api/, ''),
    } },
  },
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {},
}));
