import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    plugins: [react()],

    base: '/hello-gestion/',

    build: {
      outDir: 'dist',
      sourcemap: true,
    },

    server: {
      proxy: isDev
        ? {
            '/hello-gestion/php': {
              target: 'http://localhost',
              changeOrigin: true,
              secure: false,
            },
          }
        : {},
    },
  };
});