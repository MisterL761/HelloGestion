# Hello Gestion — Documentation technique

> Document de référence pour la prise en main du projet. Dernière mise à jour : 2026-06-08.

---

## 1. Vue d'ensemble

**Hello Gestion** est l'application interne d'Hello Fermetures, née de la fusion de deux outils :
- **Hello Stock** : gestion de stock (réception, pose, défectueux, inventaire, outils, commandes)
- **Administratif** : RH/financier (casiers commerciaux, dossiers, notes de frais, commissions)

C'est une **SPA React** (frontend) connectée à une **API PHP/MySQL maison** (backend), déployée sous `/hello-gestion/`.

```
crm/
├── src/            → Frontend React (composants, hooks, utils)
├── php/            → Backend PHP (endpoints API, cron, config, logs)
├── public/         → Assets statiques
└── dist/           → Build de production (généré par `npm run build`)
```

---

## 2. Stack technique

| Côté | Techno |
|---|---|
| Frontend | React 19.2 + Vite 7.1 + Tailwind CSS 4.1 + lucide-react (icônes) |
| Backend | PHP procédural (pas de framework) + PDO/MySQL + sessions natives |
| Base de données | MySQL (`helloferep296`) |
| Dépendance PHP | `smalot/pdfparser` (parsing de PDF, via Composer) |
| IA | Mistral API (assistant intégré) |

⚠️ **Pas de routeur React** (pas de React Router) — la navigation est gérée à la main via deux états dans `App.jsx` : `activeModule` et `activeTab`.

---

## 3. Frontend — modules et navigation

Navigation pilotée par `App.jsx` :

- **`activeModule`** (module global) : `stock`, `rapports`, `casier`, `dossiers`, `logs`, `annuaire`, `assistant`, `comparateur`, `generateur-arc`, `catalogue`, `chantiers`, `calcul-chantier`, `history`, `settings`
  <br>
  <br>
- **`activeTab`** (sous-onglets du module stock) : `dashboard` (réservé aux rôles managériaux), `received`, `installed`, `defective`, `stock`, `tools`, `orders`

La page d'accueil dépend du rôle (`getDefaultTab`) : Dashboard pour les rôles managériaux sur desktop, sinon `received`.

### Composants principaux (`src/components/`)

**Auth / layout**
`Login`, `Header`, `Sidebar`, `BottomNav`, `MobileStockNav`, `Tabs`, `SearchBar`, `LoadingSpinner`, `Skeleton`, `SessionExpiredModal`, `ToastProvider`

**Stock / produits**
`ProductsReceived`, `ProductsInstalled`, `ProductsDefective`, `Inventory`, `Tools`, `Orders`, `StockHistory`
+ cartes : `ReceivedCard`, `InstalledCard`, `DefectiveCard`, `InventoryCard`, `InventoryItemRow`, `ToolCard`, `StatusBadge`

**Modals CRUD**
`Add/EditProductModal`, `Add/EditDefectiveProductModal`, `Add/EditArticleModal`, `Add/EditToolModal`

**Dashboard & rapports**
`Dashboard`, `StatsCard`, `MonthlyReport`, `Rapports`

**Administratif / RH**
`AdminDossiers`, `Casier`, `ExpenseReports`, `CommissionCalculator`, `Settings`

**Outils métier**
`Catalogue`, `Chantiers`, `CalculChantier`, `ComparateurDevis`, `GenerateurARC`, `Annuaire`

**Assistant IA**
`Assistant` (chat basé sur Mistral, voir `assistant_*.php`)

**Notifications / communication**
`NotificationBell`, `BroadcastModal`, `BroadcastBubble`, `Logs`

**Hooks** (`src/hooks/`)
`useDataFetching`, `useNotifications`, `useOnlineStatus`

**Utils** (`src/utils/`)
`Apiclient.js`, `constants.js`, `compressImage.js`, `utilities.js`, `helpers.js`

---

## 4. Backend PHP (`php/`)

