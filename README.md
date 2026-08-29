# Hello Gestion

Application interne d'Hello Fermetures : gestion de stock/chantier (ex-Hello Stock) + administratif/RH (casiers commerciaux, dossiers, notes de frais, commissions, courrier). SPA React connectée à une API PHP/MySQL maison.

📖 **Documentation complète : [`DOCUMENTATION.md`](./DOCUMENTATION.md)** — architecture, modules, RBAC, authentification, cron, déploiement, points d'attention, guide de prise en main.

## Stack

- **Frontend** : React 19 + Vite + Tailwind CSS + lucide-react
- **Backend** : PHP procédural (PDO/MySQL, sessions natives, sans framework)
- **Déploiement** : GitHub Actions → FTP vers production (voir `.github/workflows/deploy.yml`)

## Démarrage rapide

```bash
npm install
npm run dev      # frontend en local (proxy /php vers le backend)
npm run build    # build de production → dist/
```

Le backend (`php/`) nécessite un serveur PHP + MySQL et les fichiers de config locaux (`php/config.php`, `php/db.php`) — non versionnés, à demander séparément.

Pour tout le reste (architecture, RBAC, secrets à transmettre, pièges connus), voir [`DOCUMENTATION.md`](./DOCUMENTATION.md).
