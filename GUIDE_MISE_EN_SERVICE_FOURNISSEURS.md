# Guide de mise en service — Boîte Fournisseurs

> À faire **une seule fois**, avec Sébastien (il a les accès Microsoft de la société).
> Durée : ~15 minutes. Aucun code à écrire.

---

## Ce qu'il faut avant de commencer

- L'accès au compte Microsoft 365 de la société (celui qui gère les adresses `@hello-fermetures.com`) → **Sébastien**
- L'accès au serveur OVH (gestionnaire de fichiers ou FTP) pour modifier UN fichier → **toi**

---

## PARTIE A — Créer la « carte d'accès » Microsoft (~10 min, avec Sébastien)

> But : obtenir 2 codes (`CLIENT_ID` et `CLIENT_SECRET`) que Microsoft fabrique pour autoriser le CRM.

1. Aller sur **https://entra.microsoft.com** et se connecter avec le compte de **Sébastien** (`sebastien@hello-fermetures.com`).

2. Dans le menu de gauche : **Identité (Identity)** → **Applications** → **Inscriptions d'applications (App registrations)**.

3. Cliquer **+ Nouvelle inscription (+ New registration)**.
   > ⚠️ **« Inscription » ne veut PAS dire « nouveau compte » !** C'est une mauvaise traduction de Microsoft (« registration » = enregistrer une application). Vous restez connecté avec le compte de Sébastien. Ça ajoute juste une fiche « application » dans une liste — aucun nouveau compte, aucune nouvelle adresse, aucun nouveau mot de passe.

4. Remplir :
   - **Nom (Name)** : `Hello Gestion CRM`
   - **Types de comptes pris en charge** : choisir *« Comptes dans cet annuaire d'organisation uniquement »* (Accounts in this organizational directory only).
   - **URI de redirection (Redirect URI)** : choisir le type **Web** dans le menu déroulant, puis coller exactement :
     ```
     https://hello-fermetures.com/hello-gestion/php/supplier_emails_api.php?action=oauth_callback
     ```
   - Cliquer **Inscrire (Register)**.

5. Sur la page qui s'affiche : **copier le « ID d'application (client) » / "Application (client) ID »**.
   👉 **C'est le CODE n°1 (`CLIENT_ID`)** — le noter quelque part.

6. Créer le mot de passe de l'application :
   - Menu de gauche de l'app → **Certificats et secrets (Certificates & secrets)**.
   - Cliquer **+ Nouveau secret client (+ New client secret)**.
   - Description : `CRM` — Expiration : `24 mois` — cliquer **Ajouter (Add)**.
   - ⚠️ **Copier tout de suite la valeur** dans la colonne **« Valeur (Value) »** (elle disparaît si on quitte la page !).
   👉 **C'est le CODE n°2 (`CLIENT_SECRET`)** — le noter.

7. Donner les autorisations :
   - Menu de gauche → **Autorisations d'API (API permissions)**.
   - **+ Ajouter une autorisation (+ Add a permission)** → **Microsoft Graph** → **Autorisations déléguées (Delegated permissions)**.
   - Cocher les trois : **Mail.ReadWrite**, **Mail.Send**, **offline_access**.
   - Cliquer **Ajouter les autorisations (Add permissions)**.

✅ Fin de la partie A : vous avez les 2 codes manquants.

---

## PARTIE B — Renseigner le fichier de réglages sur le serveur (~3 min, toi)

