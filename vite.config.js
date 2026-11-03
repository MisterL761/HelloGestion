import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const PROD_BASE = '/hello-gestion/';

// Les fichiers de public/ sont écrits pour la prod (/hello-gestion/).
// Pour un build avec une autre base (site dev servi à la racine), on les adapte.
function adaptPublicFilesToBase(base, outDir) {
  return {
    name: 'adapt-public-files-to-base',
    apply: 'build',
    closeBundle() {
      if (base === PROD_BASE) return;

      for (const file of ['sw.js', 'manifest.json', '.htaccess']) {
        const filePath = path.resolve(outDir, file);
        if (!fs.existsSync(filePath)) continue;

        let content = fs.readFileSync(filePath, 'utf8').split(PROD_BASE).join(base);

        if (file === '.htaccess') {
          // Les chemins /hello-gestion/... stockés en BDD ou générés par le PHP
          // (photos, liens de notification) sont redirigés vers la base du site.
          content = content.replace(
            `RewriteBase ${base}`,
            `RewriteBase ${base}\n\n# Chemins de prod /hello-gestion/... → base de ce site\nRewriteRule ^hello-gestion/?(.*)$ $1 [L]`
          );
        }

        fs.writeFileSync(filePath, content);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE || PROD_BASE;
  const outDir = env.VITE_OUT_DIR || 'dist';

  return {
    plugins: [react(), adaptPublicFilesToBase(base, outDir)],

    base,

    build: {
      outDir,
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