| Fichier | Rôle |
|---|---|
| `config.php` | Constantes globales (DB, CORS, emails, tokens, clé Mistral) — **protégé par `.htaccess`** |
| `db.php` | Connexion PDO MySQL centralisée |
| `auth.php` | Login / logout / check session, rate limiting |
| `roles.php` | RBAC : rôles, helpers `requireAuth`, `requireRole`, `hasRole`, `canAccess*` |
| `security.php` | Headers CORS + sécurité HTTP (CSP, HSTS, X-Frame-Options...) |
| `api.php`, `inventory.php`, `tools_api.php`, `received.php`, `installed.php`, `defective.php`, `bulk_update.php`, `orders.php` | Endpoints CRUD du module stock |
| `stock_history.php`, `price_history.php`, `top_consumed.php`, `stats.php`, `reports.php` | Historique, statistiques, rapports |
| `users.php`, `profile.php` | Gestion utilisateurs / profils |
| `casier_documents.php`, `casier_suivi.php`, `casier_clients.php` | Module "casier" (suivi commercial) |
| `chantiers.php`, `catalogue.php`, `generate_arc.php`, `commissions.php`, `expense_reports.php` | Modules métier |
| `annuaire.php` | Annuaire contacts |
| `assistant_ask.php`, `assistant_docs.php`, `assistant_upload.php`, `assistant_pdf.php`, `assistant_config.php` | Assistant IA (chat, ingestion docs, parsing PDF) |
| `broadcast.php` | Annonces internes |
| `logs.php`, `log_helper.php` | Journalisation applicative |
| `push_helper.php`, `push_subscribe.php` | Notifications push web |
| `hash.php`, `debug.php`, `uptimerobot_endpoint.php` | Utilitaires — **protégés par `.htaccess`** |

`.htaccess` bloque l'accès direct aux fichiers sensibles (config, security, db, roles, hash, debug, logs, .env, .log...).

---

## 5. Base de données

⚠️ **Pas de fichier de schéma SQL versionné.** Les évolutions de schéma récentes sont **auto-migrées** : chaque module vérifie et crée ses propres tables/colonnes à la volée via des fonctions PHP idempotentes (`SHOW COLUMNS` / `CREATE TABLE IF NOT EXISTS` avant chaque requête), par ex. `ensureDossierTables()` dans `php/affaire_dossiers_lib.php`. Ce pattern évite d'avoir des scripts `.sql` "à exécuter une fois" à maintenir à part — cherchez les fonctions `ensure*()` dans `php/` pour retrouver l'historique des schémas.

**Tables principales connues** : `users` (anciennement `app_users`), `inventory`, `received`, `installed`, `defective`, `tools`, `orders`, `reports`, `casier_clients`, `stock_movements`, `affaires`, `affaire_dossiers`.

👉 **Recommandation** : faire un dump complet de la base de production (`mysqldump`) et le conserver en lieu sûr (hors dépôt) pour la prise en main.

---

## 6. RBAC / Rôles

Centralisé dans `php/roles.php`.

**Rôles** : `admin`, `gerant`, `administration`, `chef_equipe`, `commercial`, `poseur`

| Rôle | Dashboard | Logs | Stock | Spécial |
|------|-----------|------|-------|---------|
| Admin | ✅ | ✅ | ✅ | Accès total + Logs + preview rôle |
| Gérant | ✅ | ❌ | ✅ | Notes de frais + Commissions |
| Administration | ✅ | ❌ | ✅ | Gestion dossiers |
| Chef d'équipe | ❌ | ❌ | ✅ | Casier personnel |
| Commercial | ❌ | ❌ | ✅ | Casier + Calculateur commission |
| Poseur | ❌ | ❌ | ✅ | Casier personnel |

Helpers PHP : `requireAuth()`, `requireRole()`, `hasRole()`, `hasAnyRole()`, `canAccessDashboard()`, `canAccessLogs()`, `canViewAllCasiers()`, `canValidateExpenses()`, `canViewCommissions()`

Côté front : rôle stocké en session (`user.role`), filtrage via `isManager`/`isAdmin` et comparaisons de rôle dans les composants concernés.

**Fonctionnalité notable** : *preview as role* (`viewAsRole` dans `App.jsx`) — réservée à `admin`, permet de visualiser l'app comme un autre rôle.

---

## 7. Authentification

Gérée par `php/auth.php` — sessions PHP natives (pas de JWT) :

- Cookies `HttpOnly`, `Secure`, `SameSite=Strict`, durée de vie 30 min
  <br>
  <br>
- Timeout d'inactivité 30 min
  <br>
  <br>
- Rate limiting : 10 tentatives / IP / 15 min (fichiers JSON dans `logs/rl_<md5(ip)>.json`)
  <br>
  <br>
- `password_verify()` contre `users.password`, condition `status = 'active'`
  <br>
  <br>
- `session_regenerate_id(true)` après login (anti session-fixation)
  <br>
  <br>
- Logs dans `php/logs/auth*.log`
  <br>
  <br>

Côté front : vérification de session au montage (`auth.php?action=check`), écoute de l'évènement `session-expired` → `SessionExpiredModal`, re-vérification toutes les 2 minutes.

---

## 8. Tâches planifiées (cron)

