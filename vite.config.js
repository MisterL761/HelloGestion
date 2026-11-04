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

const UPLOAD_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.pdf': 'application/pdf',
};

// En local, les fichiers envoyés (php/uploads) sont lus directement sur le disque :
// le proxy vers Apache coupait les réponses volumineuses (photos de plus de ~650 Ko
// incomplètes, donc jamais affichées). Les scripts PHP passent toujours par le proxy.
function servePhpUploads() {
  const uploadsDir = path.resolve('php/uploads');
  return {
    name: 'serve-php-uploads',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(`${PROD_BASE}php/uploads`, (req, res, next) => {
        const file = path.resolve(uploadsDir, '.' + decodeURIComponent(req.url.split('?')[0]));
        // Uniquement des fichiers existants à l'intérieur de php/uploads
        if (!file.startsWith(uploadsDir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
          return next();
        }
        res.setHeader('Content-Type', UPLOAD_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
        res.setHeader('Content-Length', fs.statSync(file).size);
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE || PROD_BASE;
  const outDir = env.VITE_OUT_DIR || 'dist';

  return {
    plugins: [react(), adaptPublicFilesToBase(base, outDir), servePhpUploads()],

    base,

    build: {
      outDir,
      sourcemap: true,
    },

    server: {
      proxy: isDev
        ? {
            '/hello-gestion/php': {
              // 127.0.0.1 et non localhost : avec localhost, le proxy coupait
              // les réponses volumineuses (photos de plus de ~650 Ko jamais affichées)
              target: 'http://127.0.0.1',
              changeOrigin: true,
              secure: false,
            },
          }
        : {},
    },
  };
});