> But : coller les 6 valeurs dans `config.php`. Ce fichier vit **uniquement sur le serveur** (il n'est jamais sur GitHub, pour protéger les secrets).

1. Sur le serveur OVH, ouvrir le fichier **`php/config.php`** (gestionnaire de fichiers OVH ou FTP).

2. Ajouter ce bloc (les 4 valeurs fixes sont déjà remplies ; il ne reste qu'à coller les 2 codes de la partie A) :

```php
// ── Boîte Fournisseurs (Microsoft Graph) ──
if (!defined('MSGRAPH_CLIENT_ID'))     define('MSGRAPH_CLIENT_ID', 'COLLER_ICI_LE_CODE_N1');
if (!defined('MSGRAPH_CLIENT_SECRET')) define('MSGRAPH_CLIENT_SECRET', 'COLLER_ICI_LE_CODE_N2');
if (!defined('MSGRAPH_TENANT'))        define('MSGRAPH_TENANT', 'common');
if (!defined('MSGRAPH_REDIRECT_URI'))  define('MSGRAPH_REDIRECT_URI', 'https://hello-fermetures.com/hello-gestion/php/supplier_emails_api.php?action=oauth_callback');
if (!defined('EMAILS_ENC_KEY'))        define('EMAILS_ENC_KEY', 'VOIR_CLE_FOURNIE_PAR_CLAUDE');
if (!defined('EMAILS_CRON_KEY'))       define('EMAILS_CRON_KEY', 'VOIR_CLE_FOURNIE_PAR_CLAUDE');
```

> Les 2 clés `EMAILS_ENC_KEY` et `EMAILS_CRON_KEY` ont été générées par Claude (voir la conversation).
> 🔴 **Important** : `EMAILS_ENC_KEY` ne doit jamais rester vide — c'est elle qui chiffre l'accès à la boîte mail.

3. Enregistrer le fichier.

---

## PARTIE C — Connecter la boîte de Sébastien (~1 min)

1. Ouvrir le CRM, se connecter en **admin**.
2. Menu → **Boîte Fournisseurs** → cliquer **« Connecter la boîte Outlook »** (ou l'icône ⚙).
3. La page de connexion **Microsoft** s'affiche → **Sébastien se connecte avec son compte** `sebastien@hello-fermetures.com` et accepte les autorisations.
4. Retour automatique au CRM : la boîte est connectée. ✅

---

## PARTIE D — Configurer les fournisseurs (~5 min)

Dans le CRM → **Boîte Fournisseurs** → **⚙ Configuration** :
- Ajouter chaque fournisseur : nom (ex. « Somfy »), adresse ou domaine (`@somfy.fr`), mots-clés d'objet (ex. `commande, ARC`).
- Relire les 2 messages types (« bon pour accord » et « demande de modification »).
- Cliquer **Synchroniser** → les mails fournisseurs remontent.

---

## PARTIE E — Relances automatiques (optionnel, ~3 min, peut se faire plus tard)

Pour que les relances partent même quand personne n'utilise le CRM :
1. Créer un compte gratuit sur **https://uptimerobot.com**.
2. **+ Add New Monitor** → type **HTTP(s)** → Nom : `Cron Boîte Fournisseurs`.
3. **URL** :
   ```
   https://hello-fermetures.com/hello-gestion/php/cron_emails.php?key=VOIR_CLE_CRON_FOURNIE_PAR_CLAUDE
   ```
   (utiliser la valeur de `EMAILS_CRON_KEY`)
4. Intervalle : **5 minutes** → **Create Monitor**.

---

## ✅ Test final

Envoyer un vrai mail sur la boîte de Sébastien → dans le CRM, cliquer **Synchroniser** → le mail doit apparaître sous le bon fournisseur. Tester un **« Bon pour accord »** → vérifier dans les *Éléments envoyés* d'Outlook que la réponse est bien partie.

---

## En cas de souci

- **« Une erreur est survenue » au clic sur Connecter** → le `config.php` n'a pas (ou mal) les valeurs `MSGRAPH_*`. Revérifier la partie B.
- **Microsoft refuse la connexion** → vérifier que l'URI de redirection dans Azure (partie A, étape 4) est **exactement identique** à celle du `config.php` (partie B).
- **Rien ne remonte après Synchroniser** → vérifier qu'un fournisseur est bien configuré (partie D) et que son adresse correspond aux mails reçus.