| Fichier | Rôle |
|---|---|
| `cron.php` | Point d'entrée : inclut `check_stock_api.php` (vérif stock quotidienne 8h) |
| `cron_monthly_report.php` | Génère le rapport du mois précédent (table `reports`), envoie un email récap. **Garde-fou** : ne s'exécute que le 1er du mois (sauf CLI ou `?force=1`) |
| `check_stock_api.php` | Vérifie les niveaux de stock (rupture / seuil bas) |
| `stock_notifications.php` | Envoie les emails d'alerte stock (anti-spam) |
| `cron_debug.php` | Variante avec chemins absolus codés en dur — ⚠️ cassera en cas de migration serveur |

### Déclenchement actuel : UptimeRobot (HTTP)

OVH mutualisé bloque/complique les crons CLI classiques → on utilise **UptimeRobot** comme déclencheur HTTP :

- Monitor HTTP pingant l'URL toutes les 24h :
  ```
  https://hello-fermetures.com/hello-gestion/php/cron_monthly_report.php?cron_token=<CRON_TOKEN>
  ```
- Le script s'auto-protège : il ne génère le rapport que le **1er du mois** (sinon il répond `{"skipped": true}`), et a un anti-doublon par mois/année.
- Pour forcer un test manuel : ajouter `&force=1` à l'URL.
- Notifications du monitor : **email uniquement** (décocher SMS/Voice pour éviter le bruit).

---

## 9. Variables d'environnement / configuration

- **`.env`** (racine) : `VITE_API_BASE=https://hello-fermetures.com/hello-gestion/php`
  ⚠️ Pas de `.env.example` dans le repo — à créer pour faciliter la prise en main.
  <br>
  <br>
- **`vite.config.js`** : base `/hello-gestion/`, sourcemaps activées en prod, proxy `/php` en dev.
  <br>
  <br>
- **`php/config.php`** — constantes définies :
  <br>
  <br>
  - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_CHARSET`
  - `ALLOWED_ORIGIN`, `CRON_TOKEN`
  - `FROM_EMAIL`, `FROM_NAME`, `TO_EMAIL`
  - `MISTRAL_API_KEY`

---

## 10. Points d'attention / pièges connus

- **Secrets en clair dans `config.php`** (mot de passe DB, clé Mistral en fallback) — protégé par `.htaccess`, mais à migrer vers des variables d'environnement serveur si possible.
<br>
<br>
- **`cron_debug.php`** utilise un chemin absolu codé en dur (`/home/helloferep/www/hello-gestion/php`) — remplacer par `__DIR__` pour fiabiliser.
<br>
<br>
- **Pas de `.env.example`** — créer un template pour faciliter la reprise.
<br>
<br>
- **Pas de routeur front** — navigation gérée à la main, attention en cas d'ajout de modules.
<br>
<br>
- **Logs en fichiers texte sans rotation** (`php/logs/*.log`, fichiers de rate-limiting) — surveiller la taille, prévoir une purge.
  <br>
  <br>
- **Pas de schéma SQL versionné** — schéma auto-migré à la volée par le code PHP (voir section 5) ; faire un dump de prod pour repartir d'un état de référence.
  <br>
  <br>
- **Backend procédural sans framework** — chaque endpoint réimplémente CORS/sessions/logs ; centralisation partielle via `security.php`/`roles.php`/`db.php`.
  <br>
  <br>
- **Déploiement automatique** : un push sur `main` déclenche `.github/workflows/deploy.yml` (build + dépôt FTP en production). Les secrets `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`, `VITE_API_BASE` doivent être configurés dans les paramètres du dépôt GitHub (Settings → Secrets and variables → Actions) pour que le déploiement fonctionne.

---

## 11. Guide de prise en main rapide

**Pour démarrer en local :**

```bash
npm install
npm run dev          # frontend (proxy /php vers le backend)
```

**Pour builder en production :**

```bash
npm run build        # génère dist/
```

**Fichiers à lire en priorité pour comprendre le projet :**
1. `php/config.php` — config globale (accès serveur requis)
2. `php/roles.php` — comprendre le RBAC
3. `php/auth.php` — comprendre l'authentification
4. `src/App.jsx` — comprendre la navigation/structure générale du front
5. `php/cron_monthly_report.php` + config UptimeRobot — comprendre l'automatisation
6. `.github/workflows/deploy.yml` — comprendre le déploiement continu (FTP vers production)

**Accès nécessaires à transmettre au repreneur :**
- Accès serveur OVH (FTP/SSH/cPanel)
- Accès base de données MySQL (`helloferep295`)
- Compte UptimeRobot (monitoring + déclenchement cron)
- `CRON_TOKEN`, `MISTRAL_API_KEY`, et autres secrets de `config.php` (jamais versionné, `config.php`/`db.php` doivent être transmis à part, hors dépôt Git)
- Accès au dépôt Git
- Secrets GitHub Actions (`FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`, `VITE_API_BASE`) à reconfigurer dans le nouveau dépôt pour que le déploiement continu fonctionne
