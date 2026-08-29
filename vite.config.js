import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    plugins: [react()],

    // Base URL pour la production et le développement
    base: '/hello-gestion/',

    // Configuration de build
    build: {
      outDir: 'dist',
      // Recommandé pour le débogage en production
      sourcemap: true,
    },

    // Configuration du serveur
    server: {
      // En développement, on peut utiliser le proxy
      proxy: isDev ? {
        // Cette configuration redirige les requêtes API pendant le développement
        '/php': {
          // Pour le développement local, pointez vers votre serveur local
          target: 'http://localhost',  // Ou votre serveur local approprié
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/php/, '/hello-gestion/php'),
        }
      } : {}
    }
  };
});